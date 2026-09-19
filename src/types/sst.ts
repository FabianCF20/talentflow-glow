import type { RecordStatus } from "./entities";

/**
 * SST, Dotación y Formularios dinámicos.
 * Diseño básico pero escalable: cada entidad es independiente y admite nuevos
 * tipos sin romper la estructura (labels centralizados por diccionario).
 */

/* =============================== Exámenes =============================== */

export type TipoExamen =
  | "ingreso"
  | "periodico"
  | "egreso"
  | "post_incapacidad"
  | "reubicacion";

export const TIPO_EXAMEN_LABEL: Record<TipoExamen, string> = {
  ingreso: "Ingreso",
  periodico: "Periódico",
  egreso: "Egreso",
  post_incapacidad: "Post incapacidad",
  reubicacion: "Reubicación laboral",
};

export type ConceptoMedico = "pendiente" | "apto" | "apto_con_restricciones" | "no_apto";

export const CONCEPTO_LABEL: Record<ConceptoMedico, string> = {
  pendiente: "Pendiente",
  apto: "Apto",
  apto_con_restricciones: "Apto con restricciones",
  no_apto: "No apto",
};

export interface ExamenMedico {
  id: string;
  empleadoId: string;
  tipo: TipoExamen;
  entidad: string;
  fechaProgramada: string;
  fechaRealizada?: string;
  concepto: ConceptoMedico;
  recomendaciones?: string;
  vigenciaHasta?: string;
  estado: RecordStatus;
  registradoPor: string;
}

/* ============================== Accidentes ============================== */

export type TipoEventoSST = "accidente" | "incidente" | "enfermedad_laboral";

export const TIPO_EVENTO_SST_LABEL: Record<TipoEventoSST, string> = {
  accidente: "Accidente de trabajo",
  incidente: "Incidente",
  enfermedad_laboral: "Enfermedad laboral",
};

export type GravedadSST = "leve" | "moderado" | "grave" | "mortal";

export const GRAVEDAD_LABEL: Record<GravedadSST, string> = {
  leve: "Leve",
  moderado: "Moderado",
  grave: "Grave",
  mortal: "Mortal",
};

export type EstadoInvestigacion = "abierto" | "en_investigacion" | "cerrado";

export const ESTADO_INVESTIGACION_LABEL: Record<EstadoInvestigacion, string> = {
  abierto: "Reportado",
  en_investigacion: "En investigación",
  cerrado: "Cerrado",
};

export interface AccidenteLaboral {
  id: string;
  consecutivo: string;
  empleadoId: string;
  tipo: TipoEventoSST;
  fecha: string;
  hora: string;
  centroTrabajoId: string;
  parteCuerpo: string;
  descripcion: string;
  causaRaiz?: string;
  gravedad: GravedadSST;
  diasIncapacidad: number;
  reportadoArl: boolean;
  estadoInvestigacion: EstadoInvestigacion;
  accionesCorrectivas: string[];
  registradoPor: string;
}

/* ============================ Capacitaciones ============================ */

export type ModalidadCapacitacion = "presencial" | "virtual" | "mixta";

export const MODALIDAD_LABEL: Record<ModalidadCapacitacion, string> = {
  presencial: "Presencial",
  virtual: "Virtual",
  mixta: "Mixta",
};

export interface AsistenteCapacitacion {
  empleadoId: string;
  asistio: boolean;
  calificacion?: number;
}

export interface CapacitacionSST {
  id: string;
  codigo: string;
  tema: string;
  fecha: string;
  duracionHoras: number;
  modalidad: ModalidadCapacitacion;
  instructor: string;
  obligatoria: boolean;
  asistentes: AsistenteCapacitacion[];
  estado: RecordStatus;
}

/* =============================== Dotación =============================== */

export type ElementoDotacion = "camisa" | "pantalon" | "chaqueta" | "guantes" | "botas";

export const ELEMENTOS_DOTACION: ElementoDotacion[] = [
  "camisa",
  "pantalon",
  "chaqueta",
  "guantes",
  "botas",
];

export const ELEMENTO_LABEL: Record<ElementoDotacion, string> = {
  camisa: "Camisa",
  pantalon: "Pantalón",
  chaqueta: "Chaqueta",
  guantes: "Guantes",
  botas: "Botas",
};

/** Catálogo de tallas por elemento (escalable: solo se amplía el arreglo). */
export const TALLAS_POR_ELEMENTO: Record<ElementoDotacion, string[]> = {
  camisa: ["XS", "S", "M", "L", "XL", "XXL"],
  pantalon: ["28", "30", "32", "34", "36", "38", "40"],
  chaqueta: ["XS", "S", "M", "L", "XL", "XXL"],
  guantes: ["6", "7", "8", "9", "10"],
  botas: ["35", "36", "37", "38", "39", "40", "41", "42", "43", "44"],
};

export type TallasEmpleado = Record<ElementoDotacion, string>;

export interface FichaTallas {
  empleadoId: string;
  tallas: TallasEmpleado;
  actualizadoEn: string;
  actualizadoPor: string;
}

export type TipoEntrega = "entrega" | "reposicion";

export const TIPO_ENTREGA_LABEL: Record<TipoEntrega, string> = {
  entrega: "Entrega ordinaria",
  reposicion: "Reposición",
};

export interface ItemEntrega {
  elemento: ElementoDotacion;
  talla: string;
  cantidad: number;
}

export interface AceptacionDigital {
  aceptado: boolean;
  nombre: string;
  documento: string;
  fecha: string;
  hora: string;
  /** Huella de la firma digital (no editable). */
  firma: string;
}

export interface EntregaDotacion {
  id: string;
  consecutivo: string;
  empleadoId: string;
  tipo: TipoEntrega;
  fecha: string;
  items: ItemEntrega[];
  motivo?: string;
  entregadoPor: string;
  aceptacion?: AceptacionDigital;
}

/* ============================== Formularios ============================== */

export type TipoCampo =
  | "texto"
  | "seleccion_unica"
  | "seleccion_multiple"
  | "booleano"
  | "escala";

export const TIPO_CAMPO_LABEL: Record<TipoCampo, string> = {
  texto: "Texto",
  seleccion_unica: "Selección única",
  seleccion_multiple: "Selección múltiple",
  booleano: "Verdadero / Falso",
  escala: "Escala",
};

export interface CampoFormulario {
  id: string;
  etiqueta: string;
  tipo: TipoCampo;
  requerido: boolean;
  opciones?: string[];
  escalaMin?: number;
  escalaMax?: number;
}

export type TipoAsignacion = "empleado" | "cargo" | "area" | "empresa";

export const TIPO_ASIGNACION_LABEL: Record<TipoAsignacion, string> = {
  empleado: "Empleado específico",
  cargo: "Por cargo",
  area: "Por área",
  empresa: "Empresa completa",
};

export interface AsignacionFormulario {
  tipo: TipoAsignacion;
  /** Ids de empleado / cargo / área. Vacío cuando el alcance es la empresa. */
  valores: string[];
}

export interface Formulario {
  id: string;
  codigo: string;
  titulo: string;
  descripcion: string;
  campos: CampoFormulario[];
  asignacion: AsignacionFormulario;
  estado: RecordStatus;
  creadoPor: string;
  creadoEn: string;
}

export type ValorRespuesta = string | string[] | number | boolean;

export interface RespuestaFormulario {
  id: string;
  formularioId: string;
  empleadoId: string;
  fecha: string;
  hora: string;
  valores: Record<string, ValorRespuesta>;
}
