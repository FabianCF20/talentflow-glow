import { createFileRoute } from "@tanstack/react-router";
import { Building2, MapPin, Network, BriefcaseBusiness, Coins, Plus } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable, type Column } from "@/components/common/DataTable";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import type { RecordStatus } from "@/types/entities";

export const Route = createFileRoute("/maestros")({
  head: () => ({
    meta: [
      { title: "Datos maestros | SIGTH" },
      {
        name: "description",
        content: "Entidades maestras: empresa, sedes, áreas, cargos y centros de costo.",
      },
      { property: "og:title", content: "Datos maestros | SIGTH" },
      {
        property: "og:description",
        content: "Administración de entidades maestras del sistema de talento humano.",
      },
    ],
  }),
  component: Maestros,
});

interface MasterRow {
  id: string;
  entidad: string;
  descripcion: string;
  registros: number;
  estado: RecordStatus;
  icon: typeof Building2;
}

const rows: MasterRow[] = [
  { id: "m-1", entidad: "Empresa", descripcion: "Razón social, NIT, representante legal", registros: 1, estado: "activo", icon: Building2 },
  { id: "m-2", entidad: "Sedes", descripcion: "Ubicaciones operativas y administrativas", registros: 4, estado: "activo", icon: MapPin },
  { id: "m-3", entidad: "Áreas organizacionales", descripcion: "Estructura jerárquica de la compañía", registros: 12, estado: "activo", icon: Network },
  { id: "m-4", entidad: "Cargos", descripcion: "Perfiles y niveles jerárquicos", registros: 38, estado: "activo", icon: BriefcaseBusiness },
  { id: "m-5", entidad: "Centros de costo", descripcion: "Imputación contable de la nómina", registros: 9, estado: "inactivo", icon: Coins },
];

const columns: Column<MasterRow>[] = [
  {
    key: "entidad",
    header: "Entidad maestra",
    render: (r) => (
      <div className="flex items-center gap-3">
        <span className="grid size-8 place-items-center rounded-md bg-primary-soft text-primary">
          <r.icon className="size-4" />
        </span>
        <div>
          <div className="font-medium text-foreground">{r.entidad}</div>
          <div className="text-xs text-muted-foreground">{r.descripcion}</div>
        </div>
      </div>
    ),
  },
  { key: "registros", header: "Registros", render: (r) => <span className="tabular-nums">{r.registros}</span> },
  { key: "estado", header: "Estado", render: (r) => <StatusBadge status={r.estado} /> },
  {
    key: "acciones",
    header: "Acciones",
    className: "text-right",
    render: () => (
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm">Ver</Button>
        <Button variant="ghost" size="sm">Editar</Button>
      </div>
    ),
  },
];

function Maestros() {
  return (
    <AppShell>
      <PageHeader
        breadcrumb={["Administración", "Datos maestros"]}
        title="Datos maestros"
        description="Entidades base sobre las que operan todos los módulos. Ningún registro se elimina: se inactiva o archiva."
        actions={
          <Button size="sm">
            <Plus className="size-4" /> Nuevo registro
          </Button>
        }
      />
      <DataTable columns={columns} rows={rows} />
    </AppShell>
  );
}
