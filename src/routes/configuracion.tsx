import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/common/PageHeader";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/configuracion")({
  head: () => ({
    meta: [
      { title: "Configuración | SIGTH" },
      {
        name: "description",
        content: "Parámetros globales de seguridad, sesiones, notificaciones y ciclo de vida de registros.",
      },
      { property: "og:title", content: "Configuración | SIGTH" },
      {
        property: "og:description",
        content: "Ajustes corporativos de seguridad y comportamiento del sistema.",
      },
    ],
  }),
  component: Configuracion,
});

function Configuracion() {
  return (
    <AppShell>
      <PageHeader
        breadcrumb={["Administración", "Configuración"]}
        title="Configuración del sistema"
        description="Parámetros globales aplicables a todos los módulos."
      />

      <section className="surface-panel divide-y divide-border">
        <div className="p-5">
          <h2 className="text-base font-semibold">Seguridad de acceso</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="intentos">Intentos fallidos antes del bloqueo</Label>
              <Input id="intentos" type="number" defaultValue={5} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="inactividad">Cierre por inactividad (minutos)</Label>
              <Input id="inactividad" type="number" defaultValue={15} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="expira">Expiración de contraseña (días)</Label>
              <Input id="expira" type="number" defaultValue={90} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="minlen">Longitud mínima de contraseña</Label>
              <Input id="minlen" type="number" defaultValue={10} />
            </div>
          </div>
        </div>

        <div className="p-5">
          <h2 className="text-base font-semibold">Políticas del sistema</h2>
          <ul className="mt-3 space-y-4">
            {[
              ["Eliminación física de registros", "Deshabilitada permanentemente. Solo Activo / Inactivo / Archivado.", false, true],
              ["Auditoría obligatoria", "Registra usuario, IP, navegador, acción y valores.", true, true],
              ["Notificaciones internas", "Alertas dentro de la plataforma por módulo y rol.", true, false],
              ["Doble factor de autenticación", "Verificación adicional al iniciar sesión.", false, false],
            ].map(([titulo, desc, checked, locked]) => (
              <li key={titulo as string} className="flex items-start justify-between gap-6">
                <div>
                  <p className="text-sm font-medium text-foreground">{titulo as string}</p>
                  <p className="text-xs text-muted-foreground">{desc as string}</p>
                </div>
                <Switch defaultChecked={checked as boolean} disabled={locked as boolean} />
              </li>
            ))}
          </ul>
        </div>
      </section>
    </AppShell>
  );
}
