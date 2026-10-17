/**
 * Reglas de Recursos Humanos: expediente, hoja de vida y estados laborales.
 */
import type { RoleKey } from "@/types/entities";
import {
  ESTADOS_VINCULADOS,
  TIPO_CONTRATO_LABEL,
  type ChecklistsEmpleado,
  type DatosBancarios,
  type DatosPersonales,
  type EmpleadoRRHH,
  type EventoHojaVida,
  type ExpedienteEmpleado,
  type InformacionLaboral,
  type ItemChecklist,
  type SeguridadSocial,
  type TipoEventoHV,
} from "@/types/rrhh";
import { areaById, cargoById, centroCostoById, centroTrabajoById, empleadoById } from "@/data/organizacion";
import { formatCOP } from "@/types/organizacion";
import { hoyISO as hoy } from "./fechas";

/** Roles autorizados a modificar cargo, salario, área, centro de costo y jefe inmediato. */
export const ROLES_RRHH: RoleKey[] = ["administrador", "talento_humano"];

export const puedeEditarCamposSensibles = (roles: RoleKey[]) =>
  roles.some((r) => ROLES_RRHH.includes(r));

/** Empleados que aparecen en listados activos (los retirados quedan fuera). */
export const esVinculado = (e: EmpleadoRRHH) => ESTADOS_VINCULADOS.includes(e.estadoLaboral);

export const nombreArea = (id?: string) => areaById(id)?.nombre ?? "—";
export const nombreCargo = (id?: string) => cargoById(id)?.nombre ?? "—";
export const nombreCentroCosto = (id?: string) => centroCostoById(id)?.nombre ?? "—";
export const nombreCentroTrabajo = (id?: string) => centroTrabajoById(id)?.nombre ?? "—";
export const nombreJefe = (id?: string) => {
  const e = empleadoById(id);
  return e ? `${e.nombres} ${e.apellidos}` : "Sin jefe asignado";
};

const LABEL_CAMPO: Record<keyof InformacionLaboral, string> = {
  fechaIngreso: "Fecha de ingreso",
  areaId: "Área",
  dependenciaId: "Dependencia",
  cargoId: "Cargo",
  centroCostoId: "Centro de costo",
  centroTrabajoId: "Centro de trabajo",
  jefeInmediatoId: "Jefe inmediato",
  tipoContrato: "Tipo de contrato",
  salario: "Salario",
  fechaFinContrato: "Fin de contrato",
  fechaRetiro: "Fecha de retiro",
  motivoRetiro: "Motivo de retiro",
};

const mostrar = (campo: keyof InformacionLaboral, valor: unknown): string => {
  if (valor === undefined || valor === "" || valor === null) return "—";
  switch (campo) {
    case "areaId":
      return nombreArea(String(valor));
    case "cargoId":
      return nombreCargo(String(valor));
    case "centroCostoId":
      return nombreCentroCosto(String(valor));
    case "centroTrabajoId":
      return nombreCentroTrabajo(String(valor));
    case "jefeInmediatoId":
      return nombreJefe(String(valor));
    case "salario":
      return formatCOP(Number(valor));
    case "tipoContrato":
      return TIPO_CONTRATO_LABEL[valor as keyof typeof TIPO_CONTRATO_LABEL] ?? String(valor);
    default:
      return String(valor);
  }
};


/** Clasifica automáticamente el tipo de evento según el campo modificado. */
function tipoDeCambio(
  campo: keyof InformacionLaboral,
  anterior: InformacionLaboral,
  nuevo: InformacionLaboral,
): TipoEventoHV | null {
  switch (campo) {
    case "cargoId": {
      const nivelAnt = cargoById(anterior.cargoId)?.nivelId ?? "";
      const nivelNue = cargoById(nuevo.cargoId)?.nivelId ?? "";
      return nivelNue < nivelAnt || nuevo.salario > anterior.salario ? "ascenso" : "traslado";
    }
    case "salario":
      return "cambio_salarial";
    case "areaId":
    case "dependenciaId":
    case "centroTrabajoId":
    case "centroCostoId":
    case "jefeInmediatoId":
      return "traslado";
    case "fechaFinContrato":
      return "renovacion";
    case "tipoContrato":
      return "renovacion";
    case "fechaRetiro":
    case "motivoRetiro":
      return "terminacion";
    default:
      return null;
  }
}

