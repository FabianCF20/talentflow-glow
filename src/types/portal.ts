/**
 * Portal del Empleado: autoconsulta, solicitudes de actualización con aprobación
 * de RRHH, gestión documental con versionamiento y certificados automáticos.
 */

/* --------------------- Solicitudes de actualización --------------------- */

export type CampoAutogestion = "direccion" | "telefono" | "celular" | "emailPersonal" | "familiar";

export const CAMPO_AUTOGESTION_LABEL: Record<CampoAutogestion, string> = {
  direccion: "Dirección de residencia",
  telefono: "Teléfono fijo",
  celular: "Teléfono celular",
  emailPersonal: "Correo electrónico",
  familiar: "Información familiar",
};

export type EstadoSolicitud = "pendiente" | "aprobada" | "rechazada";

export const ESTADO_SOLICITUD_LABEL: Record<EstadoSolicitud, string> = {
  pendiente: "Pendiente de aprobación",
  aprobada: "Aprobada",
  rechazada: "Rechazada",
};

export interface SolicitudCambio {
  id: string;
  empleadoId: string;
  campo: CampoAutogestion;
  valorAnterior: string;
  valorNuevo: string;
  observacionEmpleado?: string;
  estado: EstadoSolicitud;
  fechaSolicitud: string;
  fechaRevision?: string;
  revisadoPor?: string;
  comentarioRrhh?: string;
}

/* ------------------------- Gestión documental ------------------------- */

export type CategoriaDocumento =
  | "personales"
  | "academicos"
  | "contractuales"
  | "sst"
  | "disciplinarios"
  | "incapacidades";

export const CATEGORIA_DOC_LABEL: Record<CategoriaDocumento, string> = {
  personales: "Personales",
  academicos: "Académicos",
  contractuales: "Contractuales",
  sst: "SST",
  disciplinarios: "Disciplinarios",
  incapacidades: "Incapacidades",
};

export const CATEGORIAS_DOC = Object.keys(CATEGORIA_DOC_LABEL) as CategoriaDocumento[];

export interface VersionDocumento {
  version: number;
  nombreArchivo: string;
  tamanoKb: number;
  subidoPor: string;
  fecha: string;
  nota?: string;
}

export interface DocumentoEmpleado {
  id: string;
  empleadoId: string;
  categoria: CategoriaDocumento;
  nombre: string;
  /** Vigencia del documento; vacío = sin vencimiento. */
  fechaVencimiento?: string;
  /** Última versión primero no: se conserva orden ascendente por versión. */
  versiones: VersionDocumento[];
}

export type EstadoVigencia = "vigente" | "por_vencer" | "vencido" | "sin_vencimiento";

export const VIGENCIA_LABEL: Record<EstadoVigencia, string> = {
  vigente: "Vigente",
  por_vencer: "Por vencer",
  vencido: "Vencido",
  sin_vencimiento: "Sin vencimiento",
};

/* ---------------------------- Certificados ---------------------------- */

export type TipoCertificado = "laboral" | "antiguedad" | "cargo";

export const TIPO_CERTIFICADO_LABEL: Record<TipoCertificado, string> = {
  laboral: "Certificado laboral",
  antiguedad: "Certificado de antigüedad",
  cargo: "Certificado de cargo",
};

export interface CertificadoEmitido {
  id: string;
  codigo: string;
  tipo: TipoCertificado;
  empleadoId: string;
  fechaEmision: string;
  incluyeSalario: boolean;
  solicitadoPor: string;
}

/* -------------------- Consultas del portal (mock) -------------------- */

export interface PeriodoVacaciones {
  id: string;
  periodo: string;
  diasCausados: number;
  diasTomados: number;
  desde?: string;
  hasta?: string;
  estado: "disfrutadas" | "programadas" | "pendientes";
}

export interface RegistroIncapacidad {
  id: string;
  tipo: "enfermedad_general" | "accidente_trabajo" | "licencia_maternidad";
  desde: string;
  hasta: string;
  dias: number;
  entidad: string;
  estado: "radicada" | "en_tramite" | "pagada";
}

export interface DesprendibleNomina {
  id: string;
  periodo: string;
  devengado: number;
  deducciones: number;
  neto: number;
  fechaPago: string;
}

export interface EntregaDotacion {
  id: string;
  elemento: string;
  talla: string;
  cantidad: number;
  fechaEntrega: string;
  proximaEntrega: string;
  firmada: boolean;
}

export const TIPO_INCAPACIDAD_LABEL: Record<RegistroIncapacidad["tipo"], string> = {
  enfermedad_general: "Enfermedad general",
  accidente_trabajo: "Accidente de trabajo",
  licencia_maternidad: "Licencia de maternidad",
};
