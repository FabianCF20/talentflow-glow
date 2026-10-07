/**
 * Pestaña "Desprendibles" de Nómina: consulta y descarga de comprobantes de pago firmados.
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
import { mesLabel } from "@/lib/nomina";

export function Desprendibles({ empleadoActuandoId }: { empleadoActuandoId: string }) {
  const usuarioActual = useUsuarioActual();
  const { empleados } = useRrhh();
  const { periodos } = useNomina();
  const [empleadoId, setEmpleadoId] = useState(empleadoActuandoId);
  const empleado = empleados.find((e) => e.id === empleadoId);

  const historico = useMemo(
    () =>
      [...periodos]
        .filter((p) => p.detalles.some((d) => d.empleadoId === empleadoId))
        .sort((a, b) => (a.id < b.id ? 1 : -1))
        .slice(0, 12),
    [periodos, empleadoId],
  );

  return (
    <div className="space-y-4">
      <div className="surface-panel flex flex-wrap items-end gap-4 p-5">
        <div className="min-w-56 space-y-1.5">
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
        <p className="text-xs text-muted-foreground">
          Consulta histórica de los últimos 12 meses con descarga individual del desprendible en PDF.
        </p>
      </div>

      {historico.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="Sin desprendibles disponibles"
          description="Este empleado aún no tiene periodos de nómina liquidados."
        />
      ) : (
        <DataTable
          rows={historico.map((p) => ({ id: p.id, periodo: p }))}
          columns={[
            { key: "mes", header: "Periodo", render: (r) => mesLabel(r.periodo.mes, r.periodo.anio) },
            { key: "codigo", header: "Código", render: (r) => r.periodo.codigo },
            { key: "estado", header: "Estado", render: (r) => ESTADO_PERIODO_LABEL[r.periodo.estado] },
            {
              key: "neto",
              header: "Neto pagado",
              render: (r) => {
                const d = (r.periodo.detalles ?? []).find((x) => x.empleadoId === empleadoId);
                return <span className="tabular-nums">{formatCOP(d?.netoPagar ?? 0)}</span>;
              },
            },
            {
              key: "pdf",
              header: "Descarga",
              render: (r) => {
                const d = (r.periodo.detalles ?? []).find((x) => x.empleadoId === empleadoId);
                return (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!d || !empleado}
                    onClick={() => {
                      if (d && empleado) void descargarDesprendible(r.periodo, d, empleado, usuarioActual);
                    }}
                  >
                    <FileDown className="size-4" /> PDF
                  </Button>
                );
              },
            },
          ]}
        />
      )}
    </div>
  );
}
