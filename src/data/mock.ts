import type { AuditLog, Notificacion } from "@/types/entities";

/**
 * Notificaciones y auditoría reales (Firestore). El índice de búsqueda es
 * navegación de la aplicación, no datos de negocio.
 */

export const NOTIFICACIONES: Notificacion[] = [];

export const AUDIT_LOGS: AuditLog[] = [];

export interface SearchEntry {
  titulo: string;
  descripcion: string;
  modulo: string;
  to: string;
}

export const SEARCH_INDEX: SearchEntry[] = [
  { titulo: "Empleados", descripcion: "Directorio y hojas de vida", modulo: "Talento Humano", to: "/empleados" },
  { titulo: "Organización", descripcion: "Áreas, cargos y centros de costo", modulo: "Configuración", to: "/organizacion" },
  { titulo: "Organigrama", descripcion: "Estructura jerárquica", modulo: "Configuración", to: "/organigrama" },
  { titulo: "Usuarios", descripcion: "Cuentas y roles del sistema", modulo: "Seguridad", to: "/usuarios" },
  { titulo: "Nómina", descripcion: "Periodos y liquidaciones", modulo: "Nómina", to: "/nomina" },
  { titulo: "Solicitudes", descripcion: "Permisos, vacaciones y cambios", modulo: "Operación", to: "/solicitudes" },
  { titulo: "Asistencia", descripcion: "Registro y control de jornada", modulo: "Operación", to: "/asistencia" },
  { titulo: "Horas extras", descripcion: "Autorización y liquidación", modulo: "Operación", to: "/horas-extras" },
  { titulo: "Ausencias", descripcion: "Incapacidades y licencias", modulo: "Operación", to: "/ausencias" },
  { titulo: "Novedades", descripcion: "Novedades operativas", modulo: "Operación", to: "/novedades" },
  { titulo: "SST", descripcion: "Exámenes, accidentes y capacitaciones", modulo: "SST", to: "/sst" },
  { titulo: "Dotación", descripcion: "Tallas y entregas", modulo: "SST", to: "/dotacion" },
  { titulo: "Formularios", descripcion: "Encuestas y autoreportes", modulo: "SST", to: "/formularios" },
  { titulo: "Disciplinario", descripcion: "Incidencias y descargos", modulo: "Disciplinario", to: "/disciplinario" },
  { titulo: "Evaluaciones", descripcion: "Desempeño y competencias", modulo: "Disciplinario", to: "/evaluaciones" },
  { titulo: "Documentos", descripcion: "Expedientes digitales", modulo: "Talento Humano", to: "/documentos" },
  { titulo: "Portal del empleado", descripcion: "Autogestión del colaborador", modulo: "Portal", to: "/portal" },
  { titulo: "Reportes", descripcion: "Indicadores y exportaciones", modulo: "Reportes", to: "/reportes" },
  { titulo: "Auditoría", descripcion: "Trazabilidad de cambios", modulo: "Seguridad", to: "/auditoria" },
  { titulo: "Configuración", descripcion: "Parámetros del sistema", modulo: "Configuración", to: "/configuracion" },
];
