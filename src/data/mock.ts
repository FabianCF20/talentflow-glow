import type { AuditLog, Notificacion } from "@/types/entities";

/**
 * Notificaciones y auditoría reales (Firestore). El índice de búsqueda es
 * navegación de la aplicación, no datos de negocio.
 */

export const NOTIFICACIONES: Notificacion[] = [];

export const AUDIT_LOGS: AuditLog[] = [];

export interface SearchEntry {
  id: string;
  titulo: string;
  detalle: string;
  categoria: string;
  to: string;
}

export const SEARCH_INDEX: SearchEntry[] = [
  { id: "nav-empleados", titulo: "Empleados", detalle: "Directorio y hojas de vida", categoria: "Talento Humano", to: "/empleados" },
  { id: "nav-organizacion", titulo: "Organización", detalle: "Áreas, cargos y centros de costo", categoria: "Configuración", to: "/organizacion" },
  { id: "nav-organigrama", titulo: "Organigrama", detalle: "Estructura jerárquica", categoria: "Configuración", to: "/organigrama" },
  { id: "nav-usuarios", titulo: "Usuarios", detalle: "Cuentas y roles del sistema", categoria: "Seguridad", to: "/usuarios" },
  { id: "nav-nomina", titulo: "Nómina", detalle: "Periodos y liquidaciones", categoria: "Nómina", to: "/nomina" },
  { id: "nav-solicitudes", titulo: "Solicitudes", detalle: "Permisos, vacaciones y cambios", categoria: "Operación", to: "/solicitudes" },
  { id: "nav-asistencia", titulo: "Asistencia", detalle: "Registro y control de jornada", categoria: "Operación", to: "/asistencia" },
  { id: "nav-horas-extras", titulo: "Horas extras", detalle: "Autorización y liquidación", categoria: "Operación", to: "/horas-extras" },
  { id: "nav-ausencias", titulo: "Ausencias", detalle: "Incapacidades y licencias", categoria: "Operación", to: "/ausencias" },
  { id: "nav-novedades", titulo: "Novedades", detalle: "Novedades operativas", categoria: "Operación", to: "/novedades" },
  { id: "nav-sst", titulo: "SST", detalle: "Exámenes, accidentes y capacitaciones", categoria: "SST", to: "/sst" },
  { id: "nav-dotacion", titulo: "Dotación", detalle: "Tallas y entregas", categoria: "SST", to: "/dotacion" },
  { id: "nav-formularios", titulo: "Formularios", detalle: "Encuestas y autoreportes", categoria: "SST", to: "/formularios" },
  { id: "nav-disciplinario", titulo: "Disciplinario", detalle: "Incidencias y descargos", categoria: "Disciplinario", to: "/disciplinario" },
  { id: "nav-evaluaciones", titulo: "Evaluaciones", detalle: "Desempeño y competencias", categoria: "Disciplinario", to: "/evaluaciones" },
  { id: "nav-documentos", titulo: "Documentos", detalle: "Expedientes digitales", categoria: "Talento Humano", to: "/documentos" },
  { id: "nav-portal", titulo: "Portal del empleado", detalle: "Autogestión del colaborador", categoria: "Portal", to: "/portal" },
  { id: "nav-reportes", titulo: "Reportes", detalle: "Indicadores y exportaciones", categoria: "Reportes", to: "/reportes" },
  { id: "nav-auditoria", titulo: "Auditoría", detalle: "Trazabilidad de cambios", categoria: "Seguridad", to: "/auditoria" },
  { id: "nav-configuracion", titulo: "Configuración", detalle: "Parámetros del sistema", categoria: "Configuración", to: "/configuracion" },
];
