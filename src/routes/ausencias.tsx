import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { CalendarClock, CalendarDays, Check, HeartPulse, Inbox, Send, X } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { EmptyState } from "@/components/common/EmptyState";
import {
  EstadoIncapacidadBadge,
  EstadoSolicitudOpBadge,
  FlujoTraza,
} from "@/components/operaciones/FlujoBadges";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useRrhh } from "@/store/rrhh";
import { useOperaciones } from "@/store/operaciones";
import { diasEntre, esJefeOp, esRrhhOp, hoyISO, supervisorDe } from "@/lib/operaciones";
import { downloadCsv } from "@/lib/export";
import { nombreEmpleado } from "@/types/rrhh";
import { esVinculado } from "@/lib/rrhh";
import { empleadoById } from "@/data/organizacion";
import { nombreCompleto } from "@/types/organizacion";
import {
  ESTADO_SOLICITUD_OP_LABEL,
  TIPOS_SOLICITUD,
  TIPO_INCAPACIDAD_OP_LABEL,
  TIPO_SOLICITUD_LABEL,
  type TipoIncapacidadOp,
  type TipoSolicitud,
} from "@/types/operaciones";

export const Route = createFileRoute("/ausencias")({
  head: () => ({
    meta: [
      { title: "Solicitudes e incapacidades | SIGTH" },
      {
        name: "description",
        content:
          "Flujo operativo de vacaciones, permisos, licencias y actualización de datos (Empleado → Jefe → RRHH) e incapacidades con notificación automática al supervisor.",
      },
      { property: "og:title", content: "Solicitudes e incapacidades | SIGTH" },
      {
        property: "og:description",
        content:
          "Aprobación, rechazo, modificación de fechas y reprogramación de solicitudes con trazabilidad completa.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AusenciasPage,
});

function AusenciasPage() {
  const { empleados, rolActivo, empleadoActuandoId } = useRrhh();
  const op = useOperaciones();

  const rrhh = esRrhhOp(rolActivo);
  const jefe = esJefeOp(rolActivo);
  const actor = useMemo(() => `Usuario (${rolActivo})`, [rolActivo]);

  const vinculados = empleados.filter(esVinculado);
  const nombrePor = useMemo(
    () => Object.fromEntries(empleados.map((e) => [e.id, nombreEmpleado(e)])),
    [empleados],
  );

  /* --------------------------- Nueva solicitud --------------------------- */
  const [nueva, setNueva] = useState({
    empleadoId: empleadoActuandoId,
    tipo: "vacaciones" as TipoSolicitud,
    desde: hoyISO(),
    hasta: hoyISO(),
    motivo: "",
  });

  /* -------------------------- Nueva incapacidad ------------------------- */
  const [inc, setInc] = useState({
    empleadoId: empleadoActuandoId,
    tipo: "enfermedad_general" as TipoIncapacidadOp,
    desde: hoyISO(),
    hasta: hoyISO(),
    entidad: "",
    diagnostico: "",
    soporteAdjunto: true,
  });

  const [comentarios, setComentarios] = useState<Record<string, string>>({});
  const [fechas, setFechas] = useState<Record<string, { desde: string; hasta: string }>>({});
  const comentario = (id: string) => comentarios[id]?.trim() || undefined;

  const pendientesJefe = op.solicitudes.filter((s) => s.estado === "pendiente_jefe");
  const pendientesRrhh = op.solicitudes.filter((s) => s.estado === "pendiente_rrhh");
  const resueltas = op.solicitudes.filter(
    (s) => s.estado === "aprobada" || s.estado === "rechazada" || s.estado === "reprogramada",
  );

  const exportarSolicitudes = () =>
    downloadCsv(
      `solicitudes-operativas-${hoyISO()}.csv`,
      ["Consecutivo", "Empleado", "Tipo", "Desde", "Hasta", "Días", "Estado", "Radicación", "Motivo"],
      op.solicitudes.map((s) => [
        s.consecutivo,
        nombrePor[s.empleadoId] ?? s.empleadoId,
        TIPO_SOLICITUD_LABEL[s.tipo],
        s.desde,
        s.hasta,
        s.dias,
        ESTADO_SOLICITUD_OP_LABEL[s.estado],
        s.fechaRadicacion,
        s.motivo,
      ]),
    );

  return (
    <AppShell>
      <PageHeader
        breadcrumb={["Operación", "Solicitudes e incapacidades"]}
        title="Solicitudes e incapacidades"
        description="Vacaciones, permisos, licencias y actualización de datos siguen el flujo Empleado → Jefe → RRHH. Las incapacidades van del empleado a Recursos Humanos y el supervisor recibe notificación automática."
        actions={
          <Button variant="outline" size="sm" onClick={exportarSolicitudes}>
            Exportar solicitudes
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Pendientes jefe" value={String(pendientesJefe.length)} icon={Inbox} hint="Primer nivel" />
        <StatCard label="Pendientes RRHH" value={String(pendientesRrhh.length)} icon={CalendarClock} hint="Segundo nivel" />
        <StatCard
          label="Aprobadas"
          value={String(op.solicitudes.filter((s) => s.estado === "aprobada").length)}
          icon={Check}
          hint="Aplicadas"
        />
        <StatCard
          label="Incapacidades activas"
          value={String(op.incapacidades.filter((i) => i.estado !== "rechazada").length)}
          icon={HeartPulse}
          hint="Radicadas y validadas"
        />
      </div>

      <Tabs defaultValue="bandeja">
        <TabsList className="flex-wrap">
          <TabsTrigger value="bandeja">Bandeja de aprobación</TabsTrigger>
          <TabsTrigger value="radicar">Radicar solicitud</TabsTrigger>
          <TabsTrigger value="incapacidades">Incapacidades</TabsTrigger>
          <TabsTrigger value="historico">Histórico</TabsTrigger>
        </TabsList>

        {/* ------------------------- Bandeja ------------------------- */}
        <TabsContent value="bandeja" className="mt-4 space-y-6">
          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Nivel 1 · Jefe inmediato ({pendientesJefe.length})
            </h2>
            {!jefe && (
              <p className="surface-panel p-4 text-sm text-muted-foreground">
                Con el rol actual ({rolActivo}) esta bandeja es de consulta.
              </p>
            )}
            {pendientesJefe.length === 0 ? (
              <EmptyState icon={Inbox} title="Sin pendientes" description="No hay solicitudes esperando aprobación del jefe inmediato." />
            ) : (
              pendientesJefe.map((s) => (
                <div key={s.id} className="surface-panel p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {nombrePor[s.empleadoId] ?? s.empleadoId} · {TIPO_SOLICITUD_LABEL[s.tipo]}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {s.consecutivo} · {s.desde} a {s.hasta} ({s.dias} días) · radicada {s.fechaRadicacion}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">{s.motivo}</p>
                    </div>
                    <EstadoSolicitudOpBadge estado={s.estado} />
                  </div>
                  <FlujoTraza pasos={s.flujo} />
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Input
                      value={comentarios[s.id] ?? ""}
                      maxLength={200}
                      placeholder="Comentario del jefe (opcional)"
                      className="h-9 flex-1"
                      disabled={!jefe}
                      onChange={(e) => setComentarios((c) => ({ ...c, [s.id]: e.target.value }))}
                    />
                    <Button
                      size="sm"
                      disabled={!jefe}
                      onClick={() => {
                        op.aprobarPorJefe(s.id, actor, comentario(s.id));
                        toast.success("Solicitud aprobada. Pasa a Recursos Humanos.");
                      }}
                    >
                      <Check className="size-4" /> Aprobar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!jefe}
                      onClick={() => {
                        op.rechazarSolicitud(s.id, actor, "jefe", comentario(s.id));
                        toast.success("Solicitud rechazada.");
                      }}
                    >
                      <X className="size-4" /> Rechazar
                    </Button>
                  </div>
                </div>
              ))
            )}
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Nivel 2 · Recursos Humanos ({pendientesRrhh.length})
            </h2>
            {!rrhh && (
              <p className="surface-panel p-4 text-sm text-muted-foreground">
                Solo Recursos Humanos puede aprobar, rechazar, modificar fechas o reprogramar.
              </p>
            )}
            {pendientesRrhh.length === 0 ? (
              <EmptyState icon={CalendarClock} title="Bandeja al día" description="No hay solicitudes pendientes de Recursos Humanos." />
            ) : (
              pendientesRrhh.map((s) => {
                const f = fechas[s.id] ?? { desde: s.desde, hasta: s.hasta };
                return (
                  <div key={s.id} className="surface-panel p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          {nombrePor[s.empleadoId] ?? s.empleadoId} · {TIPO_SOLICITUD_LABEL[s.tipo]}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {s.consecutivo} · {s.desde} a {s.hasta} ({s.dias} días)
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">{s.motivo}</p>
                      </div>
                      <EstadoSolicitudOpBadge estado={s.estado} />
                    </div>
                    <FlujoTraza pasos={s.flujo} />
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      <label className="text-xs text-muted-foreground">
                        Nueva fecha desde
                        <Input
                          type="date"
                          value={f.desde}
                          disabled={!rrhh}
                          className="mt-1 h-9"
                          onChange={(e) =>
                            setFechas((p) => ({ ...p, [s.id]: { ...f, desde: e.target.value } }))
                          }
                        />
                      </label>
                      <label className="text-xs text-muted-foreground">
                        Nueva fecha hasta
                        <Input
                          type="date"
                          value={f.hasta}
                          disabled={!rrhh}
                          className="mt-1 h-9"
                          onChange={(e) =>
                            setFechas((p) => ({ ...p, [s.id]: { ...f, hasta: e.target.value } }))
                          }
                        />
                      </label>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <Input
                        value={comentarios[s.id] ?? ""}
                        maxLength={200}
                        placeholder="Comentario de RRHH (opcional)"
                        className="h-9 flex-1"
                        disabled={!rrhh}
                        onChange={(e) => setComentarios((c) => ({ ...c, [s.id]: e.target.value }))}
                      />
                      <Button
                        size="sm"
                        disabled={!rrhh}
                        onClick={() => {
                          op.aprobarPorRrhh(s.id, actor, comentario(s.id));
                          toast.success("Solicitud aprobada por Recursos Humanos.");
                        }}
                      >
                        <Check className="size-4" /> Aprobar
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={!rrhh || diasEntre(f.desde, f.hasta) === 0}
                        onClick={() => {
                          op.modificarFechas(s.id, f.desde, f.hasta, actor, comentario(s.id));
                          toast.success("Fechas modificadas y registradas en el historial.");
                        }}
                      >
                        <CalendarDays className="size-4" /> Modificar fechas
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={!rrhh || diasEntre(f.desde, f.hasta) === 0}
                        onClick={() => {
                          op.reprogramarSolicitud(s.id, f.desde, f.hasta, actor, comentario(s.id));
                          toast.success("Solicitud reprogramada.");
                        }}
                      >
                        <CalendarClock className="size-4" /> Reprogramar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!rrhh}
                        onClick={() => {
                          op.rechazarSolicitud(s.id, actor, "rrhh", comentario(s.id));
                          toast.success("Solicitud rechazada.");
                        }}
                      >
                        <X className="size-4" /> Rechazar
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </section>
        </TabsContent>

        {/* ------------------------- Radicar ------------------------- */}
        <TabsContent value="radicar" className="mt-4">
          <div className="surface-panel space-y-4 p-5">
            <div>
              <h2 className="text-base font-semibold text-foreground">Radicar nueva solicitud</h2>
              <p className="text-sm text-muted-foreground">
                La solicitud se envía al jefe inmediato y, tras su aprobación, a Recursos Humanos.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-medium text-muted-foreground">
                Empleado
                <Select
                  value={nueva.empleadoId}
                  onValueChange={(v) => setNueva((n) => ({ ...n, empleadoId: v }))}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {vinculados.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {nombreEmpleado(e)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
              <label className="text-xs font-medium text-muted-foreground">
                Tipo de solicitud
                <Select
                  value={nueva.tipo}
                  onValueChange={(v) => setNueva((n) => ({ ...n, tipo: v as TipoSolicitud }))}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPOS_SOLICITUD.map((t) => (
                      <SelectItem key={t} value={t}>
                        {TIPO_SOLICITUD_LABEL[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
              <label className="text-xs font-medium text-muted-foreground">
                Desde
                <Input
                  type="date"
                  className="mt-1"
                  value={nueva.desde}
                  onChange={(e) => setNueva((n) => ({ ...n, desde: e.target.value }))}
                />
              </label>
              <label className="text-xs font-medium text-muted-foreground">
                Hasta
                <Input
                  type="date"
                  className="mt-1"
                  value={nueva.hasta}
                  onChange={(e) => setNueva((n) => ({ ...n, hasta: e.target.value }))}
                />
              </label>
            </div>
            <label className="block text-xs font-medium text-muted-foreground">
              Motivo / justificación
              <Textarea
                className="mt-1"
                rows={3}
                maxLength={300}
                value={nueva.motivo}
                placeholder="Describa el motivo de la solicitud"
                onChange={(e) => setNueva((n) => ({ ...n, motivo: e.target.value }))}
              />
            </label>
            <p className="text-xs text-muted-foreground">
              Días calendario calculados: <span className="font-medium text-foreground">{diasEntre(nueva.desde, nueva.hasta)}</span>
            </p>
            <Button
              disabled={!nueva.motivo.trim() || diasEntre(nueva.desde, nueva.hasta) === 0}
              onClick={() => {
                op.radicarSolicitud({ ...nueva, motivo: nueva.motivo.trim(), responsable: actor });
                toast.success("Solicitud radicada. Enviada al jefe inmediato.");
                setNueva((n) => ({ ...n, motivo: "" }));
              }}
            >
              <Send className="size-4" /> Radicar solicitud
            </Button>
          </div>
        </TabsContent>

        {/* ---------------------- Incapacidades ---------------------- */}
        <TabsContent value="incapacidades" className="mt-4 space-y-6">
          <div className="surface-panel space-y-4 p-5">
            <div>
              <h2 className="text-base font-semibold text-foreground">Radicar incapacidad</h2>
              <p className="text-sm text-muted-foreground">
                Flujo Empleado → Recursos Humanos. El supervisor del empleado recibe notificación automática.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-medium text-muted-foreground">
                Empleado
                <Select value={inc.empleadoId} onValueChange={(v) => setInc((i) => ({ ...i, empleadoId: v }))}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {vinculados.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {nombreEmpleado(e)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
              <label className="text-xs font-medium text-muted-foreground">
                Tipo
                <Select
                  value={inc.tipo}
                  onValueChange={(v) => setInc((i) => ({ ...i, tipo: v as TipoIncapacidadOp }))}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(TIPO_INCAPACIDAD_OP_LABEL) as TipoIncapacidadOp[]).map((t) => (
                      <SelectItem key={t} value={t}>
                        {TIPO_INCAPACIDAD_OP_LABEL[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
              <label className="text-xs font-medium text-muted-foreground">
                Desde
                <Input
                  type="date"
                  className="mt-1"
                  value={inc.desde}
                  onChange={(e) => setInc((i) => ({ ...i, desde: e.target.value }))}
                />
              </label>
              <label className="text-xs font-medium text-muted-foreground">
                Hasta
                <Input
                  type="date"
                  className="mt-1"
                  value={inc.hasta}
                  onChange={(e) => setInc((i) => ({ ...i, hasta: e.target.value }))}
                />
              </label>
              <label className="text-xs font-medium text-muted-foreground">
                Entidad (EPS / ARL)
                <Input
                  className="mt-1"
                  value={inc.entidad}
                  placeholder="EPS Sura, ARL Positiva..."
                  onChange={(e) => setInc((i) => ({ ...i, entidad: e.target.value }))}
                />
              </label>
              <label className="text-xs font-medium text-muted-foreground">
                Diagnóstico
                <Input
                  className="mt-1"
                  value={inc.diagnostico}
                  placeholder="Descripción del diagnóstico"
                  onChange={(e) => setInc((i) => ({ ...i, diagnostico: e.target.value }))}
                />
              </label>
            </div>
            <p className="text-xs text-muted-foreground">
              Supervisor que será notificado:{" "}
              <span className="font-medium text-foreground">
                {(() => {
                  const sid = supervisorDe(inc.empleadoId);
                  const sup = sid ? empleadoById(sid) : undefined;
                  return sup ? nombreCompleto(sup) : "Sin supervisor asignado";
                })()}
              </span>
            </p>
            <Button
              disabled={!inc.entidad.trim() || !inc.diagnostico.trim() || diasEntre(inc.desde, inc.hasta) === 0}
              onClick={() => {
                op.radicarIncapacidad({
                  ...inc,
                  entidad: inc.entidad.trim(),
                  diagnostico: inc.diagnostico.trim(),
                  responsable: actor,
                });
                toast.success("Incapacidad radicada. Supervisor notificado.");
                setInc((i) => ({ ...i, entidad: "", diagnostico: "" }));
              }}
            >
              <HeartPulse className="size-4" /> Radicar incapacidad
            </Button>
          </div>

          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Incapacidades registradas
            </h2>
            {op.incapacidades.map((i) => {
              const sup = i.supervisorNotificadoId ? empleadoById(i.supervisorNotificadoId) : undefined;
              return (
                <div key={i.id} className="surface-panel p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {nombrePor[i.empleadoId] ?? i.empleadoId} · {TIPO_INCAPACIDAD_OP_LABEL[i.tipo]}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {i.consecutivo} · {i.desde} a {i.hasta} ({i.dias} días) · {i.entidad}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {i.diagnostico} · Soporte {i.soporteAdjunto ? "adjunto" : "pendiente"} · Supervisor
                        notificado: {sup ? nombreCompleto(sup) : "—"}
                      </p>
                    </div>
                    <EstadoIncapacidadBadge estado={i.estado} />
                  </div>
                  <FlujoTraza pasos={i.flujo} />
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Input
                      value={comentarios[i.id] ?? ""}
                      maxLength={200}
                      placeholder="Observación de RRHH (opcional)"
                      className="h-9 flex-1"
                      disabled={!rrhh}
                      onChange={(e) => setComentarios((c) => ({ ...c, [i.id]: e.target.value }))}
                    />
                    <Button
                      size="sm"
                      disabled={!rrhh || i.estado === "validada"}
                      onClick={() => {
                        op.validarIncapacidad(i.id, actor, comentario(i.id));
                        toast.success("Incapacidad validada.");
                      }}
                    >
                      <Check className="size-4" /> Validar
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={!rrhh}
                      onClick={() => {
                        op.transcribirIncapacidad(i.id, actor);
                        toast.success("Incapacidad enviada a transcripción.");
                      }}
                    >
                      Transcribir
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!rrhh}
                      onClick={() => {
                        op.rechazarIncapacidad(i.id, actor, comentario(i.id));
                        toast.success("Incapacidad rechazada.");
                      }}
                    >
                      <X className="size-4" /> Rechazar
                    </Button>
                  </div>
                </div>
              );
            })}
          </section>
        </TabsContent>

        {/* ------------------------ Histórico ------------------------ */}
        <TabsContent value="historico" className="mt-4 space-y-3">
          {resueltas.length === 0 ? (
            <EmptyState icon={Inbox} title="Sin histórico" description="Aún no hay solicitudes resueltas." />
          ) : (
            resueltas.map((s) => (
              <div key={s.id} className="surface-panel p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {nombrePor[s.empleadoId] ?? s.empleadoId} · {TIPO_SOLICITUD_LABEL[s.tipo]} · {s.consecutivo}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {s.desde} a {s.hasta} ({s.dias} días)
                      {s.desdeOriginal
                        ? ` · Original: ${s.desdeOriginal} a ${s.hastaOriginal}`
                        : ""}
                    </p>
                  </div>
                  <EstadoSolicitudOpBadge estado={s.estado} />
                </div>
                <FlujoTraza pasos={s.flujo} />
              </div>
            ))
          )}
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}
