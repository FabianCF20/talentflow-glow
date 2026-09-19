import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ClipboardCheck, Users, BarChart3, Plus, Trash2, Award } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/common/StatusBadge";
import { BarraDistribucion } from "@/components/sst/SstBadges";
import { ResultadoBadge, TipoInstrumentoBadge } from "@/components/disciplinario/DisciplinarioBadges";
import { useRrhh } from "@/store/rrhh";
import { useDisciplinario } from "@/store/disciplinario";
import {
  destinatariosAsignacion,
  indicadoresEvaluacion,
  puedeGestionarEvaluaciones,
} from "@/lib/disciplinario";
import { estadisticasFormulario } from "@/lib/sst";
import { downloadCsv } from "@/lib/export";
import { AREAS, CARGOS } from "@/data/organizacion";
import { nombreEmpleado, ESTADOS_VINCULADOS } from "@/types/rrhh";
import {
  TIPO_ASIGNACION_LABEL,
  TIPO_CAMPO_LABEL,
  type TipoAsignacion,
  type TipoCampo,
  type ValorRespuesta,
} from "@/types/sst";
import {
  TIPO_INSTRUMENTO_LABEL,
  type CampoEvaluacion,
  type Evaluacion,
  type RespuestaEvaluacion,
  type TipoInstrumento,
} from "@/types/disciplinario";

