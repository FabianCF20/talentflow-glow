/**
 * Reglas de cálculo de nómina colombiana (parámetros legales configurables).
 * Base 30 días/mes y 360 días/año, según la práctica laboral colombiana.
 */

import type { RoleKey } from "@/types/entities";
import { RECARGO_HORA_EXTRA, type HoraExtra, type TipoHoraExtra } from "@/types/operaciones";
import type { EmpleadoRRHH } from "@/types/rrhh";
import type {
  ConceptoLinea,
  ConceptoRecurrente,
  DetalleNomina,
  LiquidacionFinal,
  MotivoLiquidacion,
  PeriodoNomina,
  Provisiones,
} from "@/types/nomina";

/** Parámetros legales vigentes (editables desde configuración de nómina). */
export const PARAMS_NOMINA = {
  smmlv: 1_623_500,
  auxilioTransporte: 200_000,
  /** El auxilio se paga hasta 2 SMMLV. */
  topeAuxilioSmmlv: 2,
  saludPct: 0.04,
  pensionPct: 0.04,
  /** Fondo de solidaridad pensional desde 4 SMMLV. */
  fspDesdeSmmlv: 4,
  fspPct: 0.01,
  interesesCesantiasPct: 0.12,
  horasMes: 240,
};

export const ROLES_NOMINA: RoleKey[] = ["administrador", "nomina"];
export const puedeGestionarNomina = (rol: RoleKey) => ROLES_NOMINA.includes(rol);

export const ROLES_REPORTES_GERENCIA: RoleKey[] = [
  "administrador",
  "gerente_general",
  "director",
  "nomina",
  "contabilidad",
];

export const hoyISO = () => new Date().toISOString().slice(0, 10);

export const redondear = (v: number) => Math.round(v);

export const valorDia = (salario: number) => salario / 30;
export const valorHora = (salario: number) => salario / PARAMS_NOMINA.horasMes;

export const tieneAuxilioTransporte = (salario: number) =>
  salario <= PARAMS_NOMINA.smmlv * PARAMS_NOMINA.topeAuxilioSmmlv;

export const diasEntreFechas = (desde: string, hasta: string) => {
  const a = new Date(`${desde}T00:00:00`).getTime();
  const b = new Date(`${hasta}T00:00:00`).getTime();
  return Math.max(0, Math.round((b - a) / 86_400_000));
};

/** Días laborados en base 360 (30 días por mes cumplido). */
export const diasBase360 = (desde: string, hasta: string) => {
  const [a1, m1, d1] = desde.split("-").map(Number);
  const [a2, m2, d2] = hasta.split("-").map(Number);
  const dias =
    ((a2 ?? 0) - (a1 ?? 0)) * 360 + ((m2 ?? 0) - (m1 ?? 0)) * 30 + (Math.min(d2 ?? 0, 30) - Math.min(d1 ?? 0, 30));
  return Math.max(0, dias + 1);
};

export const valorRecargo = (salario: number, tipo: TipoHoraExtra, horas: number) =>
  redondear(valorHora(salario) * (1 + RECARGO_HORA_EXTRA[tipo]) * horas);

const ES_RECARGO: TipoHoraExtra[] = ["recargo_nocturno"];

/* -------------------------------- Provisiones -------------------------------- */

export function calcularProvisiones(baseMensual: number, dias: number): Provisiones {
  const prima = redondear((baseMensual * dias) / 360);
  const cesantias = redondear((baseMensual * dias) / 360);
  const interesesCesantias = redondear((cesantias * PARAMS_NOMINA.interesesCesantiasPct * dias) / 360);
  const vacaciones = redondear((baseMensual * dias) / 720);
  return { prima, cesantias, interesesCesantias, vacaciones };
}

/* ----------------------------- Detalle de nómina ----------------------------- */

