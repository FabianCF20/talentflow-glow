/**
 * Motor de reportes ejecutivos: RRHH, nómina, SST y gerencia.
 * Todos los cálculos son puros para permitir exportación a Excel y PDF.
 */

import { AREAS, CENTROS_COSTO, areaById, centroCostoById } from "@/data/organizacion";
import { calcularAsistencia } from "@/lib/operaciones";
import { totalesPeriodo, valorRecargo } from "@/lib/nomina";
import type { AccidenteLaboral, CapacitacionSST } from "@/types/sst";
import type {
  HoraExtra,
  IncapacidadOperativa,
  RegistroAsistencia,
  SolicitudOperativa,
} from "@/types/operaciones";
import { ESTADOS_VINCULADOS, type EmpleadoRRHH } from "@/types/rrhh";
import { MESES_LABEL, type PeriodoNomina } from "@/types/nomina";

export interface FiltroReportes {
  anio: number;
  areaId: string | "todas";
  centroCostoId: string | "todos";
}

export const anioActual = () => new Date().getFullYear();

export const aplicaFiltro = (e: EmpleadoRRHH, f: FiltroReportes) =>
  (f.areaId === "todas" || e.laboral.areaId === f.areaId) &&
  (f.centroCostoId === "todos" || e.laboral.centroCostoId === f.centroCostoId);

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
    const retiros = empleados.filter((e) => e.laboral.fechaRetiro?.startsWith(prefijo)).length;
    return { label: mes.slice(0, 3), valor: Number(((retiros / base) * 100).toFixed(2)) };
  });
}

export const ANTIGUEDAD_RANGOS = ["< 1 año", "1 a 3 años", "3 a 5 años", "5 a 10 años", "> 10 años"];

export function antiguedadDistribucion(empleados: EmpleadoRRHH[]): PuntoSerie[] {
  const hoy = Date.now();
  const conteo = [0, 0, 0, 0, 0];
  for (const e of empleados.filter(vinculado)) {
    const anios = (hoy - new Date(`${e.laboral.fechaIngreso}T00:00:00`).getTime()) / 31_536_000_000;
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
      solicitudesPendientes: propias.filter((s) => s.estado.startsWith("pendiente")).length,
    };
  });
}

/* -------------------------------- Nómina --------------------------------- */

export interface CostoMensual {
  label: string;
  devengado: number;
  prestaciones: number;
  costoTotal: number;
  neto: number;
}

export function costosLaborales(periodos: PeriodoNomina[], anio: number): CostoMensual[] {
  return periodos
    .filter((p) => p.anio === anio && p.detalles.length > 0)
    .map((p) => {
      const t = totalesPeriodo(p);
      const prestaciones =
        t.provisiones.prima +
        t.provisiones.cesantias +
        t.provisiones.interesesCesantias +
        t.provisiones.vacaciones;
      return {
        label: MESES_LABEL[p.mes - 1]?.slice(0, 3) ?? "",
        devengado: t.devengado,
        prestaciones,
        costoTotal: t.costoTotal,
        neto: t.neto,
      };
    });
}

export function prestacionesPorEmpleado(periodos: PeriodoNomina[], anio: number) {
  const acc = new Map<string, { prima: number; cesantias: number; intereses: number; vacaciones: number }>();
  for (const p of periodos.filter((x) => x.anio === anio)) {
    for (const d of p.detalles) {
      const prev = acc.get(d.empleadoId) ?? { prima: 0, cesantias: 0, intereses: 0, vacaciones: 0 };
      acc.set(d.empleadoId, {
        prima: prev.prima + d.provisiones.prima,
        cesantias: prev.cesantias + d.provisiones.cesantias,
        intereses: prev.intereses + d.provisiones.interesesCesantias,
        vacaciones: prev.vacaciones + d.provisiones.vacaciones,
      });
    }
  }
  return acc;
}

export function horasExtrasReporte(
  horasExtras: HoraExtra[],
  empleados: EmpleadoRRHH[],
  anio: number,
) {
  const byEmp = new Map(empleados.map((e) => [e.id, e]));
  return horasExtras
    .filter((h) => h.fecha.startsWith(String(anio)))
    .map((h) => {
      const emp = byEmp.get(h.empleadoId);
      const salario = emp?.laboral.salario ?? 0;
      return { ...h, valor: valorRecargo(salario, h.tipo, h.horas), empleado: emp };
    });
}

/* ---------------------------------- SST ---------------------------------- */

export function accidentalidadMensual(accidentes: AccidenteLaboral[], anio: number): PuntoSerie[] {
  return MESES_LABEL.map((mes, i) => ({
    label: mes.slice(0, 3),
    valor: accidentes.filter((a) => a.fecha.startsWith(`${anio}-${String(i + 1).padStart(2, "0")}`)).length,
  }));
}

