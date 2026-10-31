/**
 * Control diario de asistencia: consulta individual/masiva y validación jerárquica.
 * Las horas y coordenadas originales son de solo lectura; el empleado marca desde su portal.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { collection, doc, onSnapshot, query, serverTimestamp, where, writeBatch } from "firebase/firestore";
import { AlertTriangle, CheckCircle2, Clock, Users } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth";
import { useRrhh } from "@/store/rrhh";
import { downloadCsv } from "@/lib/export";
import { esVinculado } from "@/lib/rrhh";
import { nombreEmpleado } from "@/types/rrhh";
import { JORNADA } from "@/types/operaciones";

type PuntoMarcacion = {
  latitud: number;
  longitud: number;
  precisionMetros: number;
  marcadoEn?: { toDate: () => Date };
};

type RegistroDia = {
  id: string;
  empleadoId: string;
  fecha: string;
  ingreso?: PuntoMarcacion;
  salida?: PuntoMarcacion;
  validacion?: {
    estado: "pendiente" | "validada" | "observada";
    usuarioUid?: string;
    fecha?: { toDate: () => Date };
    observacion?: string;
  };
  // Solo para mostrar registros históricos creados con el modelo anterior.
  horaIngreso?: string;
  horaSalida?: string;
  ausente?: boolean;
  justificacion?: string;
};

const fechaBogota = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

const hora = (punto?: PuntoMarcacion, legado?: string) => {
  const fecha = punto?.marcadoEn?.toDate();
  if (fecha) {
    return fecha.toLocaleTimeString("es-CO", {
      timeZone: "America/Bogota",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }
  return legado ?? "—";
};

const gps = (punto?: PuntoMarcacion) =>
  punto
    ? `https://www.google.com/maps?q=${punto.latitud},${punto.longitud}`
    : undefined;

const gruposDe = (ids: string[], maximo = 30) => {
  const grupos: string[][] = [];
  for (let i = 0; i < ids.length; i += maximo) grupos.push(ids.slice(i, i + maximo));
  return grupos;
};

export const Route = createFileRoute("/asistencia")({
  head: () => ({
    meta: [
      { title: "Control de asistencia | SIGTH" },
      { name: "description", content: "Consulta individual y masiva de marcaciones GPS y validación de asistencia." },
    ],
  }),
  component: AsistenciaPage,
});

function AsistenciaPage() {
  const { perfil } = useAuth();
  const { empleados } = useRrhh();
  const roles = perfil?.roles ?? [];
  const esRrhh = roles.some((r) => r === "administrador" || r === "talento_humano");
  const esMando = roles.some((r) =>
    ["supervisor", "jefe", "director", "gerente_general"].includes(r),
  );
  const puedeConsultar = esRrhh || esMando;
  const puedeValidar = puedeConsultar;
  const subordinados = [...new Set(perfil?.subordinadosIds ?? [])].filter(Boolean);

  const [fecha, setFecha] = useState(fechaBogota);
  const [busqueda, setBusqueda] = useState("");
  const [registros, setRegistros] = useState<RegistroDia[]>([]);
  const [cargando, setCargando] = useState(true);
  const [seleccionados, setSeleccionados] = useState<string[]>([]);
  const [observaciones, setObservaciones] = useState<Record<string, string>>({});

  useEffect(() => {
    setCargando(true);
    setSeleccionados([]);
    if (!puedeConsultar || (!esRrhh && subordinados.length === 0)) {
      setRegistros([]);
      setCargando(false);
      return;
    }

    const consultas = esRrhh
      ? [query(collection(db, "op_asistencia"), where("fecha", "==", fecha))]
      : gruposDe(subordinados).map((grupo) =>
          query(
            collection(db, "op_asistencia"),
            where("fecha", "==", fecha),
            where("empleadoId", "in", grupo),
          ),
        );

    const resultados = new Map<number, RegistroDia[]>();
    const unsubs = consultas.map((consulta, indice) =>
      onSnapshot(
        consulta,
        (snap) => {
          resultados.set(
            indice,
            snap.docs.map((d) => ({ ...d.data(), id: d.id }) as RegistroDia),
          );
          const unidos = new Map<string, RegistroDia>();
          for (const lista of resultados.values()) {
            for (const registro of lista) {
              const previo = unidos.get(registro.empleadoId);
              if (!previo || (!previo.ingreso && registro.ingreso)) {
                unidos.set(registro.empleadoId, registro);
              }
            }
          }
          setRegistros([...unidos.values()]);
          setCargando(false);
        },
        (error) => {
          console.error("[asistencia] Error consultando registros", error);
          setRegistros([]);
          setCargando(false);
          toast.error("No fue posible consultar la asistencia. Verifica permisos e índices de Firestore.");
        },
      ),
    );
    return () => {
      unsubs.forEach((unsub) => unsub());
    };
  }, [fecha, puedeConsultar, esRrhh, subordinados.join("|")]);

  const personal = useMemo(
    () =>
      empleados
        .filter(esVinculado)
        .filter((e) => esRrhh || subordinados.includes(e.id)),
    [empleados, esRrhh, subordinados.join("|")],
  );
  const registrosPorEmpleado = useMemo(
    () => new Map(registros.map((r) => [r.empleadoId, r])),
    [registros],
  );
  const filas = useMemo(
    () =>
      personal
        .filter((e) => {
          const texto = `${nombreEmpleado(e)} ${e.id}`.toLowerCase();
          return texto.includes(busqueda.trim().toLowerCase());
        })
        .map((empleado) => ({ empleado, registro: registrosPorEmpleado.get(empleado.id) })),
    [personal, registrosPorEmpleado, busqueda],
  );

  const pendientes = registros.filter((r) => (r.validacion?.estado ?? "pendiente") === "pendiente");
  const validadas = registros.filter((r) => r.validacion?.estado === "validada");
  const observadas = registros.filter((r) => r.validacion?.estado === "observada");

  const validar = async (registro: RegistroDia, estado: "validada" | "observada") => {
    const uid = perfil?.id;
    if (!uid || !puedeValidar) return;
    const observacion = observaciones[registro.id]?.trim() ?? "";
    if (estado === "observada" && observacion.length < 5) {
      toast.error("Escribe una observación de al menos 5 caracteres.");
      return;
    }
    if (!registro.ingreso || !registro.salida) {
      toast.error("No se puede validar: falta la marcación de ingreso o salida.");
      return;
    }
    try {
      await writeBatch(db)
        .update(doc(db, "op_asistencia", registro.id), {
          validacion: { estado, usuarioUid: uid, fecha: serverTimestamp(), observacion },
        })
        .commit();
      toast.success(estado === "validada" ? "Asistencia validada." : "Asistencia observada.");
    } catch (error) {
      console.error("[asistencia] No se pudo validar", error);
      toast.error("No fue posible guardar la validación. Revisa tu alcance jerárquico.");
    }
  };

  const validarSeleccionados = async () => {
    const uid = perfil?.id;
    if (!uid || !seleccionados.length) return;
    const elegibles = registros.filter(
      (r) =>
        seleccionados.includes(r.id) &&
        r.ingreso &&
        r.salida &&
        (r.validacion?.estado ?? "pendiente") === "pendiente",
    );
    if (!elegibles.length) {
      toast.error("Selecciona registros completos que estén pendientes de validación.");
      return;
    }
    try {
      const lote = writeBatch(db);
      elegibles.forEach((r) =>
        lote.update(doc(db, "op_asistencia", r.id), {
          validacion: { estado: "validada", usuarioUid: uid, fecha: serverTimestamp(), observacion: "" },
        }),
      );
      await lote.commit();
      setSeleccionados([]);
      toast.success(`${elegibles.length} asistencia(s) validada(s).`);
    } catch (error) {
      console.error("[asistencia] Error en validación masiva", error);
      toast.error("No se pudo completar la validación masiva. No se confirmó ningún cambio.");
    }
  };

  const exportar = () =>
    downloadCsv(
      `asistencia-${fecha}.csv`,
      ["Empleado", "ID", "Fecha", "Ingreso", "Salida", "GPS ingreso", "GPS salida", "Precisión ingreso (m)", "Precisión salida (m)", "Estado", "Observación"],
      filas.map(({ empleado, registro }) => [
        nombreEmpleado(empleado),
        empleado.id,
        fecha,
        hora(registro?.ingreso, registro?.horaIngreso),
        hora(registro?.salida, registro?.horaSalida),
        registro?.ingreso ? `${registro.ingreso.latitud},${registro.ingreso.longitud}` : "",
        registro?.salida ? `${registro.salida.latitud},${registro.salida.longitud}` : "",
        registro?.ingreso?.precisionMetros ?? "",
        registro?.salida?.precisionMetros ?? "",
        registro?.validacion?.estado ?? (registro ? "Pendiente" : "Sin marcación"),
        registro?.validacion?.observacion ?? registro?.justificacion ?? "",
      ]),
    );

  const alternarSeleccion = (id: string, activo: boolean) =>
    setSeleccionados((prev) => activo ? [...new Set([...prev, id])] : prev.filter((x) => x !== id));

  return (
    <AppShell>
      <PageHeader
        breadcrumb={["Operación", "Control de asistencia"]}
        title="Control de asistencia"
        description={`El empleado registra ingreso y salida con GPS. El superior valida los registros. Jornada de referencia: ${JORNADA.horaEntrada}–${JORNADA.horaSalida}.`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Input type="date" value={fecha} className="h-9 w-40" onChange={(e) => setFecha(e.target.value)} />
            <Button size="sm" variant="outline" onClick={exportar}>Exportar día</Button>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Empleados consultados" value={String(filas.length)} icon={Users} hint="Según alcance autorizado" />
        <StatCard label="Pendientes" value={String(pendientes.length)} icon={Clock} hint="Esperan validación" />
        <StatCard label="Validadas" value={String(validadas.length)} icon={CheckCircle2} hint="Confirmadas por el superior" />
        <StatCard label="Observadas" value={String(observadas.length)} icon={AlertTriangle} hint="Requieren revisión" />
      </div>

      {!puedeConsultar && (
        <div className="rounded-lg border border-border p-4 text-sm text-muted-foreground">
          Tu rol no tiene acceso al panel de validación. Puedes registrar tu asistencia desde la pestaña «Mi asistencia» del Portal del Empleado.
        </div>
      )}

      {puedeConsultar && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Input
              className="h-9 max-w-sm"
              placeholder="Buscar empleado o identificación…"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
            <Button size="sm" onClick={() => void validarSeleccionados()} disabled={!seleccionados.length || !puedeValidar}>
              Validar seleccionados ({seleccionados.length})
            </Button>
          </div>

          {cargando ? (
            <div className="rounded-lg border border-border p-6 text-center text-sm text-muted-foreground">Consultando asistencia…</div>
          ) : filas.length === 0 ? (
            <div className="rounded-lg border border-border p-6 text-center text-sm text-muted-foreground">No hay empleados dentro del alcance o no se encontraron resultados.</div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full min-w-[850px] text-sm">
                <thead className="bg-muted/60 text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="p-3">Validar</th>
                    <th className="p-3">Empleado</th>
                    <th className="p-3">Ingreso</th>
                    <th className="p-3">Salida</th>
                    <th className="p-3">Estado</th>
                    <th className="p-3">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {filas.map(({ empleado, registro }) => {
                    const estado = registro?.validacion?.estado ?? (registro ? "pendiente" : "sin_marcacion");
                    const completo = !!registro?.ingreso && !!registro?.salida;
                    const legacy = !!registro && !registro.ingreso;
                    const puedeSeleccionar = !!registro?.ingreso && !!registro.salida && estado === "pendiente";
                    return (
                      <tr key={empleado.id} className="border-t border-border align-top">
                        <td className="p-3">
                          <input
                            aria-label={`Seleccionar ${nombreEmpleado(empleado)}`}
                            type="checkbox"
                            checked={!!registro && seleccionados.includes(registro.id)}
                            disabled={!puedeSeleccionar}
                            onChange={(e) => registro && alternarSeleccion(registro.id, e.target.checked)}
                          />
                        </td>
                        <td className="p-3">
                          <p className="font-medium text-foreground">{nombreEmpleado(empleado)}</p>
                          <p className="text-xs text-muted-foreground">{empleado.id}</p>
                        </td>
                        <td className="p-3">
                          <p>{hora(registro?.ingreso, registro?.horaIngreso)}</p>
                          {registro?.ingreso && gps(registro.ingreso) && (
                            <a className="text-xs text-primary underline" href={gps(registro.ingreso)} target="_blank" rel="noreferrer">
                              Ver GPS · ±{Math.round(registro.ingreso.precisionMetros)} m
                            </a>
                          )}
                        </td>
                        <td className="p-3">
                          <p>{hora(registro?.salida, registro?.horaSalida)}</p>
                          {registro?.salida && gps(registro.salida) && (
                            <a className="text-xs text-primary underline" href={gps(registro.salida)} target="_blank" rel="noreferrer">
                              Ver GPS · ±{Math.round(registro.salida.precisionMetros)} m
                            </a>
                          )}
                        </td>
                        <td className="p-3">
                          <span className="rounded-full border border-border px-2 py-1 text-xs">
                            {legacy ? "Histórico sin GPS" :
                              estado === "validada" ? "Validada" :
                              estado === "observada" ? "Observada" :
                              estado === "sin_marcacion" ? "Sin marcación" :
                              completo ? "Pendiente" : "Incompleta"}
                          </span>
                          {registro?.validacion?.observacion && (
                            <p className="mt-1 max-w-[180px] text-xs text-muted-foreground">{registro.validacion.observacion}</p>
                          )}
                        </td>
                        <td className="p-3">
                          {puedeSeleccionar ? (
                            <div className="flex min-w-[210px] flex-col gap-2">
                              <Button size="sm" onClick={() => void validar(registro!, "validada")}>Validar</Button>
                              <Input
                                className="h-8"
                                placeholder="Motivo de observación"
                                value={observaciones[registro!.id] ?? ""}
                                onChange={(e) => setObservaciones((prev) => ({ ...prev, [registro!.id]: e.target.value }))}
                              />
                              <Button size="sm" variant="outline" onClick={() => void validar(registro!, "observada")}>Observar</Button>
                            </div>
                          ) : legacy ? (
                            <span className="text-xs text-muted-foreground">Solo consulta histórica</span>
                          ) : registro ? (
                            <span className="text-xs text-muted-foreground">Pendiente de marcación completa</span>
                          ) : (
                            <span className="text-xs text-muted-foreground">Sin registro</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Los registros antiguos se conservan como históricos, pero no se consideran verificados por GPS. La ubicación es evidencia declarada por el dispositivo y no sustituye una validación presencial o geocerca.
          </p>
        </div>
      )}
    </AppShell>
  );
}