export function calcularDetalle(input: {
  periodo: Pick<PeriodoNomina, "id" | "desde" | "hasta">;
  empleado: EmpleadoRRHH;
  diasLiquidados?: number;
  horasExtras: HoraExtra[];
  recurrentes: ConceptoRecurrente[];
}): DetalleNomina {
  const { periodo, empleado, horasExtras, recurrentes } = input;
  const dias = input.diasLiquidados ?? 30;
  const salario = empleado.laboral.salario;

  const devengados: ConceptoLinea[] = [];
  const salarioProporcional = redondear(valorDia(salario) * dias);
  devengados.push({ codigo: "101", descripcion: "Salario básico", cantidad: dias, valor: salarioProporcional });

  if (tieneAuxilioTransporte(salario)) {
    devengados.push({
      codigo: "102",
      descripcion: "Auxilio de transporte",
      cantidad: dias,
      valor: redondear((PARAMS_NOMINA.auxilioTransporte / 30) * dias),
    });
  }

  const bonos = recurrentes.filter((c) => c.activo && c.tipo === "bonificacion");
  for (const b of bonos) {
    devengados.push({ codigo: "103", descripcion: `Bonificación · ${b.descripcion}`, valor: b.valorMensual });
  }

  const heDelPeriodo = horasExtras.filter(
    (h) => h.empleadoId === empleado.id && h.fecha >= periodo.desde && h.fecha <= periodo.hasta,
  );
  const extras = heDelPeriodo.filter((h) => !ES_RECARGO.includes(h.tipo));
  const recargos = heDelPeriodo.filter((h) => ES_RECARGO.includes(h.tipo));

  const totalExtras = extras.reduce((s, h) => s + valorRecargo(salario, h.tipo, h.horas), 0);
  const horasExtrasCant = extras.reduce((s, h) => s + h.horas, 0);
  if (totalExtras > 0) {
    devengados.push({ codigo: "104", descripcion: "Horas extras", cantidad: horasExtrasCant, valor: totalExtras });
  }
  const totalRecargos = recargos.reduce((s, h) => s + valorRecargo(salario, h.tipo, h.horas), 0);
  if (totalRecargos > 0) {
    devengados.push({
      codigo: "105",
      descripcion: "Recargos nocturnos",
      cantidad: recargos.reduce((s, h) => s + h.horas, 0),
      valor: totalRecargos,
    });
  }

  const totalDevengado = devengados.reduce((s, d) => s + d.valor, 0);

  /** Base de aportes: excluye el auxilio de transporte (no constituye salario). */
  const baseAportes =
    totalDevengado -
    (devengados.find((d) => d.codigo === "102")?.valor ?? 0) -
    bonos.filter((b) => b.descripcion.toLowerCase().includes("no salarial")).reduce((s, b) => s + b.valorMensual, 0);

  const deducciones: ConceptoLinea[] = [
    { codigo: "201", descripcion: "Aporte salud (4%)", valor: redondear(baseAportes * PARAMS_NOMINA.saludPct) },
    { codigo: "202", descripcion: "Aporte pensión (4%)", valor: redondear(baseAportes * PARAMS_NOMINA.pensionPct) },
  ];

  if (salario >= PARAMS_NOMINA.smmlv * PARAMS_NOMINA.fspDesdeSmmlv) {
    deducciones.push({
      codigo: "203",
      descripcion: "Fondo de solidaridad pensional (1%)",
      valor: redondear(baseAportes * PARAMS_NOMINA.fspPct),
    });
  }

  for (const c of recurrentes.filter((r) => r.activo && r.tipo !== "bonificacion")) {
    const codigo = c.tipo === "libranza" ? "204" : c.tipo === "embargo" ? "205" : "206";
    const prefijo = c.tipo === "libranza" ? "Libranza" : c.tipo === "embargo" ? "Embargo" : "Otro descuento";
    deducciones.push({ codigo, descripcion: `${prefijo} · ${c.descripcion}`, valor: c.valorMensual });
  }

  const totalDeducido = deducciones.reduce((s, d) => s + d.valor, 0);

  return {
    id: `${periodo.id}-${empleado.id}`,
    periodoId: periodo.id,
    empleadoId: empleado.id,
    diasLiquidados: dias,
    salarioBase: salario,
    devengados,
    deducciones,
    totalDevengado,
    totalDeducido,
    netoPagar: totalDevengado - totalDeducido,
    provisiones: calcularProvisiones(baseAportes, dias),
  };
}

/* -------------------------- Liquidación definitiva -------------------------- */

/** Indemnización por despido sin justa causa (contrato a término indefinido). */
export function indemnizacion(salario: number, diasLaborados: number, motivo: MotivoLiquidacion) {
  if (motivo !== "despido") return 0;
  const anios = diasLaborados / 360;
  if (salario < PARAMS_NOMINA.smmlv * 10) {
    const base = 30 + Math.max(0, Math.ceil(anios - 1)) * 20;
    return redondear(valorDia(salario) * base);
  }
  const base = 20 + Math.max(0, Math.ceil(anios - 1)) * 15;
  return redondear(valorDia(salario) * base);
}

