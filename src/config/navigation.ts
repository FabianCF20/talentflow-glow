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
      { label: "Nómina", to: "/nomina", icon: Wallet, modulo: "nomina" },
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
      { label: "Configuración", to: "/configuracion", icon: Settings, modulo: "configuracion" },
    ],
  },
];