export function capacitacionesResumen(capacitaciones: CapacitacionSST[], anio: number) {
  const delAnio = capacitaciones.filter((c) => c.fecha.startsWith(String(anio)));
  const convocados = delAnio.reduce((s, c) => s + c.asistentes.length, 0);
  const asistieron = delAnio.reduce((s, c) => s + c.asistentes.filter((a) => a.asistio).length, 0);
  const horas = delAnio.reduce((s, c) => s + c.duracionHoras, 0);
  const notas = delAnio.flatMap((c) => c.asistentes.map((a) => a.calificacion ?? 0)).filter((n) => n > 0);
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

export interface CostoAgrupado {
  id: string;
  nombre: string;
  empleados: number;
  devengado: number;
  prestaciones: number;
  costoTotal: number;
}

function agrupar(
  periodo: PeriodoNomina | undefined,
  empleados: EmpleadoRRHH[],
  claves: { id: string; nombre: string }[],
  selector: (e: EmpleadoRRHH) => string,
): CostoAgrupado[] {
  const byEmp = new Map(empleados.map((e) => [e.id, e]));
  return claves
    .map((k) => {
      const detalles = (periodo?.detalles ?? []).filter((d) => {
        const emp = byEmp.get(d.empleadoId);
        return emp ? selector(emp) === k.id : false;
      });
      const devengado = detalles.reduce((s, d) => s + d.totalDevengado, 0);
      const prestaciones = detalles.reduce(
        (s, d) =>
          s +
          d.provisiones.prima +
          d.provisiones.cesantias +
          d.provisiones.interesesCesantias +
          d.provisiones.vacaciones,
        0,
      );
      return {
        id: k.id,
        nombre: k.nombre,
        empleados: detalles.length,
        devengado,
        prestaciones,
        costoTotal: devengado + prestaciones,
      };
    })
    .filter((x) => x.empleados > 0)
    .sort((a, b) => b.costoTotal - a.costoTotal);
}

export const costosPorArea = (periodo: PeriodoNomina | undefined, empleados: EmpleadoRRHH[]) =>
  agrupar(
    periodo,
    empleados,
    AREAS.map((a) => ({ id: a.id, nombre: a.nombre })),
    (e) => e.laboral.areaId,
  );

export const costosPorCentroCosto = (periodo: PeriodoNomina | undefined, empleados: EmpleadoRRHH[]) =>
  agrupar(
    periodo,
    empleados,
    CENTROS_COSTO.map((c) => ({ id: c.id, nombre: `${c.codigo} · ${c.nombre}` })),
    (e) => e.laboral.centroCostoId,
  );

export const nombreAreaCorto = (id?: string) => areaById(id)?.nombre ?? "—";
export const nombreCentroCostoCorto = (id?: string) => centroCostoById(id)?.nombre ?? "—";

export interface IndicadoresGlobales {
  headcount: number;
  rotacionAnual: number;
  antiguedadPromedio: number;
  costoNominaMes: number;
  costoPromedioEmpleado: number;
  tasaAusentismo: number;
  accidentesAnio: number;
  coberturaCapacitacion: number;
}

export function indicadoresGlobales(input: {
  empleados: EmpleadoRRHH[];
  periodos: PeriodoNomina[];
  incapacidades: IncapacidadOperativa[];
  asistencia: RegistroAsistencia[];
  accidentes: AccidenteLaboral[];
  capacitaciones: CapacitacionSST[];
  anio: number;
}): IndicadoresGlobales {
  const { empleados, periodos, anio } = input;
  const activos = empleados.filter(vinculado);
  const retirosAnio = empleados.filter((e) => e.laboral.fechaRetiro?.startsWith(String(anio))).length;
  const ultimo = [...periodos].reverse().find((p) => p.detalles.length > 0);
  const totales = ultimo ? totalesPeriodo(ultimo) : null;
  const hoy = Date.now();
  const antiguedad = activos.length
    ? activos.reduce(
        (s, e) => s + (hoy - new Date(`${e.laboral.fechaIngreso}T00:00:00`).getTime()) / 31_536_000_000,
        0,
      ) / activos.length
    : 0;
  const aus = ausentismo(activos, input.incapacidades, input.asistencia);
  const cap = capacitacionesResumen(input.capacitaciones, anio);

  return {
    headcount: activos.length,
    rotacionAnual: activos.length ? Number(((retirosAnio / activos.length) * 100).toFixed(2)) : 0,
    antiguedadPromedio: Number(antiguedad.toFixed(1)),
    costoNominaMes: totales?.costoTotal ?? 0,
    costoPromedioEmpleado: totales && totales.empleados ? Math.round(totales.costoTotal / totales.empleados) : 0,
    tasaAusentismo: aus.length
      ? Number((aus.reduce((s, a) => s + a.tasa, 0) / aus.length).toFixed(2))
      : 0,
    accidentesAnio: input.accidentes.filter((a) => a.fecha.startsWith(String(anio))).length,
    coberturaCapacitacion: cap.cobertura,
  };
}
