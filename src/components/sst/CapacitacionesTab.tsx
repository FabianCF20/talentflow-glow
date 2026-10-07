/**
 * Pestaña "Capacitaciones" de SST: programación, convocados y asistencia.
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

export function CapacitacionesTab({
  gestiona,
  nombrePor,
  vinculados,
}: {
  gestiona: boolean;
  nombrePor: Record<string, string>;
  vinculados: string[];
}) {
  const { capacitaciones, crearCapacitacion, marcarAsistencia } = useSst();
  const [nueva, setNueva] = useState({
    tema: "",
    fecha: hoyISO(),
    duracionHoras: 2,
    modalidad: "presencial" as ModalidadCapacitacion,
    instructor: "",
    obligatoria: true,
  });
  const [seleccion, setSeleccion] = useState<string[]>([]);
  const [abierta, setAbierta] = useState<string | null>(null);

  const columns: Column<CapacitacionSST>[] = [
    {
      key: "tema",
      header: "Capacitación",
      render: (c) => (
        <div>
          <div className="font-medium text-foreground">{c.tema}</div>
          <div className="text-xs text-muted-foreground">{c.codigo} · {c.instructor}</div>
        </div>
      ),
    },
    {
      key: "fecha",
      header: "Fecha / Duración",
      render: (c) => (
        <div className="text-xs text-muted-foreground">
          <div className="tabular-nums text-foreground">{c.fecha}</div>
          <div>{c.duracionHoras} h · {MODALIDAD_LABEL[c.modalidad]}</div>
        </div>
      ),
    },
    {
      key: "obligatoria",
      header: "Carácter",
      render: (c) => (
        <span className="rounded-md border border-border bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
          {c.obligatoria ? "Obligatoria" : "Opcional"}
        </span>
      ),
    },
    {
      key: "asistencia",
      header: "Asistencia",
      render: (c) => {
        const asistieron = c.asistentes.filter((a) => a.asistio).length;
        const pct = c.asistentes.length ? Math.round((asistieron / c.asistentes.length) * 100) : 0;
        return (
          <span className="tabular-nums text-sm text-foreground">
            {asistieron}/{c.asistentes.length} <span className="text-muted-foreground">({pct}%)</span>
          </span>
        );
      },
    },
    {
      key: "acciones",
      header: "Asistentes",
      render: (c) => (
        <Button size="sm" variant="outline" onClick={() => setAbierta(abierta === c.id ? null : c.id)}>
          {abierta === c.id ? "Ocultar" : "Gestionar"}
        </Button>
      ),
    },
  ];

  const detalle = capacitaciones.find((c) => c.id === abierta);

  return (
    <div className="space-y-4">
      {gestiona && (
        <div className="surface-panel space-y-4 p-5">
          <h2 className="font-display text-lg font-semibold text-foreground">Programar capacitación SST</h2>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="space-y-1.5 md:col-span-2">
              <Label>Tema</Label>
              <Input value={nueva.tema} maxLength={120} onChange={(e) => setNueva({ ...nueva, tema: e.target.value })} placeholder="Uso correcto de EPP" />
            </div>
            <div className="space-y-1.5">
              <Label>Instructor</Label>
              <Input value={nueva.instructor} maxLength={80} onChange={(e) => setNueva({ ...nueva, instructor: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Fecha</Label>
              <Input type="date" value={nueva.fecha} onChange={(e) => setNueva({ ...nueva, fecha: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Duración (horas)</Label>
              <Input type="number" min={1} max={40} value={nueva.duracionHoras} onChange={(e) => setNueva({ ...nueva, duracionHoras: Math.max(1, Math.min(40, Number(e.target.value) || 1)) })} />
            </div>
            <div className="space-y-1.5">
              <Label>Modalidad</Label>
              <Select value={nueva.modalidad} onValueChange={(v) => setNueva({ ...nueva, modalidad: v as ModalidadCapacitacion })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(MODALIDAD_LABEL) as ModalidadCapacitacion[]).map((m) => (
                    <SelectItem key={m} value={m}>{MODALIDAD_LABEL[m]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Convocados ({seleccion.length})</Label>
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={() => setSeleccion(vinculados)}>Todos</Button>
                <Button size="sm" variant="ghost" onClick={() => setSeleccion([])}>Ninguno</Button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {vinculados.map((id) => {
                const activo = seleccion.includes(id);
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setSeleccion((prev) => (activo ? prev.filter((x) => x !== id) : [...prev, id]))}
                    className={
                      activo
                        ? "rounded-full border border-primary bg-primary-soft px-3 py-1 text-xs font-medium text-primary"
                        : "rounded-full border border-border px-3 py-1 text-xs text-muted-foreground hover:bg-muted"
                    }
                  >
                    {nombrePor[id]}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch id="obl" checked={nueva.obligatoria} onCheckedChange={(v) => setNueva({ ...nueva, obligatoria: v })} />
              <Label htmlFor="obl" className="text-sm">Obligatoria</Label>
            </div>
            <Button
              size="sm"
              onClick={() => {
                if (!nueva.tema.trim() || !nueva.instructor.trim() || seleccion.length === 0) {
                  return toast.error("Complete tema, instructor y al menos un convocado.");
                }
                crearCapacitacion({ ...nueva, tema: nueva.tema.trim(), instructor: nueva.instructor.trim(), empleadoIds: seleccion });
                setNueva({ ...nueva, tema: "", instructor: "" });
                setSeleccion([]);
                toast.success("Capacitación programada.");
              }}
            >
              Programar capacitación
            </Button>
          </div>
        </div>
      )}

      <DataTable columns={columns} rows={capacitaciones} emptyMessage="Sin capacitaciones registradas." />

      {detalle && (
        <div className="surface-panel space-y-3 p-5">
          <h3 className="font-medium text-foreground">Asistentes · {detalle.tema}</h3>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {detalle.asistentes.map((a) => (
              <label key={a.empleadoId} className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2 text-sm">
                <span className="text-foreground">{nombrePor[a.empleadoId] ?? a.empleadoId}</span>
                <span className="flex items-center gap-2">
                  {a.calificacion !== undefined && (
                    <span className="tabular-nums text-xs text-muted-foreground">{a.calificacion} pts</span>
                  )}
                  <Switch
                    checked={a.asistio}
                    disabled={!gestiona}
                    onCheckedChange={(v) => marcarAsistencia(detalle.id, a.empleadoId, v)}
                  />
                </span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ----------------------------- Indicadores ----------------------------- */
