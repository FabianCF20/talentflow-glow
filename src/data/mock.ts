import type { AuditLog, Notificacion, RoleKey } from "@/types/entities";

/** Datos de demostración de la arquitectura base (se reemplazan al conectar el backend). */

export const CURRENT_USER = {
  id: "u-001",
  nombres: "Laura",
  apellidos: "Restrepo",
  email: "laura.restrepo@empresa.com.co",
  cargo: "Directora de Talento Humano",
  roles: ["administrador", "talento_humano"] as RoleKey[],
  iniciales: "LR",
};

export const NOTIFICACIONES: Notificacion[] = [
  {
    id: "n-1",
    titulo: "Solicitud de vacaciones pendiente",
    mensaje: "Carlos Mejía solicitó 8 días a partir del 12/08.",
    nivel: "info",
    modulo: "Solicitudes",
    fecha: "Hace 12 min",
    leida: false,
  },
  {
    id: "n-2",
    titulo: "Contratos por vencer",
    mensaje: "5 contratos a término fijo vencen en los próximos 30 días.",
    nivel: "alerta",
    modulo: "Talento Humano",
    fecha: "Hace 2 h",
    leida: false,
  },
  {
    id: "n-3",
    titulo: "Examen médico ocupacional vencido",
    mensaje: "3 empleados requieren renovación de exámenes periódicos.",
    nivel: "critico",
    modulo: "SST",
    fecha: "Ayer",
    leida: false,
  },
  {
    id: "n-4",
    titulo: "Nómina cerrada correctamente",
    mensaje: "Periodo julio 1–15 liquidado sin novedades.",
    nivel: "exito",
    modulo: "Nómina",
    fecha: "Ayer",
    leida: true,
  },
];

export const AUDIT_LOGS: AuditLog[] = [
  {
    id: "a-1",
    usuario: "laura.restrepo",
    fecha: "30/07/2026",
    hora: "09:14:22",
    ip: "190.85.44.12",
    navegador: "Chrome 138 / Windows",
    accion: "editar",
    modulo: "Datos maestros",
    registroAfectado: "Cargo · Analista de Nómina",
    valorAnterior: "Nivel jerárquico: 5",
    valorNuevo: "Nivel jerárquico: 4",
  },
  {
    id: "a-2",
    usuario: "jorge.pineda",
    fecha: "30/07/2026",
    hora: "08:52:10",
    ip: "190.85.44.31",
    navegador: "Edge 138 / Windows",
    accion: "login",
    modulo: "Seguridad",
    registroAfectado: "Sesión u-014",
  },
  {
    id: "a-3",
    usuario: "sandra.ruiz",
    fecha: "29/07/2026",
    hora: "17:40:03",
    ip: "181.49.20.7",
    navegador: "Firefox 130 / macOS",
    accion: "inactivar",
    modulo: "Usuarios y roles",
    registroAfectado: "Usuario · mvargas",
    valorAnterior: "Estado: Activo",
    valorNuevo: "Estado: Inactivo",
  },
  {
    id: "a-4",
    usuario: "laura.restrepo",
    fecha: "29/07/2026",
    hora: "15:06:48",
    ip: "190.85.44.12",
    navegador: "Chrome 138 / Windows",
    accion: "exportar",
    modulo: "Auditoría",
    registroAfectado: "Reporte trazabilidad julio",
  },
  {
    id: "a-5",
    usuario: "admin",
    fecha: "29/07/2026",
    hora: "07:15:00",
    ip: "10.0.0.4",
    navegador: "Chrome 138 / Windows",
    accion: "crear",
    modulo: "Datos maestros",
    registroAfectado: "Sede · Planta Yumbo",
    valorNuevo: "Estado: Activo",
  },
];

export interface SearchEntry {
  id: string;
  titulo: string;
  categoria: string;
  detalle: string;
  to?: string;
}

export const SEARCH_INDEX: SearchEntry[] = [
  { id: "s-1", titulo: "Dashboard", categoria: "Navegación", detalle: "Panel configurable de indicadores", to: "/" },
  { id: "s-2", titulo: "Datos maestros", categoria: "Navegación", detalle: "Empresas, sedes, áreas, cargos", to: "/maestros" },
  { id: "s-3", titulo: "Usuarios y roles", categoria: "Navegación", detalle: "Gestión de accesos y permisos", to: "/usuarios" },
  { id: "s-4", titulo: "Auditoría", categoria: "Navegación", detalle: "Trazabilidad completa de acciones", to: "/auditoria" },
  { id: "s-5", titulo: "Configuración", categoria: "Navegación", detalle: "Parámetros del sistema y seguridad", to: "/configuracion" },
  { id: "s-6", titulo: "Carlos Mejía", categoria: "Empleados", detalle: "CC 1.094.222.145 · Operaciones" },
  { id: "s-7", titulo: "Sandra Ruiz", categoria: "Empleados", detalle: "CC 43.556.900 · Talento Humano" },
  { id: "s-8", titulo: "Planta Yumbo", categoria: "Sedes", detalle: "Yumbo, Valle del Cauca" },
  { id: "s-9", titulo: "Analista de Nómina", categoria: "Cargos", detalle: "Área administrativa · Nivel 4" },
];
