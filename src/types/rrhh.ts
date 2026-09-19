import type { RecordStatus } from "./entities";

/**
 * Módulo central de Recursos Humanos: expediente del empleado y hoja de vida digital.
 * Ningún registro se elimina: los retiros conservan histórico y reportes.
 */

export type EstadoLaboral =
  | "activo"
  | "vacaciones"
  | "incapacidad"
  | "licencia"
  | "suspendido"
  | "retirado";

export const ESTADO_LABORAL_LABEL: Record<EstadoLaboral, string> = {
  activo: "Activo",
  vacaciones: "Vacaciones",
  incapacidad: "Incapacidad",
  licencia: "Licencia",
  suspendido: "Suspendido",
  retirado: "Retirado",
};

/** Estados que siguen contando como personal vinculado (aparecen en listados activos). */
export const ESTADOS_VINCULADOS: EstadoLaboral[] = [
  "activo",
  "vacaciones",
  "incapacidad",
  "licencia",
  "suspendido",
];

export type TipoContrato =
  | "indefinido"
  | "fijo"
  | "obra_labor"
  | "aprendizaje"
  | "prestacion_servicios";

export const TIPO_CONTRATO_LABEL: Record<TipoContrato, string> = {
  indefinido: "Término indefinido",
  fijo: "Término fijo",
  obra_labor: "Obra o labor",
  aprendizaje: "Aprendizaje SENA",
  prestacion_servicios: "Prestación de servicios",
};

export interface DatosPersonales {
  tipoDocumento: "CC" | "CE" | "PA" | "PEP" | "TI";
  fechaNacimiento: string;
  lugarNacimiento: string;
  genero: "M" | "F" | "O";
  estadoCivil: "soltero" | "casado" | "union_libre" | "separado" | "viudo";
  rh: string;
  direccion: string;
  ciudad: string;
  telefono: string;
  celular: string;
  emailPersonal: string;
}

export interface Familiar {
  id: string;
  nombre: string;
  parentesco: "conyuge" | "hijo" | "padre" | "madre" | "hermano" | "otro";
  fechaNacimiento?: string;
  documento?: string;
  aCargo: boolean;
}

export interface ContactoEmergencia {
  id: string;
  nombre: string;
  parentesco: string;
  telefono: string;
  principal: boolean;
}

export interface DatoAcademico {
  id: string;
  nivel:
    | "bachiller"
    | "tecnico"
    | "tecnologo"
    | "profesional"
    | "especializacion"
    | "maestria"
    | "doctorado";
  titulo: string;
  institucion: string;
  anioGraduacion: number;
  certificado: boolean;
}

export interface ExperienciaLaboral {
  id: string;
  empresa: string;
  cargo: string;
  desde: string;
  hasta: string;
  motivoRetiro?: string;
  verificada: boolean;
}

export interface DatosBancarios {
  banco: string;
  tipoCuenta: "ahorros" | "corriente";
  numeroCuenta: string;
  titular: string;
  certificacionAdjunta: boolean;
}

export interface SeguridadSocial {
  eps: string;
  afp: string;
  cesantias: string;
  arl: string;
  cajaCompensacion: string;
  claseRiesgo: "I" | "II" | "III" | "IV" | "V";
  afiliadoDesde: string;
}

/** Información laboral: campos sensibles editables únicamente por RRHH. */
export interface InformacionLaboral {
  fechaIngreso: string;
  areaId: string;
  dependenciaId?: string;
  cargoId: string;
  centroCostoId: string;
  centroTrabajoId: string;
  jefeInmediatoId?: string;
  tipoContrato: TipoContrato;
  salario: number;
  fechaFinContrato?: string;
  fechaRetiro?: string;
  motivoRetiro?: string;
}

/** Campos que solo Recursos Humanos puede modificar. */
export const CAMPOS_SOLO_RRHH = [
  "cargoId",
  "salario",
  "areaId",
  "centroCostoId",
  "jefeInmediatoId",
] as const;

export type CampoSoloRRHH = (typeof CAMPOS_SOLO_RRHH)[number];

export type TipoEventoHV =
  | "ingreso"
  | "ascenso"
  | "cambio_salarial"
  | "traslado"
  | "renovacion"
  | "terminacion"
  | "cambio_estado";

export const TIPO_EVENTO_LABEL: Record<TipoEventoHV, string> = {
  ingreso: "Ingreso",
  ascenso: "Ascenso",
  cambio_salarial: "Cambio salarial",
  traslado: "Traslado",
  renovacion: "Renovación de contrato",
  terminacion: "Terminación",
  cambio_estado: "Cambio de estado",
};

/** Evento de la hoja de vida digital: se registra automáticamente ante cada cambio. */
export interface EventoHojaVida {
  id: string;
  empleadoId: string;
  tipo: TipoEventoHV;
  fecha: string;
  titulo: string;
  detalle: string;
  valorAnterior?: string;
  valorNuevo?: string;
  registradoPor: string;
}

export interface ExpedienteEmpleado {
  empleadoId: string;
  personales: DatosPersonales;
  familiares: Familiar[];
  contactosEmergencia: ContactoEmergencia[];
  academicos: DatoAcademico[];
  experiencia: ExperienciaLaboral[];
  bancarios: DatosBancarios;
  seguridadSocial: SeguridadSocial;
}

/** Empleado del módulo de RRHH: estructura organizacional + estado laboral. */
export interface EmpleadoRRHH {
  id: string;
  nombres: string;
  apellidos: string;
  documento: string;
  estadoLaboral: EstadoLaboral;
  /** Ciclo de vida del registro (nunca se elimina físicamente). */
  estado: RecordStatus;
  accesoHabilitado: boolean;
  laboral: InformacionLaboral;
}

export const nombreEmpleado = (e: { nombres: string; apellidos: string }) =>
  `${e.nombres} ${e.apellidos}`;

export const iniciales = (e: { nombres: string; apellidos: string }) =>
  `${e.nombres[0] ?? ""}${e.apellidos[0] ?? ""}`.toUpperCase();
