import { createFileRoute } from "@tanstack/react-router";
import { Fragment, useMemo, useState } from "react";
import { Check, Minus, UserPlus, ShieldAlert, KeyRound, Wallet } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable, type Column } from "@/components/common/DataTable";
import { StatCard } from "@/components/common/StatCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ROLES, PERMISSION_MATRIX, ROLE_LABEL } from "@/config/roles";
import { PERMISSION_ACTIONS, PERMISSION_ACTION_LABEL } from "@/types/entities";
import type { PermissionAction, RoleKey } from "@/types/entities";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EMPLEADOS, USUARIOS, areaById, cargoById, empleadoById } from "@/data/organizacion";
import { ESTADO_USUARIO_LABEL, nombreCompleto, type EstadoUsuario, type UsuarioSistema } from "@/types/organizacion";
import { ALCANCE_LABEL, MATRIZ_VISIBILIDAD, alcanceDe, empleadosVisibles } from "@/lib/visibilidad";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/usuarios")({
  head: () => ({
    meta: [
      { title: "Usuarios, roles y permisos | SIGTH" },
      {
        name: "description",
        content:
          "Administración de usuarios por empleado, estados de cuenta, roles corporativos, matriz de permisos y reglas de visibilidad de personal y salarios.",
      },
      { property: "og:title", content: "Usuarios, roles y permisos | SIGTH" },
      {
        property: "og:description",
        content: "Control de accesos, permisos granulares y visibilidad por jerarquía.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Usuarios,
});

const ESTADO_STYLE: Record<EstadoUsuario, string> = {
  activo: "bg-success/12 text-success border-success/30",
  inactivo: "bg-muted text-muted-foreground border-border",
  bloqueado: "bg-destructive/10 text-destructive border-destructive/30",
  pendiente: "bg-warning/15 text-warning-foreground border-warning/40 dark:text-warning",
};

function EstadoUsuarioBadge({ estado }: { estado: EstadoUsuario }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium", ESTADO_STYLE[estado])}>
      <span className="size-1.5 rounded-full bg-current" />
      {ESTADO_USUARIO_LABEL[estado]}
    </span>
  );
}

const usuarioColumns: Column<UsuarioSistema>[] = [
  {
    key: "usuario",
    header: "Usuario / Empleado",
    render: (u) => {
      const e = empleadoById(u.empleadoId);
      return (
        <div>
          <div className="font-medium text-foreground">{e ? nombreCompleto(e) : u.username}</div>
          <div className="text-xs text-muted-foreground">
            {u.username} · {u.email}
          </div>
        </div>
      );
    },
  },
  {
    key: "cargo",
    header: "Cargo / Área",
    render: (u) => {
      const e = empleadoById(u.empleadoId);
      return e ? (
        <div className="text-xs">
          <div className="text-foreground">{cargoById(e.cargoId)?.nombre}</div>
          <div className="text-muted-foreground">{areaById(e.areaId)?.nombre}</div>
        </div>
      ) : (
        "—"
      );
    },
  },
  {
    key: "roles",
    header: "Roles",
    render: (u) => (
      <div className="flex flex-wrap gap-1">
        {u.roles.map((r) => (
          <span key={r} className="rounded-md bg-secondary px-1.5 py-0.5 text-[11px] font-medium text-secondary-foreground">
            {ROLE_LABEL[r]}
          </span>
        ))}
      </div>
    ),
  },
  { key: "estado", header: "Estado", render: (u) => <EstadoUsuarioBadge estado={u.estadoUsuario} /> },
  {
    key: "acceso",
    header: "Último acceso",
    render: (u) => (
      <span className="text-xs tabular-nums text-muted-foreground">{u.ultimoAcceso ?? "Nunca"}</span>
    ),
  },
  {
    key: "intentos",
    header: "Intentos fallidos",
    render: (u) => (
      <span className={cn("tabular-nums", u.intentosFallidos >= 3 ? "font-semibold text-destructive" : "text-foreground")}>
        {u.intentosFallidos}
      </span>
    ),
  },
  {
    key: "acciones",
    header: "Acciones",
    className: "text-right",
    render: (u) => (
      <div className="flex justify-end gap-1">
        <Button variant="ghost" size="sm">Editar</Button>
        <Button variant="ghost" size="sm">
          {u.estadoUsuario === "bloqueado" ? "Desbloquear" : "Inactivar"}
        </Button>
      </div>
    ),
  },
];

const modulos = Object.keys(PERMISSION_MATRIX);

function Usuarios() {
  const [query, setQuery] = useState("");
  const [rolSel, setRolSel] = useState<RoleKey>("jefe");
  const [matriz, setMatriz] = useState(PERMISSION_MATRIX);

  const usuariosFiltrados = useMemo(() => {
    const q = query.trim().toLowerCase();
    return USUARIOS.filter((u) => {
      const e = empleadoById(u.empleadoId);
      return `${u.username} ${u.email} ${e ? nombreCompleto(e) : ""}`.toLowerCase().includes(q);
    });
  }, [query]);

  const empleadosSinUsuario = EMPLEADOS.filter((e) => !USUARIOS.some((u) => u.empleadoId === e.id));
  const bloqueados = USUARIOS.filter((u) => u.estadoUsuario === "bloqueado").length;

  const toggle = (modulo: string, rol: RoleKey, accion: PermissionAction) => {
    setMatriz((prev) => {
      const actuales = prev[modulo]?.[rol] ?? [];
      const nuevas = actuales.includes(accion)
        ? actuales.filter((a) => a !== accion)
        : [...actuales, accion];
      return { ...prev, [modulo]: { ...prev[modulo], [rol]: nuevas } };
    });
  };

  return (
    <AppShell>
      <PageHeader
        breadcrumb={["Administración", "Usuarios, roles y permisos"]}
        title="Usuarios, roles y permisos"
        description="Cada empleado puede tener un usuario con estado, último acceso e intentos fallidos controlados. Los permisos son granulares por módulo y acción."
        actions={
          <Button size="sm">
            <UserPlus className="size-4" /> Nuevo usuario
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Usuarios activos" value={String(USUARIOS.filter((u) => u.estadoUsuario === "activo").length)} icon={KeyRound} hint="con acceso vigente" />
        <StatCard label="Cuentas bloqueadas" value={String(bloqueados)} icon={ShieldAlert} hint="por intentos fallidos" />
        <StatCard label="Empleados sin usuario" value={String(empleadosSinUsuario.length)} icon={UserPlus} hint="pendientes de creación" />
        <StatCard label="Roles configurados" value={String(ROLES.length)} icon={Wallet} hint="con permisos granulares" />
      </div>

      <Tabs defaultValue="usuarios">
        <TabsList className="flex-wrap">
          <TabsTrigger value="usuarios">Usuarios</TabsTrigger>
          <TabsTrigger value="roles">Roles</TabsTrigger>
          <TabsTrigger value="permisos">Matriz de permisos</TabsTrigger>
          <TabsTrigger value="visibilidad">Visibilidad y salarios</TabsTrigger>
        </TabsList>

        <TabsContent value="usuarios" className="mt-4 space-y-4">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre, usuario o correo…"
            className="max-w-sm"
          />
          <DataTable columns={usuarioColumns} rows={usuariosFiltrados} emptyMessage="Sin usuarios que coincidan." />
          {empleadosSinUsuario.length > 0 && (
            <div className="surface-panel p-4">
              <h3 className="text-sm font-semibold text-foreground">Empleados sin usuario asignado</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Todo empleado puede tener usuario; la creación es opcional y auditada.
              </p>
              <ul className="mt-3 flex flex-wrap gap-2">
                {empleadosSinUsuario.map((e) => (
                  <li key={e.id} className="flex items-center gap-2 rounded-md border border-border px-2.5 py-1.5 text-xs">
                    <span className="text-foreground">{nombreCompleto(e)}</span>
                    <Button variant="ghost" size="sm" className="h-6 px-2 text-[11px]">Crear usuario</Button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </TabsContent>

        <TabsContent value="roles" className="mt-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {ROLES.map((role) => {
              const usuariosRol = USUARIOS.filter((u) => u.roles.includes(role.key)).length;
              return (
                <div key={role.key} className="surface-panel p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-foreground">{role.nombre}</h3>
                    <span className="rounded-md bg-secondary px-2 py-0.5 text-[11px] font-medium text-secondary-foreground">
                      Nivel {role.nivel}
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs text-muted-foreground">{role.descripcion}</p>
                  <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      Alcance: <strong className="text-foreground">{ALCANCE_LABEL[alcanceDe([role.key])]}</strong>
                    </span>
                    <span className="tabular-nums">{usuariosRol} usuario(s)</span>
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="permisos" className="mt-4 space-y-3">
          <div className="flex flex-wrap gap-2">
            {ROLES.map((r) => (
              <button
                key={r.key}
                onClick={() => setRolSel(r.key)}
                className={cn(
                  "rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
                  rolSel === r.key
                    ? "border-primary bg-primary-soft text-primary"
                    : "border-border text-muted-foreground hover:bg-muted",
                )}
              >
                {r.nombre}
              </button>
            ))}
          </div>

          <div className="surface-panel overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3 text-left">Módulo</th>
                  {PERMISSION_ACTIONS.map((a) => (
                    <th key={a} className="px-3 py-3 text-center font-semibold">
                      {PERMISSION_ACTION_LABEL[a]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {modulos.map((modulo) => (
                  <tr key={modulo} className="border-b border-border/60 last:border-0">
                    <td className="px-4 py-2.5 capitalize text-foreground">{modulo}</td>
                    {PERMISSION_ACTIONS.map((a) => (
                      <td key={a} className="px-3 py-2.5 text-center">
                        <Checkbox
                          checked={matriz[modulo]?.[rolSel]?.includes(a) ?? false}
                          onCheckedChange={() => toggle(modulo, rolSel, a)}
                          aria-label={`${PERMISSION_ACTION_LABEL[a]} en ${modulo}`}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="surface-panel overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3 text-left">Resumen módulo / rol</th>
                  {PERMISSION_ACTIONS.map((a) => (
                    <th key={a} className="px-3 py-3 text-center font-semibold">
                      {PERMISSION_ACTION_LABEL[a]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {modulos.map((modulo) => (
                  <Fragment key={modulo}>
                    <tr className="border-b border-border bg-primary-soft/50">
                      <td colSpan={PERMISSION_ACTIONS.length + 1} className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-primary">
                        {modulo}
                      </td>
                    </tr>
                    {Object.entries(matriz[modulo]).map(([roleKey, actions]) => (
                      <tr key={`${modulo}-${roleKey}`} className="border-b border-border/60 last:border-0">
                        <td className="px-4 py-2.5 text-foreground">{ROLE_LABEL[roleKey as RoleKey]}</td>
                        {PERMISSION_ACTIONS.map((a) => (
                          <td key={a} className="px-3 py-2.5 text-center">
                            {actions?.includes(a) ? (
                              <Check className="mx-auto size-4 text-success" />
                            ) : (
                              <Minus className="mx-auto size-4 text-muted-foreground/40" />
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="visibilidad" className="mt-4 space-y-4">
          <div className="surface-panel overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3 text-left">Rol</th>
                  <th className="px-4 py-3 text-left">Visibilidad de personal</th>
                  <th className="px-4 py-3 text-left">Visibilidad de salarios</th>
                  <th className="px-4 py-3 text-right">Empleados visibles (ejemplo)</th>
                </tr>
              </thead>
              <tbody>
                {MATRIZ_VISIBILIDAD.map((fila) => {
                  const ejemplo = USUARIOS.find((u) => u.roles.includes(fila.rol));
                  const total = ejemplo
                    ? empleadosVisibles(ejemplo.empleadoId, [fila.rol]).length
                    : 0;
                  return (
                    <tr key={fila.rol} className="border-b border-border/60 last:border-0">
                      <td className="px-4 py-3 font-medium text-foreground">{ROLE_LABEL[fila.rol]}</td>
                      <td className="px-4 py-3 text-muted-foreground">{fila.personal}</td>
                      <td className="px-4 py-3 text-muted-foreground">{fila.salarios}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-foreground">
                        {ejemplo ? `${total} de ${EMPLEADOS.length}` : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground">
            Las reglas se aplican en cascada sobre el organigrama: al cambiar el jefe inmediato o el
            área de un empleado, la visibilidad de personal y salarios se recalcula automáticamente.
          </p>
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}
