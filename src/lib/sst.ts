import { CARGOS, EMPLEADOS, areasDeDireccion } from "@/data/organizacion";
import type {
  AccidenteLaboral,
  CampoFormulario,
  CapacitacionSST,
  ExamenMedico,
  Formulario,
  RespuestaFormulario,
  ValorRespuesta,
} from "@/types/sst";
import type { RoleKey } from "@/types/entities";

export const hoyISO = () => new Date().toISOString().slice(0, 10);
export const horaActual = () => new Date().toTimeString().slice(0, 5);

export const ROLES_SST: RoleKey[] = ["administrador", "sst", "talento_humano"];
export const puedeGestionarSST = (rol: RoleKey) => ROLES_SST.includes(rol);

export const consecutivoSST = (prefijo: string, n: number) =>
  `${prefijo}-${new Date().getFullYear()}-${String(n).padStart(4, "0")}`;

export const sumarMeses = (fecha: string, meses: number) => {
  const d = new Date(`${fecha}T00:00:00`);
  d.setMonth(d.getMonth() + meses);
  return d.toISOString().slice(0, 10);
};

export const diasHasta = (fecha?: string) => {
  if (!fecha) return null;
  const ms = new Date(`${fecha}T00:00:00`).getTime() - new Date(`${hoyISO()}T00:00:00`).getTime();
  return Math.round(ms / 86_400_000);
};

/* --------------------------- Indicadores SST --------------------------- */

export interface IndicadoresSST {
  totalEventos: number;
  accidentes: number;
  incidentes: number;
  enfermedades: number;
  diasPerdidos: number;
  /** Índice de frecuencia: accidentes * 200.000 / horas hombre trabajadas. */
  frecuencia: number;
  /** Índice de severidad: días perdidos * 200.000 / horas hombre trabajadas. */
  severidad: number;
  /** Índice de lesiones incapacitantes. */
  ili: number;
  investigacionesAbiertas: number;
  coberturaCapacitacion: number;
  horasCapacitacion: number;
  examenesVigentes: number;
  examenesPendientes: number;
  examenesPorVencer: number;
}

const HORAS_HOMBRE_MES = 192;

export function calcularIndicadores(
  accidentes: AccidenteLaboral[],
  capacitaciones: CapacitacionSST[],
  examenes: ExamenMedico[],
  totalEmpleados: number,
): IndicadoresSST {
  const horasHombre = Math.max(totalEmpleados * HORAS_HOMBRE_MES * 12, 1);
  const at = accidentes.filter((a) => a.tipo === "accidente");
  const diasPerdidos = accidentes.reduce((s, a) => s + a.diasIncapacidad, 0);
  const frecuencia = (at.length * 200_000) / horasHombre;
  const severidad = (diasPerdidos * 200_000) / horasHombre;

  const capacitados = new Set(
    capacitaciones.flatMap((c) => c.asistentes.filter((a) => a.asistio).map((a) => a.empleadoId)),
  );

  return {
    totalEventos: accidentes.length,
    accidentes: at.length,
    incidentes: accidentes.filter((a) => a.tipo === "incidente").length,
    enfermedades: accidentes.filter((a) => a.tipo === "enfermedad_laboral").length,
    diasPerdidos,
    frecuencia: Number(frecuencia.toFixed(2)),
    severidad: Number(severidad.toFixed(2)),
    ili: Number(((frecuencia * severidad) / 1000).toFixed(2)),
    investigacionesAbiertas: accidentes.filter((a) => a.estadoInvestigacion !== "cerrado").length,
    coberturaCapacitacion: totalEmpleados
      ? Math.round((capacitados.size / totalEmpleados) * 100)
      : 0,
    horasCapacitacion: capacitaciones.reduce(
      (s, c) => s + c.duracionHoras * c.asistentes.filter((a) => a.asistio).length,
      0,
    ),
    examenesVigentes: examenes.filter(
      (e) => e.concepto !== "pendiente" && (diasHasta(e.vigenciaHasta) ?? 1) > 0,
    ).length,
    examenesPendientes: examenes.filter((e) => e.concepto === "pendiente").length,
    examenesPorVencer: examenes.filter((e) => {
      const d = diasHasta(e.vigenciaHasta);
      return d !== null && d >= 0 && d <= 60;
    }).length,
  };
}

