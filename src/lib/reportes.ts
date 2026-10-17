/**
 * Motor de reportes ejecutivos: RRHH, horas extras (solo tiempo), SST y gerencia.
 * Todos los cálculos son puros para permitir exportación a Excel y PDF.
 */

import { AREAS, CENTROS_COSTO, areaById, centroCostoById } from "@/data/organizacion";
import { calcularAsistencia } from "@/lib/operaciones";
import type { AccidenteLaboral, CapacitacionSST } from "@/types/sst";
import type {
  HoraExtra,
  IncapacidadOperativa,
  RegistroAsistencia,
  SolicitudOperativa,
} from "@/types/operaciones";
import { ESTADOS_VINCULADOS, TIPO_CONTRATO_LABEL, type EmpleadoRRHH } from "@/types/rrhh";
import { EXPEDIENTES } from "@/data/rrhh";
import { MESES_LABEL } from "@/lib/fechas";

export interface FiltroReportes {
  anio: number;
  areaId: string | "todas";
  centroCostoId: string | "todos";
}

export const anioActual = () => new Date().getFullYear();

export const aplicaFiltro = (e: EmpleadoRRHH, f: FiltroReportes) =>
  (f.areaId === "todas" || e.laboral?.areaId === f.areaId) &&
  (f.centroCostoId === "todos" || e.laboral?.centroCostoId === f.centroCostoId);

const vinculado = (e: EmpleadoRRHH) => ESTADOS_VINCULADOS.includes(e.estadoLaboral);

/* --------------------------------- RRHH ---------------------------------- */

export interface PuntoSerie {
  label: string;
  valor: number;
}

/** Rotación mensual = retiros / promedio de personal vinculado. */
export function rotacionMensual(empleados: EmpleadoRRHH[], anio: number): PuntoSerie[] {
  const base = empleados.filter(vinculado).length || 1;
  return MESES_LABEL.map((mes, i) => {
    const prefijo = `${anio}-${String(i + 1).padStart(2, "0")}`;
    const retiros = empleados.filter((e) => e.laboral?.fechaRetiro?.startsWith(prefijo)).length;
    return { label: mes.slice(0, 3), valor: Number(((retiros / base) * 100).toFixed(2)) };
  });
}

export const ANTIGUEDAD_RANGOS = ["< 1 año", "1 a 3 años", "3 a 5 años", "5 a 10 años", "> 10 años"];

export function antiguedadDistribucion(empleados: EmpleadoRRHH[]): PuntoSerie[] {
  const hoy = Date.now();
  const conteo = [0, 0, 0, 0, 0];
  for (const e of empleados.filter(vinculado)) {
    const anios = (hoy - new Date(`${e.laboral?.fechaIngreso}T00:00:00`).getTime()) / 31_536_000_000;
    const idx = anios < 1 ? 0 : anios < 3 ? 1 : anios < 5 ? 2 : anios < 10 ? 3 : 4;
    conteo[idx] = (conteo[idx] ?? 0) + 1;
  }
  return ANTIGUEDAD_RANGOS.map((label, i) => ({ label, valor: conteo[i] ?? 0 }));
}

export interface AusentismoFila {
  empleadoId: string;
  diasIncapacidad: number;
  ausenciasInjustificadas: number;
  minutosTardanza: number;
  tasa: number;
}

export function ausentismo(
  empleados: EmpleadoRRHH[],
  incapacidades: IncapacidadOperativa[],
  asistencia: RegistroAsistencia[],
  diasProgramados = 30,
): AusentismoFila[] {
  return empleados.map((e) => {
    const diasIncapacidad = incapacidades
      .filter((i) => i.empleadoId === e.id && i.estado !== "rechazada")
      .reduce((s, i) => s + i.dias, 0);
    const registros = asistencia.filter((a) => a.empleadoId === e.id);
    const ausenciasInjustificadas = registros.filter((a) => a.ausente && !a.justificacion).length;
    const minutosTardanza = registros.reduce((s, a) => s + calcularAsistencia(a).minutosTardanza, 0);
    const perdidos = diasIncapacidad + ausenciasInjustificadas;
    return {
      empleadoId: e.id,
      diasIncapacidad,
      ausenciasInjustificadas,
      minutosTardanza,
      tasa: Number(((perdidos / diasProgramados) * 100).toFixed(2)),
    };
  });
}

export interface VacacionesFila {
  empleadoId: string;
  diasTomados: number;
  diasPendientes: number;
  solicitudesPendientes: number;
}

