import { createFileRoute } from "@tanstack/react-router";
import { Fragment, useMemo, useState } from "react";
import { Check, Minus, UserPlus, ShieldAlert, KeyRound, Wallet, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable, type Column } from "@/components/common/DataTable";
import { StatCard } from "@/components/common/StatCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ROLES, ROLE_LABEL } from "@/config/roles";
import { PERMISSION_ACTIONS, PERMISSION_ACTION_LABEL } from "@/types/entities";
import type { PermissionAction, RoleKey } from "@/types/entities";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EMPLEADOS, areaById, cargoById, empleadoById } from "@/data/organizacion";
import {
  ESTADO_USUARIO_LABEL,
  nombreCompleto,
  type EstadoUsuario,
  type UsuarioSistema,
} from "@/types/organizacion";
import { ALCANCE_LABEL, MATRIZ_VISIBILIDAD, alcanceDe, empleadosVisibles } from "@/lib/visibilidad";
import {
  actualizarCuentaUsuario,
  aUsuarioSistema,
  crearCuentaUsuario,
  enviarResetClave,
  useCuentas,
  type CuentaUsuario,
} from "@/lib/usuarios-admin";
import { usePermisos, guardarPermisos } from "@/lib/permisos";
import { mensajeAuth, useAuth } from "@/lib/auth";
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
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        ESTADO_STYLE[estado],
      )}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {ESTADO_USUARIO_LABEL[estado]}
    </span>
  );
}

interface FormularioCuenta {
  email: string;
  password: string;
  nombres: string;
  apellidos: string;
  empleadoId: string;
  roles: RoleKey[];
  estadoUsuario: EstadoUsuario;
}

const FORM_VACIO: FormularioCuenta = {
  email: "",
  password: "",
  nombres: "",
  apellidos: "",
  empleadoId: "",
  roles: ["empleado"],
  estadoUsuario: "activo",
};

