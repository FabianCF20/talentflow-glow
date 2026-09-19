import { EMPLEADOS, areasDeDireccion } from "@/data/organizacion";
import type { RoleKey } from "@/types/entities";
import type { AsignacionFormulario, ValorRespuesta } from "@/types/sst";
import type {
  CampoEvaluacion,
  Evaluacion,
  EstadoIncidencia,
  Incidencia,
  RespuestaEvaluacion,
} from "@/types/disciplinario";
import { ROLES_OBSERVACION } from "@/types/disciplinario";

export const hoyISO = () => new Date().toISOString().slice(0, 10);
export const horaActual = () => new Date().toTimeString().slice(0, 5);

export const consecutivoDisciplinario = (n: number) =>
  `DIS-${new Date().getFullYear()}-${String(n).padStart(4, "0")}`;

/* ------------------------------- Permisos ------------------------------- */

export const ROLES_REGISTRO_INCIDENCIA: RoleKey[] = [
  "administrador",
  "supervisor",
  "jefe",
  "talento_humano",
];
export const ROLES_VALIDACION: RoleKey[] = ["administrador", "jefe", "director"];
export const ROLES_RRHH_DISCIPLINARIO: RoleKey[] = ["administrador", "talento_humano"];
export const ROLES_EVALUACIONES: RoleKey[] = ["administrador", "talento_humano", "sst"];

export const puedeRegistrarIncidencia = (rol: RoleKey) => ROLES_REGISTRO_INCIDENCIA.includes(rol);
export const puedeValidarIncidencia = (rol: RoleKey) => ROLES_VALIDACION.includes(rol);
export const puedeActuarRRHH = (rol: RoleKey) => ROLES_RRHH_DISCIPLINARIO.includes(rol);
export const puedeRegistrarObservacion = (rol: RoleKey) => ROLES_OBSERVACION.includes(rol);
export const puedeVerObservaciones = (rol: RoleKey) => ROLES_OBSERVACION.includes(rol);
export const puedeGestionarEvaluaciones = (rol: RoleKey) => ROLES_EVALUACIONES.includes(rol);

/** Etapas habilitadas según el estado actual de la incidencia. */
export const esperaJefe = (e: EstadoIncidencia) => e === "registrada";
export const esperaRRHH = (e: EstadoIncidencia) =>
  e === "escalada_rrhh" || e === "en_descargos" || e === "sancionada";

/* ---------------------------- Destinatarios ---------------------------- */

export function destinatariosAsignacion(asignacion: AsignacionFormulario): string[] {
  const activos = EMPLEADOS.filter((e) => e.estado === "activo");
  switch (asignacion.tipo) {
    case "empleado":
      return asignacion.valores;
    case "cargo":
      return activos.filter((e) => asignacion.valores.includes(e.cargoId)).map((e) => e.id);
    case "area": {
      const areas = new Set(asignacion.valores.flatMap((a) => areasDeDireccion(a)));
      return activos.filter((e) => areas.has(e.areaId)).map((e) => e.id);
    }
    case "empresa":
    default:
      return activos.map((e) => e.id);
  }
}

/* --------------------------- Calificación --------------------------- */

const mismaRespuesta = (a: ValorRespuesta, b: ValorRespuesta) => {
  if (Array.isArray(a) || Array.isArray(b)) {
    const la = [...(Array.isArray(a) ? a : [String(a)])].sort();
    const lb = [...(Array.isArray(b) ? b : [String(b)])].sort();
    return la.length === lb.length && la.every((v, i) => v === lb[i]);
  }
  return String(a) === String(b);
};

export const esCalificable = (campos: CampoEvaluacion[]) =>
  campos.some((c) => c.correcta !== undefined);

/** Puntaje porcentual sobre los campos con respuesta correcta definida. */
export function calificar(
  evaluacion: Evaluacion,
  valores: Record<string, ValorRespuesta>,
): { puntaje?: number; aprobado?: boolean } {
  const calificables = evaluacion.campos.filter((c) => c.correcta !== undefined);
  if (calificables.length === 0) return {};
  const pesoTotal = calificables.reduce((s, c) => s + (c.peso ?? 1), 0);
  const obtenido = calificables.reduce((s, c) => {
    const valor = valores[c.id];
    if (valor === undefined) return s;
    return mismaRespuesta(valor, c.correcta as ValorRespuesta) ? s + (c.peso ?? 1) : s;
  }, 0);
  const puntaje = Math.round((obtenido / Math.max(pesoTotal, 1)) * 100);
  return { puntaje, aprobado: puntaje >= (evaluacion.puntajeAprobacion ?? 70) };
}

/* --------------------------- Indicadores --------------------------- */

export interface IndicadoresDisciplinarios {
  total: number;
  pendientesJefe: number;
  pendientesRRHH: number;
  desestimadas: number;
  sancionadas: number;
  llamados: number;
  descargos: number;
  suspensiones: number;
  /** Porcentaje de incidencias que terminan en sanción. */
  tasaSancion: number;
}

export function indicadoresDisciplinarios(incidencias: Incidencia[]): IndicadoresDisciplinarios {
  const actuaciones = incidencias.flatMap((i) => i.actuaciones);
  const sancionadas = incidencias.filter((i) => i.estado === "sancionada").length;
  return {
    total: incidencias.length,
    pendientesJefe: incidencias.filter((i) => esperaJefe(i.estado)).length,
    pendientesRRHH: incidencias.filter((i) => i.estado === "escalada_rrhh" || i.estado === "en_descargos")
      .length,
    desestimadas: incidencias.filter((i) => i.estado === "desestimada").length,
    sancionadas,
    llamados: actuaciones.filter((a) => a.tipo === "llamado_atencion").length,
    descargos: actuaciones.filter((a) => a.tipo === "descargos").length,
    suspensiones: actuaciones.filter((a) => a.tipoSancion === "suspension").length,
    tasaSancion: incidencias.length ? Math.round((sancionadas / incidencias.length) * 100) : 0,
  };
}

export interface IndicadoresEvaluacion {
  destinatarios: number;
  respuestas: number;
  cobertura: number;
  promedio?: number;
  aprobados: number;
  reprobados: number;
  tasaAprobacion?: number;
}

export function indicadoresEvaluacion(
  evaluacion: Evaluacion,
  respuestas: RespuestaEvaluacion[],
): IndicadoresEvaluacion {
  const propias = respuestas.filter((r) => r.evaluacionId === evaluacion.id);
  const destinatarios = destinatariosAsignacion(evaluacion.asignacion).length;
  const calificadas = propias.filter((r) => typeof r.puntaje === "number");
  const aprobados = calificadas.filter((r) => r.aprobado).length;
  return {
    destinatarios,
    respuestas: propias.length,
    cobertura: destinatarios ? Math.round((propias.length / destinatarios) * 100) : 0,
    promedio: calificadas.length
      ? Number((calificadas.reduce((s, r) => s + (r.puntaje ?? 0), 0) / calificadas.length).toFixed(1))
      : undefined,
    aprobados,
    reprobados: calificadas.length - aprobados,
    tasaAprobacion: calificadas.length ? Math.round((aprobados / calificadas.length) * 100) : undefined,
  };
}
