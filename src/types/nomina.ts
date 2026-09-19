/**
 * Módulo de Nómina Colombia: devengados, deducciones, prestaciones sociales,
 * liquidaciones definitivas y desprendibles de pago.
 * Ningún periodo se elimina: se cierra y conserva histórico para reportes.
 */

export type TipoDevengado =
  | "salario"
  | "auxilio_transporte"
  | "bonificacion"
  | "horas_extras"
  | "recargos";

export const TIPO_DEVENGADO_LABEL: Record<TipoDevengado, string> = {
  salario: "Salario básico",
  auxilio_transporte: "Auxilio de transporte",
  bonificacion: "Bonificaciones",
  horas_extras: "Horas extras",
  recargos: "Recargos",
};

export type TipoDeduccion =
  | "salud"
  | "pension"
  | "fondo_solidaridad"
  | "libranza"
  | "embargo"
  | "otro";

export const TIPO_DEDUCCION_LABEL: Record<TipoDeduccion, string> = {
  salud: "Salud (4%)",
  pension: "Pensión (4%)",
  fondo_solidaridad: "Fondo de solidaridad pensional",
  libranza: "Libranzas",
  embargo: "Embargos judiciales",
  otro: "Otros descuentos",
};

export interface ConceptoLinea {
  codigo: string;
  descripcion: string;
  cantidad?: number;
  valor: number;
}

export interface Provisiones {
  prima: number;
  cesantias: number;
  interesesCesantias: number;
  vacaciones: number;
}

/** Detalle de nómina de un empleado en un periodo. */
export interface DetalleNomina {
  id: string;
  periodoId: string;
  empleadoId: string;
  diasLiquidados: number;
  salarioBase: number;
  devengados: ConceptoLinea[];
  deducciones: ConceptoLinea[];
  totalDevengado: number;
  totalDeducido: number;
  netoPagar: number;
  provisiones: Provisiones;
}

export type EstadoPeriodo = "abierta" | "liquidada" | "pagada";

export const ESTADO_PERIODO_LABEL: Record<EstadoPeriodo, string> = {
  abierta: "Abierta",
  liquidada: "Liquidada",
  pagada: "Pagada",
};

export interface PeriodoNomina {
  id: string;
  codigo: string;
  anio: number;
  mes: number;
  desde: string;
  hasta: string;
  estado: EstadoPeriodo;
  detalles: DetalleNomina[];
  liquidadoPor?: string;
  fechaLiquidacion?: string;
}

/** Conceptos recurrentes configurados por Nómina (bonificaciones y descuentos). */
export type TipoRecurrente = "bonificacion" | "libranza" | "embargo" | "otro";

export const TIPO_RECURRENTE_LABEL: Record<TipoRecurrente, string> = {
  bonificacion: "Bonificación",
  libranza: "Libranza",
  embargo: "Embargo judicial",
  otro: "Otro descuento",
};

export interface ConceptoRecurrente {
  id: string;
  empleadoId: string;
  tipo: TipoRecurrente;
  descripcion: string;
  valorMensual: number;
  activo: boolean;
}

/* ---------------------------- Liquidación definitiva ---------------------------- */

export type MotivoLiquidacion = "renuncia" | "terminacion" | "despido";

export const MOTIVO_LIQUIDACION_LABEL: Record<MotivoLiquidacion, string> = {
  renuncia: "Renuncia voluntaria",
  terminacion: "Terminación de contrato",
  despido: "Despido sin justa causa",
};

export interface LiquidacionFinal {
  id: string;
  consecutivo: string;
  empleadoId: string;
  motivo: MotivoLiquidacion;
  fechaIngreso: string;
  fechaRetiro: string;
  diasLaborados: number;
  salarioBase: number;
  conceptos: ConceptoLinea[];
  deducciones: ConceptoLinea[];
  totalPagar: number;
  fechaCalculo: string;
  registradoPor: string;
}

export const MESES_LABEL = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];
