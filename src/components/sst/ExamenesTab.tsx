/**
 * Pestaña "Exámenes médicos" de SST: registro, vigencia y exportación de exámenes ocupacionales.
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

export function ExamenesTab({
  gestiona,
  nombrePor,
  vinculados,
}: {
  gestiona: boolean;
  nombrePor: Record<string, string>;
  vinculados: string[];
}) {
  const { examenes, programarExamen, registrarConcepto } = useSst();
  const [empleadoId, setEmpleadoId] = useState(vinculados[0] ?? "");
  const [tipo, setTipo] = useState<TipoExamen>("periodico");
  const [entidad, setEntidad] = useState("IPS Salud Ocupacional SAS");
  const [fecha, setFecha] = useState(hoyISO());
  const [conceptoId, setConceptoId] = useState<string | null>(null);
  const [concepto, setConcepto] = useState<ConceptoMedico>("apto");
  const [recomendaciones, setRecomendaciones] = useState("");
  const [filtro, setFiltro] = useState<"todos" | "pendientes" | "por_vencer">("todos");

  const filtrados = examenes.filter((e) => {
    if (filtro === "pendientes") return e.concepto === "pendiente";
    if (filtro === "por_vencer") {
      const d = diasHasta(e.vigenciaHasta);
      return d !== null && d <= 60;
    }
    return true;
  });

  const columns: Column<ExamenMedico>[] = [
    {
      key: "empleado",
      header: "Empleado",
      render: (e) => (
        <div>
          <div className="font-medium text-foreground">{nombrePor[e.empleadoId] ?? e.empleadoId}</div>
          <div className="text-xs text-muted-foreground">{e.entidad}</div>
        </div>
      ),
    },
    { key: "tipo", header: "Tipo", render: (e) => <span className="text-sm">{TIPO_EXAMEN_LABEL[e.tipo]}</span> },
    {
      key: "fechas",
      header: "Programado / Realizado",
      render: (e) => (
        <div className="text-xs tabular-nums text-muted-foreground">
          <div>{e.fechaProgramada}</div>
          <div className="text-foreground">{e.fechaRealizada ?? "Sin realizar"}</div>
        </div>
      ),
    },
    { key: "concepto", header: "Concepto", render: (e) => <ConceptoBadge concepto={e.concepto} /> },
    { key: "vigencia", header: "Vigencia", render: (e) => <VigenciaExamenBadge dias={diasHasta(e.vigenciaHasta)} /> },
    {
      key: "acciones",
      header: "Acciones",
      render: (e) =>
        gestiona ? (
          <Button size="sm" variant="outline" onClick={() => { setConceptoId(e.id); setConcepto(e.concepto === "pendiente" ? "apto" : e.concepto); setRecomendaciones(e.recomendaciones ?? ""); }}>
            Registrar concepto
          </Button>
        ) : (
          <span className="text-xs text-muted-foreground">Solo lectura</span>
        ),
    },
  ];

  return (
    <div className="space-y-4">
      {gestiona && (
        <div className="surface-panel space-y-4 p-5">
          <h2 className="font-display text-lg font-semibold text-foreground">Programar examen ocupacional</h2>
          <div className="grid gap-3 md:grid-cols-4">
            <div className="space-y-1.5">
              <Label>Empleado</Label>
              <Select value={empleadoId} onValueChange={setEmpleadoId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {vinculados.map((id) => (
                    <SelectItem key={id} value={id}>{nombrePor[id]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select value={tipo} onValueChange={(v) => setTipo(v as TipoExamen)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(TIPO_EXAMEN_LABEL) as TipoExamen[]).map((t) => (
                    <SelectItem key={t} value={t}>{TIPO_EXAMEN_LABEL[t]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Entidad / IPS</Label>
              <Input value={entidad} maxLength={80} onChange={(ev) => setEntidad(ev.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Fecha programada</Label>
              <Input type="date" value={fecha} onChange={(ev) => setFecha(ev.target.value)} />
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => {
              if (!empleadoId || !entidad.trim()) return toast.error("Complete empleado y entidad.");
              programarExamen({ empleadoId, tipo, entidad: entidad.trim(), fechaProgramada: fecha, responsable: "Área SST" });
              toast.success("Examen programado.");
            }}
          >
            Programar examen
          </Button>
        </div>
      )}

      {conceptoId && (
        <div className="surface-panel space-y-3 p-5">
          <h3 className="font-medium text-foreground">Concepto médico ocupacional</h3>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Concepto</Label>
              <Select value={concepto} onValueChange={(v) => setConcepto(v as ConceptoMedico)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(CONCEPTO_LABEL) as ConceptoMedico[]).map((c) => (
                    <SelectItem key={c} value={c}>{CONCEPTO_LABEL[c]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Recomendaciones médicas</Label>
              <Textarea
                value={recomendaciones}
                maxLength={500}
                onChange={(ev) => setRecomendaciones(ev.target.value)}
                placeholder="Restricciones o recomendaciones laborales"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => {
                registrarConcepto(conceptoId, concepto, recomendaciones, "Área SST");
                setConceptoId(null);
                toast.success("Concepto registrado. Vigencia actualizada a 12 meses.");
              }}
            >
              Guardar concepto
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setConceptoId(null)}>Cancelar</Button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Select value={filtro} onValueChange={(v) => setFiltro(v as typeof filtro)}>
          <SelectTrigger className="h-9 w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los exámenes</SelectItem>
            <SelectItem value="pendientes">Pendientes de concepto</SelectItem>
            <SelectItem value="por_vencer">Por vencer o vencidos</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground">{filtrados.length} registros</span>
      </div>

      <DataTable columns={columns} rows={filtrados} emptyMessage="Sin exámenes registrados." />
    </div>
  );
}

/* ------------------------------ Accidentes ------------------------------ */