export function calcularLiquidacionFinal(input: {
  empleado: EmpleadoRRHH;
  motivo: MotivoLiquidacion;
  fechaRetiro: string;
  diasVacacionesPendientes: number;
  registradoPor: string;
  consecutivo: string;
}): LiquidacionFinal {
  const { empleado, motivo, fechaRetiro, diasVacacionesPendientes } = input;
  const salario = empleado.laboral.salario;
  const ingreso = empleado.laboral.fechaIngreso;
  const diasTotales = diasBase360(ingreso, fechaRetiro);
  const anio = fechaRetiro.slice(0, 4);
  const diasAnio = diasBase360(`${anio}-01-01`, fechaRetiro);
  const inicioSemestre = Number(fechaRetiro.slice(5, 7)) > 6 ? `${anio}-07-01` : `${anio}-01-01`;
  const diasSemestre = diasBase360(inicioSemestre, fechaRetiro);

  const baseAux = tieneAuxilioTransporte(salario) ? PARAMS_NOMINA.auxilioTransporte : 0;
  const basePrestacional = salario + baseAux;

  const conceptos: ConceptoLinea[] = [
    {
      codigo: "301",
      descripcion: "Salario pendiente del mes",
      cantidad: Math.min(30, Number(fechaRetiro.slice(8, 10))),
      valor: redondear(valorDia(salario) * Math.min(30, Number(fechaRetiro.slice(8, 10)))),
    },
    {
      codigo: "302",
      descripcion: "Prima de servicios proporcional",
      cantidad: diasSemestre,
      valor: redondear((basePrestacional * diasSemestre) / 360),
    },
    {
      codigo: "303",
      descripcion: "Cesantías proporcionales",
      cantidad: diasAnio,
      valor: redondear((basePrestacional * diasAnio) / 360),
    },
    {
      codigo: "304",
      descripcion: "Intereses sobre cesantías (12%)",
      cantidad: diasAnio,
      valor: redondear(((basePrestacional * diasAnio) / 360) * PARAMS_NOMINA.interesesCesantiasPct * (diasAnio / 360)),
    },
    {
      codigo: "305",
      descripcion: "Vacaciones pendientes",
      cantidad: diasVacacionesPendientes,
      valor: redondear(valorDia(salario) * diasVacacionesPendientes),
    },
  ];

  const indem = indemnizacion(salario, diasTotales, motivo);
  if (indem > 0) {
    conceptos.push({ codigo: "306", descripcion: "Indemnización por despido sin justa causa", valor: indem });
  }

  const salarioMes = redondear(valorDia(salario) * Math.min(30, Number(fechaRetiro.slice(8, 10))));
  const deducciones: ConceptoLinea[] = [
    { codigo: "401", descripcion: "Aporte salud (4%)", valor: redondear(salarioMes * PARAMS_NOMINA.saludPct) },
    { codigo: "402", descripcion: "Aporte pensión (4%)", valor: redondear(salarioMes * PARAMS_NOMINA.pensionPct) },
  ];

  const total =
    conceptos.reduce((s, c) => s + c.valor, 0) - deducciones.reduce((s, d) => s + d.valor, 0);

  return {
    id: `liq-${empleado.id}-${fechaRetiro}`,
    consecutivo: input.consecutivo,
    empleadoId: empleado.id,
    motivo,
    fechaIngreso: ingreso,
    fechaRetiro,
    diasLaborados: diasTotales,
    salarioBase: salario,
    conceptos,
    deducciones,
    totalPagar: total,
    fechaCalculo: hoyISO(),
    registradoPor: input.registradoPor,
  };
}

/* ------------------------------- Totalizadores ------------------------------- */

export interface TotalesPeriodo {
  empleados: number;
  devengado: number;
  deducido: number;
  neto: number;
  provisiones: Provisiones;
  costoTotal: number;
}

export function totalesPeriodo(p: PeriodoNomina): TotalesPeriodo {
  const acc: TotalesPeriodo = {
    empleados: p.detalles.length,
    devengado: 0,
    deducido: 0,
    neto: 0,
    provisiones: { prima: 0, cesantias: 0, interesesCesantias: 0, vacaciones: 0 },
    costoTotal: 0,
  };
  for (const d of p.detalles) {
    acc.devengado += d.totalDevengado;
    acc.deducido += d.totalDeducido;
    acc.neto += d.netoPagar;
    acc.provisiones.prima += d.provisiones.prima;
    acc.provisiones.cesantias += d.provisiones.cesantias;
    acc.provisiones.interesesCesantias += d.provisiones.interesesCesantias;
    acc.provisiones.vacaciones += d.provisiones.vacaciones;
  }
  const prov = acc.provisiones;
  acc.costoTotal =
    acc.devengado + prov.prima + prov.cesantias + prov.interesesCesantias + prov.vacaciones;
  return acc;
}

export const totalDevengadoPorTipo = (p: PeriodoNomina, codigo: string) =>
  p.detalles.reduce(
    (s, d) => s + d.devengados.filter((x) => x.codigo === codigo).reduce((a, b) => a + b.valor, 0),
    0,
  );
