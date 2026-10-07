/**
 * Pestaña "Accidentes laborales" de SST: reporte, investigación y acciones correctivas.
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

export function AccidentesTab({
  gestiona,
  nombrePor,
  vinculados,
}: {
  gestiona: boolean;
  nombrePor: Record<string, string>;
  vinculados: string[];
}) {
  const { accidentes, reportarEvento, actualizarInvestigacion } = useSst();
  const [form, setForm] = useState({
    empleadoId: vinculados[0] ?? "",
    tipo: "accidente" as TipoEventoSST,
    fecha: hoyISO(),
    hora: "08:00",
    centroTrabajoId: "ct-2",
    parteCuerpo: "",
    descripcion: "",
    gravedad: "leve" as GravedadSST,
    diasIncapacidad: 0,
    reportadoArl: true,
  });
  const [expandido, setExpandido] = useState<string | null>(null);
  const [causa, setCausa] = useState("");
  const [accion, setAccion] = useState("");

  const columns: Column<AccidenteLaboral>[] = [
    {
      key: "evento",
      header: "Evento",
      render: (a) => (
        <div>
          <div className="font-medium text-foreground">{a.consecutivo}</div>
          <div className="text-xs text-muted-foreground">{TIPO_EVENTO_SST_LABEL[a.tipo]}</div>
        </div>
      ),
    },
    {
      key: "empleado",
      header: "Empleado / Centro",
      render: (a) => (
        <div>
          <div className="text-foreground">{nombrePor[a.empleadoId] ?? a.empleadoId}</div>
          <div className="text-xs text-muted-foreground">{centroTrabajoById(a.centroTrabajoId)?.nombre ?? "—"}</div>
        </div>
      ),
    },
    {
      key: "fecha",
      header: "Fecha",
      render: (a) => (
        <span className="text-xs tabular-nums text-muted-foreground">{a.fecha} · {a.hora}</span>
      ),
    },
    { key: "gravedad", header: "Gravedad", render: (a) => <GravedadBadge gravedad={a.gravedad} /> },
    {
      key: "dias",
      header: "Días / ARL",
      render: (a) => (
        <div className="text-xs">
          <div className="tabular-nums text-foreground">{a.diasIncapacidad} días</div>
          <div className="text-muted-foreground">{a.reportadoArl ? "Reportado a ARL" : "Sin reporte ARL"}</div>
        </div>
      ),
    },
    { key: "investigacion", header: "Investigación", render: (a) => <InvestigacionBadge estado={a.estadoInvestigacion} /> },
    {
      key: "acciones",
      header: "Detalle",
      render: (a) => (
        <Button size="sm" variant="outline" onClick={() => { setExpandido(expandido === a.id ? null : a.id); setCausa(a.causaRaiz ?? ""); setAccion(""); }}>
          {expandido === a.id ? "Ocultar" : "Ver"}
        </Button>
      ),
    },
  ];

  const detalle = accidentes.find((a) => a.id === expandido);

  return (
    <div className="space-y-4">
      {gestiona && (
        <div className="surface-panel space-y-4 p-5">
          <h2 className="font-display text-lg font-semibold text-foreground">Reportar accidente o incidente</h2>
          <div className="grid gap-3 md:grid-cols-4">
            <div className="space-y-1.5">
              <Label>Empleado</Label>
              <Select value={form.empleadoId} onValueChange={(v) => setForm({ ...form, empleadoId: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {vinculados.map((id) => <SelectItem key={id} value={id}>{nombrePor[id]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Tipo de evento</Label>
              <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v as TipoEventoSST })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(TIPO_EVENTO_SST_LABEL) as TipoEventoSST[]).map((t) => (
                    <SelectItem key={t} value={t}>{TIPO_EVENTO_SST_LABEL[t]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Fecha</Label>
              <Input type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Hora</Label>
              <Input type="time" value={form.hora} onChange={(e) => setForm({ ...form, hora: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Centro de trabajo</Label>
              <Select value={form.centroTrabajoId} onValueChange={(v) => setForm({ ...form, centroTrabajoId: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["ct-1", "ct-2", "ct-3", "ct-4"].map((id) => (
                    <SelectItem key={id} value={id}>{centroTrabajoById(id)?.nombre ?? id}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Parte del cuerpo</Label>
              <Input value={form.parteCuerpo} maxLength={60} onChange={(e) => setForm({ ...form, parteCuerpo: e.target.value })} placeholder="Mano derecha" />
            </div>
            <div className="space-y-1.5">
              <Label>Gravedad</Label>
              <Select value={form.gravedad} onValueChange={(v) => setForm({ ...form, gravedad: v as GravedadSST })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(GRAVEDAD_LABEL) as GravedadSST[]).map((g) => (
                    <SelectItem key={g} value={g}>{GRAVEDAD_LABEL[g]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Días de incapacidad</Label>
              <Input
                type="number"
                min={0}
                max={365}
                value={form.diasIncapacidad}
                onChange={(e) => setForm({ ...form, diasIncapacidad: Math.max(0, Math.min(365, Number(e.target.value) || 0)) })}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Descripción del evento</Label>
            <Textarea
              value={form.descripcion}
              maxLength={800}
              onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
              placeholder="Describa cómo ocurrió el evento, tareas involucradas y testigos."
            />
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch checked={form.reportadoArl} onCheckedChange={(v) => setForm({ ...form, reportadoArl: v })} id="arl" />
              <Label htmlFor="arl" className="text-sm">Reportado a la ARL</Label>
            </div>
            <Button
              size="sm"
              onClick={() => {
                if (!form.empleadoId || form.descripcion.trim().length < 10 || !form.parteCuerpo.trim()) {
                  return toast.error("Complete empleado, parte del cuerpo y una descripción de al menos 10 caracteres.");
                }
                reportarEvento({ ...form, parteCuerpo: form.parteCuerpo.trim(), descripcion: form.descripcion.trim(), responsable: "Área SST" });
                setForm({ ...form, parteCuerpo: "", descripcion: "", diasIncapacidad: 0 });
                toast.success("Evento reportado. Investigación abierta.");
              }}
            >
              Reportar evento
            </Button>
          </div>
        </div>
      )}

      <DataTable columns={columns} rows={accidentes} emptyMessage="Sin eventos de accidentalidad registrados." />

      {detalle && (
        <div className="surface-panel space-y-4 p-5">
          <div>
            <h3 className="font-medium text-foreground">{detalle.consecutivo} · {TIPO_EVENTO_SST_LABEL[detalle.tipo]}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{detalle.descripcion}</p>
          </div>
          <div className="grid gap-3 text-sm md:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Causa raíz</p>
              <p className="text-foreground">{detalle.causaRaiz ?? "Pendiente de investigación"}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Acciones correctivas</p>
              {detalle.accionesCorrectivas.length ? (
                <ul className="list-disc pl-4 text-foreground">
                  {detalle.accionesCorrectivas.map((a, i) => <li key={i}>{a}</li>)}
                </ul>
              ) : (
                <p className="text-muted-foreground">Sin acciones registradas</p>
              )}
            </div>
          </div>
          {gestiona && (
            <div className="space-y-3 border-t border-border pt-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Causa raíz</Label>
                  <Textarea value={causa} maxLength={400} onChange={(e) => setCausa(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Nueva acción correctiva</Label>
                  <Textarea value={accion} maxLength={400} onChange={(e) => setAccion(e.target.value)} />
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={() => { actualizarInvestigacion(detalle.id, { causaRaiz: causa, accionCorrectiva: accion }); setAccion(""); toast.success("Investigación actualizada."); }}>
                  Guardar investigación
                </Button>
                {(Object.keys(ESTADO_INVESTIGACION_LABEL) as EstadoInvestigacion[]).map((est) => (
                  <Button
                    key={est}
                    size="sm"
                    variant={detalle.estadoInvestigacion === est ? "default" : "outline"}
                    onClick={() => { actualizarInvestigacion(detalle.id, { estadoInvestigacion: est }); toast.success(`Estado: ${ESTADO_INVESTIGACION_LABEL[est]}`); }}
                  >
                    {ESTADO_INVESTIGACION_LABEL[est]}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ---------------------------- Capacitaciones ---------------------------- */
