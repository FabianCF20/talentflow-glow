import { hoyISO } from "@/lib/nomina";
import type { ConceptoRecurrente, LiquidacionFinal, PeriodoNomina } from "@/types/nomina";

/** Módulo de nómina sin datos de prueba: periodos y conceptos vienen de Firestore. */

export const RECURRENTES_INICIALES: ConceptoRecurrente[] = [];
export const PERIODOS_INICIALES: PeriodoNomina[] = [];
export const LIQUIDACIONES_INICIALES: LiquidacionFinal[] = [];

/** Saldo de vacaciones por empleado (se alimentará desde el módulo de ausencias). */
export const VACACIONES_PENDIENTES: Record<string, number> = {};

export const FECHA_ACTUAL = hoyISO();
