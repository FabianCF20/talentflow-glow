import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Scale, ShieldAlert, Gavel, EyeOff, Plus } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { DataTable, type Column } from "@/components/common/DataTable";
import { EmptyState } from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  CategoriaObservacionBadge,
  EstadoIncidenciaBadge,
  GravedadFaltaBadge,
  TrazaDisciplinaria,
} from "@/components/disciplinario/DisciplinarioBadges";
import { useRrhh } from "@/store/rrhh";
import { useDisciplinario } from "@/store/disciplinario";
import {
  esperaJefe,
  esperaRRHH,
  hoyISO,
  horaActual,
  indicadoresDisciplinarios,
  puedeActuarRRHH,
  puedeRegistrarIncidencia,
  puedeRegistrarObservacion,
  puedeVerObservaciones,
} from "@/lib/disciplinario";
import { downloadCsv } from "@/lib/export";
import { nombreEmpleado, ESTADOS_VINCULADOS } from "@/types/rrhh";
import { ROLE_LABEL } from "@/config/roles";
import {
  CATEGORIA_OBSERVACION_LABEL,
  ESTADO_INCIDENCIA_LABEL,
  GRAVEDAD_FALTA_LABEL,
  TIPO_ACTUACION_LABEL,
  TIPO_FALTA_LABEL,
  TIPO_SANCION_LABEL,
  type CategoriaObservacion,
  type GravedadFalta,
  type Incidencia,
  type ObservacionInterna,
  type TipoActuacion,
  type TipoFalta,
  type TipoSancion,
} from "@/types/disciplinario";