/**
 * Registro automático en la hoja de vida: compara la información laboral
 * anterior con la nueva y genera un evento por cada cambio detectado.
 */
export function generarEventosPorCambio(
  empleadoId: string,
  anterior: InformacionLaboral,
  nuevo: InformacionLaboral,
  registradoPor: string,
): EventoHojaVida[] {
  const campos = Object.keys(LABEL_CAMPO) as (keyof InformacionLaboral)[];
  const eventos: EventoHojaVida[] = [];
  for (const campo of campos) {
    if (anterior[campo] === nuevo[campo]) continue;
    const tipo = tipoDeCambio(campo, anterior, nuevo);
    if (!tipo) continue;
    eventos.push({
      id: `${empleadoId}-ev-${campo}-${Date.now()}-${eventos.length}`,
      empleadoId,
      tipo,
      fecha: hoy(),
      titulo: `${LABEL_CAMPO[campo]} actualizado`,
      detalle: `Cambio automático registrado en la hoja de vida digital (${LABEL_CAMPO[campo]}).`,
      valorAnterior: mostrar(campo, anterior[campo]),
      valorNuevo: mostrar(campo, nuevo[campo]),
      registradoPor,
    });
  }
  return eventos;
}

export function eventoPorEstado(
  empleadoId: string,
  anterior: string,
  nuevo: string,
  registradoPor: string,
): EventoHojaVida {
  return {
    id: `${empleadoId}-ev-estado-${Date.now()}`,
    empleadoId,
    tipo: nuevo === "retirado" ? "terminacion" : "cambio_estado",
    fecha: hoy(),
    titulo: nuevo === "retirado" ? "Retiro del empleado" : "Cambio de estado laboral",
    detalle:
      nuevo === "retirado"
        ? "Se desactivó el acceso al sistema y el registro se oculta de listados activos conservando históricos."
        : "Actualización del estado laboral del empleado.",
    valorAnterior: anterior,
    valorNuevo: nuevo,
    registradoPor,
  };
}

export const ordenarEventos = (eventos: EventoHojaVida[]) =>
  [...eventos].sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : 0));

export const antiguedadAnios = (fechaIngreso: string, fechaRetiro?: string) => {
  const fin = fechaRetiro ? new Date(fechaRetiro) : new Date();
  const ini = new Date(fechaIngreso);
  return Math.max(0, Math.round(((fin.getTime() - ini.getTime()) / 31_557_600_000) * 10) / 10);
};

/* ------------------------- Completitud del expediente ------------------------- */

/**
 * Porcentaje de completitud del expediente (0-100). Evalúa las siete secciones
 * con el mismo peso; tolera expedientes ausentes o con campos faltantes.
 */
export function completitudExpediente(exp?: Partial<ExpedienteEmpleado> | null): number {
  if (!exp) return 0;
  const p = exp.personales ?? ({} as Partial<DatosPersonales>);
  const b = exp.bancarios ?? ({} as Partial<DatosBancarios>);
  const s = exp.seguridadSocial ?? ({} as Partial<SeguridadSocial>);
  const lleno = (v?: string | number | null) => v !== undefined && v !== null && String(v).trim() !== "";
  const secciones = [
    // Datos personales: 8 campos clave.
    [p.fechaNacimiento, p.genero, p.estadoCivil, p.rh, p.direccion, p.ciudad, p.celular, p.emailPersonal].filter(lleno).length / 8,
    (exp.familiares ?? []).length > 0 ? 1 : 0,
    (exp.contactosEmergencia ?? []).length > 0 ? 1 : 0,
    (exp.academicos ?? []).length > 0 ? 1 : 0,
    (exp.experiencia ?? []).length > 0 ? 1 : 0,
    [b.banco, b.numeroCuenta, b.titular].filter(lleno).length / 3,
    [s.eps, s.afp, s.arl, s.cajaCompensacion].filter(lleno).length / 4,
  ];
  return Math.round((secciones.reduce((a, x) => a + x, 0) / secciones.length) * 100);
}

/* -------------------- Listas de chequeo de ingreso y retiro -------------------- */

