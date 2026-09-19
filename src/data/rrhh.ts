import type { EmpleadoRRHH, EventoHojaVida, ExpedienteEmpleado } from "@/types/rrhh";

/**
 * Módulo central de Recursos Humanos. Sin datos de prueba: los registros
 * provienen de Firestore (colecciones `empleados_rrhh` y `eventos_hv`).
 */

export const EMPLEADOS_RRHH: EmpleadoRRHH[] = [];

export const EXPEDIENTES: Record<string, ExpedienteEmpleado> = {};

export const EVENTOS_HV: EventoHojaVida[] = [];

export const empleadoRRHHById = (id?: string) => EMPLEADOS_RRHH.find((e) => e.id === id);