export const Route = createFileRoute("/disciplinario")({
  head: () => ({
    meta: [
      { title: "Gestión disciplinaria y observaciones internas | SIGTH" },
      {
        name: "description",
        content:
          "Flujo disciplinario Supervisor → Jefe → RRHH con llamados de atención, descargos, sanciones e historial permanente.",
      },
      { property: "og:title", content: "Gestión disciplinaria | SIGTH" },
      {
        property: "og:description",
        content:
          "Registro de incidencias, validación del jefe, actuaciones de Talento Humano y observaciones internas no visibles para el empleado.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DisciplinarioPage,
});

const TIPOS_FALTA = Object.keys(TIPO_FALTA_LABEL) as TipoFalta[];
const GRAVEDADES = Object.keys(GRAVEDAD_FALTA_LABEL) as GravedadFalta[];
const CATEGORIAS = Object.keys(CATEGORIA_OBSERVACION_LABEL) as CategoriaObservacion[];
const TIPOS_SANCION = Object.keys(TIPO_SANCION_LABEL) as TipoSancion[];

function DisciplinarioPage() {
  const { empleados, rolActivo } = useRrhh();
  const disc = useDisciplinario();
  const puedeRegistrar = puedeRegistrarIncidencia(rolActivo);
  const esRRHH = puedeActuarRRHH(rolActivo);
  const verObs = puedeVerObservaciones(rolActivo);
  const registraObs = puedeRegistrarObservacion(rolActivo);
  const actor = `${ROLE_LABEL[rolActivo]}`;

  const vinculados = useMemo(
    () => empleados.filter((e) => ESTADOS_VINCULADOS.includes(e.estadoLaboral)),
    [empleados],
  );
  const nombrePor = useMemo(
    () => Object.fromEntries(empleados.map((e) => [e.id, nombreEmpleado(e)])) as Record<string, string>,
    [empleados],
  );
  const indicadores = useMemo(() => indicadoresDisciplinarios(disc.incidencias), [disc.incidencias]);

  const [seleccionada, setSeleccionada] = useState<string | null>(null);
  const detalle = disc.incidencias.find((i) => i.id === seleccionada) ?? null;

  /* --------------------------- Nueva incidencia --------------------------- */
  const [nueva, setNueva] = useState({
    empleadoId: vinculados[0]?.id ?? "",
    tipo: "incumplimiento_horario" as TipoFalta,
    gravedadPresunta: "leve" as GravedadFalta,
    fecha: hoyISO(),
    hora: horaActual(),
    descripcion: "",
    evidencia: "",
  });

  const crear = () => {
    if (!nueva.empleadoId || nueva.descripcion.trim().length < 15) {
      toast.error("Seleccione el empleado y describa la incidencia (mínimo 15 caracteres).");
      return;
    }
    disc.registrarIncidencia({ ...nueva, responsable: actor });
    setNueva((n) => ({ ...n, descripcion: "", evidencia: "" }));
    toast.success("Incidencia registrada. Queda pendiente de validación del jefe inmediato.");
  };

  /* ----------------------------- Actuaciones ----------------------------- */
  const [nota, setNota] = useState("");
  const [actuacion, setActuacion] = useState({
    tipo: "llamado_atencion" as TipoActuacion,
    detalle: "",
    versionEmpleado: "",
    tipoSancion: "amonestacion_escrita" as TipoSancion,
    diasSuspension: 1,
  });

  const guardarActuacion = () => {
    if (!detalle) return;
    if (actuacion.detalle.trim().length < 10) {
      toast.error("Describa la actuación registrada.");
      return;
    }
    disc.registrarActuacion(detalle.id, {
      tipo: actuacion.tipo,
      detalle: actuacion.detalle,
      versionEmpleado: actuacion.tipo === "descargos" ? actuacion.versionEmpleado : undefined,
      tipoSancion: actuacion.tipoSancion,
      diasSuspension: actuacion.diasSuspension,
      responsable: actor,
    });
    setActuacion((a) => ({ ...a, detalle: "", versionEmpleado: "" }));
    toast.success(`${TIPO_ACTUACION_LABEL[actuacion.tipo]} registrado en el historial permanente.`);
  };

  /* ---------------------------- Observaciones ---------------------------- */
  const [obs, setObs] = useState({
    empleadoId: vinculados[0]?.id ?? "",
    categoria: "seguimiento" as CategoriaObservacion,
    texto: "",
  });

  const guardarObservacion = () => {
    if (!obs.empleadoId || obs.texto.trim().length < 10) {
      toast.error("Seleccione el empleado y escriba la observación.");
      return;
    }
    disc.registrarObservacion({ ...obs, autor: actor, rolAutor: rolActivo });
    setObs((o) => ({ ...o, texto: "" }));
    toast.success("Observación interna registrada. No es visible para el empleado.");
  };

  const columnas: Column<Incidencia>[] = [
    {
      key: "consecutivo",
      header: "Caso",
      render: (i) => (
        <div className="space-y-0.5">
          <p className="font-medium text-foreground">{i.consecutivo}</p>
          <p className="text-xs text-muted-foreground">
            {i.fecha} · {i.hora}
          </p>
        </div>
      ),
    },
    {
      key: "empleado",
      header: "Empleado",
      render: (i) => <span className="text-foreground">{nombrePor[i.empleadoId] ?? i.empleadoId}</span>,
    },
    { key: "tipo", header: "Tipo de falta", render: (i) => TIPO_FALTA_LABEL[i.tipo] },
    {
      key: "gravedad",
      header: "Gravedad",
      render: (i) => <GravedadFaltaBadge gravedad={i.gravedadPresunta} />,
    },
    { key: "estado", header: "Estado", render: (i) => <EstadoIncidenciaBadge estado={i.estado} /> },
    {
      key: "acciones",
      header: "",
      render: (i) => (
        <Button size="sm" variant="outline" onClick={() => setSeleccionada(i.id)}>
          Gestionar
        </Button>
      ),
    },
  ];

  const columnasObs: Column<ObservacionInterna>[] = [
    {
      key: "empleado",
      header: "Empleado",
      render: (o) => (
        <div className="space-y-0.5">
          <p className="font-medium text-foreground">{nombrePor[o.empleadoId] ?? o.empleadoId}</p>
          <p className="text-xs text-muted-foreground">
            {o.fecha} · {o.hora}
          </p>
        </div>
      ),
    },
    {
      key: "categoria",
      header: "Categoría",
      render: (o) => <CategoriaObservacionBadge categoria={o.categoria} />,
    },
    {
      key: "texto",
      header: "Observación",
      render: (o) => <span className="text-sm text-muted-foreground">{o.texto}</span>,
    },
    {
      key: "autor",
      header: "Registrada por",
      render: (o) => (
        <div className="space-y-0.5">
          <p className="text-foreground">{o.autor}</p>
          <p className="text-xs text-muted-foreground">{ROLE_LABEL[o.rolAutor]}</p>
        </div>
      ),
    },
  ];

  const exportarCasos = () =>
    downloadCsv(
      "historial-disciplinario.csv",
      ["Caso", "Empleado", "Fecha", "Tipo", "Gravedad", "Estado", "Actuaciones"],
      disc.incidencias.map((i) => [
        i.consecutivo,
        nombrePor[i.empleadoId] ?? i.empleadoId,
        i.fecha,
        TIPO_FALTA_LABEL[i.tipo],
        GRAVEDAD_FALTA_LABEL[i.gravedadPresunta],
        ESTADO_INCIDENCIA_LABEL[i.estado],
        i.actuaciones.map((a) => TIPO_ACTUACION_LABEL[a.tipo]).join(" | "),
      ]),
    );

  return (
    <AppShell>
      <PageHeader
        title="Gestión disciplinaria"
        description="Flujo Supervisor → Jefe → Talento Humano. El historial de cada caso es permanente y no puede eliminarse."
        breadcrumb={["Talento Humano", "Disciplinario"]}
        actions={
          <Button variant="outline" onClick={exportarCasos}>
            Exportar historial
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Casos registrados" value={String(indicadores.total)} icon={Scale} hint="Historial permanente" />
        <StatCard
          label="Pendientes del jefe"
          value={String(indicadores.pendientesJefe)}
          icon={ShieldAlert}
          hint="Validar, desestimar o escalar"
        />
        <StatCard
          label="En trámite de RRHH"
          value={String(indicadores.pendientesRRHH)}
          icon={Gavel}
          hint={`${indicadores.descargos} descargos registrados`}
        />
        <StatCard
          label="Con sanción"
          value={String(indicadores.sancionadas)}
          icon={Gavel}
          hint={`Tasa de sanción ${indicadores.tasaSancion}%`}
        />
      </div>

      <Tabs defaultValue="casos" className="space-y-6">
        <TabsList>
          <TabsTrigger value="casos">Incidencias</TabsTrigger>
          <TabsTrigger value="observaciones">Observaciones internas</TabsTrigger>
        </TabsList>

        <TabsContent value="casos" className="space-y-6">
          {puedeRegistrar && (
            <section className="surface-panel space-y-4 p-5">
              <h2 className="text-sm font-semibold text-foreground">Registrar incidencia</h2>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-1.5">
                  <Label>Empleado</Label>
                  <Select
                    value={nueva.empleadoId}
                    onValueChange={(v) => setNueva((n) => ({ ...n, empleadoId: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione" />
                    </SelectTrigger>
                    <SelectContent>
                      {vinculados.map((e) => (
                        <SelectItem key={e.id} value={e.id}>
                          {nombreEmpleado(e)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Tipo de falta</Label>
                  <Select
                    value={nueva.tipo}
                    onValueChange={(v) => setNueva((n) => ({ ...n, tipo: v as TipoFalta }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIPOS_FALTA.map((t) => (
                        <SelectItem key={t} value={t}>
                          {TIPO_FALTA_LABEL[t]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Gravedad presunta</Label>
                  <Select
                    value={nueva.gravedadPresunta}
                    onValueChange={(v) =>
                      setNueva((n) => ({ ...n, gravedadPresunta: v as GravedadFalta }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {GRAVEDADES.map((g) => (
                        <SelectItem key={g} value={g}>
                          {GRAVEDAD_FALTA_LABEL[g]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Fecha del hecho</Label>
                  <Input
                    type="date"
                    value={nueva.fecha}
                    onChange={(e) => setNueva((n) => ({ ...n, fecha: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Hora</Label>
                  <Input
                    type="time"
                    value={nueva.hora}
                    onChange={(e) => setNueva((n) => ({ ...n, hora: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Evidencia (opcional)</Label>
                  <Input
                    value={nueva.evidencia}
                    placeholder="Soporte, acta o registro"
                    onChange={(e) => setNueva((n) => ({ ...n, evidencia: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Descripción de los hechos</Label>
                <Textarea
                  rows={3}
                  value={nueva.descripcion}
                  onChange={(e) => setNueva((n) => ({ ...n, descripcion: e.target.value }))}
                  placeholder="Describa objetivamente lo ocurrido, sin calificar la falta."
                />
              </div>
              <Button onClick={crear}>
                <Plus className="size-4" /> Registrar incidencia
              </Button>
            </section>
          )}

          <DataTable columns={columnas} rows={disc.incidencias} emptyMessage="Sin casos registrados." />

          {detalle && (
            <section className="surface-panel space-y-5 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <h2 className="text-sm font-semibold text-foreground">
                    {detalle.consecutivo} · {nombrePor[detalle.empleadoId] ?? detalle.empleadoId}
                  </h2>
                  <p className="text-sm text-muted-foreground">{detalle.descripcion}</p>
                  {detalle.evidencia && (
                    <p className="text-xs text-muted-foreground">Evidencia: {detalle.evidencia}</p>
                  )}
                </div>
                <EstadoIncidenciaBadge estado={detalle.estado} />
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Historial permanente del caso
                  </h3>
                  <TrazaDisciplinaria pasos={detalle.traza} />
                  {detalle.actuaciones.length > 0 && (
                    <div className="space-y-2 rounded-md border border-border p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Actuaciones de Talento Humano
                      </p>
                      {detalle.actuaciones.map((a) => (
                        <div key={a.id} className="space-y-0.5 border-b border-border/60 pb-2 last:border-0">
                          <p className="text-sm font-medium text-foreground">
                            {TIPO_ACTUACION_LABEL[a.tipo]}
                            {a.tipoSancion ? ` — ${TIPO_SANCION_LABEL[a.tipoSancion]}` : ""}
                            {a.diasSuspension && a.tipoSancion === "suspension"
                              ? ` (${a.diasSuspension} días)`
                              : ""}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {a.fecha} · {a.registradoPor}
                          </p>
                          <p className="text-sm text-muted-foreground">{a.detalle}</p>
                          {a.versionEmpleado && (
                            <p className="text-sm text-muted-foreground">
                              Versión del empleado: {a.versionEmpleado}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  {esperaJefe(detalle.estado) && (
                    <div className="space-y-3 rounded-md border border-border p-4">
                      <p className="text-sm font-semibold text-foreground">Decisión del jefe inmediato</p>
                      <Textarea
                        rows={2}
                        placeholder="Nota de la decisión"
                        value={nota}
                        onChange={(e) => setNota(e.target.value)}
                      />
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          onClick={() => {
                            disc.validarIncidencia(detalle.id, nota, actor);
                            setNota("");
                            toast.success("Incidencia validada.");
                          }}
                        >
                          Validar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            disc.desestimarIncidencia(detalle.id, nota, actor);
                            setNota("");
                            toast.success("Incidencia desestimada. Queda en el historial.");
                          }}
                        >
                          Desestimar
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            disc.escalarIncidencia(detalle.id, nota, actor);
                            setNota("");
                            toast.success("Caso escalado a Talento Humano.");
                          }}
                        >
                          Escalar a RRHH
                        </Button>
                      </div>
                    </div>
                  )}

                  {detalle.estado === "validada" && (
                    <div className="space-y-3 rounded-md border border-border p-4">
                      <p className="text-sm text-muted-foreground">
                        Caso validado por el jefe. Puede escalarse a Talento Humano para actuaciones
                        formales.
                      </p>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          disc.escalarIncidencia(detalle.id, nota, actor);
                          toast.success("Caso escalado a Talento Humano.");
                        }}
                      >
                        Escalar a RRHH
                      </Button>
                    </div>
                  )}

                  {esRRHH && esperaRRHH(detalle.estado) && (
                    <div className="space-y-3 rounded-md border border-border p-4">
                      <p className="text-sm font-semibold text-foreground">Actuación de Talento Humano</p>
                      <div className="space-y-1.5">
                        <Label>Tipo de actuación</Label>
                        <Select
                          value={actuacion.tipo}
                          onValueChange={(v) =>
                            setActuacion((a) => ({ ...a, tipo: v as TipoActuacion }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {(["llamado_atencion", "descargos", "sancion"] as TipoActuacion[]).map((t) => (
                              <SelectItem key={t} value={t}>
                                {TIPO_ACTUACION_LABEL[t]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {actuacion.tipo === "sancion" && (
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="space-y-1.5">
                            <Label>Sanción</Label>
                            <Select
                              value={actuacion.tipoSancion}
                              onValueChange={(v) =>
                                setActuacion((a) => ({ ...a, tipoSancion: v as TipoSancion }))
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {TIPOS_SANCION.map((t) => (
                                  <SelectItem key={t} value={t}>
                                    {TIPO_SANCION_LABEL[t]}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          {actuacion.tipoSancion === "suspension" && (
                            <div className="space-y-1.5">
                              <Label>Días de suspensión</Label>
                              <Input
                                type="number"
                                min={1}
                                value={actuacion.diasSuspension}
                                onChange={(e) =>
                                  setActuacion((a) => ({
                                    ...a,
                                    diasSuspension: Number(e.target.value) || 1,
                                  }))
                                }
                              />
                            </div>
                          )}
                        </div>
                      )}
                      {actuacion.tipo === "descargos" && (
                        <div className="space-y-1.5">
                          <Label>Versión del empleado</Label>
                          <Textarea
                            rows={2}
                            value={actuacion.versionEmpleado}
                            onChange={(e) =>
                              setActuacion((a) => ({ ...a, versionEmpleado: e.target.value }))
                            }
                          />
                        </div>
                      )}
                      <div className="space-y-1.5">
                        <Label>Detalle</Label>
                        <Textarea
                          rows={2}
                          value={actuacion.detalle}
                          onChange={(e) => setActuacion((a) => ({ ...a, detalle: e.target.value }))}
                        />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" onClick={guardarActuacion}>
                          Registrar actuación
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            disc.archivarIncidencia(detalle.id, actor);
                            toast.success("Caso archivado con historial completo.");
                          }}
                        >
                          Cerrar y archivar
                        </Button>
                      </div>
                    </div>
                  )}

                  {!esRRHH && esperaRRHH(detalle.estado) && (
                    <p className="rounded-md border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
                      Solo Talento Humano puede registrar llamados de atención, descargos y sanciones.
                    </p>
                  )}
                </div>
              </div>
            </section>
          )}
        </TabsContent>

        <TabsContent value="observaciones" className="space-y-6">
          <div className="flex items-start gap-2 rounded-md border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
            <EyeOff className="mt-0.5 size-4 shrink-0" />
            <p>
              Las observaciones internas solo son visibles para Talento Humano, directores, jefes y
              supervisores. Nunca se muestran en el Portal del Empleado.
            </p>
          </div>

          {registraObs && (
            <section className="surface-panel space-y-4 p-5">
              <h2 className="text-sm font-semibold text-foreground">Registrar observación interna</h2>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Empleado</Label>
                  <Select value={obs.empleadoId} onValueChange={(v) => setObs((o) => ({ ...o, empleadoId: v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione" />
                    </SelectTrigger>
                    <SelectContent>
                      {vinculados.map((e) => (
                        <SelectItem key={e.id} value={e.id}>
                          {nombreEmpleado(e)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Categoría</Label>
                  <Select
                    value={obs.categoria}
                    onValueChange={(v) => setObs((o) => ({ ...o, categoria: v as CategoriaObservacion }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIAS.map((c) => (
                        <SelectItem key={c} value={c}>
                          {CATEGORIA_OBSERVACION_LABEL[c]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Observación</Label>
                <Textarea
                  rows={3}
                  value={obs.texto}
                  onChange={(e) => setObs((o) => ({ ...o, texto: e.target.value }))}
                  placeholder="Registro interno de seguimiento, desempeño o alerta."
                />
              </div>
              <Button onClick={guardarObservacion}>
                <Plus className="size-4" /> Registrar observación
              </Button>
            </section>
          )}

          {verObs ? (
            <DataTable
              columns={columnasObs}
              rows={disc.observaciones}
              emptyMessage="Sin observaciones internas registradas."
            />
          ) : (
            <EmptyState
              icon={EyeOff}
              title="Contenido restringido"
              description="Su rol no tiene acceso a las observaciones internas del personal."
            />
          )}
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}