/** Ítems que Talento Humano debe completar para cerrar una vinculación. */
export const CHECKLIST_INGRESO: string[] = [
  "Datos personales y familiares completos",
  "Documentos del expediente cargados",
  "Afiliaciones a seguridad social (EPS, AFP, ARL, caja)",
  "Examen médico de ingreso realizado",
  "Dotación entregada y aceptada",
];

/** Ítems que Talento Humano debe completar para cerrar un retiro. */
export const CHECKLIST_RETIRO: string[] = [
  "Carta de terminación o renuncia en el expediente",
  "Paz y salvo de dotación y equipos",
  "Examen médico de retiro realizado",
  "Acceso al sistema desactivado",
];

const itemsDe = (etiquetas: string[]): ItemChecklist[] =>
  etiquetas.map((etiqueta, i) => ({ id: `chk-${i}`, etiqueta, hecho: false }));

/** Devuelve las listas del empleado, creándolas con valores iniciales si faltan. */
export function checklistDe(e: EmpleadoRRHH): ChecklistsEmpleado {
  return {
    ingreso: e.checklist?.ingreso?.length ? e.checklist.ingreso : itemsDe(CHECKLIST_INGRESO),
    retiro: e.checklist?.retiro?.length ? e.checklist.retiro : itemsDe(CHECKLIST_RETIRO),
  };
}

/** Porcentaje de avance de una lista de chequeo. */
export const avanceChecklist = (items: ItemChecklist[]) =>
  items.length ? Math.round((items.filter((i) => i.hecho).length / items.length) * 100) : 0;

/* --------------------- Cumpleaños, aniversarios y vacaciones --------------------- */

/** Cumpleaños del mes actual a partir de la fecha de nacimiento (`AAAA-MM-DD`). */
export const esCumpleaniosDelMes = (fechaNacimiento?: string, hoy = new Date()) =>
  Boolean(fechaNacimiento) && Number(fechaNacimiento!.slice(5, 7)) === hoy.getMonth() + 1;

/** Años cumplidos de antigüedad si el aniversario de ingreso cae en el mes actual. */
export function aniversarioDelMes(fechaIngreso?: string, hoy = new Date()): number | null {
  if (!fechaIngreso) return null;
  const [anio, mes] = fechaIngreso.split("-").map(Number);
  if (!anio || !mes || mes !== hoy.getMonth() + 1) return null;
  const anios = hoy.getFullYear() - anio;
  return anios > 0 ? anios : null;
}

/** Meses transcurridos desde una fecha ISO hasta hoy (0 si la fecha falta o es futura). */
export function mesesDesde(fecha?: string, hoy = new Date()): number {
  if (!fecha) return 0;
  const ini = new Date(`${fecha}T00:00:00`).getTime();
  if (Number.isNaN(ini) || ini > hoy.getTime()) return 0;
  return (hoy.getTime() - ini) / 2_629_800_000;
}

/**
 * Meses sin vacaciones: desde el ingreso o desde la última vacación aprobada,
 * lo más reciente. Art. 186 CST: derecho a 15 días hábiles por año de servicio.
 */
export function mesesSinVacaciones(
  e: EmpleadoRRHH,
  solicitudes: { empleadoId: string; tipo: string; estado: string; hasta: string }[],
): number {
  const ultimas = solicitudes
    .filter((s) => s.empleadoId === e.id && s.tipo === "vacaciones" && s.estado === "aprobada")
    .map((s) => s.hasta)
    .sort();
  const referencia = ultimas[ultimas.length - 1] ?? e.laboral?.fechaIngreso;
  return Math.floor(mesesDesde(referencia));
}

/** Días de periodo de prueba según el tipo de contrato (práctica laboral colombiana). */
export function diasPeriodoPrueba(tipo?: string): number {
  return tipo === "indefinido" ? 60 : tipo === "fijo" || tipo === "obra_labor" ? 30 : 0;
}

/** Días restantes del periodo de prueba (negativo = ya venció; null si no aplica). */
export function diasRestantesPrueba(e: EmpleadoRRHH, hoy = new Date()): number | null {
  const dias = diasPeriodoPrueba(e.laboral?.tipoContrato);
  const ingreso = e.laboral?.fechaIngreso;
  if (!dias || !ingreso) return null;
  const fin = new Date(`${ingreso}T00:00:00`);
  fin.setDate(fin.getDate() + dias);
  return Math.ceil((fin.getTime() - hoy.getTime()) / 86_400_000);
}
