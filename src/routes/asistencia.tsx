/**
 * Control diario de asistencia: consulta individual/masiva y validación jerárquica.
 * Las horas y coordenadas originales son de solo lectura; el empleado marca desde su portal.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { collection, doc, getDoc, onSnapshot, query, serverTimestamp, setDoc, updateDoc, where, writeBatch } from "firebase/firestore";
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
import { esVinculado } from "@/lib/rrhh";
import { downloadCsv } from "@/lib/export";
import { JORNADA } from "@/types/operaciones";

type PuntoMarcacion = {
  latitud: number;
  longitud: number;
  precisionMetros: number;
  marcadoEn?: { toDate: () => Date };
  origen?: "empleado" | "supervisor";
  registradoPorUid?: string;
  registradoPor?: string;
};

type PersonaAsistencia = { id: string; nombre: string };

type RegistroDia = {
  id: string;
  empleadoId: string;
  fecha: string;
  ingreso?: PuntoMarcacion;
  salida?: PuntoMarcacion;
  validacion?: {
    estado: "pendiente" | "pendiente_rrhh" | "validada" | "observada";
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

const obtenerGps = (): Promise<{ latitud: number; longitud: number; precisionMetros: number }> =>
  new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Este dispositivo o navegador no permite obtener ubicación GPS."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) =>
        resolve({
          latitud: coords.latitude,
          longitud: coords.longitude,
          precisionMetros: coords.accuracy,
        }),
      (error) => {
        const mensaje =
          error.code === error.PERMISSION_DENIED
            ? "Debes permitir el acceso a la ubicación para registrar asistencia."
            : error.code === error.TIMEOUT
              ? "No fue posible obtener GPS a tiempo. Intenta nuevamente en un lugar abierto."
              : "No se pudo obtener la ubicación GPS.";
        reject(new Error(mensaje));
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
    );
  });

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
  const subordinados = useMemo(
    () => [...new Set(perfil?.subordinadosIds ?? [])].filter(Boolean),
    [perfil?.subordinadosIds],
  );

  const [fecha, setFecha] = useState(fechaBogota);
  const [busqueda, setBusqueda] = useState("");
  const [registros, setRegistros] = useState<RegistroDia[]>([]);
  const [cargando, setCargando] = useState(true);
  const [seleccionados, setSeleccionados] = useState<string[]>([]);
  const [observaciones, setObservaciones] = useState<Record<string, string>>({});
  const [empleadoManualId, setEmpleadoManualId] = useState("");
  const [marcandoManual, setMarcandoManual] = useState(false);

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
  }, [fecha, puedeConsultar, esRrhh, subordinados]);

  const personal = useMemo<PersonaAsistencia[]>(() => {
    const nombres = new Map(
      empleados.filter(esVinculado).map((empleado) => [empleado.id, `${empleado.nombres} ${empleado.apellidos}`.trim()]),
    );
    const ids = esRrhh ? empleados.filter(esVinculado).map((empleado) => empleado.id) : subordinados;
    return [...new Set(ids)].map((id) => ({ id, nombre: nombres.get(id) || id }));
  }, [empleados, esRrhh, subordinados]);
  const registrosPorEmpleado = useMemo(
    () => new Map(registros.map((r) => [r.empleadoId, r])),
    [registros],
  );
  const filas = useMemo(
    () =>
      personal
        .filter((e) => {
          const texto = `${e.nombre} ${e.id}`.toLowerCase();
          return texto.includes(busqueda.trim().toLowerCase());
        })
        .map((empleado) => ({ empleado, registro: registrosPorEmpleado.get(empleado.id) })),
    [personal, registrosPorEmpleado, busqueda],
  );

  const pendientes = registros.filter((r) => ["pendiente", "pendiente_rrhh"].includes(r.validacion?.estado ?? "pendiente"));
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
      const lote = writeBatch(db);
      lote.update(doc(db, "op_asistencia", registro.id), {
        validacion: { estado, usuarioUid: uid, fecha: serverTimestamp(), observacion },
      });
      await lote.commit();
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
        (esRrhh
          ? ["pendiente", "pendiente_rrhh"].includes(r.validacion?.estado ?? "pendiente")
          : (r.validacion?.estado ?? "pendiente") === "pendiente"
            && r.ingreso?.origen === "empleado"
            && r.salida?.origen === "empleado"),
    );
    if (!elegibles.length) {
      toast.error("Selecciona registros completos que estén pendientes de validación.");
      return;
    }
    if (elegibles.length > 450) {
      toast.error("Valida máximo 450 registros por lote y divide los demás en otro grupo.");
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
      ["Empleado", "ID", "Fecha", "Ingreso", "Salida", "GPS ingreso", "GPS salida", "Precisión ingreso (m)", "Precisión salida (m)", "Origen ingreso", "Registró ingreso", "Origen salida", "Registró salida", "Estado", "Observación"],
      filas.map(({ empleado, registro }) => [
        empleado.nombre,
        empleado.id,
        fecha,
        hora(registro?.ingreso, registro?.horaIngreso),
        hora(registro?.salida, registro?.horaSalida),
        registro?.ingreso ? `${registro.ingreso.latitud},${registro.ingreso.longitud}` : "",
        registro?.salida ? `${registro.salida.latitud},${registro.salida.longitud}` : "",
        registro?.ingreso?.precisionMetros ?? "",
        registro?.salida?.precisionMetros ?? "",
        registro?.ingreso?.origen ?? "Histórico",
        registro?.ingreso?.registradoPor ?? "",
        registro?.salida?.origen ?? "Histórico",
        registro?.salida?.registradoPor ?? "",
        registro?.validacion?.estado ?? (registro ? "Pendiente" : "Sin marcación"),
        registro?.validacion?.observacion ?? registro?.justificacion ?? "",
      ]),
    );

  const alternarSeleccion = (id: string, activo: boolean) =>
    setSeleccionados((prev) => activo ? [...new Set([...prev, id])] : prev.filter((x) => x !== id));

  const registrarManual = async (tipo: "ingreso" | "salida") => {
    const empleadoId = empleadoManualId || personal[0]?.id || "";
    const uid = perfil?.id;
    if (!uid || !empleadoId || !esMando || marcandoManual) return;

    setMarcandoManual(true);
    try {
      const ubicacion = await obtenerGps();
      const actor = `${perfil?.nombres ?? ""} ${perfil?.apellidos ?? ""}`.trim() || "Supervisor";
      const punto = {
        ...ubicacion,
        marcadoEn: serverTimestamp(),
        origen: "supervisor" as const,
        registradoPorUid: uid,
        registradoPor: actor,
      };
      const id = `${empleadoId}_${fecha}`;
      const referencia = doc(db, "op_asistencia", id);
      const actual = await getDoc(referencia);

      if (!actual.exists()) {
        if (tipo === "salida") {
          throw new Error("Primero debe existir un ingreso. Registra el ingreso antes de la salida.");
        }
        await setDoc(referencia, {
          id,
          empleadoId,
          fecha,
          ingreso: punto,
          validacion: { estado: "pendiente_rrhh" },
        });
      } else {
        const datos = actual.data() as RegistroDia;
        if (datos[tipo]) {
          throw new Error(`El ${tipo} ya está registrado para este empleado y fecha.`);
        }
        if (!datos.ingreso) {
          throw new Error("El registro existente es histórico o no tiene ingreso GPS. Solicita revisión a Talento Humano.");
        }
        if (datos.validacion?.estado === "validada" || datos.validacion?.estado === "observada") {
          throw new Error("La asistencia ya fue cerrada por validación. Solicita una corrección a Talento Humano.");
        }
        await updateDoc(referencia, {
          [tipo]: punto,
          validacion: { estado: "pendiente_rrhh" },
        });
      }

      toast.success(
        `${tipo === "ingreso" ? "Ingreso" : "Salida"} registrada por supervisor. Quedó pendiente de Talento Humano.`,
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No fue posible registrar la marcación.");
    } finally {
      setMarcandoManual(false);
    }
  };

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

      {esMando && (
        <section className="space-y-3 rounded-lg border border-border bg-card p-4">
          <div>
            <h2 className="font-semibold text-foreground">Registrar ingreso o salida por un empleado</h2>
            <p className="text-sm text-muted-foreground">
              Usa esta opción cuando el empleado no pueda marcar desde su cuenta. Se guardará el GPS del dispositivo del supervisor, quién realizó el registro y la hora oficial del servidor. Estas marcas solo las puede validar Talento Humano.
            </p>
          </div>
          {personal.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay subordinados asignados a tu perfil.</p>
          ) : (
            <div className="flex flex-wrap items-end gap-2">
              <label className="min-w-56 flex-1 text-sm">
                Empleado
                <select
                  className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3"
                  value={empleadoManualId || personal[0]?.id || ""}
                  onChange={(e) => setEmpleadoManualId(e.target.value)}
                >
                  {personal.map((persona) => (
                    <option key={persona.id} value={persona.id}>{persona.nombre}</option>
                  ))}
                </select>
              </label>
              <Button disabled={marcandoManual} onClick={() => void registrarManual("ingreso")}>
                Registrar ingreso
              </Button>
              <Button variant="outline" disabled={marcandoManual} onClick={() => void registrarManual("salida")}>
                Registrar salida
              </Button>
            </div>
          )}
        </section>
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
                    const puedeSeleccionar = !!registro?.ingreso && !!registro.salida && (
                      esRrhh
                        ? estado === "pendiente" || estado === "pendiente_rrhh"
                        : estado === "pendiente"
                          && registro.ingreso.origen === "empleado"
                          && registro.salida.origen === "empleado"
                    );
                    return (
                      <tr key={empleado.id} className="border-t border-border align-top">
                        <td className="p-3">
                          <input
                            aria-label={`Seleccionar ${empleado.nombre}`}
                            type="checkbox"
                            checked={!!registro && seleccionados.includes(registro.id)}
                            disabled={!puedeSeleccionar}
                            onChange={(e) => registro && alternarSeleccion(registro.id, e.target.checked)}
                          />
                        </td>
                        <td className="p-3">
                          <p className="font-medium text-foreground">{empleado.nombre}</p>
                          <p className="text-xs text-muted-foreground">{empleado.id}</p>
                        </td>
                        <td className="p-3">
                          <p>{hora(registro?.ingreso, registro?.horaIngreso)}</p>
                          {registro?.ingreso && gps(registro.ingreso) && (
                            <a className="text-xs text-primary underline" href={gps(registro.ingreso)} target="_blank" rel="noreferrer">
                              Ver GPS · ±{Math.round(registro.ingreso.precisionMetros)} m
                            </a>
                          )}
                          {registro?.ingreso?.origen === "supervisor" && (
                            <p className="text-xs text-muted-foreground">Registró supervisor: {registro.ingreso.registradoPor ?? "No identificado"}</p>
                          )}
                        </td>
                        <td className="p-3">
                          <p>{hora(registro?.salida, registro?.horaSalida)}</p>
                          {registro?.salida && gps(registro.salida) && (
                            <a className="text-xs text-primary underline" href={gps(registro.salida)} target="_blank" rel="noreferrer">
                              Ver GPS · ±{Math.round(registro.salida.precisionMetros)} m
                            </a>
                          )}
                          {registro?.salida?.origen === "supervisor" && (
                            <p className="text-xs text-muted-foreground">Registró supervisor: {registro.salida.registradoPor ?? "No identificado"}</p>
                          )}
                        </td>
                        <td className="p-3">
                          <span className="rounded-full border border-border px-2 py-1 text-xs">
                            {legacy ? "Histórico sin GPS" :
                              estado === "validada" ? "Validada" :
                              estado === "observada" ? "Observada" :
                              estado === "pendiente_rrhh" ? "Pendiente Talento Humano" :
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
                          ) : registro && estado === "pendiente_rrhh" ? (
                            <span className="text-xs text-muted-foreground">Pendiente de validación por Talento Humano</span>
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
