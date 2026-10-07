/**
 * Tarjeta de resumen compacta usada en el Portal del Empleado.
 */
import { useMemo, useState } from "react";
import {
  BadgeCheck,
  CalendarDays,
  Download,
  FileBadge,
  FileText,
  HeartPulse,
  Send,
  Shirt,
  Upload,
  Wallet,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable, type Column } from "@/components/common/DataTable";
import { EstadoLaboralBadge } from "@/components/rrhh/EstadoLaboralBadge";
import { TimelineLaboral } from "@/components/rrhh/TimelineLaboral";
import { CampoDato, GridDatos, SeccionExpediente } from "@/components/rrhh/SeccionExpediente";
import { DocumentoCard } from "@/components/portal/DocumentoCard";
import { SolicitudBadge } from "@/components/portal/SolicitudBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useRrhh } from "@/store/rrhh";
import { usePortal } from "@/store/portal";
import { dotacionDe, incapacidadesDe, nominaDe, vacacionesDe } from "@/data/portal";
import {
  antiguedadAnios,
  nombreArea,
  nombreCargo,
  nombreCentroCosto,
  nombreCentroTrabajo,
  nombreJefe,
  ordenarEventos,
} from "@/lib/rrhh";
import { descargarCertificado } from "@/lib/certificados";
import { useAuth } from "@/lib/auth";
import { formatCOP } from "@/types/organizacion";
import {
  CAMPO_AUTOGESTION_LABEL,
  CATEGORIAS_DOC,
  CATEGORIA_DOC_LABEL,
  TIPO_CERTIFICADO_LABEL,
  TIPO_INCAPACIDAD_LABEL,
  type CampoAutogestion,
  type CategoriaDocumento,
  type DesprendibleNomina,
  type EntregaDotacion,
  type PeriodoVacaciones,
  type RegistroIncapacidad,
  type TipoCertificado,
} from "@/types/portal";
import { TIPO_CONTRATO_LABEL, iniciales, nombreEmpleado } from "@/types/rrhh";
import { can } from "@/config/roles";

export function ResumenMini({
  icon: Icon,
  label,
  valor,
}: {
  icon: typeof CalendarDays;
  label: string;
  valor: string;
}) {
  return (
    <div className="surface-panel flex items-center gap-3 p-4">
      <span className="grid size-9 place-items-center rounded-md bg-primary-soft text-primary">
        <Icon className="size-4.5" />
      </span>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-display text-lg font-semibold text-foreground">{valor}</p>
      </div>
    </div>
  );
}
