import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Building2,
  Network,
  MapPinned,
  BriefcaseBusiness,
  Layers,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CrudMaestro, type CampoDef } from "@/components/maestros/CrudMaestro";
import {
  useAreas,
  useCargos,
  useCentrosCosto,
  useCentrosTrabajo,
  useDependencias,
  useEmpleadosOrg,
  useNiveles,
} from "@/lib/maestros";
import { useAuth } from "@/lib/auth";
import { can } from "@/config/roles";
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

const RIESGOS = ["I", "II", "III", "IV", "V"].map((v) => ({ value: v, label: `Clase ${v}` }));

function Organizacion() {
  const { perfil } = useAuth();
  const roles = perfil?.roles ?? [];
  const puedeEditar = can(roles, "organizacion", "crear") || can(roles, "organizacion", "editar");

  const [query, setQuery] = useState("");
  const [niveles, setNiveles] = useNiveles();
  const [areas, setAreas] = useAreas();
  const [dependencias, setDependencias] = useDependencias();
  const [centrosTrabajo, setCentrosTrabajo] = useCentrosTrabajo();
  const [centrosCosto, setCentrosCosto] = useCentrosCosto();
  const [cargos, setCargos] = useCargos();
  const [empleados] = useEmpleadosOrg();

  const opcAreas = areas.map((a) => ({ value: a.id, label: `${a.codigo} · ${a.nombre}` }));
  const opcNiveles = niveles.map((n) => ({ value: n.id, label: `${n.nivel} · ${n.nombre}` }));
  const opcEmpleados = empleados.map((e) => ({ value: e.id, label: nombreCompleto(e) }));

  const nombreArea = (id?: string) => areas.find((a) => a.id === id)?.nombre ?? "—";
  const nombreEmpleado = (id?: string) => {
    const e = empleados.find((x) => x.id === id);
    return e ? nombreCompleto(e) : "Sin asignar";
  };

  const camposNivel: CampoDef<NivelJerarquico>[] = [
    { key: "nivel", label: "Número de nivel", tipo: "numero", requerido: true },
    { key: "nombre", label: "Denominación", requerido: true, placeholder: "Dirección, Jefatura…" },
    { key: "descripcion", label: "Descripción" },
  ];

  const camposArea: CampoDef<AreaOrg>[] = [
    { key: "codigo", label: "Código", requerido: true, placeholder: "ADM-01" },
    { key: "nombre", label: "Área", requerido: true },
    {
      key: "direccionId",
      label: "Depende de",
      tipo: "select",
      opciones: opcAreas,
      render: (r) => (
        <span className="text-xs text-muted-foreground">
          {r.direccionId ? nombreArea(r.direccionId) : "Nivel raíz"}
        </span>
      ),
    },
    {
      key: "responsableId",
      label: "Responsable",
      tipo: "select",
      opciones: opcEmpleados,
      render: (r) => nombreEmpleado(r.responsableId),
    },
  ];

  const camposDependencia: CampoDef<Dependencia>[] = [
    { key: "codigo", label: "Código", requerido: true },
    { key: "nombre", label: "Dependencia", requerido: true },
    {
      key: "areaId",
      label: "Área",
      tipo: "select",
      opciones: opcAreas,
      requerido: true,
      render: (r) => nombreArea(r.areaId),
    },
    {
      key: "responsableId",
      label: "Responsable",
      tipo: "select",
      opciones: opcEmpleados,
      render: (r) => nombreEmpleado(r.responsableId),
    },
  ];

  const camposCentroTrabajo: CampoDef<CentroTrabajo>[] = [
    { key: "codigo", label: "Código", requerido: true },
    { key: "nombre", label: "Centro de trabajo", requerido: true },
    { key: "ciudad", label: "Ciudad", requerido: true },
    { key: "direccion", label: "Dirección" },
    { key: "riesgoArl", label: "Riesgo ARL", tipo: "select", opciones: RIESGOS, requerido: true },
  ];

  const camposCentroCosto: CampoDef<CentroCostoOrg>[] = [
    { key: "codigo", label: "Código", requerido: true },
    { key: "nombre", label: "Centro de costo", requerido: true },
    {
      key: "areaId",
      label: "Área imputable",
      tipo: "select",
      opciones: opcAreas,
      requerido: true,
      render: (r) => nombreArea(r.areaId),
    },
    {
      key: "presupuestoAnual",
      label: "Presupuesto anual",
      tipo: "numero",
      render: (r) => (
        <span className="tabular-nums">{formatCOP(Number(r.presupuestoAnual ?? 0))}</span>
      ),
    },
  ];

  const camposCargo: CampoDef<CargoOrg>[] = [
    { key: "codigo", label: "Código", requerido: true },
    { key: "nombre", label: "Cargo", requerido: true },
    {
      key: "areaId",
      label: "Área",
      tipo: "select",
      opciones: opcAreas,
      requerido: true,
      render: (r) => nombreArea(r.areaId),
    },
    {
      key: "nivelId",
      label: "Nivel jerárquico",
      tipo: "select",
      opciones: opcNiveles,
      requerido: true,
      render: (r) => {
        const n = niveles.find((x) => x.id === r.nivelId);
        return n ? `${n.nivel} · ${n.nombre}` : "—";
      },
    },
    {
      key: "salarioBase",
      label: "Salario base",
      tipo: "numero",
      render: (r) => <span className="tabular-nums">{formatCOP(Number(r.salarioBase ?? 0))}</span>,
    },
  ];

  const stats = useMemo(
    () => [
      {
        label: "Áreas",
        value: String(areas.filter((a) => a.estado === "activo").length),
        icon: Building2,
        hint: "activas",
      },
      {
        label: "Dependencias",
        value: String(dependencias.filter((d) => d.estado === "activo").length),
        icon: Network,
        hint: "activas",
      },
      {
        label: "Cargos",
        value: String(cargos.filter((c) => c.estado === "activo").length),
        icon: BriefcaseBusiness,
        hint: "definidos",
      },
      {
        label: "Centros de trabajo",
        value: String(centrosTrabajo.filter((c) => c.estado === "activo").length),
        icon: MapPinned,
        hint: "operativos",
      },
    ],
    [areas, dependencias, cargos, centrosTrabajo],
  );

  return (
    <AppShell>
      <PageHeader
        breadcrumb={["Organización", "Estructura organizacional"]}
        title="Estructura organizacional"
        description="Áreas, dependencias, centros de trabajo, centros de costo, cargos y niveles jerárquicos. Toda modificación se refleja automáticamente en el organigrama."
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
          <CrudMaestro<AreaOrg>
            titulo="Áreas organizacionales"
            descripcion="Direcciones y áreas dependientes."
            prefijoId="area"
            campos={camposArea}
            items={areas}
            setItems={setAreas}
            valoresIniciales={{ codigo: "", nombre: "", direccionId: "", responsableId: "" }}
            puedeEditar={puedeEditar}
            filtro={query}
          />
        </TabsContent>
        <TabsContent value="dependencias" className="mt-4">
          <CrudMaestro<Dependencia>
            titulo="Dependencias"
            prefijoId="dep"
            campos={camposDependencia}
            items={dependencias}
            setItems={setDependencias}
            valoresIniciales={{ codigo: "", nombre: "", areaId: "", responsableId: "" }}
            puedeEditar={puedeEditar}
            filtro={query}
          />
        </TabsContent>
        <TabsContent value="centros-trabajo" className="mt-4">
          <CrudMaestro<CentroTrabajo>
            titulo="Centros de trabajo"
            prefijoId="ct"
            campos={camposCentroTrabajo}
            items={centrosTrabajo}
            setItems={setCentrosTrabajo}
            valoresIniciales={{
              codigo: "",
              nombre: "",
              ciudad: "",
              direccion: "",
              riesgoArl: "I" as CentroTrabajo["riesgoArl"],
            }}
            puedeEditar={puedeEditar}
            filtro={query}
          />
        </TabsContent>
        <TabsContent value="centros-costo" className="mt-4">
          <CrudMaestro<CentroCostoOrg>
            titulo="Centros de costo"
            prefijoId="cc"
            campos={camposCentroCosto}
            items={centrosCosto}
            setItems={setCentrosCosto}
            valoresIniciales={{ codigo: "", nombre: "", areaId: "", presupuestoAnual: 0 }}
            puedeEditar={puedeEditar}
            filtro={query}
          />
        </TabsContent>
        <TabsContent value="cargos" className="mt-4">
          <CrudMaestro<CargoOrg>
            titulo="Cargos"
            prefijoId="cargo"
            campos={camposCargo}
            items={cargos}
            setItems={setCargos}
            valoresIniciales={{ codigo: "", nombre: "", areaId: "", nivelId: "", salarioBase: 0 }}
            puedeEditar={puedeEditar}
            filtro={query}
          />
        </TabsContent>
        <TabsContent value="niveles" className="mt-4">
          <CrudMaestro<NivelJerarquico>
            titulo="Niveles jerárquicos"
            descripcion="Definen el orden del organigrama."
            prefijoId="niv"
            campos={camposNivel}
            items={niveles}
            setItems={setNiveles}
            valoresIniciales={{ nivel: 1, nombre: "", descripcion: "" }}
            puedeEditar={puedeEditar}
            filtro={query}
          />
        </TabsContent>
      </Tabs>

      <div className="surface-panel flex items-start gap-3 p-4 text-sm text-muted-foreground">
        <Layers className="mt-0.5 size-4 shrink-0 text-primary" />
        <p>
          Ningún registro se elimina físicamente: se inactiva o archiva conservando su trazabilidad.
          Los cambios de cargo, área o jefe inmediato regeneran el organigrama automáticamente.
          {!puedeEditar && " Su rol actual solo permite consultar."}
        </p>
      </div>
    </AppShell>
  );
}
