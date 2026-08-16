import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import {
  ASISTENCIA_INICIAL,
  HORAS_EXTRAS_INICIALES,
  INCAPACIDADES_OP_INICIALES,
  NOVEDADES_INICIALES,
  SOLICITUDES_OP_INICIALES,
} from "@/data/operaciones";
import { calcularAsistencia, consecutivo, diasEntre, horaActual, hoyISO, supervisorDe } from "@/lib/operaciones";
import { empleadoById } from "@/data/organizacion";
import { nombreCompleto } from "@/types/organizacion";
import type {
  HoraExtra,
  IncapacidadOperativa,
  NovedadOperativa,
  PasoFlujo,
  RegistroAsistencia,
  SolicitudOperativa,
  TipoHoraExtra,
  TipoIncapacidadOp,
  TipoNovedad,
  TipoSolicitud,
} from "@/types/operaciones";

/**
 * Estado de los procesos operativos.
 * Solicitudes: Empleado → Jefe → RRHH. Incapacidades: Empleado → RRHH (con
 * notificación al supervisor). Horas extras: Supervisor → Jefe → Nómina.
 * Cada acción genera una novedad en el historial.
 */

interface OperacionesContextValue {
  solicitudes: SolicitudOperativa[];
  incapacidades: IncapacidadOperativa[];
  asistencia: RegistroAsistencia[];
  horasExtras: HoraExtra[];
  novedades: NovedadOperativa[];

  radicarSolicitud: (input: {
    empleadoId: string;
    tipo: TipoSolicitud;
    desde: string;
    hasta: string;
    motivo: string;
    responsable: string;
  }) => void;
  aprobarPorJefe: (id: string, responsable: string, comentario?: string) => void;
  aprobarPorRrhh: (id: string, responsable: string, comentario?: string) => void;
  rechazarSolicitud: (id: string, responsable: string, etapa: "jefe" | "rrhh", comentario?: string) => void;
  modificarFechas: (id: string, desde: string, hasta: string, responsable: string, comentario?: string) => void;
  reprogramarSolicitud: (
    id: string,
    desde: string,
    hasta: string,
    responsable: string,
    comentario?: string,
  ) => void;

  radicarIncapacidad: (input: {
    empleadoId: string;
    tipo: TipoIncapacidadOp;
    desde: string;
    hasta: string;
    entidad: string;
    diagnostico: string;
    soporteAdjunto: boolean;
    responsable: string;
  }) => void;
  validarIncapacidad: (id: string, responsable: string, observacion?: string) => void;
  rechazarIncapacidad: (id: string, responsable: string, observacion?: string) => void;
  transcribirIncapacidad: (id: string, responsable: string) => void;

  registrarMarcacion: (input: {
    empleadoId: string;
    fecha: string;
    campo: "horaIngreso" | "inicioAlmuerzo" | "finAlmuerzo" | "horaSalida";
    valor: string;
    responsable: string;
  }) => void;
  agregarReceso: (empleadoId: string, fecha: string, inicio: string, fin: string, responsable: string) => void;
  marcarAusencia: (empleadoId: string, fecha: string, justificacion: string, responsable: string) => void;

  registrarHoraExtra: (input: {
    empleadoId: string;
    fecha: string;
    tipo: TipoHoraExtra;
    horas: number;
    justificacion: string;
    responsable: string;
  }) => void;
  aprobarHoraExtraJefe: (id: string, responsable: string, comentario?: string) => void;
  liquidarHoraExtra: (id: string, responsable: string, comentario?: string) => void;
  rechazarHoraExtra: (id: string, responsable: string, etapa: "jefe" | "nomina", comentario?: string) => void;
}

const OperacionesContext = createContext<OperacionesContextValue | null>(null);

let seq = 100;
const nextId = (p: string) => `${p}-${Date.now()}-${seq++}`;

