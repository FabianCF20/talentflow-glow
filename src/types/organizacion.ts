/**
 * Modelos de la estructura organizacional, usuarios del sistema y etiquetas asociadas.
 */
import type { RecordStatus, RoleKey } from "./entities";

/** Estructura organizacional de SIGTH. Ningún registro se elimina: se inactiva o archiva. */

export interface NivelJerarquico {
  id: string;
  nivel: number;
  nombre: string;
  descripcion: string;
  estado: RecordStatus;
}

export interface AreaOrg {
  id: string;
  codigo: string;
  nombre: string;
  direccionId?: string;
  responsableId?: string;
  estado: RecordStatus;
}

export interface Dependencia {
  id: string;
  codigo: string;
  nombre: string;
  areaId: string;
  responsableId?: string;
  estado: RecordStatus;
}

export interface CentroTrabajo {
  id: string;
  codigo: string;
  nombre: string;
  ciudad: string;
  direccion: string;
  riesgoArl: "I" | "II" | "III" | "IV" | "V";
  estado: RecordStatus;
}

export interface CentroCostoOrg {
  id: string;
  codigo: string;
  nombre: string;
  areaId: string;
  presupuestoAnual: number;
  estado: RecordStatus;
}

export interface CargoOrg {
  id: string;
  codigo: string;
  nombre: string;
  areaId: string;
  nivelId: string;
  salarioBase: number;
  estado: RecordStatus;
}

export interface EmpleadoOrg {
  id: string;
  nombres: string;
  apellidos: string;
  documento: string;
  cargoId: string;
  areaId: string;
  dependenciaId?: string;
  centroTrabajoId: string;
  centroCostoId: string;
  jefeInmediatoId?: string;
  salario: number;
  fechaIngreso: string;
  estado: RecordStatus;
  usuarioId?: string;
}

export type EstadoUsuario = "activo" | "inactivo" | "bloqueado" | "pendiente";

export const ESTADO_USUARIO_LABEL: Record<EstadoUsuario, string> = {
  activo: "Activo",
  inactivo: "Inactivo",
  bloqueado: "Bloqueado",
  pendiente: "Pendiente activación",
};

export interface UsuarioSistema {
  id: string;
  empleadoId: string;
  username: string;
  email: string;
  roles: RoleKey[];
  estadoUsuario: EstadoUsuario;
  ultimoAcceso?: string;
  intentosFallidos: number;
  creadoEn: string;
}

// Formatos de presentación: viven en `@/lib/formato` y se re-exportan aquí
// porque muchas pantallas ya los importan desde este archivo.
export { nombreCompleto, formatCOP } from "@/lib/formato";
