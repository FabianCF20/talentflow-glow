import type { RecordStatus, RoleKey } from "./entities";
import type { AsignacionFormulario, CampoFormulario, ValorRespuesta } from "./sst";

/**
 * Módulo disciplinario, observaciones internas y evaluaciones.
 * El historial disciplinario es permanente: ningún registro se elimina, solo
 * se archiva conservando la traza completa del flujo.
 */

/* ============================ Disciplinario ============================ */

export type TipoFalta =
  | "incumplimiento_horario"
  | "conducta"
  | "procedimiento"
  | "seguridad"
  | "calidad"
  | "otra";

export const TIPO_FALTA_LABEL: Record<TipoFalta, string> = {
  incumplimiento_horario: "Incumplimiento de horario",
  conducta: "Conducta laboral",
  procedimiento: "Incumplimiento de procedimiento",
  seguridad: "Incumplimiento de seguridad (SST)",
  calidad: "Falla de calidad",
  otra: "Otra",
};

export type GravedadFalta = "leve" | "grave" | "gravisima";

export const GRAVEDAD_FALTA_LABEL: Record<GravedadFalta, string> = {
  leve: "Leve",
  grave: "Grave",
  gravisima: "Gravísima",
};

/**
 * Flujo: Supervisor registra → Jefe valida / desestima / escala a RRHH →
 * RRHH registra llamado de atención, descargos y sanciones.
 */
export type EstadoIncidencia =
  | "registrada"
  | "validada"
  | "desestimada"
  | "escalada_rrhh"
  | "en_descargos"
  | "sancionada"
  | "archivada";

export const ESTADO_INCIDENCIA_LABEL: Record<EstadoIncidencia, string> = {
  registrada: "Registrada por supervisor",
  validada: "Validada por jefe",
  desestimada: "Desestimada",
  escalada_rrhh: "Escalada a RRHH",
  en_descargos: "En descargos",
  sancionada: "Con sanción registrada",
  archivada: "Archivada",
};

export type EtapaDisciplinaria = "supervisor" | "jefe" | "rrhh";

export const ETAPA_DISCIPLINARIA_LABEL: Record<EtapaDisciplinaria, string> = {
  supervisor: "Supervisor",
  jefe: "Jefe inmediato",
  rrhh: "Talento Humano",
};

export type AccionDisciplinaria =
  | "registrada"
  | "validada"
  | "desestimada"
  | "escalada"
  | "llamado_atencion"
  | "descargos"
  | "sancion"
  | "archivada";

export const ACCION_DISCIPLINARIA_LABEL: Record<AccionDisciplinaria, string> = {
  registrada: "Incidencia registrada",
  validada: "Validada",
  desestimada: "Desestimada",
  escalada: "Escalada a RRHH",
  llamado_atencion: "Llamado de atención",
  descargos: "Diligencia de descargos",
  sancion: "Sanción",
  archivada: "Archivada",
};

export interface PasoDisciplinario {
  etapa: EtapaDisciplinaria;
  accion: AccionDisciplinaria;
  actor: string;
  fecha: string;
  hora: string;
  nota?: string;
}

export type TipoSancion =
  | "amonestacion_verbal"
  | "amonestacion_escrita"
  | "suspension"
  | "terminacion_justa_causa";

export const TIPO_SANCION_LABEL: Record<TipoSancion, string> = {
  amonestacion_verbal: "Amonestación verbal",
  amonestacion_escrita: "Amonestación escrita",
  suspension: "Suspensión",
  terminacion_justa_causa: "Terminación con justa causa",
};

export type TipoActuacion = "llamado_atencion" | "descargos" | "sancion";

export const TIPO_ACTUACION_LABEL: Record<TipoActuacion, string> = {
  llamado_atencion: "Llamado de atención",
  descargos: "Descargos",
  sancion: "Sanción",
};

/** Actuación registrada exclusivamente por Talento Humano. */
export interface ActuacionDisciplinaria {
  id: string;
  tipo: TipoActuacion;
  fecha: string;
  detalle: string;
  /** Solo para descargos: versión del empleado. */
  versionEmpleado?: string;
  /** Solo para sanciones. */
  tipoSancion?: TipoSancion;
  diasSuspension?: number;
  vigenteHasta?: string;
  registradoPor: string;
}

export interface Incidencia {
  id: string;
  consecutivo: string;
  empleadoId: string;
  tipo: TipoFalta;
  gravedadPresunta: GravedadFalta;
  fecha: string;
  hora: string;
  descripcion: string;
  evidencia?: string;
  estado: EstadoIncidencia;
  registradoPor: string;
  /** Historial permanente del flujo. */
  traza: PasoDisciplinario[];
  actuaciones: ActuacionDisciplinaria[];
}

/* ========================= Observaciones internas ========================= */

export type CategoriaObservacion =
  | "desempeno"
  | "comportamiento"
  | "reconocimiento"
  | "seguimiento"
  | "riesgo";

export const CATEGORIA_OBSERVACION_LABEL: Record<CategoriaObservacion, string> = {
  desempeno: "Desempeño",
  comportamiento: "Comportamiento",
  reconocimiento: "Reconocimiento",
  seguimiento: "Seguimiento",
  riesgo: "Alerta / riesgo",
};

/** Observación de uso interno: nunca visible para el empleado. */
export interface ObservacionInterna {
  id: string;
  empleadoId: string;
  categoria: CategoriaObservacion;
  texto: string;
  fecha: string;
  hora: string;
  autor: string;
  rolAutor: RoleKey;
  estado: RecordStatus;
}

/** Roles habilitados para registrar observaciones internas. */
export const ROLES_OBSERVACION: RoleKey[] = [
  "administrador",
  "talento_humano",
  "director",
  "jefe",
  "supervisor",
];

/* ============================= Evaluaciones ============================= */

export type TipoInstrumento = "encuesta" | "evaluacion" | "cuestionario" | "prueba_sst";

export const TIPO_INSTRUMENTO_LABEL: Record<TipoInstrumento, string> = {
  encuesta: "Encuesta",
  evaluacion: "Evaluación",
  cuestionario: "Cuestionario",
  prueba_sst: "Prueba SST",
};

/** Campo con respuesta correcta opcional (permite calificar automáticamente). */
export interface CampoEvaluacion extends CampoFormulario {
  correcta?: ValorRespuesta;
  peso?: number;
}

export interface Evaluacion {
  id: string;
  codigo: string;
  titulo: string;
  descripcion: string;
  tipo: TipoInstrumento;
  campos: CampoEvaluacion[];
  asignacion: AsignacionFormulario;
  /** Porcentaje mínimo para aprobar (solo instrumentos calificables). */
  puntajeAprobacion?: number;
  estado: RecordStatus;
  creadoPor: string;
  creadoEn: string;
}

export interface RespuestaEvaluacion {
  id: string;
  evaluacionId: string;
  empleadoId: string;
  fecha: string;
  hora: string;
  valores: Record<string, ValorRespuesta>;
  /** Porcentaje obtenido cuando el instrumento es calificable. */
  puntaje?: number;
  aprobado?: boolean;
}
