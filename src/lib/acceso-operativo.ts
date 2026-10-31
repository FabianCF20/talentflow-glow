import type { RoleKey } from "@/types/entities";

type Filtro = { campo: string; valor: string | string[]; operador?: "==" | "in" | "array-contains" };
type Alcance = { enabled?: boolean; filtros?: Filtro[] };

/**
 * Construye consultas compatibles con las reglas de Firestore.
 * Las colecciones operativas se consultan por empleadoId para no pedir
 * documentos ajenos al alcance del usuario.
 */
export function alcanceOperacion(
  roles: RoleKey[],
  empleadoId: string,
  subordinadosIds: string[],
  modulo: "solicitudes" | "incapacidades" | "asistencia" | "horasExtras" | "novedades",
): Alcance {
  const rrhh = roles.some((r) => r === "administrador" || r === "talento_humano");
  const nomina = roles.some((r) => r === "administrador" || r === "nomina");
  const consultaNomina = rrhh || roles.some((r) => r === "nomina" || r === "contabilidad");
  const sst = rrhh || roles.includes("sst");

  if (
    (modulo === "solicitudes" && rrhh) ||
    (modulo === "incapacidades" && sst) ||
    (modulo === "asistencia" && (rrhh || nomina)) ||
    (modulo === "horasExtras" && consultaNomina) ||
    (modulo === "novedades" && (rrhh || nomina))
  ) {
    return { enabled: true };
  }

  // Las novedades operativas no son un historial personal para empleados.
  if (modulo === "novedades") {
    const ids = [...new Set(subordinadosIds.filter(Boolean))];
    return ids.length
      ? { filtros: ids.map((id) => ({ campo: "empleadoId", valor: id })) }
      : { enabled: false };
  }

  const ids = [...new Set([empleadoId, ...subordinadosIds].filter(Boolean))];
  return ids.length
    ? { filtros: ids.map((id) => ({ campo: "empleadoId", valor: id })) }
    : { enabled: false };
}

/** Alcance reutilizable para colecciones protegidas por empleadoId o ID de documento. */
export function alcancePorEmpleado(
  roles: RoleKey[],
  empleadoId: string,
  subordinadosIds: string[],
  rolesGlobales: RoleKey[],
  opciones: { incluirPropio?: boolean; incluirSubordinados?: boolean; campo?: string } = {},
): Alcance {
  if (roles.some((rol) => rolesGlobales.includes(rol))) return { enabled: true };
  const campo = opciones.campo ?? "empleadoId";
  const ids = [
    ...(opciones.incluirPropio === false ? [] : [empleadoId]),
    ...(opciones.incluirSubordinados === false ? [] : subordinadosIds),
  ].filter(Boolean);
  const unicos = [...new Set(ids)];
  return unicos.length
    ? { filtros: unicos.map((id) => ({ campo, valor: id })) }
    : { enabled: false };
}
