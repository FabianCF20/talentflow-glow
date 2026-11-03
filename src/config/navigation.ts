/**
 * Definición del menú lateral. Para agregar un módulo al menú, añada un elemento aquí (y cree su ruta).
 */
import { can } from "./roles";
import type { RoleKey } from "@/types/entities";
import {
  LayoutDashboard,
  Users,
  FolderKanban,
  FileText,
  Inbox,
  Wallet,
  HardHat,
  ClipboardCheck,
  Gauge,
  CalendarClock,
  Timer,
  ListChecks,
  Scale,
  ShieldCheck,
  ShieldAlert,
  Settings,
  Building2,
  History,
  Network,
  IdCard,
  FolderOpen,
  Shirt,
  ClipboardList,
  BarChart3,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  to?: string;
  icon: LucideIcon;
  modulo: string;
  /** Módulos funcionales aún no implementados: se muestran deshabilitados. */
  proximamente?: boolean;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "General",
    items: [
      { label: "Dashboard", to: "/", icon: LayoutDashboard, modulo: "dashboard" },
      { label: "Bandeja de solicitudes", to: "/solicitudes", icon: Inbox, modulo: "solicitudes" },
    ],
  },
  {
    label: "Organización",
    items: [
      { label: "Estructura organizacional", to: "/organizacion", icon: Building2, modulo: "organizacion" },
      { label: "Organigrama", to: "/organigrama", icon: Network, modulo: "organigrama" },
    ],
  },
  {
    label: "Talento Humano",
    items: [
      { label: "Empleados", to: "/empleados", icon: Users, modulo: "empleados" },
      { label: "Portal del Empleado", to: "/portal", icon: IdCard, modulo: "portal" },
      { label: "Gestión documental", to: "/documentos", icon: FolderOpen, modulo: "documentacion" },
      { label: "Dotación", to: "/dotacion", icon: Shirt, modulo: "dotacion" },
      { label: "Evaluaciones", to: "/evaluaciones", icon: ClipboardCheck, modulo: "evaluaciones" },
      { label: "Gestión disciplinaria", to: "/disciplinario", icon: Scale, modulo: "disciplinario" },
    ],
  },
  {
    label: "Operación",
    items: [
      { label: "Solicitudes e incapacidades", to: "/ausencias", icon: CalendarClock, modulo: "ausencias" },
      { label: "Control de asistencia", to: "/asistencia", icon: Gauge, modulo: "asistencia" },
      { label: "Horas extras", to: "/horas-extras", icon: Timer, modulo: "horas_extras" },
      { label: "Historial de novedades", to: "/novedades", icon: ListChecks, modulo: "novedades" },
      { label: "SST", to: "/sst", icon: HardHat, modulo: "sst" },
      { label: "Proyectos y áreas", icon: FolderKanban, modulo: "areas", proximamente: true },
    ],
  },
  {
    label: "Administración",
    items: [
      { label: "Reportes y dashboards", to: "/reportes", icon: BarChart3, modulo: "reportes" },
      { label: "Datos maestros", to: "/maestros", icon: Building2, modulo: "maestros" },
      { label: "Formularios", to: "/formularios", icon: ClipboardList, modulo: "formularios" },
      { label: "Usuarios y roles", to: "/usuarios", icon: ShieldCheck, modulo: "usuarios" },
      { label: "Auditoría", to: "/auditoria", icon: History, modulo: "auditoria" },
      { label: "Cumplimiento", to: "/cumplimiento", icon: ShieldAlert, modulo: "cumplimiento" },
      { label: "Configuración", to: "/configuracion", icon: Settings, modulo: "configuracion" },
    ],
  },
];

/** Devuelve únicamente grupos con módulos autorizados para los roles efectivos. */
export function gruposNavegacionVisibles(roles: RoleKey[]): NavGroup[] {
  return NAV_GROUPS.map((grupo) => ({
    ...grupo,
    items: grupo.items.filter((item) => can(roles, item.modulo, "ver")),
  })).filter((grupo) => grupo.items.length > 0);
}

/** Encuentra la opción de navegación que corresponde a una ruta, priorizando la ruta más específica. */
export function itemNavegacionPorRuta(pathname: string): NavItem | undefined {
  return NAV_GROUPS.flatMap((grupo) => grupo.items)
    .filter((item) => item.to && (item.to === "/" ? pathname === "/" : pathname.startsWith(item.to)))
    .sort((a, b) => (b.to?.length ?? 0) - (a.to?.length ?? 0))[0];
}
