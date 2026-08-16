import { EMPLEADOS_RRHH } from "@/data/rrhh";
import { HORAS_EXTRAS_INICIALES } from "@/data/operaciones";
import { calcularDetalle, hoyISO } from "@/lib/nomina";
import { ESTADOS_VINCULADOS } from "@/types/rrhh";
import type { ConceptoRecurrente, LiquidacionFinal, PeriodoNomina } from "@/types/nomina";

/** Datos de demostración del módulo de nómina: 12 periodos históricos. */

const VINCULADOS = EMPLEADOS_RRHH.filter((e) => ESTADOS_VINCULADOS.includes(e.estadoLaboral));

export const RECURRENTES_INICIALES: ConceptoRecurrente[] = [
  { id: "rc-1", empleadoId: "e-001", tipo: "bonificacion", descripcion: "Bonificación por resultados", valorMensual: 1_200_000, activo: true },
  { id: "rc-2", empleadoId: "e-002", tipo: "bonificacion", descripcion: "Auxilio de rodamiento (no salarial)", valorMensual: 450_000, activo: true },
  { id: "rc-3", empleadoId: "e-004", tipo: "libranza", descripcion: "Banco Popular · crédito libre inversión", valorMensual: 380_000, activo: true },
  { id: "rc-4", empleadoId: "e-005", tipo: "libranza", descripcion: "Fondo de empleados · cuota mensual", valorMensual: 150_000, activo: true },
  { id: "rc-5", empleadoId: "e-006", tipo: "embargo", descripcion: "Juzgado 12 de Familia · alimentos", valorMensual: 520_000, activo: true },
  { id: "rc-6", empleadoId: "e-008", tipo: "otro", descripcion: "Préstamo interno de vivienda", valorMensual: 260_000, activo: true },
  { id: "rc-7", empleadoId: "e-010", tipo: "bonificacion", descripcion: "Bonificación de productividad", valorMensual: 600_000, activo: true },
  { id: "rc-8", empleadoId: "e-011", tipo: "libranza", descripcion: "Cooperativa Coomeva", valorMensual: 210_000, activo: true },
];

const mesISO = (anio: number, mes: number, dia: number) =>
  `${anio}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;

const ultimoDia = (anio: number, mes: number) => new Date(anio, mes, 0).getDate();

function construirPeriodos(): PeriodoNomina[] {
  const hoy = new Date();
  const periodos: PeriodoNomina[] = [];
  for (let i = 11; i >= 0; i--) {
    const ref = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
    const anio = ref.getFullYear();
    const mes = ref.getMonth() + 1;
    const id = `np-${anio}-${String(mes).padStart(2, "0")}`;
    const desde = mesISO(anio, mes, 1);
    const hasta = mesISO(anio, mes, ultimoDia(anio, mes));
    const abierto = i === 0;
    const periodo: PeriodoNomina = {
      id,
      codigo: `NOM-${anio}-${String(mes).padStart(2, "0")}`,
      anio,
      mes,
      desde,
      hasta,
      estado: abierto ? "abierta" : i === 1 ? "liquidada" : "pagada",
      detalles: [],
      liquidadoPor: abierto ? undefined : "Sistema de nómina",
      fechaLiquidacion: abierto ? undefined : hasta,
    };
    if (!abierto) {
      periodo.detalles = VINCULADOS.map((emp) =>
        calcularDetalle({
          periodo,
          empleado: emp,
          horasExtras: HORAS_EXTRAS_INICIALES,
          recurrentes: RECURRENTES_INICIALES.filter((r) => r.empleadoId === emp.id),
        }),
      );
    }
    periodos.push(periodo);
  }
  return periodos;
}

export const PERIODOS_INICIALES: PeriodoNomina[] = construirPeriodos();

export const LIQUIDACIONES_INICIALES: LiquidacionFinal[] = [
  {
    id: "liq-e-014",
    consecutivo: "LIQ-2026-0001",
    empleadoId: "e-014",
    motivo: "terminacion",
    fechaIngreso: "2023-02-01",
    fechaRetiro: "2026-06-30",
    diasLaborados: 1230,
    salarioBase: 2_950_000,
    conceptos: [
      { codigo: "301", descripcion: "Salario pendiente del mes", cantidad: 30, valor: 2_950_000 },
      { codigo: "302", descripcion: "Prima de servicios proporcional", cantidad: 180, valor: 1_575_000 },
      { codigo: "303", descripcion: "Cesantías proporcionales", cantidad: 180, valor: 1_575_000 },
      { codigo: "304", descripcion: "Intereses sobre cesantías (12%)", cantidad: 180, valor: 94_500 },
      { codigo: "305", descripcion: "Vacaciones pendientes", cantidad: 8, valor: 786_667 },
    ],
    deducciones: [
      { codigo: "401", descripcion: "Aporte salud (4%)", valor: 118_000 },
      { codigo: "402", descripcion: "Aporte pensión (4%)", valor: 118_000 },
    ],
    totalPagar: 6_745_167,
    fechaCalculo: "2026-07-02",
    registradoPor: "Usuario (nomina)",
  },
];

export const VACACIONES_PENDIENTES_DEMO: Record<string, number> = Object.fromEntries(
  VINCULADOS.map((e, i) => [e.id, [15, 8, 22, 4, 11, 18, 6][i % 7] ?? 10]),
);

export const FECHA_DEMO = hoyISO();
