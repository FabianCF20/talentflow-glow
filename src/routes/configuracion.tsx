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
  const { perfil } = useAuth();
  const puedeEditar = perfil?.roles.includes("administrador") ?? false;
  const { config, setConfig, cargando } = useConfigEmpresa();
  const [guardando, setGuardando] = useState(false);

  const campo = <K extends keyof ConfigEmpresa>(k: K, v: ConfigEmpresa[K]) =>
    setConfig((prev) => ({ ...prev, [k]: v }));

  const guardar = async () => {
    setGuardando(true);
    try {
      await guardarConfigEmpresa(config);
      toast.success("Plantillas y datos institucionales actualizados.");
    } catch {
      toast.error("No se pudo guardar. Verifica tus permisos de administrador.");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <AppShell>
      <PageHeader
        breadcrumb={["Administración", "Configuración"]}
        title="Configuración del sistema"
        description="Parámetros globales aplicables a todos los módulos."
      />

      <section className="surface-panel divide-y divide-border">
        <div className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-base font-semibold">Plantillas de documentos y firma</h2>
              <p className="text-xs text-muted-foreground">
                Estos datos aparecen en certificados laborales, desprendibles de nómina y
                liquidaciones.
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => void guardar()}
              disabled={!puedeEditar || guardando || cargando}
              className="shrink-0"
            >
              <Save className="size-4" /> {guardando ? "Guardando…" : "Guardar cambios"}
            </Button>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="razon">Razón social</Label>
              <Input
                id="razon"
                value={config.razonSocial}
                disabled={!puedeEditar}
                onChange={(e) => campo("razonSocial", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nit">NIT</Label>
              <Input id="nit" value={config.nit} disabled={!puedeEditar} onChange={(e) => campo("nit", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dir">Dirección</Label>
              <Input id="dir" value={config.direccion} disabled={!puedeEditar} onChange={(e) => campo("direccion", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tel">Teléfono</Label>
              <Input id="tel" value={config.telefono} disabled={!puedeEditar} onChange={(e) => campo("telefono", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ciudad">Ciudad de expedición</Label>
              <Input id="ciudad" value={config.ciudad} disabled={!puedeEditar} onChange={(e) => campo("ciudad", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="firmante">Persona que firma</Label>
              <Input id="firmante" value={config.firmante} disabled={!puedeEditar} onChange={(e) => campo("firmante", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cargo-firmante">Cargo de quien firma</Label>
              <Input
                id="cargo-firmante"
                value={config.cargoFirmante}
                disabled={!puedeEditar}
                onChange={(e) => campo("cargoFirmante", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dias-alerta">Aviso de vencimientos (días antes)</Label>
              <Input
                id="dias-alerta"
                type="number"
                min={1}
                value={config.diasAlertaVencimiento}
                disabled={!puedeEditar}
                onChange={(e) => campo("diasAlertaVencimiento", Number(e.target.value) || 1)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="retencion">Retención documental (años)</Label>
              <Input
                id="retencion"
                type="number"
                min={1}
                value={config.retencionAnios}
                disabled={!puedeEditar}
                onChange={(e) => campo("retencionAnios", Number(e.target.value) || 1)}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="cierre">Texto de cierre de los certificados</Label>
              <Textarea
                id="cierre"
                rows={2}
                value={config.textoCierre}
                disabled={!puedeEditar}
                onChange={(e) => campo("textoCierre", e.target.value)}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="pie">Nota legal al pie de los documentos</Label>
              <Textarea
                id="pie"
                rows={2}
                value={config.textoPie}
                disabled={!puedeEditar}
                onChange={(e) => campo("textoPie", e.target.value)}
              />
            </div>
          </div>

          <ul className="mt-5 space-y-4">
            <li className="flex items-start justify-between gap-6">
              <div>
                <p className="text-sm font-medium text-foreground">Firma electrónica verificable</p>
                <p className="text-xs text-muted-foreground">
                  Sella cada documento con una huella única que permite comprobar su autenticidad.
                </p>
              </div>
              <Switch
                checked={config.firmaElectronicaActiva}
                disabled={!puedeEditar}
                onCheckedChange={(v) => campo("firmaElectronicaActiva", v)}
              />
            </li>
            <li className="flex items-start justify-between gap-6">
              <div>
                <p className="text-sm font-medium text-foreground">Incluir salario en certificados</p>
                <p className="text-xs text-muted-foreground">
                  Valor por defecto al generar una certificación laboral.
                </p>
              </div>
              <Switch
                checked={config.incluirSalarioPorDefecto}
                disabled={!puedeEditar}
                onCheckedChange={(v) => campo("incluirSalarioPorDefecto", v)}
              />
            </li>
          </ul>
        </div>

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
