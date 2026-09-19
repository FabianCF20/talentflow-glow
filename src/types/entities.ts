/**
 * Entidades maestras y tipos base del sistema SIGTH.
 * Ningún registro se elimina físicamente: todo maneja estado de ciclo de vida.
 */

export type RecordStatus = "activo" | "inactivo" | "archivado";

export const RECORD_STATUS_LABEL: Record<RecordStatus, string> = {
  activo: "Activo",
  inactivo: "Inactivo",
  archivado: "Archivado",
};

/** Acciones controlables por permisos en cada módulo. */
export type PermissionAction =
  | "ver"
  | "crear"
  | "editar"
  | "aprobar"
  | "exportar"
  | "inactivar";

export const PERMISSION_ACTIONS: PermissionAction[] = [
  "ver",
  "crear",
  "editar",
  "aprobar",
  "exportar",
  "inactivar",
];

export const PERMISSION_ACTION_LABEL: Record<PermissionAction, string> = {
  ver: "Ver",
  crear: "Crear",
  editar: "Editar",
  aprobar: "Aprobar",
  exportar: "Exportar",
  inactivar: "Inactivar",
};

export type RoleKey =
  | "administrador"
  | "gerente_general"
  | "director"
  | "jefe"
  | "supervisor"
  | "talento_humano"
  | "nomina"
  | "contabilidad"
  | "sst"
  | "empleado";

export interface Role {
  key: RoleKey;
  nombre: string;
  descripcion: string;
  nivel: number;
}

/** Campos de trazabilidad presentes en toda entidad del sistema. */
export interface BaseEntity {
  id: string;
  estado: RecordStatus;
  creadoPor: string;
  creadoEn: string;
  actualizadoPor?: string;
  actualizadoEn?: string;
}

export interface Empresa extends BaseEntity {
  razonSocial: string;
  nit: string;
  direccion: string;
  ciudad: string;
  telefono: string;
  representanteLegal: string;
}

export interface Sede extends BaseEntity {
  empresaId: string;
  nombre: string;
  ciudad: string;
  direccion: string;
}

export interface AreaOrganizacional extends BaseEntity {
  nombre: string;
  codigo: string;
  responsableId?: string;
  areaPadreId?: string;
}

export interface Cargo extends BaseEntity {
  nombre: string;
  codigo: string;
  areaId: string;
  nivelJerarquico: number;
}

export interface CentroCosto extends BaseEntity {
  nombre: string;
  codigo: string;
}

export interface Usuario extends BaseEntity {
  nombres: string;
  apellidos: string;
  documento: string;
  email: string;
  roles: RoleKey[];
  cargoId?: string;
  areaId?: string;
  sedeId?: string;
  ultimoAcceso?: string;
  intentosFallidos: number;
  bloqueado: boolean;
}

export interface Empleado extends BaseEntity {
  usuarioId?: string;
  nombres: string;
  apellidos: string;
  tipoDocumento: "CC" | "CE" | "PA" | "PEP" | "TI";
  documento: string;
  fechaIngreso: string;
  cargoId: string;
  areaId: string;
  sedeId: string;
  centroCostoId?: string;
  jefeInmediatoId?: string;
  tipoContrato: "indefinido" | "fijo" | "obra_labor" | "aprendizaje" | "prestacion_servicios";
}

/** Registro de auditoría obligatorio para toda acción del sistema. */
export interface AuditLog {
  id: string;
  usuario: string;
  fecha: string;
  hora: string;
  ip: string;
  navegador: string;
  accion: "crear" | "editar" | "inactivar" | "archivar" | "aprobar" | "exportar" | "consultar" | "login" | "logout";
  modulo: string;
  registroAfectado: string;
  valorAnterior?: string;
  valorNuevo?: string;
}

export type NotificationLevel = "info" | "exito" | "alerta" | "critico";

export interface Notificacion {
  id: string;
  titulo: string;
  mensaje: string;
  nivel: NotificationLevel;
  modulo: string;
  fecha: string;
  leida: boolean;
}