function Usuarios() {
  const { perfil } = useAuth();
  const cuentas = useCuentas();
  const { matriz, setMatriz } = usePermisos();
  const [query, setQuery] = useState("");
  const [rolSel, setRolSel] = useState<RoleKey>("jefe");
  const [guardandoPermisos, setGuardandoPermisos] = useState(false);

  const [dialogoAbierto, setDialogoAbierto] = useState(false);
  const [editando, setEditando] = useState<CuentaUsuario | null>(null);
  const [form, setForm] = useState<FormularioCuenta>(FORM_VACIO);
  const [guardando, setGuardando] = useState(false);

  const esAdmin = perfil?.roles.includes("administrador") ?? false;
  const puedeGestionar = esAdmin || (perfil?.roles.includes("talento_humano") ?? false);

  const usuarios: UsuarioSistema[] = useMemo(() => cuentas.map(aUsuarioSistema), [cuentas]);

  const usuariosFiltrados = useMemo(() => {
    const q = query.trim().toLowerCase();
    return usuarios.filter((u) => {
      const e = empleadoById(u.empleadoId);
      return `${u.username} ${u.email} ${e ? nombreCompleto(e) : ""}`.toLowerCase().includes(q);
    });
  }, [query, usuarios]);

  const empleadosSinUsuario = EMPLEADOS.filter(
    (e) => !usuarios.some((u) => u.empleadoId === e.id),
  );
  const bloqueados = usuarios.filter((u) => u.estadoUsuario === "bloqueado").length;

  const abrirNuevo = (empleadoId = "") => {
    const empleado = empleadoId ? empleadoById(empleadoId) : undefined;
    setEditando(null);
    setForm({
      ...FORM_VACIO,
      empleadoId,
      nombres: empleado?.nombres ?? "",
      apellidos: empleado?.apellidos ?? "",
    });
    setDialogoAbierto(true);
  };

  const abrirEdicion = (cuenta: CuentaUsuario) => {
    setEditando(cuenta);
    setForm({
      email: cuenta.email ?? "",
      password: "",
      nombres: cuenta.nombres ?? "",
      apellidos: cuenta.apellidos ?? "",
      empleadoId: cuenta.empleadoId ?? "",
      roles: (cuenta.roles ?? ["empleado"]) as RoleKey[],
      estadoUsuario: cuenta.estadoUsuario ?? "activo",
    });
    setDialogoAbierto(true);
  };

  const alternarRol = (rol: RoleKey) =>
    setForm((f) => ({
      ...f,
      roles: f.roles.includes(rol) ? f.roles.filter((r) => r !== rol) : [...f.roles, rol],
    }));

  const guardarCuenta = async () => {
    if (!form.nombres.trim() || !form.apellidos.trim()) {
      toast.error("Nombres y apellidos son obligatorios.");
      return;
    }
    setGuardando(true);
    try {
      if (editando) {
        await actualizarCuentaUsuario(editando, {
          nombres: form.nombres,
          apellidos: form.apellidos,
          roles: form.roles.length ? form.roles : ["empleado"],
          empleadoId: form.empleadoId || undefined,
          estadoUsuario: form.estadoUsuario,
        });
        toast.success("Usuario actualizado.");
      } else {
        if (!form.email.trim()) {
          toast.error("El correo es obligatorio.");
          return;
        }
        if (form.password.length < 6) {
          toast.error("La contraseña debe tener al menos 6 caracteres.");
          return;
        }
        await crearCuentaUsuario({
          email: form.email,
          password: form.password,
          nombres: form.nombres,
          apellidos: form.apellidos,
          roles: form.roles,
          empleadoId: form.empleadoId || undefined,
        });
        toast.success("Usuario creado en Firebase Authentication.");
      }
      setDialogoAbierto(false);
    } catch (error) {
      console.error("[usuarios] no se pudo guardar", error);
      toast.error(mensajeAuth(error));
    } finally {
      setGuardando(false);
    }
  };

  const alternarEstado = async (cuenta: CuentaUsuario) => {
    const actual = cuenta.estadoUsuario ?? "activo";
    const nuevo: EstadoUsuario = actual === "activo" ? "inactivo" : "activo";
    try {
      await actualizarCuentaUsuario(cuenta, { estadoUsuario: nuevo });
      toast.success(`Cuenta ${nuevo === "activo" ? "activada" : "inactivada"}.`);
    } catch (error) {
      console.error("[usuarios] no se pudo cambiar el estado", error);
      toast.error(mensajeAuth(error));
    }
  };

  const restablecer = async (email: string) => {
    try {
      await enviarResetClave(email);
      toast.success(`Correo de restablecimiento enviado a ${email}.`);
    } catch (error) {
      console.error("[usuarios] no se pudo enviar el restablecimiento", error);
      toast.error(mensajeAuth(error));
    }
  };

  const toggle = (modulo: string, rol: RoleKey, accion: PermissionAction) => {
    setMatriz((prev) => {
      const actuales = prev[modulo]?.[rol] ?? [];
      const nuevas = actuales.includes(accion)
        ? actuales.filter((a) => a !== accion)
        : [...actuales, accion];
      return { ...prev, [modulo]: { ...prev[modulo], [rol]: nuevas } };
    });
  };

  const guardarMatriz = async () => {
    setGuardandoPermisos(true);
    try {
      await guardarPermisos(matriz);
      toast.success("Matriz de permisos guardada.");
    } catch (error) {
      console.error("[permisos] no se pudo guardar", error);
      toast.error("Solo un administrador puede guardar la matriz de permisos.");
    } finally {
      setGuardandoPermisos(false);
    }
  };

  const modulos = Object.keys(matriz);

  const usuarioColumns: Column<UsuarioSistema>[] = [
    {
      key: "usuario",
      header: "Usuario / Empleado",
      render: (u) => {
        const e = empleadoById(u.empleadoId);
        const cuenta = cuentas.find((c) => c.id === u.id);
        const nombre = e
          ? nombreCompleto(e)
          : `${cuenta?.nombres ?? ""} ${cuenta?.apellidos ?? ""}`.trim() || u.username;
        return (
          <div>
            <div className="font-medium text-foreground">{nombre}</div>
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
            <span
              key={r}
              className="rounded-md bg-secondary px-1.5 py-0.5 text-[11px] font-medium text-secondary-foreground"
            >
              {ROLE_LABEL[r]}
            </span>
          ))}
        </div>
      ),
    },
    {
      key: "estado",
      header: "Estado",
      render: (u) => <EstadoUsuarioBadge estado={u.estadoUsuario} />,
    },
    {
      key: "acceso",
      header: "Último acceso",
      render: (u) => (
        <span className="text-xs tabular-nums text-muted-foreground">
          {u.ultimoAcceso ? new Date(u.ultimoAcceso).toLocaleString("es-CO") : "Nunca"}
        </span>
      ),
    },
    {
      key: "acciones",
      header: "Acciones",
      className: "text-right",
      render: (u) => {
        const cuenta = cuentas.find((c) => c.id === u.id);
        if (!cuenta) return null;
        return (
          <div className="flex justify-end gap-1">
            <Button
              variant="ghost"
              size="sm"
              disabled={!puedeGestionar}
              onClick={() => abrirEdicion(cuenta)}
            >
              Editar
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={!puedeGestionar}
              onClick={() => alternarEstado(cuenta)}
            >
              {u.estadoUsuario === "activo" ? "Inactivar" : "Activar"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={!u.email}
              onClick={() => restablecer(u.email)}
            >
              Restablecer clave
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <AppShell>
      <PageHeader
        breadcrumb={["Administración", "Usuarios, roles y permisos"]}
        title="Usuarios, roles y permisos"
        description="Cada empleado puede tener un usuario con estado, último acceso e intentos fallidos controlados. Los permisos son granulares por módulo y acción."
        actions={
          <Button size="sm" disabled={!puedeGestionar} onClick={() => abrirNuevo()}>
            <UserPlus className="size-4" /> Nuevo usuario
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Usuarios activos"
          value={String(usuarios.filter((u) => u.estadoUsuario === "activo").length)}
          icon={KeyRound}
          hint="con acceso vigente"
        />
        <StatCard
          label="Cuentas bloqueadas"
          value={String(bloqueados)}
          icon={ShieldAlert}
          hint="por intentos fallidos"
        />
        <StatCard
          label="Empleados sin usuario"
          value={String(empleadosSinUsuario.length)}
          icon={UserPlus}
          hint="pendientes de creación"
        />
        <StatCard
          label="Roles configurados"
          value={String(ROLES.length)}
          icon={Wallet}
          hint="con permisos granulares"
        />
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
          <DataTable
            columns={usuarioColumns}
            rows={usuariosFiltrados}
            emptyMessage="Sin usuarios que coincidan."
          />
          {empleadosSinUsuario.length > 0 && (
            <div className="surface-panel p-4">
              <h3 className="text-sm font-semibold text-foreground">
                Empleados sin usuario asignado
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Todo empleado puede tener usuario; la creación es opcional y auditada.
              </p>
              <ul className="mt-3 flex flex-wrap gap-2">
                {empleadosSinUsuario.map((e) => (
                  <li
                    key={e.id}
                    className="flex items-center gap-2 rounded-md border border-border px-2.5 py-1.5 text-xs"
                  >
                    <span className="text-foreground">{nombreCompleto(e)}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-[11px]"
                      disabled={!puedeGestionar}
                      onClick={() => abrirNuevo(e.id)}
                    >
                      Crear usuario
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </TabsContent>

        <TabsContent value="roles" className="mt-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {ROLES.map((role) => {
              const usuariosRol = usuarios.filter((u) => u.roles.includes(role.key)).length;
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
                      Alcance:{" "}
                      <strong className="text-foreground">
                        {ALCANCE_LABEL[alcanceDe([role.key])]}
                      </strong>
                    </span>
                    <span className="tabular-nums">{usuariosRol} usuario(s)</span>
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="permisos" className="mt-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
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
            <Button
              size="sm"
              className="ml-auto"
              disabled={!esAdmin || guardandoPermisos}
              onClick={guardarMatriz}
            >
              {guardandoPermisos ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              Guardar permisos
            </Button>
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
                          disabled={!esAdmin}
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
                      <td
                        colSpan={PERMISSION_ACTIONS.length + 1}
                        className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-primary"
                      >
                        {modulo}
                      </td>
                    </tr>
                    {Object.entries(matriz[modulo] ?? {}).map(([roleKey, actions]) => (
                      <tr
                        key={`${modulo}-${roleKey}`}
                        className="border-b border-border/60 last:border-0"
                      >
                        <td className="px-4 py-2.5 text-foreground">
                          {ROLE_LABEL[roleKey as RoleKey]}
                        </td>
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
                  const ejemplo = usuarios.find((u) => u.roles.includes(fila.rol));
                  const total = ejemplo
                    ? empleadosVisibles(ejemplo.empleadoId, [fila.rol]).length
                    : 0;
                  return (
                    <tr key={fila.rol} className="border-b border-border/60 last:border-0">
                      <td className="px-4 py-3 font-medium text-foreground">
                        {ROLE_LABEL[fila.rol]}
                      </td>
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

      <Dialog open={dialogoAbierto} onOpenChange={setDialogoAbierto}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editando ? "Editar usuario" : "Nuevo usuario"}</DialogTitle>
            <DialogDescription>
              {editando
                ? "Actualice nombres, roles, empleado vinculado y estado de la cuenta."
                : "Se crea la cuenta en Firebase Authentication y su perfil con roles."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="nombres">Nombres</Label>
                <Input
                  id="nombres"
                  value={form.nombres}
                  onChange={(e) => setForm((f) => ({ ...f, nombres: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="apellidos">Apellidos</Label>
                <Input
                  id="apellidos"
                  value={form.apellidos}
                  onChange={(e) => setForm((f) => ({ ...f, apellidos: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">Correo</Label>
              <Input
                id="email"
                type="email"
                autoComplete="off"
                disabled={!!editando}
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>

            {!editando && (
              <div className="space-y-1.5">
                <Label htmlFor="password">Contraseña temporal</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Empleado vinculado</Label>
              <Select
                value={form.empleadoId || "ninguno"}
                onValueChange={(v) => setForm((f) => ({ ...f, empleadoId: v === "ninguno" ? "" : v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sin vincular" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ninguno">Sin vincular</SelectItem>
                  {EMPLEADOS.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {nombreCompleto(e)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {editando && (
              <div className="space-y-1.5">
                <Label>Estado de la cuenta</Label>
                <Select
                  value={form.estadoUsuario}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, estadoUsuario: v as EstadoUsuario }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(ESTADO_USUARIO_LABEL) as EstadoUsuario[]).map((e) => (
                      <SelectItem key={e} value={e}>
                        {ESTADO_USUARIO_LABEL[e]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Roles</Label>
              <div className="grid grid-cols-2 gap-2">
                {ROLES.map((r) => (
                  <label key={r.key} className="flex items-center gap-2 text-xs text-foreground">
                    <Checkbox
                      checked={form.roles.includes(r.key)}
                      onCheckedChange={() => alternarRol(r.key)}
                    />
                    {r.nombre}
                  </label>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogoAbierto(false)}>
              Cancelar
            </Button>
            <Button onClick={guardarCuenta} disabled={guardando}>
              {guardando && <Loader2 className="size-4 animate-spin" />}
              {editando ? "Guardar cambios" : "Crear usuario"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
