import type { RoleKey } from "@/types/entities";
import type { EmpleadoOrg } from "@/types/organizacion";
import { EMPLEADOS, areasDeDireccion, empleadoById, subordinadosDe } from "@/data/organizacion";

/**
 * Reglas de visibilidad de personal y de salarios.
 * Gerente: global · Director: toda su dirección · Jefe: personal a cargo ·
 * Supervisor: personal asignado (directos) · Empleado: solo su propia información.
 */

export type AlcanceVisibilidad = "global" | "direccion" | "a_cargo" | "asignado" | "propio";

export const ALCANCE_LABEL: Record<AlcanceVisibilidad, string> = {
  global: "Toda la organización",
  direccion: "Toda su dirección",
  a_cargo: "Personal a cargo (directo e indirecto)",
  asignado: "Personal asignado directamente",
  propio: "Únicamente información propia",
};

/** Roles con visibilidad global de salarios. */
export const ROLES_SALARIO_GLOBAL: RoleKey[] = [
  "administrador",
  "gerente_general",
  "director",
  "nomina",
  "contabilidad",
];

const ROL_ALCANCE: Record<RoleKey, AlcanceVisibilidad> = {
  administrador: "global",
  gerente_general: "global",
  director: "direccion",
  talento_humano: "global",
  nomina: "global",
  contabilidad: "global",
  sst: "global",
  jefe: "a_cargo",
  supervisor: "asignado",
  empleado: "propio",
};

const ORDEN: AlcanceVisibilidad[] = ["propio", "asignado", "a_cargo", "direccion", "global"];

export function alcanceDe(roles: RoleKey[]): AlcanceVisibilidad {
  return roles.reduce<AlcanceVisibilidad>((acc, r) => {
    const a = ROL_ALCANCE[r] ?? "propio";
    return ORDEN.indexOf(a) > ORDEN.indexOf(acc) ? a : acc;
  }, "propio");
}

/** Empleados visibles para un usuario según su rol y su posición en el organigrama. */
export function empleadosVisibles(
  empleadoId: string,
  roles: RoleKey[],
  empleados: EmpleadoOrg[] = EMPLEADOS,
): EmpleadoOrg[] {
  const alcance = alcanceDe(roles);
  const yo = empleadoById(empleadoId);
  switch (alcance) {
    case "global":
      return empleados;
    case "direccion": {
      if (!yo) return [];
      const areas = areasDeDireccion(yo.areaId);
      return empleados.filter((e) => areas.includes(e.areaId));
    }
    case "a_cargo": {
      const ids = new Set([empleadoId, ...subordinadosDe(empleadoId, empleados)]);
      return empleados.filter((e) => ids.has(e.id));
    }
    case "asignado":
      return empleados.filter((e) => e.id === empleadoId || e.jefeInmediatoId === empleadoId);
    default:
      return empleados.filter((e) => e.id === empleadoId);
  }
}

/** ¿Puede el usuario ver el salario de un empleado concreto? */
export function puedeVerSalario(
  empleadoId: string,
  roles: RoleKey[],
  objetivoId: string,
  empleados: EmpleadoOrg[] = EMPLEADOS,
): boolean {
  if (roles.some((r) => ROLES_SALARIO_GLOBAL.includes(r))) return true;
  if (objetivoId === empleadoId) return true;
  if (roles.includes("jefe")) return subordinadosDe(empleadoId, empleados).includes(objetivoId);
  if (roles.includes("supervisor"))
    return empleados.some((e) => e.id === objetivoId && e.jefeInmediatoId === empleadoId);
  return false;
}

export const MATRIZ_VISIBILIDAD: {
  rol: RoleKey;
  personal: string;
  salarios: string;
}[] = [
  { rol: "gerente_general", personal: "Acceso global a toda la organización", salarios: "Salarios globales" },
  { rol: "director", personal: "Toda su dirección y áreas dependientes", salarios: "Salarios globales" },
  { rol: "jefe", personal: "Únicamente personal a cargo", salarios: "Solo personal a cargo" },
  { rol: "supervisor", personal: "Únicamente personal asignado", salarios: "Solo personal asignado" },
  { rol: "nomina", personal: "Toda la organización (fines de liquidación)", salarios: "Salarios globales" },
  { rol: "contabilidad", personal: "Toda la organización (fines contables)", salarios: "Salarios globales" },
  { rol: "talento_humano", personal: "Toda la organización", salarios: "Sin acceso salarial global" },
  { rol: "empleado", personal: "Solo su propia información", salarios: "Solo su propio salario" },
];
