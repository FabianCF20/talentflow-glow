import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Layers } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/common/PageHeader";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CrudMaestro, type CampoDef } from "@/components/maestros/CrudMaestro";
import {
  useAreas,
  useCargos,
  useCentrosCosto,
  useCentrosTrabajo,
  useDependencias,
  useNiveles,
} from "@/lib/maestros";
import { useAuth } from "@/lib/auth";
import type {
  AreaOrg,
  CargoOrg,
  CentroCostoOrg,
  CentroTrabajo,
  Dependencia,
  NivelJerarquico,
} from "@/types/organizacion";

export const Route = createFileRoute("/maestros")({
  head: () => ({
    meta: [
      { title: "Datos maestros | SIGTH" },
      {
        name: "description",
        content: "Entidades maestras: niveles, áreas, dependencias, centros de trabajo, centros de costo y cargos.",
      },
      { property: "og:title", content: "Datos maestros | SIGTH" },
      {
        property: "og:description",
        content: "Administración de entidades maestras del sistema de talento humano.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Maestros,
});

const RIESGOS = ["I", "II", "III", "IV", "V"].map((v) => ({ value: v, label: `Clase ${v}` }));

function Maestros() {
  const { perfil } = useAuth();
  const puedeEditar = (perfil?.roles ?? []).some((r) =>
    ["administrador", "talento_humano"].includes(r),
  );

  const [query, setQuery] = useState("");
  const [niveles, setNiveles] = useNiveles();
  const [areas, setAreas] = useAreas();
  const [dependencias, setDependencias] = useDependencias();
  const [centrosTrabajo, setCentrosTrabajo] = useCentrosTrabajo();
  const [centrosCosto, setCentrosCosto] = useCentrosCosto();
  const [cargos, setCargos] = useCargos();

  const opcAreas = areas.map((a) => ({ value: a.id, label: `${a.codigo} · ${a.nombre}` }));
  const opcNiveles = niveles.map((n) => ({ value: n.id, label: `${n.nivel} · ${n.nombre}` }));

  const camposNivel: CampoDef<NivelJerarquico>[] = [
    { key: "nivel", label: "Número de nivel", tipo: "numero", requerido: true },
    { key: "nombre", label: "Denominación", requerido: true, placeholder: "Dirección, Jefatura…" },
    { key: "descripcion", label: "Descripción" },
  ];

  const camposArea: CampoDef<AreaOrg>[] = [
    { key: "codigo", label: "Código", requerido: true, placeholder: "ADM-01" },
    { key: "nombre", label: "Área", requerido: true },
    { key: "direccionId", label: "Depende de", tipo: "select", opciones: opcAreas },
  ];

  const camposDependencia: CampoDef<Dependencia>[] = [
    { key: "codigo", label: "Código", requerido: true },
    { key: "nombre", label: "Dependencia", requerido: true },
    { key: "areaId", label: "Área", tipo: "select", opciones: opcAreas, requerido: true },
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
    { key: "areaId", label: "Área imputable", tipo: "select", opciones: opcAreas, requerido: true },
    { key: "presupuestoAnual", label: "Presupuesto anual", tipo: "numero" },
  ];

  const camposCargo: CampoDef<CargoOrg>[] = [
    { key: "codigo", label: "Código", requerido: true },
    { key: "nombre", label: "Cargo", requerido: true },
    { key: "areaId", label: "Área", tipo: "select", opciones: opcAreas, requerido: true },
    { key: "nivelId", label: "Nivel jerárquico", tipo: "select", opciones: opcNiveles, requerido: true },
    { key: "salarioBase", label: "Salario base", tipo: "numero" },
  ];

  return (
    <AppShell>
      <PageHeader
        breadcrumb={["Administración", "Datos maestros"]}
        title="Datos maestros"
        description="Entidades base sobre las que operan todos los módulos. Ningún registro se elimina: se inactiva o archiva."
      />

      <Tabs defaultValue="niveles">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <TabsList className="flex-wrap">
            <TabsTrigger value="niveles">Niveles</TabsTrigger>
            <TabsTrigger value="areas">Áreas</TabsTrigger>
            <TabsTrigger value="dependencias">Dependencias</TabsTrigger>
            <TabsTrigger value="centros-trabajo">Centros de trabajo</TabsTrigger>
            <TabsTrigger value="centros-costo">Centros de costo</TabsTrigger>
            <TabsTrigger value="cargos">Cargos</TabsTrigger>
          </TabsList>
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar…"
            className="lg:max-w-xs"
          />
        </div>

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
        <TabsContent value="areas" className="mt-4">
          <CrudMaestro<AreaOrg>
            titulo="Áreas organizacionales"
            prefijoId="area"
            campos={camposArea}
            items={areas}
            setItems={setAreas}
            valoresIniciales={{ codigo: "", nombre: "", direccionId: "" }}
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
            valoresIniciales={{ codigo: "", nombre: "", areaId: "" }}
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
      </Tabs>

      <div className="surface-panel flex items-start gap-3 p-4 text-sm text-muted-foreground">
        <Layers className="mt-0.5 size-4 shrink-0 text-primary" />
        <p>
          Cree primero los niveles jerárquicos y las áreas: el resto de entidades (dependencias,
          centros de costo y cargos) dependen de ellas, y los empleados se crean sobre estos datos.
          {!puedeEditar && " Su rol actual solo permite consultar."}
        </p>
      </div>
    </AppShell>
  );
}
