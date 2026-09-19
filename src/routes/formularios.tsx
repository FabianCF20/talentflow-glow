import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ClipboardList, Users, BarChart3, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarraDistribucion } from "@/components/sst/SstBadges";
import { StatusBadge } from "@/components/common/StatusBadge";
import { useRrhh } from "@/store/rrhh";
import { useSst } from "@/store/sst";
import { destinatariosDe, estadisticasFormulario, hoyISO, puedeGestionarSST } from "@/lib/sst";
import { downloadCsv } from "@/lib/export";
import { AREAS, CARGOS } from "@/data/organizacion";
import { nombreEmpleado, ESTADOS_VINCULADOS } from "@/types/rrhh";
import {
  TIPO_ASIGNACION_LABEL,
  TIPO_CAMPO_LABEL,
  type CampoFormulario,
  type TipoAsignacion,
  type TipoCampo,
  type ValorRespuesta,
} from "@/types/sst";

export const Route = createFileRoute("/formularios")({
  head: () => ({
    meta: [
      { title: "Constructor de formularios dinámicos | SIGTH" },
      {
        name: "description",
        content:
          "Cree formularios con campos de texto, selección única, múltiple, verdadero/falso y escalas; asígnelos por empleado, cargo, área o empresa y consulte estadísticas.",
      },
      { property: "og:title", content: "Constructor de formularios dinámicos | SIGTH" },
      {
        property: "og:description",
        content: "Formularios dinámicos con asignación por empleado, cargo, área o empresa completa y estadísticas de resultados.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: FormulariosPage,
});

const nuevoCampo = (n: number): CampoFormulario => ({
  id: `c${n}`,
  etiqueta: "",
  tipo: "texto",
  requerido: true,
  opciones: [],
  escalaMin: 1,
  escalaMax: 5,
});

function FormulariosPage() {
  const { empleados, rolActivo, empleadoActuandoId } = useRrhh();
  const { formularios, respuestas, crearFormulario, archivarFormulario, responderFormulario } = useSst();
  const gestiona = puedeGestionarSST(rolActivo);

  const nombrePor = useMemo(
    () => Object.fromEntries(empleados.map((e) => [e.id, nombreEmpleado(e)])) as Record<string, string>,
    [empleados],
  );
  const vinculados = empleados.filter((e) => ESTADOS_VINCULADOS.includes(e.estadoLaboral));

  /* -------------------------- Constructor -------------------------- */
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [campos, setCampos] = useState<CampoFormulario[]>([nuevoCampo(1)]);
  const [tipoAsignacion, setTipoAsignacion] = useState<TipoAsignacion>("empresa");
  const [valores, setValores] = useState<string[]>([]);

  const opcionesAsignacion =
    tipoAsignacion === "empleado"
      ? vinculados.map((e) => ({ id: e.id, label: nombreEmpleado(e) }))
      : tipoAsignacion === "cargo"
        ? CARGOS.filter((c) => c.estado === "activo").map((c) => ({ id: c.id, label: c.nombre }))
        : tipoAsignacion === "area"
          ? AREAS.filter((a) => a.estado === "activo").map((a) => ({ id: a.id, label: a.nombre }))
          : [];

  const actualizarCampo = (id: string, cambios: Partial<CampoFormulario>) =>
    setCampos((prev) => prev.map((c) => (c.id === id ? { ...c, ...cambios } : c)));

  const guardar = () => {
    if (titulo.trim().length < 4) return toast.error("El título debe tener al menos 4 caracteres.");
    const limpios = campos.filter((c) => c.etiqueta.trim());
    if (!limpios.length) return toast.error("Agregue al menos una pregunta con etiqueta.");
    const invalido = limpios.find(
      (c) => (c.tipo === "seleccion_unica" || c.tipo === "seleccion_multiple") && (c.opciones ?? []).length < 2,
    );
    if (invalido) return toast.error(`La pregunta "${invalido.etiqueta}" requiere al menos dos opciones.`);
    if (tipoAsignacion !== "empresa" && valores.length === 0)
      return toast.error("Seleccione al menos un destinatario para la asignación.");

    crearFormulario({
      titulo: titulo.trim(),
      descripcion: descripcion.trim(),
      campos: limpios.map((c) => ({ ...c, etiqueta: c.etiqueta.trim() })),
      asignacion: { tipo: tipoAsignacion, valores: tipoAsignacion === "empresa" ? [] : valores },
      responsable: "Área SST",
    });
    setTitulo("");
    setDescripcion("");
    setCampos([nuevoCampo(1)]);
    setValores([]);
    toast.success("Formulario creado y asignado.");
  };

  /* --------------------------- Diligenciar --------------------------- */
  const [activoId, setActivoId] = useState(formularios[0]?.id ?? "");
  const activo = formularios.find((f) => f.id === activoId) ?? formularios[0];
  const [respuesta, setRespuesta] = useState<Record<string, ValorRespuesta>>({});

  const enviar = () => {
    if (!activo) return;
    const faltante = activo.campos.find((c) => {
      if (!c.requerido) return false;
      const v = respuesta[c.id];
      return v === undefined || v === "" || (Array.isArray(v) && v.length === 0);
    });
    if (faltante) return toast.error(`Responda la pregunta obligatoria: ${faltante.etiqueta}`);
    responderFormulario(activo.id, empleadoActuandoId, respuesta);
    setRespuesta({});
    toast.success("Respuesta registrada.");
  };

  const totalRespuestas = respuestas.length;

  return (
    <AppShell>
      <PageHeader
        breadcrumb={["Administración", "Formularios"]}
        title="Constructor de formularios dinámicos"
        description="Diseñe formularios con texto, selección única y múltiple, verdadero/falso y escalas; asígnelos por empleado, cargo, área o empresa completa y analice los resultados."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Formularios" value={String(formularios.length)} icon={ClipboardList} hint={`${formularios.filter((f) => f.estado === "activo").length} activos`} />
        <StatCard label="Respuestas totales" value={String(totalRespuestas)} icon={BarChart3} hint="Acumuladas por todos los formularios" />
        <StatCard label="Destinatarios del activo" value={String(activo ? destinatariosDe(activo).length : 0)} icon={Users} hint={activo ? TIPO_ASIGNACION_LABEL[activo.asignacion.tipo] : "—"} />
      </div>

      <Tabs defaultValue="listado" className="space-y-4">
        <TabsList className="flex w-full flex-wrap justify-start">
          <TabsTrigger value="listado">Formularios</TabsTrigger>
          <TabsTrigger value="constructor">Constructor</TabsTrigger>
          <TabsTrigger value="diligenciar">Diligenciar</TabsTrigger>
          <TabsTrigger value="resultados">Resultados</TabsTrigger>
        </TabsList>

        {/* ----------------------------- Listado ----------------------------- */}
        <TabsContent value="listado" className="grid gap-4 lg:grid-cols-2">
          {formularios.map((f) => {
            const destinatarios = destinatariosDe(f);
            const contestadas = respuestas.filter((r) => r.formularioId === f.id).length;
            return (
              <div key={f.id} className="surface-panel space-y-3 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-display text-lg font-semibold text-foreground">{f.titulo}</h3>
                    <p className="text-xs text-muted-foreground">{f.codigo} · creado {f.creadoEn} por {f.creadoPor}</p>
                  </div>
                  <StatusBadge status={f.estado} />
                </div>
                <p className="text-sm text-muted-foreground">{f.descripcion}</p>
                <div className="flex flex-wrap gap-1.5">
                  {f.campos.map((c) => (
                    <span key={c.id} className="rounded-md border border-border bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
                      {TIPO_CAMPO_LABEL[c.tipo]}
                    </span>
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="rounded-md border border-border p-2">
                    <p className="font-display text-xl font-semibold tabular-nums text-foreground">{f.campos.length}</p>
                    <p className="text-muted-foreground">Preguntas</p>
                  </div>
                  <div className="rounded-md border border-border p-2">
                    <p className="font-display text-xl font-semibold tabular-nums text-foreground">{destinatarios.length}</p>
                    <p className="text-muted-foreground">Asignados</p>
                  </div>
                  <div className="rounded-md border border-border p-2">
                    <p className="font-display text-xl font-semibold tabular-nums text-foreground">
                      {destinatarios.length ? Math.round((contestadas / destinatarios.length) * 100) : 0}%
                    </p>
                    <p className="text-muted-foreground">Diligenciado</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => setActivoId(f.id)}>Seleccionar</Button>
                  {gestiona && (
                    <Button size="sm" variant="ghost" onClick={() => archivarFormulario(f.id)}>
                      {f.estado === "activo" ? "Archivar" : "Reactivar"}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </TabsContent>

        {/* --------------------------- Constructor --------------------------- */}
        <TabsContent value="constructor" className="space-y-4">
          {!gestiona ? (
            <div className="surface-panel p-5 text-sm text-muted-foreground">
              Su rol no tiene permiso para crear formularios. Solicítelo al área de SST o Talento Humano.
            </div>
          ) : (
            <div className="surface-panel space-y-5 p-5">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Título</Label>
                  <Input value={titulo} maxLength={120} onChange={(e) => setTitulo(e.target.value)} placeholder="Encuesta de clima de seguridad" />
                </div>
                <div className="space-y-1.5">
                  <Label>Descripción</Label>
                  <Input value={descripcion} maxLength={200} onChange={(e) => setDescripcion(e.target.value)} placeholder="Objetivo y periodicidad" />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-foreground">Preguntas ({campos.length})</h3>
                  <Button size="sm" variant="outline" onClick={() => setCampos((p) => [...p, nuevoCampo(p.length + 1)])}>
                    <Plus className="mr-1 size-3.5" /> Agregar pregunta
                  </Button>
                </div>

                {campos.map((c, idx) => (
                  <div key={c.id} className="space-y-3 rounded-lg border border-border p-4">
                    <div className="grid gap-3 md:grid-cols-[1fr_200px_auto]">
                      <div className="space-y-1.5">
                        <Label>Pregunta {idx + 1}</Label>
                        <Input value={c.etiqueta} maxLength={200} onChange={(e) => actualizarCampo(c.id, { etiqueta: e.target.value })} />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Tipo</Label>
                        <Select value={c.tipo} onValueChange={(v) => actualizarCampo(c.id, { tipo: v as TipoCampo })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {(Object.keys(TIPO_CAMPO_LABEL) as TipoCampo[]).map((t) => (
                              <SelectItem key={t} value={t}>{TIPO_CAMPO_LABEL[t]}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-end gap-2">
                        <div className="flex items-center gap-2 pb-2">
                          <Switch checked={c.requerido} onCheckedChange={(v) => actualizarCampo(c.id, { requerido: v })} />
                          <span className="text-xs text-muted-foreground">Obligatoria</span>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="mb-1"
                          onClick={() => setCampos((p) => (p.length > 1 ? p.filter((x) => x.id !== c.id) : p))}
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
                              opciones: e.target.value.split(",").map((o) => o.trim()).filter(Boolean),
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
                          <Input type="number" min={0} max={9} value={c.escalaMin ?? 1} onChange={(e) => actualizarCampo(c.id, { escalaMin: Number(e.target.value) || 0 })} />
                        </div>
                        <div className="space-y-1.5">
                          <Label>Máximo</Label>
                          <Input type="number" min={2} max={10} value={c.escalaMax ?? 5} onChange={(e) => actualizarCampo(c.id, { escalaMax: Number(e.target.value) || 5 })} />
                        </div>
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
                    <Select value={tipoAsignacion} onValueChange={(v) => { setTipoAsignacion(v as TipoAsignacion); setValores([]); }}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {(Object.keys(TIPO_ASIGNACION_LABEL) as TipoAsignacion[]).map((t) => (
                          <SelectItem key={t} value={t}>{TIPO_ASIGNACION_LABEL[t]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end text-xs text-muted-foreground">
                    {tipoAsignacion === "empresa"
                      ? `Se asignará a los ${vinculados.length} empleados vinculados.`
                      : `${valores.length} destinatario(s) seleccionado(s).`}
                  </div>
                </div>
                {tipoAsignacion !== "empresa" && (
                  <div className="flex flex-wrap gap-2">
                    {opcionesAsignacion.map((o) => {
                      const sel = valores.includes(o.id);
                      return (
                        <button
                          key={o.id}
                          type="button"
                          onClick={() => setValores((p) => (sel ? p.filter((x) => x !== o.id) : [...p, o.id]))}
                          className={
                            sel
                              ? "rounded-full border border-primary bg-primary-soft px-3 py-1 text-xs font-medium text-primary"
                              : "rounded-full border border-border px-3 py-1 text-xs text-muted-foreground hover:bg-muted"
                          }
                        >
                          {o.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <Button size="sm" onClick={guardar}>Crear formulario</Button>
            </div>
          )}
        </TabsContent>

        {/* --------------------------- Diligenciar --------------------------- */}
        <TabsContent value="diligenciar" className="space-y-4">
          <div className="surface-panel space-y-4 p-5">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Formulario</Label>
                <Select value={activo?.id ?? ""} onValueChange={(v) => { setActivoId(v); setRespuesta({}); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {formularios.filter((f) => f.estado === "activo").map((f) => (
                      <SelectItem key={f.id} value={f.id}>{f.titulo}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end text-xs text-muted-foreground">
                Responde: {nombrePor[empleadoActuandoId] ?? empleadoActuandoId}
              </div>
            </div>

            {activo?.campos.map((c) => (
              <div key={c.id} className="space-y-2 rounded-lg border border-border p-4">
                <Label>
                  {c.etiqueta} {c.requerido && <span className="text-destructive">*</span>}
                </Label>

                {c.tipo === "texto" && (
                  <Textarea
                    maxLength={500}
                    value={String(respuesta[c.id] ?? "")}
                    onChange={(e) => setRespuesta({ ...respuesta, [c.id]: e.target.value })}
                  />
                )}

                {c.tipo === "seleccion_unica" && (
                  <Select value={String(respuesta[c.id] ?? "")} onValueChange={(v) => setRespuesta({ ...respuesta, [c.id]: v })}>
                    <SelectTrigger><SelectValue placeholder="Seleccione" /></SelectTrigger>
                    <SelectContent>
                      {(c.opciones ?? []).map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}

                {c.tipo === "seleccion_multiple" && (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {(c.opciones ?? []).map((o) => {
                      const actuales = (respuesta[c.id] as string[] | undefined) ?? [];
                      return (
                        <label key={o} className="flex items-center gap-2 text-sm text-foreground">
                          <Checkbox
                            checked={actuales.includes(o)}
                            onCheckedChange={(v) =>
                              setRespuesta({
                                ...respuesta,
                                [c.id]: v ? [...actuales, o] : actuales.filter((x) => x !== o),
                              })
                            }
                          />
                          {o}
                        </label>
                      );
                    })}
                  </div>
                )}

                {c.tipo === "booleano" && (
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={Boolean(respuesta[c.id])}
                      onCheckedChange={(v) => setRespuesta({ ...respuesta, [c.id]: v })}
                    />
                    <span className="text-sm text-muted-foreground">
                      {respuesta[c.id] ? "Verdadero" : "Falso"}
                    </span>
                  </div>
                )}

                {c.tipo === "escala" && (
                  <div className="flex flex-wrap gap-2">
                    {Array.from(
                      { length: (c.escalaMax ?? 5) - (c.escalaMin ?? 1) + 1 },
                      (_, i) => (c.escalaMin ?? 1) + i,
                    ).map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setRespuesta({ ...respuesta, [c.id]: n })}
                        className={
                          respuesta[c.id] === n
                            ? "size-9 rounded-md border border-primary bg-primary text-sm font-semibold text-primary-foreground"
                            : "size-9 rounded-md border border-border text-sm text-muted-foreground hover:bg-muted"
                        }
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {activo && <Button size="sm" onClick={enviar}>Enviar respuesta</Button>}
          </div>
        </TabsContent>

        {/* ---------------------------- Resultados ---------------------------- */}
        <TabsContent value="resultados" className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Select value={activo?.id ?? ""} onValueChange={setActivoId}>
              <SelectTrigger className="h-9 w-72"><SelectValue /></SelectTrigger>
              <SelectContent>
                {formularios.map((f) => <SelectItem key={f.id} value={f.id}>{f.titulo}</SelectItem>)}
              </SelectContent>
            </Select>
            {activo && (
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  downloadCsv(
                    `resultados-${activo.codigo}-${hoyISO()}.csv`,
                    ["Empleado", "Fecha", ...activo.campos.map((c) => c.etiqueta)],
                    respuestas
                      .filter((r) => r.formularioId === activo.id)
                      .map((r) => [
                        nombrePor[r.empleadoId] ?? r.empleadoId,
                        `${r.fecha} ${r.hora}`,
                        ...activo.campos.map((c) => {
                          const v = r.valores[c.id];
                          if (Array.isArray(v)) return v.join(" | ");
                          if (typeof v === "boolean") return v ? "Verdadero" : "Falso";
                          return v === undefined ? "" : String(v);
                        }),
                      ]),
                  )
                }
              >
                Exportar resultados
              </Button>
            )}
          </div>

          {activo && (
            <div className="grid gap-4 lg:grid-cols-2">
              {estadisticasFormulario(activo, respuestas).map((est) => (
                <div key={est.campo.id} className="surface-panel space-y-3 p-5">
                  <div>
                    <h3 className="font-medium text-foreground">{est.campo.etiqueta}</h3>
                    <p className="text-xs text-muted-foreground">
                      {TIPO_CAMPO_LABEL[est.campo.tipo]} · {est.respuestas} respuestas
                      {est.promedio !== undefined && ` · promedio ${est.promedio}`}
                    </p>
                  </div>
                  {est.distribucion.length > 0 && (
                    <div className="space-y-2.5">
                      {est.distribucion.map((d) => (
                        <BarraDistribucion key={d.etiqueta} etiqueta={d.etiqueta} total={d.total} porcentaje={d.porcentaje} />
                      ))}
                    </div>
                  )}
                  {est.textos && (
                    <ul className="space-y-1.5 text-sm text-muted-foreground">
                      {est.textos.filter(Boolean).map((t, i) => (
                        <li key={i} className="rounded-md border border-border px-3 py-2">{t}</li>
                      ))}
                      {est.textos.filter(Boolean).length === 0 && <li>Sin respuestas de texto.</li>}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}