export function OperacionesProvider({ children }: { children: ReactNode }) {
  const [solicitudes, setSolicitudes] = useState<SolicitudOperativa[]>(SOLICITUDES_OP_INICIALES);
  const [incapacidades, setIncapacidades] = useState<IncapacidadOperativa[]>(INCAPACIDADES_OP_INICIALES);
  const [asistencia, setAsistencia] = useState<RegistroAsistencia[]>(ASISTENCIA_INICIAL);
  const [horasExtras, setHorasExtras] = useState<HoraExtra[]>(HORAS_EXTRAS_INICIALES);
  const [novedades, setNovedades] = useState<NovedadOperativa[]>(NOVEDADES_INICIALES);

  const registrarNovedad = useCallback(
    (n: Omit<NovedadOperativa, "id" | "fecha" | "hora">) => {
      setNovedades((prev) => [{ ...n, id: nextId("nov"), fecha: hoyISO(), hora: horaActual() }, ...prev]);
    },
    [],
  );

  const paso = (
    etapa: PasoFlujo["etapa"],
    accion: PasoFlujo["accion"],
    responsable: string,
    comentario?: string,
  ): PasoFlujo => ({ etapa, accion, responsable, fecha: hoyISO(), comentario });

  /* ----------------------------- Solicitudes ----------------------------- */

  const radicarSolicitud = useCallback<OperacionesContextValue["radicarSolicitud"]>(
    ({ empleadoId, tipo, desde, hasta, motivo, responsable }) => {
      const cons = consecutivo("SOL", solicitudes.length + 1);
      setSolicitudes((prev) => [
        {
          id: nextId("sop"),
          consecutivo: cons,
          empleadoId,
          tipo,
          desde,
          hasta,
          dias: diasEntre(desde, hasta),
          motivo,
          estado: "pendiente_jefe",
          fechaRadicacion: hoyISO(),
          flujo: [paso("empleado", "radicada", responsable)],
        },
        ...prev,
      ]);
      registrarNovedad({
        empleadoId,
        tipo: "solicitud",
        titulo: "Solicitud radicada",
        detalle: `${tipo} · ${desde} a ${hasta} (${diasEntre(desde, hasta)} días)`,
        etapa: "empleado",
        responsable,
        referencia: cons,
      });
    },
    [registrarNovedad, solicitudes.length],
  );

  const mutarSolicitud = useCallback(
    (
      id: string,
      cambios: (s: SolicitudOperativa) => SolicitudOperativa,
      novedad: (s: SolicitudOperativa) => Omit<NovedadOperativa, "id" | "fecha" | "hora">,
    ) => {
      setSolicitudes((prev) => {
        const actual = prev.find((s) => s.id === id);
        if (actual) registrarNovedad(novedad(actual));
        return prev.map((s) => (s.id === id ? cambios(s) : s));
      });
    },
    [registrarNovedad],
  );

  const aprobarPorJefe = useCallback<OperacionesContextValue["aprobarPorJefe"]>(
    (id, responsable, comentario) =>
      mutarSolicitud(
        id,
        (s) => ({
          ...s,
          estado: "pendiente_rrhh",
          flujo: [...s.flujo, paso("jefe", "aprobada", responsable, comentario)],
        }),
        (s) => ({
          empleadoId: s.empleadoId,
          tipo: "solicitud",
          titulo: "Aprobada por jefe inmediato",
          detalle: `${s.consecutivo} pasa a revisión de Recursos Humanos`,
          etapa: "jefe",
          responsable,
          referencia: s.consecutivo,
        }),
      ),
    [mutarSolicitud],
  );

  const aprobarPorRrhh = useCallback<OperacionesContextValue["aprobarPorRrhh"]>(
    (id, responsable, comentario) =>
      mutarSolicitud(
        id,
        (s) => ({
          ...s,
          estado: "aprobada",
          flujo: [...s.flujo, paso("rrhh", "aprobada", responsable, comentario)],
        }),
        (s) => ({
          empleadoId: s.empleadoId,
          tipo: "solicitud",
          titulo: "Aprobada por Recursos Humanos",
          detalle: `${s.consecutivo} · ${s.desde} a ${s.hasta}`,
          etapa: "rrhh",
          responsable,
          referencia: s.consecutivo,
        }),
      ),
    [mutarSolicitud],
  );

  const rechazarSolicitud = useCallback<OperacionesContextValue["rechazarSolicitud"]>(
    (id, responsable, etapa, comentario) =>
      mutarSolicitud(
        id,
        (s) => ({
          ...s,
          estado: "rechazada",
          flujo: [...s.flujo, paso(etapa, "rechazada", responsable, comentario)],
        }),
        (s) => ({
          empleadoId: s.empleadoId,
          tipo: "solicitud",
          titulo: etapa === "jefe" ? "Rechazada por jefe inmediato" : "Rechazada por Recursos Humanos",
          detalle: comentario ?? `${s.consecutivo} sin justificación registrada`,
          etapa,
          responsable,
          referencia: s.consecutivo,
        }),
      ),
    [mutarSolicitud],
  );

  const modificarFechas = useCallback<OperacionesContextValue["modificarFechas"]>(
    (id, desde, hasta, responsable, comentario) =>
      mutarSolicitud(
        id,
        (s) => ({
          ...s,
          desdeOriginal: s.desdeOriginal ?? s.desde,
          hastaOriginal: s.hastaOriginal ?? s.hasta,
          desde,
          hasta,
          dias: diasEntre(desde, hasta),
          flujo: [...s.flujo, paso("rrhh", "fechas_modificadas", responsable, comentario)],
        }),
        (s) => ({
          empleadoId: s.empleadoId,
          tipo: "solicitud",
          titulo: "Fechas modificadas por RRHH",
          detalle: `${s.desde} → ${desde} · ${s.hasta} → ${hasta}`,
          etapa: "rrhh",
          responsable,
          referencia: s.consecutivo,
        }),
      ),
    [mutarSolicitud],
  );

  const reprogramarSolicitud = useCallback<OperacionesContextValue["reprogramarSolicitud"]>(
    (id, desde, hasta, responsable, comentario) =>
      mutarSolicitud(
        id,
        (s) => ({
          ...s,
          desdeOriginal: s.desdeOriginal ?? s.desde,
          hastaOriginal: s.hastaOriginal ?? s.hasta,
          desde,
          hasta,
          dias: diasEntre(desde, hasta),
          estado: "reprogramada",
          flujo: [...s.flujo, paso("rrhh", "reprogramada", responsable, comentario)],
        }),
        (s) => ({
          empleadoId: s.empleadoId,
          tipo: "solicitud",
          titulo: "Solicitud reprogramada por RRHH",
          detalle: `Nuevo periodo ${desde} a ${hasta}${comentario ? ` · ${comentario}` : ""}`,
          etapa: "rrhh",
          responsable,
          referencia: s.consecutivo,
        }),
      ),
    [mutarSolicitud],
  );

  /* ---------------------------- Incapacidades ---------------------------- */

  const radicarIncapacidad = useCallback<OperacionesContextValue["radicarIncapacidad"]>(
    ({ empleadoId, tipo, desde, hasta, entidad, diagnostico, soporteAdjunto, responsable }) => {
      const cons = consecutivo("INC", incapacidades.length + 1);
      const supervisorId = supervisorDe(empleadoId);
      const supervisor = supervisorId ? empleadoById(supervisorId) : undefined;
      const nombreSupervisor = supervisor ? `${nombreCompleto(supervisor)} (Supervisor)` : "Supervisor no asignado";
      setIncapacidades((prev) => [
        {
          id: nextId("inc"),
          consecutivo: cons,
          empleadoId,
          tipo,
          desde,
          hasta,
          dias: diasEntre(desde, hasta),
          entidad,
          diagnostico,
          soporteAdjunto,
          estado: "radicada",
          fechaRadicacion: hoyISO(),
          supervisorNotificadoId: supervisorId,
          flujo: [
            paso("empleado", "radicada", responsable),
            paso("jefe", "notificada", nombreSupervisor, "Notificación automática al supervisor del empleado"),
          ],
        },
        ...prev,
      ]);
      registrarNovedad({
        empleadoId,
        tipo: "incapacidad",
        titulo: "Incapacidad radicada ante RRHH",
        detalle: `${diagnostico} · ${diasEntre(desde, hasta)} días · ${entidad}`,
        etapa: "empleado",
        responsable,
        referencia: cons,
      });
      registrarNovedad({
        empleadoId,
        tipo: "notificacion",
        titulo: "Supervisor notificado de incapacidad",
        detalle: `${nombreSupervisor} recibió la notificación de ${cons}`,
        etapa: "jefe",
        responsable: nombreSupervisor,
        referencia: cons,
      });
    },
    [incapacidades.length, registrarNovedad],
  );

  const mutarIncapacidad = useCallback(
    (
      id: string,
      cambios: (i: IncapacidadOperativa) => IncapacidadOperativa,
      novedad: (i: IncapacidadOperativa) => Omit<NovedadOperativa, "id" | "fecha" | "hora">,
    ) => {
      setIncapacidades((prev) => {
        const actual = prev.find((i) => i.id === id);
        if (actual) registrarNovedad(novedad(actual));
        return prev.map((i) => (i.id === id ? cambios(i) : i));
      });
    },
    [registrarNovedad],
  );

  const validarIncapacidad = useCallback<OperacionesContextValue["validarIncapacidad"]>(
    (id, responsable, observacion) =>
      mutarIncapacidad(
        id,
        (i) => ({
          ...i,
          estado: "validada",
          observacionRrhh: observacion ?? i.observacionRrhh,
          flujo: [...i.flujo, paso("rrhh", "aprobada", responsable, observacion)],
        }),
        (i) => ({
          empleadoId: i.empleadoId,
          tipo: "incapacidad",
          titulo: "Incapacidad validada por RRHH",
          detalle: `${i.consecutivo} · ${i.dias} días · ${i.entidad}`,
          etapa: "rrhh",
          responsable,
          referencia: i.consecutivo,
        }),
      ),
    [mutarIncapacidad],
  );

  const rechazarIncapacidad = useCallback<OperacionesContextValue["rechazarIncapacidad"]>(
    (id, responsable, observacion) =>
      mutarIncapacidad(
        id,
        (i) => ({
          ...i,
          estado: "rechazada",
          observacionRrhh: observacion ?? i.observacionRrhh,
          flujo: [...i.flujo, paso("rrhh", "rechazada", responsable, observacion)],
        }),
        (i) => ({
          empleadoId: i.empleadoId,
          tipo: "incapacidad",
          titulo: "Incapacidad rechazada por RRHH",
          detalle: observacion ?? `${i.consecutivo} sin soporte válido`,
          etapa: "rrhh",
          responsable,
          referencia: i.consecutivo,
        }),
      ),
    [mutarIncapacidad],
  );

  const transcribirIncapacidad = useCallback<OperacionesContextValue["transcribirIncapacidad"]>(
    (id, responsable) =>
      mutarIncapacidad(
        id,
        (i) => ({
          ...i,
          estado: "en_transcripcion",
          flujo: [...i.flujo, paso("rrhh", "aprobada", responsable, "Enviada a transcripción ante la entidad")],
        }),
        (i) => ({
          empleadoId: i.empleadoId,
          tipo: "incapacidad",
          titulo: "Incapacidad en transcripción",
          detalle: `${i.consecutivo} radicada ante ${i.entidad}`,
          etapa: "rrhh",
          responsable,
          referencia: i.consecutivo,
        }),
      ),
    [mutarIncapacidad],
  );

  /* --------------------------- Control asistencia --------------------------- */

  const upsertAsistencia = useCallback(
    (
      empleadoId: string,
      fecha: string,
      responsable: string,
      cambios: (r: RegistroAsistencia) => RegistroAsistencia,
    ) => {
      setAsistencia((prev) => {
        const existe = prev.find((r) => r.empleadoId === empleadoId && r.fecha === fecha);
        if (existe) return prev.map((r) => (r === existe ? cambios(r) : r));
        const base: RegistroAsistencia = {
          id: nextId("as"),
          empleadoId,
          fecha,
          recesos: [],
          ausente: false,
          registradoPor: responsable,
        };
        return [cambios(base), ...prev];
      });
    },
    [],
  );

  const registrarMarcacion = useCallback<OperacionesContextValue["registrarMarcacion"]>(
    ({ empleadoId, fecha, campo, valor, responsable }) => {
      upsertAsistencia(empleadoId, fecha, responsable, (r) => {
        const actualizado = { ...r, [campo]: valor, ausente: false, registradoPor: responsable };
        return actualizado;
      });
      const etiqueta: Record<typeof campo, string> = {
        horaIngreso: "Hora de ingreso",
        inicioAlmuerzo: "Inicio de almuerzo",
        finAlmuerzo: "Fin de almuerzo",
        horaSalida: "Hora de salida",
      };
      registrarNovedad({
        empleadoId,
        tipo: "asistencia",
        titulo: `${etiqueta[campo]} registrada`,
        detalle: `${fecha} · ${valor}`,
        etapa: "jefe",
        responsable,
        referencia: `AS-${fecha}`,
      });
    },
    [registrarNovedad, upsertAsistencia],
  );

  const agregarReceso = useCallback<OperacionesContextValue["agregarReceso"]>(
    (empleadoId, fecha, inicio, fin, responsable) => {
      upsertAsistencia(empleadoId, fecha, responsable, (r) => ({
        ...r,
        recesos: [...r.recesos, { inicio, fin }],
        registradoPor: responsable,
      }));
      registrarNovedad({
        empleadoId,
        tipo: "asistencia",
        titulo: "Receso registrado",
        detalle: `${fecha} · ${inicio} a ${fin}`,
        etapa: "jefe",
        responsable,
        referencia: `AS-${fecha}`,
      });
    },
    [registrarNovedad, upsertAsistencia],
  );

  const marcarAusencia = useCallback<OperacionesContextValue["marcarAusencia"]>(
    (empleadoId, fecha, justificacion, responsable) => {
      upsertAsistencia(empleadoId, fecha, responsable, (r) => ({
        ...r,
        ausente: true,
        horaIngreso: undefined,
        inicioAlmuerzo: undefined,
        finAlmuerzo: undefined,
        horaSalida: undefined,
        recesos: [],
        justificacion,
        registradoPor: responsable,
      }));
      registrarNovedad({
        empleadoId,
        tipo: "asistencia",
        titulo: "Ausencia registrada",
        detalle: `${fecha} · ${justificacion || "Sin justificación"}`,
        etapa: "jefe",
        responsable,
        referencia: `AS-${fecha}`,
      });
    },
    [registrarNovedad, upsertAsistencia],
  );

  /* ------------------------------ Horas extras ----------------------------- */

  const registrarHoraExtra = useCallback<OperacionesContextValue["registrarHoraExtra"]>(
    ({ empleadoId, fecha, tipo, horas, justificacion, responsable }) => {
      const cons = consecutivo("HE", horasExtras.length + 1);
      setHorasExtras((prev) => [
        {
          id: nextId("he"),
          consecutivo: cons,
          empleadoId,
          fecha,
          tipo,
          horas,
          justificacion,
          registradoPor: responsable,
          estado: "pendiente_jefe",
          flujo: [paso("empleado", "radicada", responsable, "Registro operativo del supervisor")],
        },
        ...prev,
      ]);
      registrarNovedad({
        empleadoId,
        tipo: "hora_extra",
        titulo: "Horas extras registradas por supervisor",
        detalle: `${horas} h · ${fecha} · ${justificacion}`,
        etapa: "jefe",
        responsable,
        referencia: cons,
      });
    },
    [horasExtras.length, registrarNovedad],
  );

  const mutarHoraExtra = useCallback(
    (
      id: string,
      cambios: (h: HoraExtra) => HoraExtra,
      novedad: (h: HoraExtra) => Omit<NovedadOperativa, "id" | "fecha" | "hora">,
    ) => {
      setHorasExtras((prev) => {
        const actual = prev.find((h) => h.id === id);
        if (actual) registrarNovedad(novedad(actual));
        return prev.map((h) => (h.id === id ? cambios(h) : h));
      });
    },
    [registrarNovedad],
  );

  const aprobarHoraExtraJefe = useCallback<OperacionesContextValue["aprobarHoraExtraJefe"]>(
    (id, responsable, comentario) =>
      mutarHoraExtra(
        id,
        (h) => ({
          ...h,
          estado: "pendiente_nomina",
          flujo: [...h.flujo, paso("jefe", "aprobada", responsable, comentario)],
        }),
        (h) => ({
          empleadoId: h.empleadoId,
          tipo: "hora_extra",
          titulo: "Horas extras aprobadas por jefe",
          detalle: `${h.consecutivo} pasa a Nómina para liquidación`,
          etapa: "jefe",
          responsable,
          referencia: h.consecutivo,
        }),
      ),
    [mutarHoraExtra],
  );

  const liquidarHoraExtra = useCallback<OperacionesContextValue["liquidarHoraExtra"]>(
    (id, responsable, comentario) =>
      mutarHoraExtra(
        id,
        (h) => ({
          ...h,
          estado: "liquidada",
          flujo: [...h.flujo, paso("nomina", "aprobada", responsable, comentario)],
        }),
        (h) => ({
          empleadoId: h.empleadoId,
          tipo: "hora_extra",
          titulo: "Horas extras liquidadas en nómina",
          detalle: `${h.horas} h · ${h.consecutivo}`,
          etapa: "nomina",
          responsable,
          referencia: h.consecutivo,
        }),
      ),
    [mutarHoraExtra],
  );

  const rechazarHoraExtra = useCallback<OperacionesContextValue["rechazarHoraExtra"]>(
    (id, responsable, etapa, comentario) =>
      mutarHoraExtra(
        id,
        (h) => ({
          ...h,
          estado: "rechazada",
          flujo: [...h.flujo, paso(etapa, "rechazada", responsable, comentario)],
        }),
        (h) => ({
          empleadoId: h.empleadoId,
          tipo: "hora_extra",
          titulo: etapa === "jefe" ? "Horas extras rechazadas por jefe" : "Horas extras rechazadas por Nómina",
          detalle: comentario ?? `${h.consecutivo} sin justificación suficiente`,
          etapa,
          responsable,
          referencia: h.consecutivo,
        }),
      ),
    [mutarHoraExtra],
  );

  const value = useMemo<OperacionesContextValue>(
    () => ({
      solicitudes,
      incapacidades,
      asistencia,
      horasExtras,
      novedades,
      radicarSolicitud,
      aprobarPorJefe,
      aprobarPorRrhh,
      rechazarSolicitud,
      modificarFechas,
      reprogramarSolicitud,
      radicarIncapacidad,
      validarIncapacidad,
      rechazarIncapacidad,
      transcribirIncapacidad,
      registrarMarcacion,
      agregarReceso,
      marcarAusencia,
      registrarHoraExtra,
      aprobarHoraExtraJefe,
      liquidarHoraExtra,
      rechazarHoraExtra,
    }),
    [
      solicitudes,
      incapacidades,
      asistencia,
      horasExtras,
      novedades,
      radicarSolicitud,
      aprobarPorJefe,
      aprobarPorRrhh,
      rechazarSolicitud,
      modificarFechas,
      reprogramarSolicitud,
      radicarIncapacidad,
      validarIncapacidad,
      rechazarIncapacidad,
      transcribirIncapacidad,
      registrarMarcacion,
      agregarReceso,
      marcarAusencia,
      registrarHoraExtra,
      aprobarHoraExtraJefe,
      liquidarHoraExtra,
      rechazarHoraExtra,
    ],
  );

  return <OperacionesContext.Provider value={value}>{children}</OperacionesContext.Provider>;
}

export function useOperaciones() {
  const ctx = useContext(OperacionesContext);
  if (!ctx) throw new Error("useOperaciones debe usarse dentro de OperacionesProvider");
  return ctx;
}

export { calcularAsistencia };
export type { TipoNovedad };
