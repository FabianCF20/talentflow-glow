import type {
  HoraExtra,
  IncapacidadOperativa,
  NovedadOperativa,
  RegistroAsistencia,
  SolicitudOperativa,
} from "@/types/operaciones";

/** Módulo operativo sin datos de prueba: todo se almacena en Firestore. */

export const SOLICITUDES_OP_INICIALES: SolicitudOperativa[] = [];
export const INCAPACIDADES_OP_INICIALES: IncapacidadOperativa[] = [];
export const ASISTENCIA_INICIAL: RegistroAsistencia[] = [];
export const HORAS_EXTRAS_INICIALES: HoraExtra[] = [];
export const NOVEDADES_INICIALES: NovedadOperativa[] = [];
