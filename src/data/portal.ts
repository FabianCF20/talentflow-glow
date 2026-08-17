import type {
  DesprendibleNomina,
  DocumentoEmpleado,
  EntregaDotacion,
  PeriodoVacaciones,
  RegistroIncapacidad,
  SolicitudCambio,
} from "@/types/portal";
import { EMPLEADOS_RRHH } from "@/data/rrhh";

/**
 * Portal del Empleado sin datos de prueba. Las consultas por empleado se
 * resolverán contra las colecciones de Firestore correspondientes.
 */

export function vacacionesDe(empleadoId: string): PeriodoVacaciones[] {
  return EMPLEADOS_RRHH.find((e) => e.id === empleadoId) ? [] : [];
}

export function incapacidadesDe(_empleadoId: string): RegistroIncapacidad[] {
  return [];
}

export function nominaDe(_empleadoId: string): DesprendibleNomina[] {
  return [];
}

export function dotacionDe(_empleadoId: string): EntregaDotacion[] {
  return [];
}

export const DOCUMENTOS_INICIALES: DocumentoEmpleado[] = [];
export const SOLICITUDES_INICIALES: SolicitudCambio[] = [];
