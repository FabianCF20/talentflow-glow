/**
 * Marcación de ingreso y salida con GPS, validación jerárquica y trazabilidad.
 * Empleados registran su propia jornada; supervisores pueden apoyar marcaciones.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { CheckCircle2, Clock, MapPin, UserCheck, XCircle } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useRrhh } from "@/store/rrhh";
import { useOperaciones } from "@/store/operaciones";
import { useAuth } from "@/lib/auth";
import { hoyISO, horaActual } from "@/lib/operaciones";
import { nombreEmpleado } from "@/types/rrhh";
import type { MarcacionAsistencia } from "@/types/operaciones";

export const Route = createFileRoute("/asistencia")({
  head: () => ({
    meta: [
      { title: "Asistencia y marcaciones | SIGTH" },
      { name: "description", content: "Registro de ingreso y salida con ubicación GPS y validación de supervisor." },
    ],
  }),
  component: AsistenciaPage,
});

function obtenerUbicacion(): Promise<{ latitud: number; longitud: number; precisionMetros: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Este dispositivo o navegador no permite obtener ubicación GPS."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({
        latitud: pos.coords.latitude,
        longitud: pos.coords.longitude,
        precisionMetros: Math.round(pos.coords.accuracy),
      }),
      (error) => reject(new Error(
        error.code === error.PERMISSION_DENIED
          ? "Debes permitir el acceso a la ubicación para marcar asistencia."
          : error.code === error.TIMEOUT
            ? "No se pudo obtener la ubicación a tiempo. Intenta nuevamente."
            : "No fue posible obtener la ubicación GPS.",
      )),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  });
}

const estadoLabel: Record<MarcacionAsistencia["estado"], string> = {
  pendiente_supervisor: "Pendiente de supervisor",
  pendiente_rrhh: "Pendiente de Talento Humano",
  validada: "Validada",
  rechazada: "Rechazada",
};

function AsistenciaPage() {
  const { empleados } = useRrhh();
  const op = useOperaciones();
  const { perfil, usuario } = useAuth();
  const fecha = hoyISO();
  const [empleadoSeleccionado, setEmpleadoSeleccionado] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [seleccionados, setSeleccionados] = useState<string[]>([]);
  const [motivoRechazo, setMotivoRechazo] = useState("");
  const [limiteHistorial, setLimiteHistorial] = useState(100);

  const roles = perfil?.roles ?? [];
  const empleadoId = perfil?.empleadoId ?? "";
  const esRrhh = roles.some((r) => r === "administrador" || r === "talento_humano");
  const esMando = roles.some((r) => r === "supervisor" || r === "jefe");
  const empleadoPropio = empleados.find((e) => e.id === empleadoId);
  const subordinados = empleados.filter((e) => e.id !== empleadoId && (perfil?.subordinadosIds ?? []).includes(e.id));
  const marcacionesPropias = op.marcaciones.filter((m) => m.empleadoId === empleadoId);
  const pendientes = op.marcaciones.filter((m) =>
    esRrhh
      ? m.estado === "pendiente_supervisor" || m.estado === "pendiente_rrhh"
      : m.estado === "pendiente_supervisor" && m.origen === "empleado"
        && (perfil?.subordinadosIds ?? []).includes(m.empleadoId)
        && m.registradoPorUid !== usuario?.uid,
  );
  const puedeMarcarEmpleado = Boolean(empleadoId && empleadoPropio);
  const yaMarco = (id: string, tipo: MarcacionAsistencia["tipo"]) =>
    op.marcaciones.some((m) => m.empleadoId === id && m.fecha === fecha && m.tipo === tipo && m.estado !== "rechazada");

  const nombreActor = [perfil?.nombres, perfil?.apellidos].filter(Boolean).join(" ") || "Usuario";

  const registrar = async (targetEmpleadoId: string, tipo: MarcacionAsistencia["tipo"], origen: "empleado" | "supervisor") => {
    if (!usuario?.uid) {
      toast.error("No se encontró una sesión válida.");
      return;
    }
    setOcupado(true);
    try {
      const ubicacion = await obtenerUbicacion();
      op.registrarMarcacionGPS({
        empleadoId: targetEmpleadoId,
        fecha,
        tipo,
        hora: horaActual(),
        ...ubicacion,
        origen,
        registradoPorUid: usuario.uid,
        registradoPor: nombreActor,
      });
      toast.success(origen === "empleado"
        ? `${tipo === "ingreso" ? "Ingreso" : "Salida"} registrada. Está pendiente de validación.`
        : `${tipo === "ingreso" ? "Ingreso" : "Salida"} registrado por supervisor y enviado a Talento Humano.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No fue posible registrar la marcación.");
    } finally {
      setOcupado(false);
    }
  };

  const cambiarSeleccion = (id: string, checked: boolean) => {
    setSeleccionados((prev) => checked ? [...prev, id] : prev.filter((x) => x !== id));
  };

  const revisar = (ids: string[], estado: "validada" | "rechazada") => {
    if (!usuario?.uid) return;
    if (estado === "rechazada" && !motivoRechazo.trim()) {
      toast.error("Escribe el motivo del rechazo.");
      return;
    }
    op.validarMarcaciones(ids, estado, nombreActor, usuario.uid, motivoRechazo);
    setSeleccionados([]);
    setMotivoRechazo("");
    toast.success(estado === "validada" ? "Marcación(es) validada(s)." : "Marcación(es) rechazada(s).");
  };

  const pendientesOrdenados = useMemo(
    () => [...pendientes].sort((a, b) => b.registradoEn.localeCompare(a.registradoEn)),
    [pendientes],
  );

  return (
    <AppShell>
      <PageHeader
        breadcrumb={["Operación", "Asistencia"]}
        title="Asistencia"
        description="Registra únicamente ingreso y salida. Cada marcación guarda la ubicación GPS y queda pendiente de validación."
      />

      {puedeMarcarEmpleado && (
        <section className="surface-panel space-y-3 p-4">
          <div>
            <h2 className="text-base font-semibold text-foreground">Mi jornada · {fecha}</h2>
            <p className="text-sm text-muted-foreground">La ubicación se solicita únicamente al marcar ingreso o salida.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button disabled={ocupado || yaMarco(empleadoId, "ingreso")} onClick={() => void registrar(empleadoId, "ingreso", "empleado")}>
              <MapPin className="mr-2 size-4" /> Marcar ingreso
            </Button>
            <Button variant="outline" disabled={ocupado || yaMarco(empleadoId, "salida")} onClick={() => void registrar(empleadoId, "salida", "empleado")}>
              <MapPin className="mr-2 size-4" /> Marcar salida
            </Button>
          </div>
          <div className="space-y-2">
            {marcacionesPropias.filter((m) => m.fecha === fecha).map((m) => (
              <div key={m.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3 text-sm">
                <span className="font-medium">{m.tipo === "ingreso" ? "Ingreso" : "Salida"} · {m.hora}</span>
                <span className="text-muted-foreground">{estadoLabel[m.estado]}</span>{m.motivoRechazo && <span className="text-destructive">Motivo: {m.motivoRechazo}</span>}
                <a className="text-primary underline" href={`https://www.google.com/maps?q=${m.latitud},${m.longitud}`} target="_blank" rel="noreferrer">Ver ubicación</a>
              </div>
            ))}
          </div>
        </section>
      )}

      {esMando && (
        <section className="surface-panel space-y-3 p-4">
          <div>
            <h2 className="text-base font-semibold text-foreground">Registro de marcación por supervisor</h2>
            <p className="text-sm text-muted-foreground">Puedes registrar ingreso o salida de un subordinado cuando sea necesario. Estas marcaciones quedan pendientes de Talento Humano.</p>
          </div>
          {subordinados.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay subordinados asignados a tu perfil. Solicita a Talento Humano que revise tu organigrama y la lista de subordinados.</p>
          ) : (
            <div className="flex flex-wrap items-end gap-2">
              <label className="min-w-56 flex-1 text-sm">
                Empleado
                <select className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3" value={empleadoSeleccionado || subordinados[0]?.id || ""} onChange={(e) => setEmpleadoSeleccionado(e.target.value)}>
                  {subordinados.map((e) => <option key={e.id} value={e.id}>{nombreEmpleado(e)}</option>)}
                </select>
              </label>
              <Button disabled={ocupado || !subordinados.length || yaMarco(empleadoSeleccionado || subordinados[0]?.id || "", "ingreso")} onClick={() => void registrar(empleadoSeleccionado || subordinados[0]?.id || "", "ingreso", "supervisor")}>
                <MapPin className="mr-2 size-4" /> Registrar ingreso
              </Button>
              <Button variant="outline" disabled={ocupado || !subordinados.length || yaMarco(empleadoSeleccionado || subordinados[0]?.id || "", "salida")} onClick={() => void registrar(empleadoSeleccionado || subordinados[0]?.id || "", "salida", "supervisor")}>
                <MapPin className="mr-2 size-4" /> Registrar salida
              </Button>
            </div>
          )}
        </section>
      )}

      {(esMando || esRrhh) && (
        <section className="surface-panel space-y-3 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold text-foreground">Marcaciones pendientes de validación</h2>
              <p className="text-sm text-muted-foreground">{esRrhh ? "Talento Humano puede revisar todas las marcaciones, incluidas las registradas por supervisores." : "Puedes validar marcaciones de tus subordinados registradas por ellos mismos."}</p>
            </div>
            <span className="rounded-md bg-secondary px-2 py-1 text-xs">{pendientesOrdenados.length} pendientes</span>
          </div>
          {pendientesOrdenados.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay marcaciones pendientes.</p>
          ) : (
            <>
              <div className="space-y-2">
                {pendientesOrdenados.map((m) => {
                  const emp = empleados.find((e) => e.id === m.empleadoId);
                  return (
                    <div key={m.id} className="rounded-lg border border-border p-3">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <label className="flex items-start gap-2 text-sm">
                          <input type="checkbox" checked={seleccionados.includes(m.id)} onChange={(e) => cambiarSeleccion(m.id, e.target.checked)} />
                          <span><strong>{emp ? nombreEmpleado(emp) : m.empleadoId}</strong><br />{m.tipo === "ingreso" ? "Ingreso" : "Salida"} · {m.fecha} {m.hora}</span>
                        </label>
                        <span className="text-xs text-muted-foreground">{m.origen === "supervisor" ? "Registrada por supervisor" : "Registrada por empleado"} · {estadoLabel[m.estado]}</span>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        <span>Registró: {m.registradoPor}</span>
                        <span>Precisión GPS: {m.precisionMetros} m</span>
                        <a className="text-primary underline" href={`https://www.google.com/maps?q=${m.latitud},${m.longitud}`} target="_blank" rel="noreferrer">Ver ubicación</a>
                      </div>
                      <div className="mt-3 flex gap-2">
                        <Button size="sm" onClick={() => revisar([m.id], "validada")}><CheckCircle2 className="mr-1 size-4" /> Validar</Button>
                        <Button size="sm" variant="outline" onClick={() => revisar([m.id], "rechazada")}><XCircle className="mr-1 size-4" /> Rechazar</Button>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex flex-wrap items-end gap-2 border-t border-border pt-3">
                <label className="min-w-52 flex-1 text-sm">Motivo de rechazo (obligatorio para rechazar)
                  <Input className="mt-1" value={motivoRechazo} onChange={(e) => setMotivoRechazo(e.target.value)} placeholder="Explica por qué se rechaza" />
                </label>
                <Button disabled={!seleccionados.length} onClick={() => revisar(seleccionados, "validada")}>Validar seleccionadas ({seleccionados.length})</Button>
                <Button variant="outline" disabled={!seleccionados.length || !motivoRechazo.trim()} onClick={() => revisar(seleccionados, "rechazada")}>Rechazar seleccionadas</Button>
              </div>
            </>
          )}
        </section>
      )}

      {esRrhh && (
        <section className="surface-panel space-y-2 p-4">
          <h2 className="text-base font-semibold text-foreground">Consulta global de Talento Humano</h2>
          <p className="text-sm text-muted-foreground">Historial completo de marcaciones, origen, responsable, estado y ubicación.</p>
          <div className="space-y-2">
            {op.marcaciones.slice(0, limiteHistorial).map((m) => {
              const emp = empleados.find((e) => e.id === m.empleadoId);
              return <div key={m.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-border py-2 text-sm">
                <span>{emp ? nombreEmpleado(emp) : m.empleadoId} · {m.fecha} {m.hora} · {m.tipo}</span>
                <span className="text-muted-foreground">{estadoLabel[m.estado]} · {m.registradoPor}</span>
                <a className="text-primary underline" href={`https://www.google.com/maps?q=${m.latitud},${m.longitud}`} target="_blank" rel="noreferrer">GPS</a>
              </div>;
            })}
          </div>
          {op.marcaciones.length > limiteHistorial && <Button variant="outline" size="sm" onClick={() => setLimiteHistorial((n) => n + 100)}>Mostrar más marcaciones</Button>}
        </section>
      )}

      {!puedeMarcarEmpleado && !esMando && !esRrhh && (
        <div className="surface-panel p-4 text-sm text-muted-foreground">Tu cuenta no tiene un empleado vinculado para registrar asistencia. Contacta a Talento Humano.</div>
      )}

      <p className="text-xs text-muted-foreground"><Clock className="mr-1 inline size-3" />Las marcaciones rechazadas se conservan en el historial y no se eliminan.</p>
      {esRrhh && <p className="text-xs text-muted-foreground"><UserCheck className="mr-1 inline size-3" />Solo Talento Humano puede aprobar las marcaciones registradas por supervisores.</p>}
    </AppShell>
  );
}
