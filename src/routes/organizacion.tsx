import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Building2,
  Network,
  MapPinned,
  Coins,
  BriefcaseBusiness,
  Layers,
  Plus,
  Download,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable, type Column } from "@/components/common/DataTable";
import { StatusBadge } from "@/components/common/StatusBadge";
import { StatCard } from "@/components/common/StatCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AREAS,
  CARGOS,
  CENTROS_COSTO,
  CENTROS_TRABAJO,
  DEPENDENCIAS,
  EMPLEADOS,
  NIVELES,
  areaById,
  empleadoById,
  nivelById,
} from "@/data/organizacion";
import { formatCOP, nombreCompleto } from "@/types/organizacion";
import type {
  AreaOrg,
  CargoOrg,
  CentroCostoOrg,
  CentroTrabajo,
  Dependencia,
  NivelJerarquico,
} from "@/types/organizacion";

export const Route = createFileRoute("/organizacion")({
  head: () => ({
    meta: [
      { title: "Estructura organizacional | SIGTH" },
      {
        name: "description",
        content:
          "Administración de áreas, dependencias, centros de trabajo, centros de costo, cargos y niveles jerárquicos.",
      },
      { property: "og:title", content: "Estructura organizacional | SIGTH" },
      {
        property: "og:description",
        content: "Módulos base de la estructura organizacional del talento humano.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Organizacion,
});

const responsable = (id?: string) => {
  const e = empleadoById(id);
  return e ? nombreCompleto(e) : "Sin asignar";
};

const acciones = <T,>(): Column<T & { id: string }> => ({
  key: "acciones",
  header: "Acciones",
  className: "text-right",
  render: () => (
    <div className="flex justify-end gap-1">
      <Button variant="ghost" size="sm">Editar</Button>
      <Button variant="ghost" size="sm">Inactivar</Button>
    </div>
  ),
});

const areaColumns: Column<AreaOrg>[] = [
  { key: "codigo", header: "Código", render: (r) => <span className="font-mono text-xs">{r.codigo}</span> },
  {
    key: "nombre",
    header: "Área",
    render: (r) => (
      <div>
        <div className="font-medium text-foreground">{r.nombre}</div>
        <div className="text-xs text-muted-foreground">
          {r.direccionId ? `Depende de ${areaById(r.direccionId)?.nombre}` : "Nivel raíz"}
        </div>
      </div>
    ),
  },
  { key: "responsable", header: "Responsable", render: (r) => responsable(r.responsableId) },
  {
    key: "empleados",
    header: "Empleados",
    render: (r) => <span className="tabular-nums">{EMPLEADOS.filter((e) => e.areaId === r.id).length}</span>,
  },
  { key: "estado", header: "Estado", render: (r) => <StatusBadge status={r.estado} /> },
  acciones<AreaOrg>(),
];

const dependenciaColumns: Column<Dependencia>[] = [
  { key: "codigo", header: "Código", render: (r) => <span className="font-mono text-xs">{r.codigo}</span> },
  { key: "nombre", header: "Dependencia", render: (r) => <span className="font-medium text-foreground">{r.nombre}</span> },
  { key: "area", header: "Área", render: (r) => areaById(r.areaId)?.nombre ?? "—" },
  { key: "responsable", header: "Responsable", render: (r) => responsable(r.responsableId) },
  { key: "estado", header: "Estado", render: (r) => <StatusBadge status={r.estado} /> },
  acciones<Dependencia>(),
];

const centroTrabajoColumns: Column<CentroTrabajo>[] = [
  { key: "codigo", header: "Código", render: (r) => <span className="font-mono text-xs">{r.codigo}</span> },
  {
    key: "nombre",
    header: "Centro de trabajo",
    render: (r) => (
      <div>
        <div className="font-medium text-foreground">{r.nombre}</div>
        <div className="text-xs text-muted-foreground">{r.direccion}</div>
      </div>
    ),
  },
  { key: "ciudad", header: "Ciudad", render: (r) => r.ciudad },
  { key: "riesgo", header: "Riesgo ARL", render: (r) => <span className="font-mono text-xs">Clase {r.riesgoArl}</span> },
  {
    key: "empleados",
    header: "Empleados",
    render: (r) => <span className="tabular-nums">{EMPLEADOS.filter((e) => e.centroTrabajoId === r.id).length}</span>,
  },
  { key: "estado", header: "Estado", render: (r) => <StatusBadge status={r.estado} /> },
  acciones<CentroTrabajo>(),
];

const centroCostoColumns: Column<CentroCostoOrg>[] = [
  { key: "codigo", header: "Código", render: (r) => <span className="font-mono text-xs">{r.codigo}</span> },
  { key: "nombre", header: "Centro de costo", render: (r) => <span className="font-medium text-foreground">{r.nombre}</span> },
  { key: "area", header: "Área imputable", render: (r) => areaById(r.areaId)?.nombre ?? "—" },
  {
    key: "presupuesto",
    header: "Presupuesto anual",
    render: (r) => <span className="tabular-nums">{formatCOP(r.presupuestoAnual)}</span>,
  },
  { key: "estado", header: "Estado", render: (r) => <StatusBadge status={r.estado} /> },
  acciones<CentroCostoOrg>(),
];

const cargoColumns: Column<CargoOrg>[] = [
  { key: "codigo", header: "Código", render: (r) => <span className="font-mono text-xs">{r.codigo}</span> },
  { key: "nombre", header: "Cargo", render: (r) => <span className="font-medium text-foreground">{r.nombre}</span> },
  { key: "area", header: "Área", render: (r) => areaById(r.areaId)?.nombre ?? "—" },
  {
    key: "nivel",
    header: "Nivel jerárquico",
    render: (r) => {
      const n = nivelById(r.nivelId);
      return (
        <span className="rounded-md bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
          {n ? `${n.nivel} · ${n.nombre}` : "—"}
        </span>
      );
    },
  },
  {
    key: "ocupantes",
    header: "Ocupantes",
    render: (r) => <span className="tabular-nums">{EMPLEADOS.filter((e) => e.cargoId === r.id).length}</span>,
  },
  { key: "estado", header: "Estado", render: (r) => <StatusBadge status={r.estado} /> },
  acciones<CargoOrg>(),
];

const nivelColumns: Column<NivelJerarquico>[] = [
  {
    key: "nivel",
    header: "Nivel",
    render: (r) => (
      <span className="grid size-8 place-items-center rounded-md bg-primary-soft font-display text-sm font-semibold text-primary">
        {r.nivel}
      </span>
    ),
  },
  {
    key: "nombre",
    header: "Denominación",
    render: (r) => (
      <div>
        <div className="font-medium text-foreground">{r.nombre}</div>
        <div className="text-xs text-muted-foreground">{r.descripcion}</div>
      </div>
    ),
  },
  {
    key: "cargos",
    header: "Cargos asociados",
    render: (r) => <span className="tabular-nums">{CARGOS.filter((c) => c.nivelId === r.id).length}</span>,
  },
  { key: "estado", header: "Estado", render: (r) => <StatusBadge status={r.estado} /> },
  acciones<NivelJerarquico>(),
];

function Organizacion() {
  const [query, setQuery] = useState("");

  const filtrar = <T extends { nombre: string; codigo?: string }>(rows: T[]) =>
    rows.filter((r) =>
      `${r.nombre} ${r.codigo ?? ""}`.toLowerCase().includes(query.trim().toLowerCase()),
    );

  const stats = useMemo(
    () => [
      { label: "Áreas", value: String(AREAS.filter((a) => a.estado === "activo").length), icon: Building2, hint: "activas" },
      { label: "Dependencias", value: String(DEPENDENCIAS.filter((d) => d.estado === "activo").length), icon: Network, hint: "activas" },
      { label: "Cargos", value: String(CARGOS.filter((c) => c.estado === "activo").length), icon: BriefcaseBusiness, hint: "definidos" },
      { label: "Centros de trabajo", value: String(CENTROS_TRABAJO.filter((c) => c.estado === "activo").length), icon: MapPinned, hint: "operativos" },
    ],
    [],
  );

  return (
    <AppShell>
      <PageHeader
        breadcrumb={["Organización", "Estructura organizacional"]}
        title="Estructura organizacional"
        description="Áreas, dependencias, centros de trabajo, centros de costo, cargos y niveles jerárquicos. Toda modificación se refleja automáticamente en el organigrama."
        actions={
          <>
            <Button variant="outline" size="sm">
              <Download className="size-4" /> Exportar
            </Button>
            <Button size="sm">
              <Plus className="size-4" /> Nuevo registro
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => (
          <StatCard key={s.label} label={s.label} value={s.value} icon={s.icon} hint={s.hint} />
        ))}
      </div>

      <Tabs defaultValue="areas">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <TabsList className="flex-wrap">
            <TabsTrigger value="areas">Áreas</TabsTrigger>
            <TabsTrigger value="dependencias">Dependencias</TabsTrigger>
            <TabsTrigger value="centros-trabajo">Centros de trabajo</TabsTrigger>
            <TabsTrigger value="centros-costo">Centros de costo</TabsTrigger>
            <TabsTrigger value="cargos">Cargos</TabsTrigger>
            <TabsTrigger value="niveles">Niveles jerárquicos</TabsTrigger>
          </TabsList>
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre o código…"
            className="lg:max-w-xs"
          />
        </div>

        <TabsContent value="areas" className="mt-4">
          <DataTable columns={areaColumns} rows={filtrar(AREAS)} />
        </TabsContent>
        <TabsContent value="dependencias" className="mt-4">
          <DataTable columns={dependenciaColumns} rows={filtrar(DEPENDENCIAS)} />
        </TabsContent>
        <TabsContent value="centros-trabajo" className="mt-4">
          <DataTable columns={centroTrabajoColumns} rows={filtrar(CENTROS_TRABAJO)} />
        </TabsContent>
        <TabsContent value="centros-costo" className="mt-4">
          <DataTable columns={centroCostoColumns} rows={filtrar(CENTROS_COSTO)} />
        </TabsContent>
        <TabsContent value="cargos" className="mt-4">
          <DataTable columns={cargoColumns} rows={filtrar(CARGOS)} />
        </TabsContent>
        <TabsContent value="niveles" className="mt-4">
          <DataTable columns={nivelColumns} rows={filtrar(NIVELES)} />
        </TabsContent>
      </Tabs>

      <div className="surface-panel flex items-start gap-3 p-4 text-sm text-muted-foreground">
        <Layers className="mt-0.5 size-4 shrink-0 text-primary" />
        <p>
          Ningún registro se elimina físicamente: se inactiva o archiva conservando su trazabilidad.
          Los cambios de cargo, área o jefe inmediato regeneran el organigrama automáticamente.
        </p>
      </div>
    </AppShell>
  );
}
