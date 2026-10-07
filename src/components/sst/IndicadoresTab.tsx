/**
 * Pestaña "Indicadores" de SST: frecuencia, severidad y cumplimiento.
 */
import { useMemo, useState } from "react";
import {
  HardHat,
  Stethoscope,
  AlertTriangle,
  GraduationCap,
  Activity,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { DataTable, type Column } from "@/components/common/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ConceptoBadge,
  GravedadBadge,
  InvestigacionBadge,
  VigenciaExamenBadge,
  BarraDistribucion,
} from "@/components/sst/SstBadges";
import { useRrhh } from "@/store/rrhh";
import { useSst } from "@/store/sst";
import { calcularIndicadores, diasHasta, hoyISO, puedeGestionarSST } from "@/lib/sst";
import { downloadCsv } from "@/lib/export";
import { centroTrabajoById } from "@/data/organizacion";
import { nombreEmpleado, ESTADOS_VINCULADOS } from "@/types/rrhh";
import {
  CONCEPTO_LABEL,
  ESTADO_INVESTIGACION_LABEL,
  GRAVEDAD_LABEL,
  MODALIDAD_LABEL,
  TIPO_EVENTO_SST_LABEL,
  TIPO_EXAMEN_LABEL,
  type AccidenteLaboral,
  type CapacitacionSST,
  type ConceptoMedico,
  type EstadoInvestigacion,
  type ExamenMedico,
  type GravedadSST,
  type ModalidadCapacitacion,
  type TipoEventoSST,
  type TipoExamen,
} from "@/types/sst";

export function IndicadoresTab({ indicadores }: { indicadores: ReturnType<typeof calcularIndicadores> }) {
  const total = Math.max(indicadores.totalEventos, 1);
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Índice de frecuencia" value={String(indicadores.frecuencia)} icon={Activity} hint="AT × 200.000 / horas hombre" />
        <StatCard label="Índice de severidad" value={String(indicadores.severidad)} icon={AlertTriangle} hint="Días perdidos × 200.000 / HHT" />
        <StatCard label="ILI" value={String(indicadores.ili)} icon={HardHat} hint="Lesiones incapacitantes" />
        <StatCard label="Investigaciones abiertas" value={String(indicadores.investigacionesAbiertas)} icon={ShieldAlert} hint="Pendientes de cierre" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="surface-panel space-y-4 p-5">
          <h3 className="font-medium text-foreground">Distribución de eventos</h3>
          <BarraDistribucion etiqueta="Accidentes de trabajo" total={indicadores.accidentes} porcentaje={Math.round((indicadores.accidentes / total) * 100)} />
          <BarraDistribucion etiqueta="Incidentes" total={indicadores.incidentes} porcentaje={Math.round((indicadores.incidentes / total) * 100)} />
          <BarraDistribucion etiqueta="Enfermedad laboral" total={indicadores.enfermedades} porcentaje={Math.round((indicadores.enfermedades / total) * 100)} />
        </div>
        <div className="surface-panel space-y-4 p-5">
          <h3 className="font-medium text-foreground">Gestión preventiva</h3>
          <BarraDistribucion etiqueta="Cobertura de capacitación" total={indicadores.horasCapacitacion} porcentaje={indicadores.coberturaCapacitacion} />
          <div className="grid grid-cols-3 gap-3 pt-2 text-center">
            <div className="rounded-md border border-border p-3">
              <p className="font-display text-2xl font-semibold tabular-nums text-foreground">{indicadores.examenesVigentes}</p>
              <p className="text-xs text-muted-foreground">Exámenes vigentes</p>
            </div>
            <div className="rounded-md border border-border p-3">
              <p className="font-display text-2xl font-semibold tabular-nums text-warning">{indicadores.examenesPorVencer}</p>
              <p className="text-xs text-muted-foreground">Por vencer (60 días)</p>
            </div>
            <div className="rounded-md border border-border p-3">
              <p className="font-display text-2xl font-semibold tabular-nums text-destructive">{indicadores.examenesPendientes}</p>
              <p className="text-xs text-muted-foreground">Sin concepto</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
