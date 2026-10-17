/** Alcance documental por función; las consultas y las pantallas comparten estas reglas. */
import type { RoleKey } from "@/types/entities";
import type { CategoriaDocumento } from "@/types/portal";

/** Solo administración y Talento Humano gestionan el expediente completo. */
export function gestionaDocumentacion(roles: RoleKey[]): boolean {
  return roles.some((rol) => rol === "administrador" || rol === "talento_humano");
}

/** SST consulta únicamente soportes ocupacionales e incapacidades, además de sus propios documentos. */
export function puedeLeerDocumento(roles: RoleKey[], propioId: string, documento: { empleadoId: string; categoria?: string }): boolean {
  return gestionaDocumentacion(roles)
    || Boolean(propioId && documento.empleadoId === propioId)
    || (roles.includes("sst") && ["sst", "incapacidades"].includes(documento.categoria ?? ""));
}

/** Categorías disponibles para el trabajo documental, no para la autoconsulta. */
export function categoriasGestionables(roles: RoleKey[]): CategoriaDocumento[] {
  if (gestionaDocumentacion(roles)) return ["personales", "academicos", "contractuales", "sst", "disciplinarios", "incapacidades"];
  return roles.includes("sst") ? ["sst", "incapacidades"] : [];
}

/** Describe una consulta de mínima lectura: las condiciones se combinan con OR. */
export function alcanceConsultaDocumental(roles: RoleKey[], empleadoId: string, categorias = false) {
  if (gestionaDocumentacion(roles)) return { enabled: true };
  const filtros: { campo: string; valor: string | string[] }[] = [];
  if (empleadoId) filtros.push({ campo: "empleadoId", valor: empleadoId });
  if (categorias && roles.includes("sst")) filtros.push({ campo: "categoria", valor: ["sst", "incapacidades"] });
  return { enabled: filtros.length > 0, filtros };
}