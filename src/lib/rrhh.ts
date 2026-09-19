import type { RoleKey } from "@/types/entities";
import {
  ESTADOS_VINCULADOS,
  TIPO_CONTRATO_LABEL,
  type EmpleadoRRHH,
  type EventoHojaVida,
  type InformacionLaboral,
  type TipoEventoHV,
} from "@/types/rrhh";
import { areaById, cargoById, centroCostoById, centroTrabajoById, empleadoById } from "@/data/organizacion";
import { formatCOP } from "@/types/organizacion";

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

const hoy = () => new Date().toISOString().slice(0, 10);

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
