/**
 * Pestaña "Liquidaciones definitivas" de Nómina: liquidación del contrato al retiro.
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
import { useUsuarioActual } from "./useUsuarioActual";

export function Liquidaciones({ gestiona }: { gestiona: boolean }) {
  const usuarioActual = useUsuarioActual();
  const { empleados, rolActivo } = useRrhh();
  const { liquidaciones, generarLiquidacion, vacacionesPendientes } = useNomina();
  const [empleadoId, setEmpleadoId] = useState(empleados[0]?.id ?? "");
  const [motivo, setMotivo] = useState<MotivoLiquidacion>("renuncia");
  const [fechaRetiro, setFechaRetiro] = useState(new Date().toISOString().slice(0, 10));
  const [dias, setDias] = useState("");

  const columnas: Column<LiquidacionFinal>[] = [
    { key: "cons", header: "Consecutivo", render: (l) => l.consecutivo },
    {
      key: "empleado",
      header: "Empleado",
      render: (l) => {
        const e = empleados.find((x) => x.id === l.empleadoId);
        return e ? nombreEmpleado(e) : l.empleadoId;
      },
    },
    { key: "motivo", header: "Motivo", render: (l) => MOTIVO_LIQUIDACION_LABEL[l.motivo] },
    { key: "retiro", header: "Retiro", render: (l) => l.fechaRetiro },
    { key: "dias", header: "Días", render: (l) => <span className="tabular-nums">{l.diasLaborados}</span> },
    {
      key: "total",
      header: "Total a pagar",
      render: (l) => <span className="font-semibold tabular-nums">{formatCOP(l.totalPagar)}</span>,
    },
    {
      key: "pdf",
      header: "Documento",
      render: (l) => {
        const e = empleados.find((x) => x.id === l.empleadoId);
        return (
          <Button size="sm" variant="outline" disabled={!e} onClick={() => e && void descargarLiquidacion(l, e, usuarioActual)}>
            <FileDown className="size-4" /> PDF
          </Button>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      {gestiona && (
        <div className="surface-panel grid gap-4 p-5 md:grid-cols-5">
          <div className="space-y-1.5">
            <Label>Empleado</Label>
            <Select value={empleadoId} onValueChange={setEmpleadoId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {empleados.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {nombreEmpleado(e)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Motivo</Label>
            <Select value={motivo} onValueChange={(v) => setMotivo(v as MotivoLiquidacion)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(MOTIVO_LIQUIDACION_LABEL).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Fecha de retiro</Label>
            <Input type="date" value={fechaRetiro} onChange={(e) => setFechaRetiro(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Días de vacaciones pendientes</Label>
            <Input
              inputMode="numeric"
              value={dias}
              placeholder={String(vacacionesPendientes[empleadoId] ?? 0)}
              onChange={(e) => setDias(e.target.value)}
            />
          </div>
          <div className="flex items-end">
            <Button
              className="w-full"
              onClick={() => {
                const liq = generarLiquidacion({
                  empleadoId,
                  motivo,
                  fechaRetiro,
                  diasVacaciones: Number(dias) || vacacionesPendientes[empleadoId] || 0,
                  responsable: `Usuario (${rolActivo})`,
                });
                if (!liq) {
                  toast.error("No fue posible calcular la liquidación");
                  return;
                }
                toast.success(`Liquidación ${liq.consecutivo} calculada por ${formatCOP(liq.totalPagar)}`);
              }}
            >
              Calcular liquidación
            </Button>
          </div>
        </div>
      )}
      <DataTable columns={columnas} rows={liquidaciones} emptyMessage="Sin liquidaciones registradas." />
    </div>
  );
}

/* ------------------------------ Desprendibles ------------------------------ */
