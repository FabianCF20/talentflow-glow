/**
 * Formatos de presentación compartidos (moneda, nombres, iniciales).
 *
 * Todas las funciones toleran datos incompletos: si un registro llega sin
 * nombre o sin valor, devuelven un texto seguro en vez de romper la pantalla.
 */

const COP = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

/** Formatea un valor en pesos colombianos sin decimales. Ej.: `$ 1.750.000`. */
export const formatCOP = (v: number | string | null | undefined) => COP.format(Number(v) || 0);

/** Datos mínimos para mostrar el nombre de una persona. */
export interface ConNombre {
  nombres?: string;
  apellidos?: string;
  /** Algunos registros antiguos guardan el nombre completo en un solo campo. */
  nombre?: string;
}

/** Nombre completo "Nombres Apellidos", o "Sin nombre" si no hay datos. */
export function nombreCompleto(p?: ConNombre | null) {
  const completo = `${p?.nombres ?? ""} ${p?.apellidos ?? ""}`.trim();
  return completo || p?.nombre || "Sin nombre";
}

/** Iniciales en mayúscula (primera letra de nombres y apellidos). */
export function iniciales(p?: ConNombre | null, respaldo = "?") {
  const ini = `${(p?.nombres ?? "").charAt(0)}${(p?.apellidos ?? "").charAt(0)}`.toUpperCase();
  return ini || (p?.nombre ?? "").charAt(0).toUpperCase() || respaldo;
}
