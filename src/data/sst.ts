import type {
  AccidenteLaboral,
  CapacitacionSST,
  EntregaDotacion,
  ExamenMedico,
  FichaTallas,
  Formulario,
  RespuestaFormulario,
} from "@/types/sst";

/** Módulo SST sin datos de prueba: todo se almacena en Firestore. */

export const EXAMENES_INICIALES: ExamenMedico[] = [];
export const ACCIDENTES_INICIALES: AccidenteLaboral[] = [];
export const CAPACITACIONES_INICIALES: CapacitacionSST[] = [];
export const TALLAS_INICIALES: FichaTallas[] = [];
export const ENTREGAS_INICIALES: EntregaDotacion[] = [];
export const FORMULARIOS_INICIALES: Formulario[] = [];
export const RESPUESTAS_INICIALES: RespuestaFormulario[] = [];
