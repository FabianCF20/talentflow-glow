/**
 * Pantalla: Dashboard inicial según el rol.
 * Ruta: /
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { can, esSoloEmpleado } from "@/config/roles";
import { Users, FileWarning, Inbox, ShieldAlert, LayoutGrid } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { AuditTrailTable } from "@/components/common/AuditTrailTable";
import { useAuth } from "@/lib/auth";
import { useFirestoreState } from "@/lib/firestore";
import { useRrhh } from "@/store/rrhh";
import { useOperaciones } from "@/store/operaciones";
import { usePortal } from "@/store/portal";
import { useSst } from "@/store/sst";
import { estadoVigencia } from "@/lib/documentos";
import { TIPO_ALERTA_LABEL, useAlertasCumplimiento } from "@/lib/alertas";
import type { AuditLog } from "@/types/entities";
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
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      {
        property: "og:description",
        content: "Indicadores de talento humano, solicitudes pendientes y auditoría en tiempo real.",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { perfil } = useAuth();
  if (esSoloEmpleado(perfil?.roles ?? [])) return <DashboardEmpleado />;
  return <DashboardGestion />;
}

/** Panel personal del empleado: solo muestra información propia. */
function DashboardEmpleado() {
  const { perfil } = useAuth();
  const { solicitudes } = useOperaciones();
  const { documentos } = usePortal();
  const miId = perfil?.empleadoId ?? "";
  const mias = solicitudes.filter((s) => s.empleadoId === miId);
  const pendientes = mias.filter((s) => s.estado === "pendiente_jefe" || s.estado === "pendiente_rrhh").length;
  const misDocs = documentos.filter((d) => d.empleadoId === miId);
  const porVencer = misDocs.filter((d) => {
    const v = estadoVigencia(d);
    return v === "por_vencer" || v === "vencido";
  }).length;

  return (
    <AppShell>
      <PageHeader
        breadcrumb={["Inicio"]}
        title={`Buen día${perfil?.nombres ? `, ${perfil.nombres}` : ""}`}
        description="Su panel personal: sus solicitudes, documentos y accesos rápidos."
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Mis solicitudes" value={String(mias.length)} icon={Inbox} hint="radicadas" />
        <StatCard label="Pendientes" value={String(pendientes)} icon={Inbox} hint="en espera de aprobación" />
        <StatCard label="Mis documentos por vencer" value={String(porVencer)} icon={FileWarning} hint="próximos 30 días" />
      </div>
      <section className="surface-panel p-5">
        <h2 className="text-base font-semibold">Accesos rápidos</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm"><Link to="/portal">Mi portal</Link></Button>
          <Button asChild variant="outline" size="sm"><Link to="/ausencias">Solicitar vacaciones o permisos</Link></Button>
        </div>
        {!miId && (
          <p className="mt-3 text-sm text-muted-foreground">
            Su usuario aún no está vinculado a una ficha de empleado. Contacte a Talento Humano.
          </p>
        )}
      </section>
    </AppShell>
  );
}

/** Panel general para roles de gestión. */
function DashboardGestion() {
  const { perfil } = useAuth();
  const { empleados } = useRrhh();
  const { solicitudes } = useOperaciones();
  const { documentos } = usePortal();
  const { accidentes } = useSst();
  const [logs] = useFirestoreState<AuditLog>("auditoria", "id", { enabled: can(perfil?.roles ?? [], "auditoria", "ver") });
  const alertas = useAlertasCumplimiento();
  const conteoAlertas = {
    vencido: alertas.filter((a) => a.nivel === "vencido").length,
    por_vencer: alertas.filter((a) => a.nivel === "por_vencer").length,
    informativo: alertas.filter((a) => a.nivel === "informativo").length,
  };

  const activos = empleados.filter((e) => e.estadoLaboral !== "retirado").length;
  const pendientes = solicitudes.filter((s) => s.estado === "pendiente_jefe" || s.estado === "pendiente_rrhh").length;
  const porVencer = documentos.filter((d) => {
    const v = estadoVigencia(d);
    return v === "por_vencer" || v === "vencido";
  }).length;
  const abiertos = accidentes.length;

  return (
    <AppShell>
      <PageHeader
        breadcrumb={["Inicio"]}
        title={`Buen día${perfil ? `, ${perfil.nombres}` : ""}`}
        description="Resumen general de la operación de talento humano. El panel es configurable por rol."
        actions={
          <Button variant="outline" size="sm">
            <LayoutGrid className="size-4" /> Configurar panel
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {can(perfil?.roles ?? [], "empleados", "ver") && <Link to="/empleados" className="block">
          <StatCard label="Empleados activos" value={String(activos)} icon={Users} hint="registrados en el sistema" />
        </Link>}
        {can(perfil?.roles ?? [], "solicitudes", "ver") && <Link to="/solicitudes" className="block">
          <StatCard label="Solicitudes pendientes" value={String(pendientes)} icon={Inbox} hint="en espera de aprobación" />
        </Link>}
        {can(perfil?.roles ?? [], "documentacion", "ver") && <Link to="/documentos" className="block">
          <StatCard
            label="Documentos por vencer"
            value={String(porVencer)}
            icon={FileWarning}
            hint="próximos 30 días"
          />
        </Link>}
        {can(perfil?.roles ?? [], "sst", "ver") && <Link to="/sst" className="block">
          <StatCard label="Hallazgos SST abiertos" value={String(abiertos)} icon={ShieldAlert} hint="accidentes registrados" />
        </Link>}
      </div>

      <section className="surface-panel p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold">Alertas de hoy</h2>
          <div className="flex flex-wrap gap-3 text-xs">
            <span className="font-medium text-destructive">{conteoAlertas.vencido} vencidas</span>
            <span className="font-medium text-warning">{conteoAlertas.por_vencer} por vencer</span>
            <span className="text-muted-foreground">{conteoAlertas.informativo} informativas</span>
          </div>
        </div>
        {alertas.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">Sin alertas pendientes. Todo está al día.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {alertas.slice(0, 6).map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-muted/40 px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {a.empleadoNombre} · {a.titulo}
                  </p>
                  <p className="text-xs text-muted-foreground">{TIPO_ALERTA_LABEL[a.tipo]}</p>
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link to={a.ruta}>Revisar</Link>
                </Button>
              </li>
            ))}
          </ul>
        )}
        {alertas.length > 6 && can(perfil?.roles ?? [], "cumplimiento", "ver") && (
          <Button asChild variant="link" size="sm" className="mt-2">
            <Link to="/cumplimiento">Ver las {alertas.length} alertas en Cumplimiento</Link>
          </Button>
        )}
      </section>

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

      {can(perfil?.roles ?? [], "auditoria", "ver") && <section className="space-y-3">
        <h2 className="text-base font-semibold">Actividad reciente auditada</h2>
        <AuditTrailTable logs={logs.slice(0, 4)} />
      </section>}
    </AppShell>
  );
}