export function reporteVacaciones(
  empleados: EmpleadoRRHH[],
  solicitudes: SolicitudOperativa[],
  pendientesPorEmpleado: Record<string, number>,
): VacacionesFila[] {
  return empleados.map((e) => {
    const propias = solicitudes.filter((s) => s.empleadoId === e.id && s.tipo === "vacaciones");
    const diasTomados = propias
      .filter((s) => s.estado === "aprobada" || s.estado === "reprogramada")
      .reduce((sum, s) => sum + (s.dias ?? 0), 0);
    return {
      empleadoId: e.id,
      diasTomados,
      diasPendientes: pendientesPorEmpleado[e.id] ?? 0,
      solicitudesPendientes: propias.filter((s) => s.estado?.startsWith("pendiente")).length,
    };
  });
}

/* --------------------------- Talento Humano --------------------------- */

const GENERO_LABEL: Record<string, string> = { M: "Masculino", F: "Femenino", O: "Otro" };

/** Distribución del personal vinculado por género (lee el expediente). */
export function distribucionGenero(empleados: EmpleadoRRHH[]): PuntoSerie[] {
  const conteo = new Map<string, number>();
  for (const e of empleados.filter(vinculado)) {
    const g = EXPEDIENTES[e.id]?.personales?.genero ?? "O";
    const label = GENERO_LABEL[g] ?? "Otro";
    conteo.set(label, (conteo.get(label) ?? 0) + 1);
  }
  return [...conteo.entries()].map(([label, valor]) => ({ label, valor }));
}

/** Distribución del personal vinculado por tipo de contrato. */
export function distribucionContrato(empleados: EmpleadoRRHH[]): PuntoSerie[] {
  return (Object.keys(TIPO_CONTRATO_LABEL) as (keyof typeof TIPO_CONTRATO_LABEL)[])
    .map((t) => ({
      label: TIPO_CONTRATO_LABEL[t],
      valor: empleados.filter((e) => vinculado(e) && e.laboral?.tipoContrato === t).length,
    }))
    .filter((p) => p.valor > 0);
}

export const EDAD_RANGOS = ["< 25", "25 a 34", "35 a 44", "45 a 54", "55+"];

/** Distribución del personal vinculado por rango de edad (lee el expediente). */
export function distribucionEdad(empleados: EmpleadoRRHH[]): PuntoSerie[] {
  const hoy = Date.now();
  const conteo = [0, 0, 0, 0, 0];
  for (const e of empleados.filter(vinculado)) {
    const nac = EXPEDIENTES[e.id]?.personales?.fechaNacimiento;
    if (!nac) continue;
    const edad = (hoy - new Date(`${nac}T00:00:00`).getTime()) / 31_536_000_000;
    const idx = edad < 25 ? 0 : edad < 35 ? 1 : edad < 45 ? 2 : edad < 55 ? 3 : 4;
    conteo[idx] = (conteo[idx] ?? 0) + 1;
  }
  return EDAD_RANGOS.map((label, i) => ({ label, valor: conteo[i] ?? 0 }));
}

export interface RotacionAreaFila {
  area: string;
  vinculados: number;
  retiros: number;
  rotacion: number;
}

/** Rotación anual por área: retiros del año / personal vinculado del área. */
export function rotacionPorArea(empleados: EmpleadoRRHH[], anio: number): RotacionAreaFila[] {
  return AREAS.map((a) => {
    const delArea = empleados.filter((e) => e.laboral?.areaId === a.id);
    const vinculados = delArea.filter(vinculado).length;
    const retiros = delArea.filter((e) => e.laboral?.fechaRetiro?.startsWith(String(anio))).length;
    return {
      area: a.nombre,
      vinculados,
      retiros,
      rotacion: vinculados ? Number(((retiros / vinculados) * 100).toFixed(1)) : 0,
    };
  }).filter((r) => r.vinculados > 0 || r.retiros > 0);
}

/* ------------------------------ Horas extras ------------------------------ */

/** Horas extras del año: solo tiempo registrado, sin valores monetarios. */
export function horasExtrasReporte(
  horasExtras: HoraExtra[],
  empleados: EmpleadoRRHH[],
  anio: number,
) {
  const byEmp = new Map(empleados.map((e) => [e.id, e]));
  return horasExtras
    .filter((h) => h.fecha.startsWith(String(anio)))
    .map((h) => ({ ...h, empleado: byEmp.get(h.empleadoId) }));
}

/* ---------------------------------- SST ---------------------------------- */

export function accidentalidadMensual(accidentes: AccidenteLaboral[], anio: number): PuntoSerie[] {
  return MESES_LABEL.map((mes, i) => ({
    label: mes.slice(0, 3),
    valor: accidentes.filter((a) => a.fecha?.startsWith(`${anio}-${String(i + 1).padStart(2, "0")}`)).length,
  }));
}

