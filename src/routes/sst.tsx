import { createFileRoute } from "@tanstack/react-router";
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

export const Route = createFileRoute("/sst")({
  head: () => ({
    meta: [
      { title: "SST — Seguridad y Salud en el Trabajo | SIGTH" },
      {
        name: "description",
        content:
          "Exámenes médicos ocupacionales, accidentalidad laboral, capacitaciones e indicadores del SG-SST con trazabilidad completa.",
      },
      { property: "og:title", content: "SST — Seguridad y Salud en el Trabajo | SIGTH" },
      {
        property: "og:description",
        content:
          "Gestión del SG-SST: exámenes, accidentes e incidentes, capacitaciones e indicadores de frecuencia y severidad.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SstPage,
});

function SstPage() {
  const { empleados, rolActivo } = useRrhh();
  const sst = useSst();
  const gestiona = puedeGestionarSST(rolActivo);

  const vinculados = useMemo(
    () => empleados.filter((e) => ESTADOS_VINCULADOS.includes(e.estadoLaboral)),
    [empleados],
  );
  const nombrePor = useMemo(
    () => Object.fromEntries(empleados.map((e) => [e.id, nombreEmpleado(e)])) as Record<string, string>,
    [empleados],
  );

  const indicadores = useMemo(
    () =>
      calcularIndicadores(sst.accidentes, sst.capacitaciones, sst.examenes, vinculados.length),
    [sst.accidentes, sst.capacitaciones, sst.examenes, vinculados.length],
  );

  return (
    <AppShell>
      <PageHeader
        breadcrumb={["Operación", "SST"]}
        title="Seguridad y Salud en el Trabajo"
        description="Módulo base y escalable del SG-SST: exámenes médicos ocupacionales, accidentes e incidentes laborales, capacitaciones e indicadores de gestión."
        actions={
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              downloadCsv(
                `indicadores-sst-${hoyISO()}.csv`,
                ["Indicador", "Valor"],
                [
                  ["Accidentes de trabajo", indicadores.accidentes],
                  ["Incidentes", indicadores.incidentes],
                  ["Enfermedades laborales", indicadores.enfermedades],
                  ["Días perdidos", indicadores.diasPerdidos],
                  ["Índice de frecuencia", indicadores.frecuencia],
                  ["Índice de severidad", indicadores.severidad],
                  ["ILI", indicadores.ili],
                  ["Cobertura capacitación (%)", indicadores.coberturaCapacitacion],
                  ["Exámenes vigentes", indicadores.examenesVigentes],
                  ["Exámenes pendientes", indicadores.examenesPendientes],
                ],
              )
            }
          >
            Exportar indicadores
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Eventos registrados" value={String(indicadores.totalEventos)} icon={ShieldAlert} hint={`${indicadores.investigacionesAbiertas} en investigación`} />
        <StatCard label="Días perdidos" value={String(indicadores.diasPerdidos)} icon={AlertTriangle} hint="Incapacidades por eventos SST" />
        <StatCard label="Cobertura capacitación" value={`${indicadores.coberturaCapacitacion}%`} icon={GraduationCap} hint={`${indicadores.horasCapacitacion} horas hombre`} />
        <StatCard label="Exámenes vigentes" value={String(indicadores.examenesVigentes)} icon={Stethoscope} hint={`${indicadores.examenesPorVencer} por vencer`} />
      </div>

      <Tabs defaultValue="examenes" className="space-y-4">
        <TabsList className="flex w-full flex-wrap justify-start">
          <TabsTrigger value="examenes">Exámenes médicos</TabsTrigger>
          <TabsTrigger value="accidentes">Accidentes laborales</TabsTrigger>
          <TabsTrigger value="capacitaciones">Capacitaciones</TabsTrigger>
          <TabsTrigger value="indicadores">Indicadores</TabsTrigger>
        </TabsList>

        <TabsContent value="examenes">
          <ExamenesTab gestiona={gestiona} nombrePor={nombrePor} vinculados={vinculados.map((e) => e.id)} />
        </TabsContent>
        <TabsContent value="accidentes">
          <AccidentesTab gestiona={gestiona} nombrePor={nombrePor} vinculados={vinculados.map((e) => e.id)} />
        </TabsContent>
        <TabsContent value="capacitaciones">
          <CapacitacionesTab gestiona={gestiona} nombrePor={nombrePor} vinculados={vinculados.map((e) => e.id)} />
        </TabsContent>
        <TabsContent value="indicadores">
          <IndicadoresTab indicadores={indicadores} />
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}

/* ------------------------------- Exámenes ------------------------------- */

function ExamenesTab({
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

function AccidentesTab({
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

function CapacitacionesTab({
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

function IndicadoresTab({ indicadores }: { indicadores: ReturnType<typeof calcularIndicadores> }) {
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