export const Route = createFileRoute("/evaluaciones")({
  head: () => ({
    meta: [
      { title: "Evaluaciones, encuestas y pruebas SST | SIGTH" },
      {
        name: "description",
        content:
          "Encuestas, evaluaciones, cuestionarios y pruebas SST con resultados individuales, consolidados e indicadores de cobertura y aprobación.",
      },
      { property: "og:title", content: "Evaluaciones y pruebas SST | SIGTH" },
      {
        property: "og:description",
        content:
          "Diseñe instrumentos, asígnelos por empleado, cargo, área o empresa y analice resultados individuales y consolidados.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: EvaluacionesPage,
});

const TIPOS: TipoInstrumento[] = ["encuesta", "evaluacion", "cuestionario", "prueba_sst"];

const nuevoCampo = (n: number): CampoEvaluacion => ({
  id: `c${n}-${Date.now()}`,
  etiqueta: `Pregunta ${n}`,
  tipo: "seleccion_unica",
  requerido: true,
  opciones: ["Sí", "No"],
});

function EvaluacionesPage() {
  const { empleados, rolActivo, empleadoActuandoId } = useRrhh();
  const disc = useDisciplinario();
  const gestiona = puedeGestionarEvaluaciones(rolActivo);

  const vinculados = useMemo(
    () => empleados.filter((e) => ESTADOS_VINCULADOS.includes(e.estadoLaboral)),
    [empleados],
  );
  const nombrePor = useMemo(
    () => Object.fromEntries(empleados.map((e) => [e.id, nombreEmpleado(e)])) as Record<string, string>,
    [empleados],
  );

  const activas = disc.evaluaciones.filter((e) => e.estado === "activo");
  const [activoId, setActivoId] = useState<string>(disc.evaluaciones[0]?.id ?? "");
  const evaluacion = disc.evaluaciones.find((e) => e.id === activoId) ?? disc.evaluaciones[0] ?? null;

  const indicadoresGlobales = useMemo(() => {
    const calificadas = disc.respuestas.filter((r) => typeof r.puntaje === "number");
    const destinatarios = activas.reduce(
      (s, e) => s + destinatariosAsignacion(e.asignacion).length,
      0,
    );
    return {
      instrumentos: activas.length,
      respuestas: disc.respuestas.length,
      cobertura: destinatarios ? Math.round((disc.respuestas.length / destinatarios) * 100) : 0,
      promedio: calificadas.length
        ? Math.round(calificadas.reduce((s, r) => s + (r.puntaje ?? 0), 0) / calificadas.length)
        : 0,
    };
  }, [activas, disc.respuestas]);

  /* ----------------------------- Constructor ----------------------------- */
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [tipo, setTipo] = useState<TipoInstrumento>("evaluacion");
  const [puntajeAprobacion, setPuntajeAprobacion] = useState(70);
  const [campos, setCampos] = useState<CampoEvaluacion[]>([nuevoCampo(1)]);
  const [tipoAsignacion, setTipoAsignacion] = useState<TipoAsignacion>("empresa");
  const [valores, setValores] = useState<string[]>([]);

  const actualizarCampo = (id: string, cambios: Partial<CampoEvaluacion>) =>
    setCampos((prev) => prev.map((c) => (c.id === id ? { ...c, ...cambios } : c)));

  const crear = () => {
    if (titulo.trim().length < 5 || campos.some((c) => !c.etiqueta.trim())) {
      toast.error("Complete el título y las preguntas del instrumento.");
      return;
    }
    if (tipoAsignacion !== "empresa" && valores.length === 0) {
      toast.error("Seleccione al menos un destinatario para la asignación.");
      return;
    }
    disc.crearEvaluacion({
      titulo,
      descripcion,
      tipo,
      campos,
      asignacion: { tipo: tipoAsignacion, valores: tipoAsignacion === "empresa" ? [] : valores },
      puntajeAprobacion: campos.some((c) => c.correcta !== undefined) ? puntajeAprobacion : undefined,
      responsable: "Talento Humano",
    });
    setTitulo("");
    setDescripcion("");
    setCampos([nuevoCampo(1)]);
    setValores([]);
    toast.success("Instrumento creado y asignado.");
  };

  /* ---------------------------- Diligenciamiento ---------------------------- */
  const [respuestasForm, setRespuestasForm] = useState<Record<string, ValorRespuesta>>({});

  const responder = () => {
    if (!evaluacion) return;
    const faltantes = evaluacion.campos.filter(
      (c) =>
        c.requerido &&
        (respuestasForm[c.id] === undefined ||
          respuestasForm[c.id] === "" ||
          (Array.isArray(respuestasForm[c.id]) && (respuestasForm[c.id] as string[]).length === 0)),
    );
    if (faltantes.length) {
      toast.error("Responda todas las preguntas obligatorias.");
      return;
    }
    disc.responderEvaluacion(evaluacion.id, empleadoActuandoId, respuestasForm);
    setRespuestasForm({});
    toast.success("Respuestas registradas. Los resultados se actualizaron.");
  };

  /* ------------------------------ Resultados ------------------------------ */
  const indicadores = evaluacion ? indicadoresEvaluacion(evaluacion, disc.respuestas) : null;
  const estadisticas = useMemo(
    () =>
      evaluacion
        ? estadisticasFormulario(
            {
              id: evaluacion.id,
              codigo: evaluacion.codigo,
              titulo: evaluacion.titulo,
              descripcion: evaluacion.descripcion,
              campos: evaluacion.campos,
              asignacion: evaluacion.asignacion,
              estado: evaluacion.estado,
              creadoPor: evaluacion.creadoPor,
              creadoEn: evaluacion.creadoEn,
            },
            disc.respuestas.map((r) => ({
              id: r.id,
              formularioId: r.evaluacionId,
              empleadoId: r.empleadoId,
              fecha: r.fecha,
              hora: r.hora,
              valores: r.valores,
            })),
          )
        : [],
    [evaluacion, disc.respuestas],
  );

  const individuales = evaluacion
    ? disc.respuestas.filter((r) => r.evaluacionId === evaluacion.id)
    : [];

  const columnasIndividuales: Column<RespuestaEvaluacion>[] = [
    {
      key: "empleado",
      header: "Empleado",
      render: (r) => (
        <div className="space-y-0.5">
          <p className="font-medium text-foreground">{nombrePor[r.empleadoId] ?? r.empleadoId}</p>
          <p className="text-xs text-muted-foreground">
            {r.fecha} · {r.hora}
          </p>
        </div>
      ),
    },
    {
      key: "resultado",
      header: "Resultado",
      render: (r) => <ResultadoBadge puntaje={r.puntaje} aprobado={r.aprobado} />,
    },
    {
      key: "respuestas",
      header: "Respuestas",
      render: (r) => (
        <span className="text-sm text-muted-foreground">
          {Object.keys(r.valores).length} preguntas diligenciadas
        </span>
      ),
    },
  ];

  const exportar = () => {
    if (!evaluacion) return;
    downloadCsv(
      `resultados-${evaluacion.codigo}.csv`,
      ["Empleado", "Fecha", "Puntaje", "Estado"],
      individuales.map((r) => [
        nombrePor[r.empleadoId] ?? r.empleadoId,
        r.fecha,
        typeof r.puntaje === "number" ? `${r.puntaje}%` : "—",
        r.aprobado === undefined ? "Sin calificación" : r.aprobado ? "Aprobado" : "Reprobado",
      ]),
    );
  };

  const opcionesAsignacion =
    tipoAsignacion === "empleado"
      ? vinculados.map((e) => ({ id: e.id, label: nombreEmpleado(e) }))
      : tipoAsignacion === "cargo"
        ? CARGOS.map((c) => ({ id: c.id, label: c.nombre }))
        : tipoAsignacion === "area"
          ? AREAS.map((a) => ({ id: a.id, label: a.nombre }))
          : [];

  return (
    <AppShell>
      <PageHeader
        title="Evaluaciones y pruebas"
        description="Encuestas, evaluaciones, cuestionarios y pruebas SST con resultados individuales, consolidados e indicadores."
        breadcrumb={["Talento Humano", "Evaluaciones"]}
        actions={
          <Button variant="outline" onClick={exportar} disabled={!evaluacion}>
            Exportar resultados
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Instrumentos activos"
          value={String(indicadoresGlobales.instrumentos)}
          icon={ClipboardCheck}
        />
        <StatCard label="Respuestas recibidas" value={String(indicadoresGlobales.respuestas)} icon={Users} />
        <StatCard
          label="Cobertura global"
          value={`${indicadoresGlobales.cobertura}%`}
          icon={BarChart3}
          hint="Respuestas sobre destinatarios"
        />
        <StatCard
          label="Promedio calificado"
          value={`${indicadoresGlobales.promedio}%`}
          icon={Award}
          hint="Instrumentos con respuesta correcta"
        />
      </div>

      <div className="surface-panel space-y-1.5 p-5">
        <Label>Instrumento seleccionado</Label>
        <Select value={evaluacion?.id ?? ""} onValueChange={setActivoId}>
          <SelectTrigger className="md:w-[420px]">
            <SelectValue placeholder="Seleccione un instrumento" />
          </SelectTrigger>
          <SelectContent>
            {disc.evaluaciones.map((e) => (
              <SelectItem key={e.id} value={e.id}>
                {e.codigo} — {e.titulo}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="resultados" className="space-y-6">
        <TabsList>
          <TabsTrigger value="resultados">Resultados</TabsTrigger>
          <TabsTrigger value="diligenciar">Diligenciar</TabsTrigger>
          <TabsTrigger value="instrumentos">Instrumentos</TabsTrigger>
          <TabsTrigger value="constructor">Nuevo instrumento</TabsTrigger>
        </TabsList>

        {/* ------------------------------ Resultados ------------------------------ */}
        <TabsContent value="resultados" className="space-y-6">
          {!evaluacion || !indicadores ? (
            <div className="surface-panel p-5 text-sm text-muted-foreground">
              Seleccione un instrumento para ver sus resultados.
            </div>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard label="Destinatarios" value={String(indicadores.destinatarios)} icon={Users} />
                <StatCard
                  label="Cobertura"
                  value={`${indicadores.cobertura}%`}
                  icon={BarChart3}
                  hint={`${indicadores.respuestas} respuestas`}
                />
                <StatCard
                  label="Promedio"
                  value={indicadores.promedio !== undefined ? `${indicadores.promedio}%` : "—"}
                  icon={Award}
                  hint={
                    evaluacion.puntajeAprobacion
                      ? `Mínimo aprobatorio ${evaluacion.puntajeAprobacion}%`
                      : "Instrumento sin calificación"
                  }
                />
                <StatCard
                  label="Aprobación"
                  value={
                    indicadores.tasaAprobacion !== undefined ? `${indicadores.tasaAprobacion}%` : "—"
                  }
                  icon={ClipboardCheck}
                  hint={`${indicadores.aprobados} aprobados · ${indicadores.reprobados} reprobados`}
                />
              </div>

              <section className="surface-panel space-y-5 p-5">
                <h2 className="text-sm font-semibold text-foreground">Resultados consolidados</h2>
                {estadisticas.map((est) => (
                  <div key={est.campo.id} className="space-y-2 border-b border-border/60 pb-4 last:border-0">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-medium text-foreground">{est.campo.etiqueta}</p>
                      <span className="text-xs text-muted-foreground">
                        {est.respuestas} respuestas
                        {est.promedio !== undefined ? ` · promedio ${est.promedio}` : ""}
                      </span>
                    </div>
                    {est.distribucion.length > 0 && (
                      <div className="space-y-2">
                        {est.distribucion.map((d) => (
                          <BarraDistribucion key={d.etiqueta} {...d} />
                        ))}
                      </div>
                    )}
                    {est.textos && est.textos.length > 0 && (
                      <ul className="space-y-1 text-sm text-muted-foreground">
                        {est.textos.filter(Boolean).map((t, i) => (
                          <li key={i}>· {t}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </section>

              <section className="space-y-3">
                <h2 className="text-sm font-semibold text-foreground">Resultados individuales</h2>
                <DataTable
                  columns={columnasIndividuales}
                  rows={individuales}
                  emptyMessage="Aún no hay respuestas para este instrumento."
                />
              </section>
            </>
          )}
        </TabsContent>

        {/* ------------------------------ Diligenciar ------------------------------ */}
        <TabsContent value="diligenciar" className="space-y-4">
          {!evaluacion ? (
            <div className="surface-panel p-5 text-sm text-muted-foreground">
              Seleccione un instrumento para diligenciarlo.
            </div>
          ) : (
            <section className="surface-panel space-y-5 p-5">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-sm font-semibold text-foreground">{evaluacion.titulo}</h2>
                  <TipoInstrumentoBadge tipo={evaluacion.tipo} />
                </div>
                <p className="text-sm text-muted-foreground">{evaluacion.descripcion}</p>
                <p className="text-xs text-muted-foreground">
                  Responde: {nombrePor[empleadoActuandoId] ?? empleadoActuandoId}
                </p>
              </div>

              {evaluacion.campos.map((c) => (
                <div key={c.id} className="space-y-2">
                  <Label>
                    {c.etiqueta}
                    {c.requerido && <span className="ml-1 text-destructive">*</span>}
                  </Label>

                  {c.tipo === "texto" && (
                    <Textarea
                      rows={2}
                      value={(respuestasForm[c.id] as string) ?? ""}
                      onChange={(e) => setRespuestasForm((p) => ({ ...p, [c.id]: e.target.value }))}
                    />
                  )}

                  {c.tipo === "seleccion_unica" && (
                    <Select
                      value={(respuestasForm[c.id] as string) ?? ""}
                      onValueChange={(v) => setRespuestasForm((p) => ({ ...p, [c.id]: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione" />
                      </SelectTrigger>
                      <SelectContent>
                        {(c.opciones ?? []).map((o) => (
                          <SelectItem key={o} value={o}>
                            {o}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  {c.tipo === "seleccion_multiple" && (
                    <div className="space-y-2">
                      {(c.opciones ?? []).map((o) => {
                        const lista = (respuestasForm[c.id] as string[]) ?? [];
                        return (
                          <label key={o} className="flex items-center gap-2 text-sm text-foreground">
                            <Checkbox
                              checked={lista.includes(o)}
                              onCheckedChange={(v) =>
                                setRespuestasForm((p) => ({
                                  ...p,
                                  [c.id]: v ? [...lista, o] : lista.filter((x) => x !== o),
                                }))
                              }
                            />
                            {o}
                          </label>
                        );
                      })}
                    </div>
                  )}

                  {c.tipo === "booleano" && (
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={Boolean(respuestasForm[c.id])}
                        onCheckedChange={(v) => setRespuestasForm((p) => ({ ...p, [c.id]: v }))}
                      />
                      <span className="text-sm text-muted-foreground">
                        {respuestasForm[c.id] ? "Verdadero" : "Falso"}
                      </span>
                    </div>
                  )}

                  {c.tipo === "escala" && (
                    <div className="flex flex-wrap gap-2">
                      {Array.from(
                        { length: (c.escalaMax ?? 5) - (c.escalaMin ?? 1) + 1 },
                        (_, i) => (c.escalaMin ?? 1) + i,
                      ).map((n) => (
                        <Button
                          key={n}
                          size="sm"
                          variant={respuestasForm[c.id] === n ? "default" : "outline"}
                          onClick={() => setRespuestasForm((p) => ({ ...p, [c.id]: n }))}
                        >
                          {n}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              <Button onClick={responder}>Enviar respuestas</Button>
            </section>
          )}
        </TabsContent>

        {/* ----------------------------- Instrumentos ----------------------------- */}
        <TabsContent value="instrumentos" className="space-y-3">
          {disc.evaluaciones.map((e) => {
            const ind = indicadoresEvaluacion(e, disc.respuestas);
            return (
              <div
                key={e.id}
                className="surface-panel flex flex-wrap items-center justify-between gap-3 p-4"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-foreground">
                      {e.codigo} — {e.titulo}
                    </p>
                    <TipoInstrumentoBadge tipo={e.tipo} />
                    <StatusBadge status={e.estado} />
                  </div>
                  <p className="text-sm text-muted-foreground">{e.descripcion}</p>
                  <p className="text-xs text-muted-foreground">
                    {TIPO_ASIGNACION_LABEL[e.asignacion.tipo]} · {ind.destinatarios} destinatarios ·{" "}
                    {ind.respuestas} respuestas ({ind.cobertura}%)
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setActivoId(e.id)}>
                    Seleccionar
                  </Button>
                  {gestiona && (
                    <Button size="sm" variant="ghost" onClick={() => disc.archivarEvaluacion(e.id)}>
                      {e.estado === "activo" ? "Archivar" : "Reactivar"}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </TabsContent>

        {/* ----------------------------- Constructor ----------------------------- */}
        <TabsContent value="constructor" className="space-y-4">
          {!gestiona ? (
            <div className="surface-panel p-5 text-sm text-muted-foreground">
              Su rol no tiene permiso para crear instrumentos. Solicítelo a Talento Humano o al área SST.
            </div>
          ) : (
            <div className="surface-panel space-y-5 p-5">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Título</Label>
                  <Input
                    value={titulo}
                    maxLength={120}
                    onChange={(e) => setTitulo(e.target.value)}
                    placeholder="Evaluación de desempeño anual"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Descripción</Label>
                  <Input
                    value={descripcion}
                    maxLength={200}
                    onChange={(e) => setDescripcion(e.target.value)}
                    placeholder="Objetivo y periodicidad"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Tipo de instrumento</Label>
                  <Select value={tipo} onValueChange={(v) => setTipo(v as TipoInstrumento)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIPOS.map((t) => (
                        <SelectItem key={t} value={t}>
                          {TIPO_INSTRUMENTO_LABEL[t]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Puntaje mínimo aprobatorio (%)</Label>
                  <Input
                    type="number"
                    min={1}
                    max={100}
                    value={puntajeAprobacion}
                    onChange={(e) => setPuntajeAprobacion(Number(e.target.value) || 70)}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-foreground">Preguntas ({campos.length})</h3>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setCampos((p) => [...p, nuevoCampo(p.length + 1)])}
                  >
                    <Plus className="mr-1 size-3.5" /> Agregar pregunta
                  </Button>
                </div>

                {campos.map((c, idx) => (
                  <div key={c.id} className="space-y-3 rounded-lg border border-border p-4">
                    <div className="grid gap-3 md:grid-cols-[1fr_200px_auto]">
                      <div className="space-y-1.5">
                        <Label>Pregunta {idx + 1}</Label>
                        <Input
                          value={c.etiqueta}
                          maxLength={200}
                          onChange={(e) => actualizarCampo(c.id, { etiqueta: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Tipo</Label>
                        <Select
                          value={c.tipo}
                          onValueChange={(v) =>
                            actualizarCampo(c.id, { tipo: v as TipoCampo, correcta: undefined })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {(Object.keys(TIPO_CAMPO_LABEL) as TipoCampo[]).map((t) => (
                              <SelectItem key={t} value={t}>
                                {TIPO_CAMPO_LABEL[t]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-end gap-2">
                        <div className="flex items-center gap-2 pb-2">
                          <Switch
                            checked={c.requerido}
                            onCheckedChange={(v) => actualizarCampo(c.id, { requerido: v })}
                          />
                          <span className="text-xs text-muted-foreground">Obligatoria</span>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="mb-1"
                          onClick={() =>
                            setCampos((p) => (p.length > 1 ? p.filter((x) => x.id !== c.id) : p))
                          }
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>

                    {(c.tipo === "seleccion_unica" || c.tipo === "seleccion_multiple") && (
                      <div className="space-y-1.5">
                        <Label>Opciones (separadas por coma)</Label>
                        <Textarea
                          value={(c.opciones ?? []).join(", ")}
                          maxLength={400}
                          onChange={(e) =>
                            actualizarCampo(c.id, {
                              opciones: e.target.value
                                .split(",")
                                .map((o) => o.trim())
                                .filter(Boolean),
                            })
                          }
                          placeholder="Sí, No, No aplica"
                        />
                      </div>
                    )}

                    {c.tipo === "escala" && (
                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="space-y-1.5">
                          <Label>Mínimo</Label>
                          <Input
                            type="number"
                            min={0}
                            max={9}
                            value={c.escalaMin ?? 1}
                            onChange={(e) =>
                              actualizarCampo(c.id, { escalaMin: Number(e.target.value) || 0 })
                            }
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label>Máximo</Label>
                          <Input
                            type="number"
                            min={2}
                            max={10}
                            value={c.escalaMax ?? 5}
                            onChange={(e) =>
                              actualizarCampo(c.id, { escalaMax: Number(e.target.value) || 5 })
                            }
                          />
                        </div>
                      </div>
                    )}

                    {c.tipo === "seleccion_unica" && (c.opciones ?? []).length > 0 && (
                      <div className="space-y-1.5">
                        <Label>Respuesta correcta (opcional, califica automáticamente)</Label>
                        <Select
                          value={(c.correcta as string) ?? "__ninguna"}
                          onValueChange={(v) =>
                            actualizarCampo(c.id, { correcta: v === "__ninguna" ? undefined : v })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__ninguna">Sin calificación</SelectItem>
                            {(c.opciones ?? []).map((o) => (
                              <SelectItem key={o} value={o}>
                                {o}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {c.tipo === "booleano" && (
                      <div className="space-y-1.5">
                        <Label>Respuesta correcta (opcional)</Label>
                        <Select
                          value={
                            c.correcta === undefined ? "__ninguna" : c.correcta ? "true" : "false"
                          }
                          onValueChange={(v) =>
                            actualizarCampo(c.id, {
                              correcta: v === "__ninguna" ? undefined : v === "true",
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__ninguna">Sin calificación</SelectItem>
                            <SelectItem value="true">Verdadero</SelectItem>
                            <SelectItem value="false">Falso</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="space-y-3 border-t border-border pt-4">
                <h3 className="font-medium text-foreground">Asignación</h3>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Alcance</Label>
                    <Select
                      value={tipoAsignacion}
                      onValueChange={(v) => {
                        setTipoAsignacion(v as TipoAsignacion);
                        setValores([]);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(TIPO_ASIGNACION_LABEL) as TipoAsignacion[]).map((t) => (
                          <SelectItem key={t} value={t}>
                            {TIPO_ASIGNACION_LABEL[t]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end text-xs text-muted-foreground">
                    {tipoAsignacion === "empresa"
                      ? "Se asigna a todos los empleados activos."
                      : `${valores.length} destinatarios seleccionados.`}
                  </div>
                </div>

                {opcionesAsignacion.length > 0 && (
                  <div className="grid max-h-56 gap-2 overflow-y-auto rounded-md border border-border p-3 sm:grid-cols-2">
                    {opcionesAsignacion.map((o) => (
                      <label key={o.id} className="flex items-center gap-2 text-sm text-foreground">
                        <Checkbox
                          checked={valores.includes(o.id)}
                          onCheckedChange={(v) =>
                            setValores((p) => (v ? [...p, o.id] : p.filter((x) => x !== o.id)))
                          }
                        />
                        {o.label}
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <Button onClick={crear}>Crear instrumento</Button>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}
