import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, EyeOff, RefreshCw, Users2 } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  EMPLEADOS,
  USUARIOS,
  areaById,
  buildOrgTree,
  cargoById,
  centroTrabajoById,
  dependenciaById,
  nivelById,
  subordinadosDe,
  type OrgNode,
} from "@/data/organizacion";
import { ALCANCE_LABEL, alcanceDe, empleadosVisibles, puedeVerSalario } from "@/lib/visibilidad";
import { formatCOP, nombreCompleto } from "@/types/organizacion";
import { ROLE_LABEL } from "@/config/roles";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/organigrama")({
  head: () => ({
    meta: [
      { title: "Organigrama automático | SIGTH" },
      {
        name: "description",
        content:
          "Organigrama generado automáticamente a partir del cargo, el área y el jefe inmediato de cada empleado.",
      },
      { property: "og:title", content: "Organigrama automático | SIGTH" },
      {
        property: "og:description",
        content: "Estructura jerárquica viva con reglas de visibilidad por rol.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Organigrama,
});

function NodeCard({
  node,
  visibles,
  puedeSalario,
  depth,
}: {
  node: OrgNode;
  visibles: Set<string>;
  puedeSalario: (id: string) => boolean;
  depth: number;
}) {
  const [open, setOpen] = useState(depth < 2);
  const e = node.empleado;
  const cargo = cargoById(e.cargoId);
  const nivel = nivelById(cargo?.nivelId);
  const visible = visibles.has(e.id);
  const usuario = USUARIOS.find((u) => u.empleadoId === e.id);

  return (
    <li className="relative pl-5 before:absolute before:left-0 before:top-0 before:h-full before:w-px before:bg-border last:before:h-6">
      <div className="relative">
        <span className="absolute -left-5 top-6 h-px w-5 bg-border" />
        <div
          className={cn(
            "surface-panel flex flex-wrap items-center gap-3 p-3",
            !visible && "opacity-45",
          )}
        >
          {node.hijos.length > 0 ? (
            <button
              onClick={() => setOpen((v) => !v)}
              className="grid size-6 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-muted"
              aria-label={open ? "Contraer" : "Expandir"}
            >
              {open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
            </button>
          ) : (
            <span className="size-6 shrink-0" />
          )}

          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary-soft text-xs font-semibold text-primary">
            {e.nombres[0]}
            {e.apellidos[0]}
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium text-foreground">{nombreCompleto(e)}</span>
              {nivel && (
                <span className="rounded-md bg-secondary px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-secondary-foreground">
                  N{nivel.nivel}
                </span>
              )}
              {!usuario && (
                <span className="rounded-md border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">
                  Sin usuario
                </span>
              )}
            </div>
            <p className="truncate text-xs text-muted-foreground">
              {cargo?.nombre} · {areaById(e.areaId)?.nombre}
              {e.dependenciaId ? ` · ${dependenciaById(e.dependenciaId)?.nombre}` : ""}
            </p>
            <p className="truncate text-[11px] text-muted-foreground/80">
              {centroTrabajoById(e.centroTrabajoId)?.nombre}
            </p>
          </div>

          <div className="ml-auto text-right">
            {puedeSalario(e.id) ? (
              <span className="font-mono text-sm tabular-nums text-foreground">
                {formatCOP(e.salario)}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <EyeOff className="size-3.5" /> Restringido
              </span>
            )}
            <p className="text-[11px] text-muted-foreground">
              {node.hijos.length > 0 ? `${node.hijos.length} reporte(s) directo(s)` : "Sin equipo"}
            </p>
          </div>
        </div>
      </div>

      {open && node.hijos.length > 0 && (
        <ul className="mt-2 space-y-2">
          {node.hijos.map((h) => (
            <NodeCard
              key={h.empleado.id}
              node={h}
              visibles={visibles}
              puedeSalario={puedeSalario}
              depth={depth + 1}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

function Organigrama() {
  /** Usuario simulado: permite validar las reglas de visibilidad por rol. */
  const [usuarioId, setUsuarioId] = useState("us-002");
  const usuario = USUARIOS.find((u) => u.id === usuarioId)!;
  const empleado = EMPLEADOS.find((e) => e.id === usuario.empleadoId)!;

  const tree = useMemo(() => buildOrgTree(), []);
  const visibles = useMemo(
    () => new Set(empleadosVisibles(empleado.id, usuario.roles).map((e) => e.id)),
    [empleado.id, usuario.roles],
  );
  const alcance = alcanceDe(usuario.roles);
  const puedeSalario = (id: string) => puedeVerSalario(empleado.id, usuario.roles, id);
  const equipo = subordinadosDe(empleado.id).length;

  return (
    <AppShell>
      <PageHeader
        breadcrumb={["Organización", "Organigrama"]}
        title="Organigrama automático"
        description="Se genera en tiempo real a partir del cargo, el área y el jefe inmediato. Cualquier modificación en la estructura actualiza el árbol al instante."
        actions={
          <Button variant="outline" size="sm">
            <RefreshCw className="size-4" /> Regenerar
          </Button>
        }
      />

      <div className="surface-panel flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <span className="text-sm font-medium text-foreground">Ver como</span>
          <Select value={usuarioId} onValueChange={setUsuarioId}>
            <SelectTrigger className="w-full sm:w-[320px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {USUARIOS.map((u) => {
                const emp = EMPLEADOS.find((e) => e.id === u.empleadoId);
                return (
                  <SelectItem key={u.id} value={u.id}>
                    {emp ? nombreCompleto(emp) : u.username} — {u.roles.map((r) => ROLE_LABEL[r]).join(", ")}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Users2 className="size-4 text-primary" /> Alcance: <strong className="text-foreground">{ALCANCE_LABEL[alcance]}</strong>
          </span>
          <span>
            Visibles: <strong className="text-foreground tabular-nums">{visibles.size}</strong> de {EMPLEADOS.length}
          </span>
          <span>
            Personal a cargo: <strong className="text-foreground tabular-nums">{equipo}</strong>
          </span>
        </div>
      </div>

      <ul className="space-y-2">
        {tree.map((n) => (
          <NodeCard
            key={n.empleado.id}
            node={n}
            visibles={visibles}
            puedeSalario={puedeSalario}
            depth={0}
          />
        ))}
      </ul>
    </AppShell>
  );
}
