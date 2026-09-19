import type { RoleKey } from "@/types/entities";
import { empleadoById } from "@/data/organizacion";
import {
  JORNADA,
  RECARGO_HORA_EXTRA,
  type CalculoAsistencia,
  type RegistroAsistencia,
  type TipoHoraExtra,
} from "@/types/operaciones";

/** Utilidades de cálculo y reglas de los procesos operativos. */

export const hoyISO = () => new Date().toISOString().slice(0, 10);
export const horaActual = () => new Date().toTimeString().slice(0, 5);

export const aMinutos = (hhmm?: string) => {
  if (!hhmm || !/^\d{1,2}:\d{2}$/.test(hhmm)) return null;
  const [h, m] = hhmm.split(":").map(Number);
  return h! * 60 + m!;
};

export const formatoHoras = (minutos: number) => {
  const signo = minutos < 0 ? "-" : "";
  const abs = Math.abs(Math.round(minutos));
  return `${signo}${Math.floor(abs / 60)}h ${String(abs % 60).padStart(2, "0")}m`;
};

/** Días calendario entre dos fechas (inclusive). */
export const diasEntre = (desde: string, hasta: string) => {
  const d = new Date(`${desde}T00:00:00`).getTime();
  const h = new Date(`${hasta}T00:00:00`).getTime();
  if (Number.isNaN(d) || Number.isNaN(h) || h < d) return 0;
  return Math.round((h - d) / 86_400_000) + 1;
};

export function sumarDias(fecha: string, dias: number) {
  const d = new Date(`${fecha}T00:00:00`);
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10);
}

/** Horas trabajadas, tardanza y ausencia a partir de las marcaciones del supervisor. */
export function calcularAsistencia(r: RegistroAsistencia): CalculoAsistencia {
  if (r.ausente) {
    return {
      minutosTrabajados: 0,
      minutosAlmuerzo: 0,
      minutosRecesos: 0,
      minutosTardanza: 0,
      ausencia: true,
      incompleto: false,
    };
  }

  const ingreso = aMinutos(r.horaIngreso);
  const salida = aMinutos(r.horaSalida);
  const almuerzoIni = aMinutos(r.inicioAlmuerzo);
  const almuerzoFin = aMinutos(r.finAlmuerzo);

  const minutosAlmuerzo =
    almuerzoIni !== null && almuerzoFin !== null && almuerzoFin > almuerzoIni
      ? almuerzoFin - almuerzoIni
      : 0;

  const minutosRecesos = r.recesos.reduce((acc, rec) => {
    const ini = aMinutos(rec.inicio);
    const fin = aMinutos(rec.fin);
    return acc + (ini !== null && fin !== null && fin > ini ? fin - ini : 0);
  }, 0);

  const entradaEsperada = aMinutos(JORNADA.horaEntrada)!;
  const minutosTardanza =
    ingreso !== null ? Math.max(0, ingreso - entradaEsperada - JORNADA.toleranciaMinutos) : 0;

  const bruto = ingreso !== null && salida !== null && salida > ingreso ? salida - ingreso : 0;
  const minutosTrabajados = Math.max(0, bruto - minutosAlmuerzo - minutosRecesos);

  return {
    minutosTrabajados,
    minutosAlmuerzo,
    minutosRecesos,
    minutosTardanza,
    ausencia: false,
    incompleto: ingreso === null || salida === null,
  };
}

export const esTardanza = (r: RegistroAsistencia) => calcularAsistencia(r).minutosTardanza > 0;

/** Resumen del día/periodo para el panel del supervisor. */
export function resumenAsistencia(registros: RegistroAsistencia[]) {
  const calculos = registros.map(calcularAsistencia);
  return {
    minutosTrabajados: calculos.reduce((a, c) => a + c.minutosTrabajados, 0),
    tardanzas: calculos.filter((c) => c.minutosTardanza > 0).length,
    minutosTardanza: calculos.reduce((a, c) => a + c.minutosTardanza, 0),
    ausencias: calculos.filter((c) => c.ausencia).length,
    incompletos: calculos.filter((c) => c.incompleto).length,
    jornadasCompletas: calculos.filter((c) => c.minutosTrabajados >= JORNADA.minutosJornada).length,
  };
}

/** Valor aproximado de la hora extra según salario mensual (240 horas/mes). */
export function valorHoraExtra(salarioMensual: number, tipo: TipoHoraExtra, horas: number) {
  const valorHora = salarioMensual / 240;
  return Math.round(valorHora * (1 + RECARGO_HORA_EXTRA[tipo]) * horas);
}

/* ------------------------------- Reglas de rol ------------------------------ */

export const ROLES_RRHH_OP: RoleKey[] = ["administrador", "talento_humano"];
export const ROLES_JEFE_OP: RoleKey[] = ["administrador", "jefe", "director", "gerente_general"];
export const ROLES_SUPERVISOR_OP: RoleKey[] = ["administrador", "supervisor", "jefe"];
export const ROLES_NOMINA_OP: RoleKey[] = ["administrador", "nomina"];

export const esRrhhOp = (rol: RoleKey) => ROLES_RRHH_OP.includes(rol);
export const esJefeOp = (rol: RoleKey) => ROLES_JEFE_OP.includes(rol);
export const esSupervisorOp = (rol: RoleKey) => ROLES_SUPERVISOR_OP.includes(rol);
export const esNominaOp = (rol: RoleKey) => ROLES_NOMINA_OP.includes(rol);

/** Supervisor (jefe inmediato) que debe ser notificado de una incapacidad. */
export const supervisorDe = (empleadoId: string) => empleadoById(empleadoId)?.jefeInmediatoId;

export const consecutivo = (prefijo: string, n: number) =>
  `${prefijo}-${new Date().getFullYear()}-${String(n).padStart(4, "0")}`;
