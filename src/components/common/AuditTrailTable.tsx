import { DataTable, type Column } from "@/components/common/DataTable";
import type { AuditLog } from "@/types/entities";

const ACTION_LABEL: Record<AuditLog["accion"], string> = {
  crear: "Creación",
  editar: "Edición",
  inactivar: "Inactivación",
  archivar: "Archivado",
  aprobar: "Aprobación",
  exportar: "Exportación",
  consultar: "Consulta",
  login: "Inicio de sesión",
  logout: "Cierre de sesión",
};

const columns: Column<AuditLog>[] = [
  {
    key: "usuario",
    header: "Usuario",
    render: (r) => <span className="font-medium text-foreground">{r.usuario}</span>,
  },
  {
    key: "fecha",
    header: "Fecha / Hora",
    render: (r) => (
      <span className="tabular-nums text-muted-foreground">
        {r.fecha} · {r.hora}
      </span>
    ),
  },
  {
    key: "origen",
    header: "IP / Navegador",
    render: (r) => (
      <div className="text-xs text-muted-foreground">
        <div className="tabular-nums">{r.ip}</div>
        <div>{r.navegador}</div>
      </div>
    ),
  },
  {
    key: "accion",
    header: "Acción",
    render: (r) => (
      <span className="rounded-md border border-border bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
        {ACTION_LABEL[r.accion]}
      </span>
    ),
  },
  {
    key: "registro",
    header: "Registro afectado",
    render: (r) => (
      <div>
        <div className="text-foreground">{r.registroAfectado}</div>
        <div className="text-xs text-muted-foreground">{r.modulo}</div>
      </div>
    ),
  },
  {
    key: "valores",
    header: "Valor anterior → nuevo",
    render: (r) => (
      <div className="text-xs">
        <div className="text-muted-foreground line-through decoration-destructive/60">
          {r.valorAnterior ?? "—"}
        </div>
        <div className="text-foreground">{r.valorNuevo ?? "—"}</div>
      </div>
    ),
  },
];

export function AuditTrailTable({ logs }: { logs: AuditLog[] }) {
  return <DataTable columns={columns} rows={logs} emptyMessage="Sin eventos de auditoría." />;
}
