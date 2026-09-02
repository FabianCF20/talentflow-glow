import { useMemo, useState, type SetStateAction } from "react";
import { Pencil, Plus, RotateCcw, ShieldOff } from "lucide-react";
import { toast } from "sonner";
import { DataTable, type Column } from "@/components/common/DataTable";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { nuevoId } from "@/lib/maestros";
import type { RecordStatus } from "@/types/entities";

export type CampoTipo = "texto" | "numero" | "fecha" | "select";

export interface CampoDef<T> {
  key: keyof T & string;
  label: string;
  tipo?: CampoTipo;
  opciones?: { value: string; label: string }[];
  requerido?: boolean;
  placeholder?: string;
  /** Ocultar la columna en la tabla (se sigue editando en el formulario). */
  ocultarEnTabla?: boolean;
  render?: (row: T) => React.ReactNode;
}

interface Base {
  id: string;
  estado: RecordStatus;
}

export function CrudMaestro<T extends Base>({
  titulo,
  descripcion,
  prefijoId,
  campos,
  items,
  setItems,
  valoresIniciales,
  puedeEditar = true,
  filtro,
}: {
  titulo: string;
  descripcion?: string;
  prefijoId: string;
  campos: CampoDef<T>[];
  items: T[];
  setItems: (accion: SetStateAction<T[]>) => void;
  valoresIniciales: Omit<T, "id" | "estado"> & Partial<Pick<T, "estado">>;
  puedeEditar?: boolean;
  filtro?: string;
}) {
  const [abierto, setAbierto] = useState(false);
  const [editando, setEditando] = useState<T | null>(null);
  const [form, setForm] = useState<Record<string, unknown>>({});

  const abrirNuevo = () => {
    setEditando(null);
    setForm({ ...(valoresIniciales as Record<string, unknown>) });
    setAbierto(true);
  };

  const abrirEdicion = (row: T) => {
    setEditando(row);
    setForm({ ...(row as unknown as Record<string, unknown>) });
    setAbierto(true);
  };

  const set = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  const guardar = () => {
    const faltante = campos.find(
      (c) => c.requerido && String(form[c.key] ?? "").trim() === "",
    );
    if (faltante) {
      toast.error(`El campo "${faltante.label}" es obligatorio.`);
      return;
    }
    const registro = {
      ...(form as unknown as T),
      id: editando?.id ?? nuevoId(prefijoId),
      estado: (editando?.estado ?? "activo") as RecordStatus,
    } as T;
    setItems((prev) =>
      editando ? prev.map((r) => (r.id === registro.id ? registro : r)) : [...prev, registro],
    );
    setAbierto(false);
    toast.success(editando ? `${titulo}: registro actualizado.` : `${titulo}: registro creado.`);
  };

  const cambiarEstado = (row: T, estado: RecordStatus) => {
    setItems((prev) => prev.map((r) => (r.id === row.id ? ({ ...r, estado } as T) : r)));
    toast.success(estado === "activo" ? "Registro reactivado." : "Registro inactivado.");
  };

  const columnas = useMemo<Column<T>[]>(() => {
    const base: Column<T>[] = campos
      .filter((c) => !c.ocultarEnTabla)
      .map((c) => ({
        key: c.key,
        header: c.label,
        render:
          c.render ??
          ((row: T) => {
            const valor = (row as unknown as Record<string, unknown>)[c.key];
            if (valor === undefined || valor === null || valor === "")
              return <span className="text-muted-foreground">—</span>;
            if (c.tipo === "select") {
              return c.opciones?.find((o) => o.value === String(valor))?.label ?? String(valor);
            }
            if (c.tipo === "numero")
              return <span className="tabular-nums">{Number(valor).toLocaleString("es-CO")}</span>;
            return String(valor);
          }),
      }));
    base.push({
      key: "estado",
      header: "Estado",
      render: (r) => <StatusBadge status={r.estado} />,
    });
    base.push({
      key: "acciones",
      header: "Acciones",
      className: "text-right",
      render: (r) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="sm" disabled={!puedeEditar} onClick={() => abrirEdicion(r)}>
            <Pencil className="size-3.5" /> Editar
          </Button>
          {r.estado === "activo" ? (
            <Button
              variant="ghost"
              size="sm"
              disabled={!puedeEditar}
              onClick={() => cambiarEstado(r, "inactivo")}
            >
              <ShieldOff className="size-3.5" /> Inactivar
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              disabled={!puedeEditar}
              onClick={() => cambiarEstado(r, "activo")}
            >
              <RotateCcw className="size-3.5" /> Reactivar
            </Button>
          )}
        </div>
      ),
    });
    return base;
  }, [campos, puedeEditar]);

  const filas = useMemo(() => {
    const q = (filtro ?? "").trim().toLowerCase();
    if (!q) return items;
    return items.filter((r) =>
      campos.some((c) =>
        String((r as unknown as Record<string, unknown>)[c.key] ?? "")
          .toLowerCase()
          .includes(q),
      ),
    );
  }, [items, filtro, campos]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-base font-semibold text-foreground">{titulo}</h3>
          {descripcion && <p className="text-xs text-muted-foreground">{descripcion}</p>}
        </div>
        <Button size="sm" onClick={abrirNuevo} disabled={!puedeEditar}>
          <Plus className="size-4" /> Nuevo
        </Button>
      </div>

      <DataTable
        columns={columnas}
        rows={filas}
        emptyMessage={`Aún no hay registros de ${titulo.toLowerCase()}. Use "Nuevo" para crear el primero.`}
      />

      <Dialog open={abierto} onOpenChange={setAbierto}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {editando ? "Editar" : "Nuevo"} · {titulo}
            </DialogTitle>
            <DialogDescription>
              Los registros nunca se eliminan: se inactivan o archivan conservando su trazabilidad.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 sm:grid-cols-2">
            {campos.map((c) => (
              <div key={c.key} className="space-y-1.5">
                <Label htmlFor={`campo-${c.key}`}>
                  {c.label}
                  {c.requerido && <span className="text-destructive"> *</span>}
                </Label>
                {c.tipo === "select" ? (
                  <Select
                    value={String(form[c.key] ?? "")}
                    onValueChange={(v) => set(c.key, v === "__vacio" ? "" : v)}
                  >
                    <SelectTrigger id={`campo-${c.key}`}>
                      <SelectValue placeholder="Seleccione…" />
                    </SelectTrigger>
                    <SelectContent>
                      {!c.requerido && <SelectItem value="__vacio">Sin asignar</SelectItem>}
                      {(c.opciones ?? []).map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    id={`campo-${c.key}`}
                    type={c.tipo === "numero" ? "number" : c.tipo === "fecha" ? "date" : "text"}
                    value={String(form[c.key] ?? "")}
                    placeholder={c.placeholder}
                    onChange={(e) =>
                      set(c.key, c.tipo === "numero" ? Number(e.target.value) : e.target.value)
                    }
                  />
                )}
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAbierto(false)}>
              Cancelar
            </Button>
            <Button onClick={guardar}>{editando ? "Guardar cambios" : "Crear registro"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
