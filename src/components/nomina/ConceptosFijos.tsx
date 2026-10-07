/**
 * Pestaña "Conceptos fijos" de Nómina: pagos y descuentos recurrentes por empleado.
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

export function ConceptosFijos({ gestiona }: { gestiona: boolean }) {
  const { empleados } = useRrhh();
  const { recurrentes, agregarRecurrente, toggleRecurrente } = useNomina();
  const [empleadoId, setEmpleadoId] = useState(empleados[0]?.id ?? "");
  const [tipo, setTipo] = useState<TipoRecurrente>("bonificacion");
  const [descripcion, setDescripcion] = useState("");
  const [valor, setValor] = useState("");

  const columnas: Column<ConceptoRecurrente>[] = [
    {
      key: "empleado",
      header: "Empleado",
      render: (c) => {
        const e = empleados.find((x) => x.id === c.empleadoId);
        return e ? nombreEmpleado(e) : c.empleadoId;
      },
    },
    { key: "tipo", header: "Tipo", render: (c) => TIPO_RECURRENTE_LABEL[c.tipo] },
    { key: "desc", header: "Descripción", render: (c) => c.descripcion },
    {
      key: "valor",
      header: "Valor mensual",
      render: (c) => <span className="tabular-nums">{formatCOP(c.valorMensual)}</span>,
    },
    {
      key: "activo",
      header: "Activo",
      render: (c) => (
        <Switch checked={c.activo} disabled={!gestiona} onCheckedChange={() => toggleRecurrente(c.id)} />
      ),
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
            <Label>Tipo</Label>
            <Select value={tipo} onValueChange={(v) => setTipo(v as TipoRecurrente)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(TIPO_RECURRENTE_LABEL).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label>Descripción</Label>
            <Input value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Entidad o motivo" />
          </div>
          <div className="space-y-1.5">
            <Label>Valor mensual</Label>
            <Input value={valor} inputMode="numeric" onChange={(e) => setValor(e.target.value)} placeholder="0" />
          </div>
          <div className="md:col-span-5">
            <Button
              onClick={() => {
                const v = Number(valor.replace(/\D/g, ""));
                if (!descripcion.trim() || !v) {
                  toast.error("Registre descripción y valor del concepto");
                  return;
                }
                agregarRecurrente({ empleadoId, tipo, descripcion: descripcion.trim(), valorMensual: v });
                setDescripcion("");
                setValor("");
                toast.success("Concepto registrado");
              }}
            >
              <Plus className="size-4" /> Registrar concepto
            </Button>
          </div>
        </div>
      )}
      <DataTable columns={columnas} rows={recurrentes} />
    </div>
  );
}

/* -------------------------- Liquidaciones definitivas -------------------------- */
