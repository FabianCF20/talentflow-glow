/**
 * Procesos operativos de SIGTH: solicitudes (vacaciones, permisos, licencias,
 * actualización de datos), incapacidades, control de asistencia, horas extras
 * y el historial completo de novedades.
 * Ningún registro se elimina: todo evento queda en el historial de novedades.
 */

/* ------------------------------- Solicitudes ------------------------------- */

export type TipoSolicitud = "vacaciones" | "permiso" | "licencia" | "actualizacion_datos";

export const TIPO_SOLICITUD_LABEL: Record<TipoSolicitud, string> = {
  vacaciones: "Vacaciones",
  permiso: "Permiso",
  licencia: "Licencia",
  actualizacion_datos: "Actualización de datos",
};

export const TIPOS_SOLICITUD = Object.keys(TIPO_SOLICITUD_LABEL) as TipoSolicitud[];

/** Flujo: Empleado → Jefe → RRHH. */
export type EtapaFlujo = "empleado" | "jefe" | "rrhh" | "nomina";

export const ETAPA_LABEL: Record<EtapaFlujo, string> = {
  empleado: "Empleado",
  jefe: "Jefe inmediato",
  rrhh: "Recursos Humanos",
  nomina: "Nómina",
};

export type EstadoSolicitudOperativa =
  | "pendiente_jefe"
  | "pendiente_rrhh"
  | "aprobada"
  | "rechazada"
  | "reprogramada";

export const ESTADO_SOLICITUD_OP_LABEL: Record<EstadoSolicitudOperativa, string> = {
  pendiente_jefe: "Pendiente jefe inmediato",
  pendiente_rrhh: "Pendiente Recursos Humanos",
  aprobada: "Aprobada",
  rechazada: "Rechazada",
  reprogramada: "Reprogramada",
};

export interface PasoFlujo {
  etapa: EtapaFlujo;
  accion: "radicada" | "aprobada" | "rechazada" | "fechas_modificadas" | "reprogramada" | "notificada";
  responsable: string;
  fecha: string;
  comentario?: string;
}

export interface SolicitudOperativa {
  id: string;
  consecutivo: string;
  empleadoId: string;
  tipo: TipoSolicitud;
  desde: string;
  hasta: string;
  dias: number;
  motivo: string;
  estado: EstadoSolicitudOperativa;
  fechaRadicacion: string;
  /** Fechas originales cuando RRHH modifica o reprograma. */
  desdeOriginal?: string;
  hastaOriginal?: string;
  flujo: PasoFlujo[];
}

/* ------------------------------ Incapacidades ------------------------------ */

/** Flujo Empleado → RRHH, con notificación automática al supervisor. */
export type TipoIncapacidadOp =
  | "enfermedad_general"
  | "accidente_trabajo"
  | "accidente_transito"
  | "licencia_maternidad"
  | "licencia_paternidad";

export const TIPO_INCAPACIDAD_OP_LABEL: Record<TipoIncapacidadOp, string> = {
  enfermedad_general: "Enfermedad general",
  accidente_trabajo: "Accidente de trabajo",
  accidente_transito: "Accidente de tránsito",
  licencia_maternidad: "Licencia de maternidad",
  licencia_paternidad: "Licencia de paternidad",
};

export type EstadoIncapacidadOp = "radicada" | "validada" | "rechazada" | "en_transcripcion" | "pagada";

export const ESTADO_INCAPACIDAD_OP_LABEL: Record<EstadoIncapacidadOp, string> = {
  radicada: "Radicada por el empleado",
  validada: "Validada por RRHH",
  rechazada: "Rechazada",
  en_transcripcion: "En transcripción ante la entidad",
  pagada: "Pagada",
};

export interface IncapacidadOperativa {
  id: string;
  consecutivo: string;
  empleadoId: string;
  tipo: TipoIncapacidadOp;
  desde: string;
  hasta: string;
  dias: number;
  entidad: string;
  diagnostico: string;
  soporteAdjunto: boolean;
  estado: EstadoIncapacidadOp;
  fechaRadicacion: string;
  supervisorNotificadoId?: string;
  observacionRrhh?: string;
  flujo: PasoFlujo[];
}

/* --------------------------- Control de asistencia -------------------------- */

export interface Receso {
  inicio: string;
  fin: string;
}

/** Marcaciones diarias registradas por el supervisor. */
export interface RegistroAsistencia {
  id: string;
  empleadoId: string;
  fecha: string;
  horaIngreso?: string;
  inicioAlmuerzo?: string;
  finAlmuerzo?: string;
  recesos: Receso[];
  horaSalida?: string;
  /** Ausencia registrada explícitamente por el supervisor. */
  ausente: boolean;
  justificacion?: string;
  registradoPor: string;
}

export interface CalculoAsistencia {
  minutosTrabajados: number;
  minutosAlmuerzo: number;
  minutosRecesos: number;
  minutosTardanza: number;
  ausencia: boolean;
  incompleto: boolean;
}

/** Jornada estándar de la empresa (parámetro operativo). */
export const JORNADA = {
  horaEntrada: "08:00",
  horaSalida: "17:00",
  toleranciaMinutos: 5,
  minutosJornada: 480,
};

/* -------------------------------- Horas extras ------------------------------ */

/** Flujo: Supervisor → Jefe → Nómina. */
export type TipoHoraExtra =
  | "diurna"
  | "nocturna"
  | "dominical_diurna"
  | "dominical_nocturna"
  | "recargo_nocturno";

export const TIPO_HORA_EXTRA_LABEL: Record<TipoHoraExtra, string> = {
  diurna: "Extra diurna (25%)",
  nocturna: "Extra nocturna (75%)",
  dominical_diurna: "Dominical/festiva diurna (100%)",
  dominical_nocturna: "Dominical/festiva nocturna (150%)",
  recargo_nocturno: "Recargo nocturno (35%)",
};

export const RECARGO_HORA_EXTRA: Record<TipoHoraExtra, number> = {
  diurna: 0.25,
  nocturna: 0.75,
  dominical_diurna: 1,
  dominical_nocturna: 1.5,
  recargo_nocturno: 0.35,
};

export type EstadoHoraExtra =
  | "pendiente_jefe"
  | "pendiente_nomina"
  | "liquidada"
  | "rechazada";

export const ESTADO_HORA_EXTRA_LABEL: Record<EstadoHoraExtra, string> = {
  pendiente_jefe: "Pendiente jefe inmediato",
  pendiente_nomina: "Pendiente Nómina",
  liquidada: "Liquidada en nómina",
  rechazada: "Rechazada",
};

export interface HoraExtra {
  id: string;
  consecutivo: string;
  empleadoId: string;
  fecha: string;
  tipo: TipoHoraExtra;
  horas: number;
  justificacion: string;
  registradoPor: string;
  estado: EstadoHoraExtra;
  flujo: PasoFlujo[];
}

/* ---------------------------- Historial de novedades ------------------------ */

export type TipoNovedad =
  | "solicitud"
  | "incapacidad"
  | "asistencia"
  | "hora_extra"
  | "notificacion";

export const TIPO_NOVEDAD_LABEL: Record<TipoNovedad, string> = {
  solicitud: "Solicitud",
  incapacidad: "Incapacidad",
  asistencia: "Asistencia",
  hora_extra: "Hora extra",
  notificacion: "Notificación",
};

export interface NovedadOperativa {
  id: string;
  empleadoId: string;
  tipo: TipoNovedad;
  fecha: string;
  hora: string;
  titulo: string;
  detalle: string;
  etapa: EtapaFlujo;
  responsable: string;
  referencia: string;
}