export function capacitacionesResumen(capacitaciones: CapacitacionSST[], anio: number) {
  const delAnio = capacitaciones.filter((c) => c.fecha.startsWith(String(anio)));
  const convocados = delAnio.reduce((s, c) => s + (c.asistentes ?? []).length, 0);
  const asistieron = delAnio.reduce((s, c) => s + (c.asistentes ?? []).filter((a) => a.asistio).length, 0);
  const horas = delAnio.reduce((s, c) => s + c.duracionHoras, 0);
  const notas = delAnio.flatMap((c) => (c.asistentes ?? []).map((a) => a.calificacion ?? 0)).filter((n) => n > 0);
  return {
    sesiones: delAnio.length,
    convocados,
    asistieron,
    cobertura: convocados ? Number(((asistieron / convocados) * 100).toFixed(1)) : 0,
    horas,
    promedio: notas.length ? Number((notas.reduce((a, b) => a + b, 0) / notas.length).toFixed(1)) : 0,
    detalle: delAnio,
  };
}

/* -------------------------------- Gerencia -------------------------------- */

/** Personal vinculado y horas extras agrupados por una clave (área o centro). */
export interface FilaAgrupada {
  id: string;
  nombre: string;
  empleados: number;
  horasExtras: number;
}

function agrupar(
  empleados: EmpleadoRRHH[],
  horasExtras: HoraExtra[],
  anio: number,
  claves: { id: string; nombre: string }[],
  selector: (e: EmpleadoRRHH) => string | undefined,
): FilaAgrupada[] {
  const byEmp = new Map(empleados.map((e) => [e.id, e]));
  return claves
    .map((k) => ({
      id: k.id,
      nombre: k.nombre,
      empleados: empleados.filter((e) => vinculado(e) && selector(e) === k.id).length,
      horasExtras: horasExtras
        .filter((h) => h.fecha?.startsWith(String(anio)) && h.estado !== "rechazada")
        .filter((h) => {
          const e = byEmp.get(h.empleadoId);
          return e ? selector(e) === k.id : false;
        })
        .reduce((s, h) => s + (Number(h.horas) || 0), 0),
    }))
    .filter((x) => x.empleados > 0 || x.horasExtras > 0)
    .sort((a, b) => b.empleados - a.empleados);
}

export const personalPorArea = (empleados: EmpleadoRRHH[], horasExtras: HoraExtra[], anio: number) =>
  agrupar(empleados, horasExtras, anio, AREAS.map((a) => ({ id: a.id, nombre: a.nombre })), (e) => e.laboral?.areaId);

export const personalPorCentroCosto = (empleados: EmpleadoRRHH[], horasExtras: HoraExtra[], anio: number) =>
  agrupar(
    empleados,
    horasExtras,
    anio,
    CENTROS_COSTO.map((c) => ({ id: c.id, nombre: `${c.codigo} · ${c.nombre}` })),
    (e) => e.laboral?.centroCostoId,
  );

export const nombreAreaCorto = (id?: string) => areaById(id)?.nombre ?? "—";
export const nombreCentroCostoCorto = (id?: string) => centroCostoById(id)?.nombre ?? "—";

export interface IndicadoresGlobales {
  headcount: number;
  rotacionAnual: number;
  antiguedadPromedio: number;
  horasExtrasAnio: number;
  tasaAusentismo: number;
  accidentesAnio: number;
  coberturaCapacitacion: number;
}

export function indicadoresGlobales(input: {
  empleados: EmpleadoRRHH[];
  horasExtras: HoraExtra[];
  incapacidades: IncapacidadOperativa[];
  asistencia: RegistroAsistencia[];
  accidentes: AccidenteLaboral[];
  capacitaciones: CapacitacionSST[];
  anio: number;
}): IndicadoresGlobales {
  const { empleados, anio } = input;
  const activos = empleados.filter(vinculado);
  const retirosAnio = empleados.filter((e) => e.laboral?.fechaRetiro?.startsWith(String(anio))).length;
  const hoy = Date.now();
  const antiguedad = activos.length
    ? activos.reduce(
        (s, e) => s + (hoy - new Date(`${e.laboral?.fechaIngreso}T00:00:00`).getTime()) / 31_536_000_000,
        0,
      ) / activos.length
    : 0;
  const aus = ausentismo(activos, input.incapacidades, input.asistencia);
  const cap = capacitacionesResumen(input.capacitaciones, anio);

  return {
    headcount: activos.length,
    rotacionAnual: activos.length ? Number(((retirosAnio / activos.length) * 100).toFixed(2)) : 0,
    antiguedadPromedio: Number(antiguedad.toFixed(1)),
    horasExtrasAnio: input.horasExtras
      .filter((h) => h.fecha?.startsWith(String(anio)) && h.estado !== "rechazada")
      .reduce((s, h) => s + (Number(h.horas) || 0), 0),
    tasaAusentismo: aus.length
      ? Number((aus.reduce((s, a) => s + a.tasa, 0) / aus.length).toFixed(2))
      : 0,
    accidentesAnio: input.accidentes.filter((a) => a.fecha?.startsWith(String(anio))).length,
    coberturaCapacitacion: cap.cobertura,
  };
}
