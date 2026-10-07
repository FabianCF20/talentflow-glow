/**
 * Etiqueta de color del estado de una cuenta (activo, inactivo, bloqueado, pendiente).
 */
import { Fragment, useMemo, useState } from "react";
import { Check, Minus, UserPlus, ShieldAlert, KeyRound, Wallet, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable, type Column } from "@/components/common/DataTable";
import { StatCard } from "@/components/common/StatCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ROLES, ROLE_LABEL, rolJerarquicoPorNivel, rolesPredeterminadosPorNivel } from "@/config/roles";
import { PERMISSION_ACTIONS, PERMISSION_ACTION_LABEL } from "@/types/entities";
import type { PermissionAction, RoleKey } from "@/types/entities";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EMPLEADOS, areaById, cargoById, empleadoById, nivelById } from "@/data/organizacion";
import {
  ESTADO_USUARIO_LABEL,
  nombreCompleto,
  type EstadoUsuario,
  type UsuarioSistema,
} from "@/types/organizacion";
import { ALCANCE_LABEL, MATRIZ_VISIBILIDAD, alcanceDe, empleadosVisibles } from "@/lib/visibilidad";
import {
  actualizarCuentaUsuario,
  aUsuarioSistema,
  crearCuentaUsuario,
  enviarResetClave,
  useCuentas,
  type CuentaUsuario,
} from "@/lib/usuarios-admin";
import { usePermisos, guardarPermisos } from "@/lib/permisos";
import { mensajeAuth, useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { z } from "zod";

/** Clases de color por estado de cuenta. */
const ESTADO_STYLE: Record<EstadoUsuario, string> = {
  activo: "bg-success/12 text-success border-success/30",
  inactivo: "bg-muted text-muted-foreground border-border",
  bloqueado: "bg-destructive/10 text-destructive border-destructive/30",
  pendiente: "bg-warning/15 text-warning-foreground border-warning/40 dark:text-warning",
};

export function EstadoUsuarioBadge({ estado }: { estado: EstadoUsuario }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        ESTADO_STYLE[estado],
      )}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {ESTADO_USUARIO_LABEL[estado]}
    </span>
  );
}

interface FormularioCuenta {
  email: string;
  password: string;
  nombres: string;
  apellidos: string;
  empleadoId: string;
  roles: RoleKey[];
  estadoUsuario: EstadoUsuario;
}

const FORM_VACIO: FormularioCuenta = {
  email: "",
  password: "",
  nombres: "",
  apellidos: "",
  empleadoId: "",
  roles: ["empleado"],
  estadoUsuario: "activo",
};
