import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Check, Inbox, X } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { EmptyState } from "@/components/common/EmptyState";
import { SolicitudBadge } from "@/components/portal/SolicitudBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useRrhh } from "@/store/rrhh";
import { usePortal } from "@/store/portal";
import { puedeEditarCamposSensibles } from "@/lib/rrhh";
import { CAMPO_AUTOGESTION_LABEL } from "@/types/portal";
import { nombreEmpleado } from "@/types/rrhh";

export const Route = createFileRoute("/solicitudes")({
  head: () => ({
    meta: [
      { title: "Bandeja de solicitudes | SIGTH" },
      {
        name: "description",
        content:
          "Aprobación por Recursos Humanos de las actualizaciones de dirección, teléfono, correo e información familiar solicitadas desde el Portal del Empleado.",
      },
      { property: "og:title", content: "Bandeja de solicitudes | SIGTH" },
      {
        property: "og:description",
        content: "Flujo de aprobación de cambios de datos del empleado con trazabilidad completa.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BandejaSolicitudesPage,
});

function BandejaSolicitudesPage() {
  const { empleados, rolActivo } = useRrhh();
  const { solicitudes, aprobarSolicitud, rechazarSolicitud } = usePortal();
  const esRrhh = puedeEditarCamposSensibles([rolActivo]);
  const [comentarios, setComentarios] = useState<Record<string, string>>({});

  const nombrePor = useMemo(
    () => Object.fromEntries(empleados.map((e) => [e.id, nombreEmpleado(e)])),
    [empleados],
  );

  const pendientes = solicitudes.filter((s) => s.estado === "pendiente");
  const resueltas = solicitudes.filter((s) => s.estado !== "pendiente");

  const revisor = `Talento Humano (${rolActivo})`;

  return (
    <AppShell>
      <PageHeader
        breadcrumb={["Talento Humano", "Bandeja de solicitudes"]}
        title="Bandeja de solicitudes"
        description="Toda actualización realizada por el empleado en el portal requiere aprobación de Recursos Humanos antes de aplicarse al expediente."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Pendientes" value={String(pendientes.length)} icon={Inbox} hint="Por revisar" />
        <StatCard
          label="Aprobadas"
          value={String(solicitudes.filter((s) => s.estado === "aprobada").length)}
          icon={Check}
          hint="Aplicadas al expediente"
        />
        <StatCard
          label="Rechazadas"
          value={String(solicitudes.filter((s) => s.estado === "rechazada").length)}
          icon={X}
          hint="Con justificación"
        />
      </div>

      {!esRrhh && (
        <div className="surface-panel p-4 text-sm text-muted-foreground">
          Con el rol actual ({rolActivo}) la bandeja es de consulta. Solo Recursos Humanos puede aprobar o
          rechazar solicitudes.
        </div>
      )}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Solicitudes pendientes
        </h2>
        {pendientes.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="Bandeja al día"
            description="No hay solicitudes pendientes de aprobación."
          />
        ) : (
          pendientes.map((s) => (
            <div key={s.id} className="surface-panel p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {nombrePor[s.empleadoId] ?? s.empleadoId}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {CAMPO_AUTOGESTION_LABEL[s.campo]} · solicitado {s.fechaSolicitud}
                  </p>
                </div>
                <SolicitudBadge estado={s.estado} />
              </div>
              <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                <p className="text-muted-foreground">
                  Valor actual: <span className="text-foreground">{s.valorAnterior}</span>
                </p>
                <p className="text-muted-foreground">
                  Valor solicitado: <span className="font-medium text-foreground">{s.valorNuevo}</span>
                </p>
              </div>
              {s.observacionEmpleado && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Observación del empleado: {s.observacionEmpleado}
                </p>
              )}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Input
                  value={comentarios[s.id] ?? ""}
                  maxLength={200}
                  placeholder="Comentario de RRHH (opcional)"
                  className="h-9 flex-1"
                  disabled={!esRrhh}
                  onChange={(e) => setComentarios((c) => ({ ...c, [s.id]: e.target.value }))}
                />
                <Button
                  size="sm"
                  disabled={!esRrhh}
                  onClick={() => {
                    aprobarSolicitud(s.id, revisor, comentarios[s.id]?.trim() || undefined);
                    toast.success("Solicitud aprobada y aplicada al expediente.");
                  }}
                >
                  <Check className="size-4" /> Aprobar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!esRrhh}
                  onClick={() => {
                    rechazarSolicitud(s.id, revisor, comentarios[s.id]?.trim() || undefined);
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
          Histórico de solicitudes
        </h2>
        {resueltas.map((s) => (
          <div key={s.id} className="surface-panel flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <p className="text-sm font-medium text-foreground">
                {nombrePor[s.empleadoId] ?? s.empleadoId} · {CAMPO_AUTOGESTION_LABEL[s.campo]}
              </p>
              <p className="text-xs text-muted-foreground">
                {s.valorAnterior} → {s.valorNuevo} · Revisado {s.fechaRevision} por {s.revisadoPor}
                {s.comentarioRrhh ? ` · ${s.comentarioRrhh}` : ""}
              </p>
            </div>
            <SolicitudBadge estado={s.estado} />
          </div>
        ))}
      </section>
    </AppShell>
  );
}