/* ---------------------- Alcance de los formularios ---------------------- */

export function destinatariosDe(f: Formulario): string[] {
  const activos = EMPLEADOS.filter((e) => e.estado === "activo");
  switch (f.asignacion.tipo) {
    case "empleado":
      return f.asignacion.valores;
    case "cargo":
      return activos.filter((e) => f.asignacion.valores.includes(e.cargoId)).map((e) => e.id);
    case "area": {
      const areas = new Set(f.asignacion.valores.flatMap((a) => areasDeDireccion(a)));
      return activos.filter((e) => areas.has(e.areaId)).map((e) => e.id);
    }
    case "empresa":
    default:
      return activos.map((e) => e.id);
  }
}

export const cargoNombre = (id?: string) => CARGOS.find((c) => c.id === id)?.nombre ?? "—";

/* ------------------------ Estadísticas de respuestas ------------------------ */

export interface EstadisticaCampo {
  campo: CampoFormulario;
  respuestas: number;
  /** Conteo por opción (selección, booleano). */
  distribucion: { etiqueta: string; total: number; porcentaje: number }[];
  /** Promedio para escalas. */
  promedio?: number;
  /** Muestras de texto libre. */
  textos?: string[];
}

const comoTexto = (v: ValorRespuesta) => (typeof v === "boolean" ? (v ? "Verdadero" : "Falso") : String(v));

export function estadisticasFormulario(
  formulario: Formulario,
  respuestas: RespuestaFormulario[],
): EstadisticaCampo[] {
  const propias = respuestas.filter((r) => r.formularioId === formulario.id);
  return formulario.campos.map((campo) => {
    const valores = propias
      .map((r) => r.valores[campo.id])
      .filter((v) => v !== undefined && v !== "" && !(Array.isArray(v) && v.length === 0)) as ValorRespuesta[];

    if (campo.tipo === "texto") {
      return {
        campo,
        respuestas: valores.length,
        distribucion: [],
        textos: valores.map(comoTexto).slice(0, 20),
      };
    }

    if (campo.tipo === "escala") {
      const nums = valores.map((v) => Number(v)).filter((n) => !Number.isNaN(n));
      const min = campo.escalaMin ?? 1;
      const max = campo.escalaMax ?? 5;
      const conteo = new Map<string, number>();
      for (let i = min; i <= max; i++) conteo.set(String(i), 0);
      nums.forEach((n) => conteo.set(String(n), (conteo.get(String(n)) ?? 0) + 1));
      return {
        campo,
        respuestas: nums.length,
        promedio: nums.length ? Number((nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(2)) : undefined,
        distribucion: [...conteo.entries()].map(([etiqueta, total]) => ({
          etiqueta,
          total,
          porcentaje: nums.length ? Math.round((total / nums.length) * 100) : 0,
        })),
      };
    }

    const opciones =
      campo.tipo === "booleano" ? ["Verdadero", "Falso"] : (campo.opciones ?? []);
    const conteo = new Map<string, number>(opciones.map((o) => [o, 0]));
    valores.forEach((v) => {
      const lista = Array.isArray(v) ? v : [comoTexto(v)];
      lista.forEach((item) => conteo.set(item, (conteo.get(item) ?? 0) + 1));
    });
    const base = valores.length || 1;
    return {
      campo,
      respuestas: valores.length,
      distribucion: [...conteo.entries()].map(([etiqueta, total]) => ({
        etiqueta,
        total,
        porcentaje: Math.round((total / base) * 100),
      })),
    };
  });
}

/** Huella determinística de la aceptación digital (trazabilidad de la firma). */
export function huellaFirma(empleadoId: string, consecutivo: string, fechaHora: string) {
  const raw = `${empleadoId}|${consecutivo}|${fechaHora}`;
  let h = 0;
  for (const ch of raw) h = (h * 31 + ch.charCodeAt(0)) % 0xffffffff;
  return `FD-${h.toString(16).toUpperCase().padStart(8, "0")}`;
}
