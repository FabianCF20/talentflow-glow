/**
 * Utilidades de fecha compartidas por todos los módulos.
 *
 * Convención del sistema: las fechas se guardan como texto ISO `AAAA-MM-DD`
 * y las horas como `HH:MM`. Así se ordenan alfabéticamente y se comparan sin
 * problemas de zona horaria. Use siempre estas funciones en lugar de repetir
 * `new Date().toISOString().slice(0, 10)` en cada archivo.
 */

/** Convierte un `Date` a texto `AAAA-MM-DD`. */
export const aISO = (d: Date) => d.toISOString().slice(0, 10);

/** Fecha de hoy en formato `AAAA-MM-DD`. */
export const hoyISO = () => aISO(new Date());

/** Hora actual en formato `HH:MM`. */
export const horaActual = () => new Date().toTimeString().slice(0, 5);

/** Suma (o resta, si es negativo) días a una fecha `AAAA-MM-DD`. */
export function sumarDias(fecha: string, dias: number) {
  const d = new Date(`${fecha}T00:00:00`);
  d.setDate(d.getDate() + dias);
  return aISO(d);
}

/** Suma (o resta, si es negativo) meses a una fecha `AAAA-MM-DD`. */
export function sumarMeses(fecha: string, meses: number) {
  const d = new Date(`${fecha}T00:00:00`);
  d.setMonth(d.getMonth() + meses);
  return aISO(d);
}

/** Días calendario entre dos fechas, ambas incluidas. Devuelve 0 si el rango no es válido. */
export function diasEntre(desde: string, hasta: string) {
  const d = new Date(`${desde}T00:00:00`).getTime();
  const h = new Date(`${hasta}T00:00:00`).getTime();
  if (Number.isNaN(d) || Number.isNaN(h) || h < d) return 0;
  return Math.round((h - d) / 86_400_000) + 1;
}
