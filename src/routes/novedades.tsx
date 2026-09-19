import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { History } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable, type Column } from "@/components/common/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRrhh } from "@/store/rrhh";
import { useOperaciones } from "@/store/operaciones";
import { downloadCsv } from "@/lib/export";
import { hoyISO } from "@/lib/operaciones";
import { nombreEmpleado } from "@/types/rrhh";
import {
  ETAPA_LABEL,
  TIPO_NOVEDAD_LABEL,
  type NovedadOperativa,
  type TipoNovedad,
} from "@/types/operaciones";

export const Route = createFileRoute("/novedades")({
  head: () => ({
    meta: [
      { title: "Historial de novedades | SIGTH" },
      {
        name: "description",
        content:
          "Historial completo de novedades operativas: solicitudes, incapacidades, asistencia, horas extras y notificaciones con responsable y etapa del flujo.",
      },
      { property: "og:title", content: "Historial de novedades | SIGTH" },
      {
        property: "og:description",
        content: "Trazabilidad total de los procesos operativos por empleado, tipo y etapa de aprobación.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: NovedadesPage,
});

function NovedadesPage() {
  const { empleados } = useRrhh();
  const { novedades } = useOperaciones();
  const [tipo, setTipo] = useState<TipoNovedad | "todas">("todas");
  const [busqueda, setBusqueda] = useState("");

  const nombrePor = useMemo(
    () => Object.fromEntries(empleados.map((e) => [e.id, nombreEmpleado(e)])),
    [empleados],
  );

  const filtradas = novedades.filter((n) => {
    if (tipo !== "todas" && n.tipo !== tipo) return false;
    const q = busqueda.trim().toLowerCase();
    if (!q) return true;
    return [n.titulo, n.detalle, n.responsable, n.referencia, nombrePor[n.empleadoId] ?? ""]
      .join(" ")
      .toLowerCase()
      .includes(q);
  });

  const columns: Column<NovedadOperativa>[] = [
    {
      key: "fecha",
      header: "Fecha / Hora",
      render: (n) => (
        <span className="tabular-nums text-muted-foreground">
          {n.fecha} · {n.hora}
        </span>
      ),
    },
    {
      key: "empleado",
      header: "Empleado",
      render: (n) => (
        <span className="font-medium text-foreground">{nombrePor[n.empleadoId] ?? n.empleadoId}</span>
      ),
    },
    {
      key: "tipo",
      header: "Tipo",
      render: (n) => (
        <span className="rounded-md border border-border bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
          {TIPO_NOVEDAD_LABEL[n.tipo]}
        </span>
      ),
    },
    {
      key: "novedad",
      header: "Novedad",
      render: (n) => (
        <div>
          <div className="text-foreground">{n.titulo}</div>
          <div className="text-xs text-muted-foreground">{n.detalle}</div>
        </div>
      ),
    },
    {
      key: "flujo",
      header: "Etapa / Responsable",
      render: (n) => (
        <div className="text-xs text-muted-foreground">
          <div className="text-foreground">{ETAPA_LABEL[n.etapa]}</div>
          <div>{n.responsable}</div>
        </div>
      ),
    },
    {
      key: "referencia",
      header: "Referencia",
      render: (n) => <span className="tabular-nums text-xs text-muted-foreground">{n.referencia}</span>,
    },
  ];

  const exportar = () =>
    downloadCsv(
      `novedades-operativas-${hoyISO()}.csv`,
      ["Fecha", "Hora", "Empleado", "Tipo", "Novedad", "Detalle", "Etapa", "Responsable", "Referencia"],
      filtradas.map((n) => [
        n.fecha,
        n.hora,
        nombrePor[n.empleadoId] ?? n.empleadoId,
        TIPO_NOVEDAD_LABEL[n.tipo],
        n.titulo,
        n.detalle,
        ETAPA_LABEL[n.etapa],
        n.responsable,
        n.referencia,
      ]),
    );

  return (
    <AppShell>
      <PageHeader
        breadcrumb={["Operación", "Historial de novedades"]}
        title="Historial de novedades"
        description="Registro único e inalterable de todas las acciones de los procesos operativos, con etapa del flujo, responsable y referencia del documento."
        actions={
          <Button size="sm" variant="outline" onClick={exportar}>
            Exportar historial
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <Input
          className="h-9 max-w-xs"
          placeholder="Buscar por empleado, referencia o responsable"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
        <Select value={tipo} onValueChange={(v) => setTipo(v as TipoNovedad | "todas")}>
          <SelectTrigger className="h-9 w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todos los tipos</SelectItem>
            {(Object.keys(TIPO_NOVEDAD_LABEL) as TipoNovedad[]).map((t) => (
              <SelectItem key={t} value={t}>
                {TIPO_NOVEDAD_LABEL[t]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground">
          <History className="mr-1 inline size-3.5" />
          {filtradas.length} novedades
        </span>
      </div>

      <DataTable columns={columns} rows={filtradas} emptyMessage="Sin novedades para los filtros aplicados." />
    </AppShell>
  );
}
