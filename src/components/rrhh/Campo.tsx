/**
 * Par etiqueta/valor de solo lectura usado en la ficha del empleado.
 */
import { useMemo, useState } from "react";
import { ArrowLeft, Lock, Save, ShieldOff, UserCog } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/common/PageHeader";
import { EstadoLaboralBadge } from "@/components/rrhh/EstadoLaboralBadge";
import { TimelineLaboral } from "@/components/rrhh/TimelineLaboral";
import { CampoDato, GridDatos, SeccionExpediente } from "@/components/rrhh/SeccionExpediente";
import { EmpleadoDialog } from "@/components/rrhh/EmpleadoDialog";
import { useAuth } from "@/lib/auth";
import { useRegistroAcceso } from "@/lib/habeas-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { mensajeAuth } from "@/lib/auth";
import { actualizarCuentaUsuario, useCuentas } from "@/lib/usuarios-admin";
import { AREAS, CARGOS, CENTROS_COSTO, CENTROS_TRABAJO, EMPLEADOS } from "@/data/organizacion";
import { EXPEDIENTES } from "@/data/rrhh";
import { useRrhh } from "@/store/rrhh";
import {
  antiguedadAnios,
  nombreArea,
  nombreCargo,
  nombreCentroCosto,
  nombreCentroTrabajo,
  nombreJefe,
  puedeEditarCamposSensibles,
} from "@/lib/rrhh";
import { puedeVerSalario } from "@/lib/visibilidad";
import { cargoById, nivelById } from "@/data/organizacion";
import { rolJerarquicoPorNivel } from "@/config/roles";
import { formatCOP } from "@/types/organizacion";
import {
  ESTADO_LABORAL_LABEL,
  TIPO_CONTRATO_LABEL,
  iniciales,
  nombreEmpleado,
  type EstadoLaboral,
  type InformacionLaboral,
} from "@/types/rrhh";

export function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}
