import { createFileRoute } from "@tanstack/react-router";
import { Users, FileWarning, Inbox, ShieldAlert, LayoutGrid } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { AuditTrailTable } from "@/components/common/AuditTrailTable";
import { AUDIT_LOGS, CURRENT_USER } from "@/data/mock";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard | SIGTH" },
      {
        name: "description",
        content:
          "Panel configurable con indicadores de personal, solicitudes, SST y trazabilidad del sistema SIGTH.",
      },
      { property: "og:title", content: "Dashboard | SIGTH" },
      {
        property: "og:description",
        content: "Indicadores de talento humano, solicitudes pendientes y auditoría en tiempo real.",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  return (
    <AppShell>
      <PageHeader
        breadcrumb={["Inicio"]}
        title={`Buen día, ${CURRENT_USER.nombres}`}
        description="Resumen general de la operación de talento humano. El panel es configurable por rol."
        actions={
          <Button variant="outline" size="sm">
            <LayoutGrid className="size-4" /> Configurar panel
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Empleados activos" value="128" icon={Users} trend={{ value: "+4" }} hint="vs. mes anterior" />
        <StatCard label="Solicitudes pendientes" value="17" icon={Inbox} hint="6 requieren su aprobación" />
        <StatCard
          label="Documentos por vencer"
          value="23"
          icon={FileWarning}
          trend={{ value: "+9", positive: false }}
          hint="próximos 30 días"
        />
        <StatCard label="Hallazgos SST abiertos" value="5" icon={ShieldAlert} hint="2 críticos" />
      </div>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="surface-panel p-5 lg:col-span-2">
          <h2 className="text-base font-semibold">Arquitectura del sistema</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            El núcleo está listo: navegación modular, permisos por acción, ciclo de vida de registros
            y auditoría transversal. Los módulos funcionales se conectan sobre esta base.
          </p>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {[
              ["Layout corporativo", "Menú lateral, buscador global y notificaciones internas."],
              ["Seguridad", "Login, recuperación, bloqueo por intentos e inactividad."],
              ["Ciclo de vida", "Activo / Inactivo / Archivado — sin eliminación física."],
              ["Auditoría", "Usuario, fecha, hora, IP, navegador, acción y valores."],
            ].map(([t, d]) => (
              <li key={t} className="rounded-md border border-border bg-muted/40 p-3">
                <p className="text-sm font-medium text-foreground">{t}</p>
                <p className="text-xs text-muted-foreground">{d}</p>
              </li>
            ))}
          </ul>
        </div>

        <div className="surface-panel p-5">
          <h2 className="text-base font-semibold">Estado de módulos</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {[
              ["Núcleo / Arquitectura", "Disponible"],
              ["Empleados", "Pendiente"],
              ["Nómina", "Pendiente"],
              ["SST", "Pendiente"],
              ["Evaluaciones", "Pendiente"],
              ["Disciplinario", "Pendiente"],
            ].map(([m, s]) => (
              <li key={m} className="flex items-center justify-between border-b border-border/60 pb-2 last:border-0">
                <span className="text-foreground">{m}</span>
                <span
                  className={
                    s === "Disponible"
                      ? "text-xs font-medium text-success"
                      : "text-xs text-muted-foreground"
                  }
                >
                  {s}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold">Actividad reciente auditada</h2>
        <AuditTrailTable logs={AUDIT_LOGS.slice(0, 4)} />
      </section>
    </AppShell>
  );
}
