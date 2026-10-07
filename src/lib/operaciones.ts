import type { RoleKey } from "@/types/entities";
import { empleadoById } from "@/data/organizacion";
import {
  JORNADA,
  RECARGO_HORA_EXTRA,
  type CalculoAsistencia,
  type RegistroAsistencia,
  type TipoHoraExtra,
} from "@/types/operaciones";
// Utilidades de fecha compartidas (se re-exportan para no romper importaciones existentes).
export { hoyISO, horaActual, diasEntre, sumarDias } from "./fechas";

/** Utilidades de cálculo y reglas de los procesos operativos. */


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


/** Horas trabajadas, tardanza y ausencia a partir de las marcaciones del supervisor. */
export function calcularAsistencia(r: RegistroAsistencia): CalculoAsistencia {
  if (r.ausente) {
    return {
      minutosTrabajados: 0,
      minutosTardanza: 0,
      ausencia: true,
      incompleto: false,
    };
  }

  const ingreso = aMinutos(r.horaIngreso);
  const salida = aMinutos(r.horaSalida);
  const entradaEsperada = aMinutos(JORNADA.horaEntrada)!;
  const minutosTardanza =
    ingreso !== null ? Math.max(0, ingreso - entradaEsperada - JORNADA.toleranciaMinutos) : 0;

  const bruto = ingreso !== null && salida !== null && salida > ingreso ? salida - ingreso : 0;
  return {
    minutosTrabajados: bruto,
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
