/**
 * Hook: nombre del usuario en sesión, usado como emisor de los documentos de nómina firmados.
 */
import { useMemo, useState } from "react";
import { Wallet, Calculator, PiggyBank, FileDown, Receipt, Plus } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { DataTable, type Column } from "@/components/common/DataTable";
import { EmptyState } from "@/components/common/EmptyState";
import { BarrasApiladas, DonaChart } from "@/components/common/Charts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { useNomina } from "@/store/nomina";
import { useRrhh } from "@/store/rrhh";
import { useOperaciones } from "@/store/operaciones";
import {
  PARAMS_NOMINA,
  calcularDetalle,
  puedeGestionarNomina,
  totalesPeriodo,
} from "@/lib/nomina";
import { descargarDesprendible, descargarLiquidacion } from "@/lib/desprendible";
import { useAuth } from "@/lib/auth";

/** Nombre del usuario en sesión, usado como emisor de los documentos firmados. */
function useUsuarioActual() {
  const { perfil, usuario } = useAuth();
  return perfil ? `${perfil.nombres} ${perfil.apellidos}`.trim() : (usuario?.email ?? "sistema");
}
import { downloadExcel } from "@/lib/excel";
import { nombreArea, nombreCargo } from "@/lib/rrhh";
import { formatCOP } from "@/types/organizacion";
import { ESTADOS_VINCULADOS, nombreEmpleado } from "@/types/rrhh";
import {
  ESTADO_PERIODO_LABEL,
  MESES_LABEL,
  MOTIVO_LIQUIDACION_LABEL,
  TIPO_RECURRENTE_LABEL,
  type ConceptoRecurrente,
  type DetalleNomina,
  type LiquidacionFinal,
  type MotivoLiquidacion,
  type TipoRecurrente,
} from "@/types/nomina";

/** Nombre del usuario en sesión, usado como emisor de los documentos firmados. */
export function useUsuarioActual() {
  const { perfil, usuario } = useAuth();
  return perfil ? `${perfil.nombres} ${perfil.apellidos}`.trim() : (usuario?.email ?? "sistema");
}
import { downloadExcel } from "@/lib/excel";
import { nombreArea, nombreCargo } from "@/lib/rrhh";
import { formatCOP } from "@/types/organizacion";
import { ESTADOS_VINCULADOS, nombreEmpleado } from "@/types/rrhh";
import {
  ESTADO_PERIODO_LABEL,
  MESES_LABEL,
  MOTIVO_LIQUIDACION_LABEL,
  TIPO_RECURRENTE_LABEL,
  type ConceptoRecurrente,
  type DetalleNomina,
  type LiquidacionFinal,
  type MotivoLiquidacion,
  type TipoRecurrente,
} from "@/types/nomina";

export const Route = createFileRoute("/nomina")({
  head: () => ({
    meta: [
      { title: "Nómina Colombia — Devengados, deducciones y prestaciones | SIGTH" },
      {
        name: "description",
        content:
          "Liquidación mensual de nómina con devengados, deducciones legales, provisión de prestaciones sociales, liquidaciones definitivas y desprendibles en PDF.",
      },
      { property: "og:title", content: "Nómina Colombia | SIGTH" },
      {
        property: "og:description",
        content:
          "Liquide nómina, prestaciones y liquidaciones definitivas con desprendibles de pago descargables e histórico de 12 meses.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: NominaPage,
});

const mesLabel = (mes: number, anio: number) => `${MESES_LABEL[mes - 1]} ${anio}`;
