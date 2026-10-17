/**
 * Pantalla: Gestión documental del expediente con versiones y vigencias.
 * Ruta: /documentos
 */
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AlertTriangle, FileStack, FolderOpen, Upload } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { EmptyState } from "@/components/common/EmptyState";
import { DocumentoCard } from "@/components/portal/DocumentoCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RegistrosFirma } from "@/components/portal/RegistrosFirma";
import { useDocumentosFirmados } from "@/lib/firma-digital";
import { useAuth } from "@/lib/auth";
import { categoriasGestionables } from "@/lib/acceso-documental";
import { can } from "@/config/roles";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useRrhh } from "@/store/rrhh";
import { usePortal } from "@/store/portal";
import { estadoVigencia } from "@/lib/documentos";
import { downloadCsv } from "@/lib/export";
import {
  CATEGORIAS_DOC,
  CATEGORIA_DOC_LABEL,
  VIGENCIA_LABEL,
  type CategoriaDocumento,
} from "@/types/portal";
import { nombreEmpleado } from "@/types/rrhh";

export const Route = createFileRoute("/documentos")({
  head: () => ({
    meta: [
      { title: "Gestión documental | SIGTH" },
      {
        name: "description",
        content:
          "Expediente documental por categorías con carga, descarga, versionamiento, historial y control de vencimientos.",
      },
      { property: "og:title", content: "Gestión documental | SIGTH" },
      {
        property: "og:description",
        content:
          "Documentos personales, académicos, contractuales, SST, disciplinarios e incapacidades con trazabilidad completa.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: GestionDocumentalPage,
});

function GestionDocumentalPage() {
  const { empleados } = useRrhh();
  const { perfil } = useAuth();
  const roles = perfil?.roles ?? [];
  const { documentos, cargarDocumento, nuevaVersion } = usePortal();
  const categoriasPermitidas = categoriasGestionables(roles);
  const puedeCargar = can(roles, "documentacion", "crear");
  const puedeEditar = can(roles, "documentacion", "editar");
  const firmas = useDocumentosFirmados();
  const [buscaFirma, setBuscaFirma] = useState("");
  const firmasFiltradas = firmas.filter((f) => `${f.codigo} ${f.descripcion} ${f.empleadoNombre}`.toLowerCase().includes(buscaFirma.trim().toLowerCase()));

  const [q, setQ] = useState("");
  const [categoria, setCategoria] = useState<CategoriaDocumento | "todas">("todas");
  const [empleadoId, setEmpleadoId] = useState<string>("todos");
  const [vigencia, setVigencia] = useState<"todas" | "por_vencer" | "vencido">("todas");

  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevaCategoria, setNuevaCategoria] = useState<CategoriaDocumento>(categoriasPermitidas[0] ?? "sst");
  const [nuevoEmpleado, setNuevoEmpleado] = useState(empleados[0]?.id ?? "");
  const [nuevoVence, setNuevoVence] = useState("");

  const nombrePor = useMemo(
    () => Object.fromEntries(empleados.map((e) => [e.id, nombreEmpleado(e)])),
    [empleados],
  );

  const filtrados = useMemo(
    () =>
      documentos.filter((d) => {
        if (categoria !== "todas" && d.categoria !== categoria) return false;
        if (empleadoId !== "todos" && d.empleadoId !== empleadoId) return false;
        if (vigencia !== "todas" && estadoVigencia(d) !== vigencia) return false;
        const t = q.trim().toLowerCase();
        if (!t) return true;
        return (
          d.nombre.toLowerCase().includes(t) ||
          (nombrePor[d.empleadoId] ?? "").toLowerCase().includes(t)
        );
      }),
    [documentos, categoria, empleadoId, vigencia, q, nombrePor],
  );

  const porVencer = documentos.filter((d) => estadoVigencia(d) === "por_vencer").length;
  const vencidos = documentos.filter((d) => estadoVigencia(d) === "vencido").length;
  const versiones = documentos.reduce((a, d) => a + d.versiones.length, 0);

  const exportar = () =>
    downloadCsv(
      "documentos-expediente.csv",
      ["Empleado", "Documento", "Categoría", "Versiones", "Última carga", "Vencimiento", "Vigencia"],
      filtrados.map((d) => {
         const ult = d.versiones?.[d.versiones.length - 1];
        return [
          nombrePor[d.empleadoId] ?? d.empleadoId,
          d.nombre,
          CATEGORIA_DOC_LABEL[d.categoria],
          d.versiones.length,
           ult ? `v${ult.version} · ${ult.fecha}` : "Sin versiones",
          d.fechaVencimiento ?? "No aplica",
          VIGENCIA_LABEL[estadoVigencia(d)],
        ];
      }),
    );

  const subir = () => {
    if (!puedeCargar || !categoriasPermitidas.includes(nuevaCategoria)) {
      toast.error("Su rol no puede cargar documentos de esta categoría.");
      return;
    }
    const nombre = nuevoNombre.trim();
    if (nombre.length < 4 || nombre.length > 120) {
      toast.error("El nombre del documento debe tener entre 4 y 120 caracteres.");
      return;
    }
    if (!nuevoEmpleado) {
      toast.error("Selecciona el empleado del expediente.");
      return;
    }
    cargarDocumento({
      empleadoId: nuevoEmpleado,
      categoria: nuevaCategoria,
      nombre,
      nombreArchivo: `${nombre.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-v1.pdf`,
      tamanoKb: 320,
      subidoPor: "Talento Humano",
      fechaVencimiento: nuevoVence || undefined,
      nota: "Carga desde gestión documental",
    });
    setNuevoNombre("");
    setNuevoVence("");
    toast.success("Documento cargado en el expediente.");
  };

  return (
    <AppShell>
      <PageHeader
        breadcrumb={["Talento Humano", "Gestión documental"]}
        title="Gestión documental"
        description="Expediente digital por categorías con carga, descarga, versionamiento, historial y control de vencimientos. Ningún archivo se elimina físicamente."
        actions={
          can(roles, "documentacion", "exportar") &&
          <Button variant="outline" size="sm" onClick={exportar}>
            <FileStack className="size-4" /> Exportar inventario
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Documentos" value={String(documentos.length)} icon={FolderOpen} hint="En expedientes" />
        <StatCard label="Versiones almacenadas" value={String(versiones)} icon={FileStack} hint="Historial completo" />
        <StatCard
          label="Por vencer"
          value={String(porVencer)}
          icon={AlertTriangle}
          hint="Próximos 60 días"
          trend={{ value: "Alerta", positive: false }}
        />
        <StatCard label="Vencidos" value={String(vencidos)} icon={AlertTriangle} hint="Requieren renovación" />
      </div>

      <Tabs defaultValue="expediente" className="gap-4">
        <TabsList className="max-w-full justify-start overflow-x-auto">
          <TabsTrigger value="expediente">Documentos del expediente</TabsTrigger>
          <TabsTrigger value="firmas">Registros de firma ({firmas.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="firmas" className="space-y-4">
          <Input aria-label="Buscar registros de firma" placeholder="Buscar código, documento o titular…" value={buscaFirma} onChange={(e) => setBuscaFirma(e.target.value)} className="max-w-sm" />
          <RegistrosFirma firmas={firmasFiltradas} />
        </TabsContent>
        <TabsContent value="expediente" className="space-y-4">
      {puedeCargar && (
        <div className="surface-panel p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Cargar documento al expediente
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Input
              value={nuevoNombre}
              maxLength={120}
              placeholder="Nombre del documento"
              onChange={(e) => setNuevoNombre(e.target.value)}
            />
            <Select value={nuevoEmpleado} onValueChange={setNuevoEmpleado}>
              <SelectTrigger><SelectValue placeholder="Empleado" /></SelectTrigger>
              <SelectContent>
                {empleados.map((e) => (
                  <SelectItem key={e.id} value={e.id}>{nombreEmpleado(e)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={nuevaCategoria} onValueChange={(v) => setNuevaCategoria(v as CategoriaDocumento)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                 {categoriasPermitidas.map((c) => (
                  <SelectItem key={c} value={c}>{CATEGORIA_DOC_LABEL[c]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Input type="date" value={nuevoVence} onChange={(e) => setNuevoVence(e.target.value)} />
              <Button size="sm" onClick={subir}>
                <Upload className="size-4" /> Cargar
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="surface-panel grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
        <Input
          value={q}
          placeholder="Buscar documento o empleado…"
          onChange={(e) => setQ(e.target.value)}
        />
        <Select value={categoria} onValueChange={(v) => setCategoria(v as CategoriaDocumento | "todas")}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas las categorías</SelectItem>
             {categoriasPermitidas.map((c) => (
              <SelectItem key={c} value={c}>{CATEGORIA_DOC_LABEL[c]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={empleadoId} onValueChange={setEmpleadoId}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los empleados</SelectItem>
            {empleados.map((e) => (
              <SelectItem key={e.id} value={e.id}>{nombreEmpleado(e)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={vigencia} onValueChange={(v) => setVigencia(v as typeof vigencia)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Cualquier vigencia</SelectItem>
            <SelectItem value="por_vencer">Por vencer</SelectItem>
            <SelectItem value="vencido">Vencidos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtrados.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title="Sin documentos"
          description="No hay documentos que coincidan con los filtros seleccionados."
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {filtrados.map((doc) => (
            <DocumentoCard
              key={doc.id}
              documento={doc}
              empleado={empleados.find((e) => e.id === doc.empleadoId)}
              subtitulo={nombrePor[doc.empleadoId]}
              onNuevaVersion={
                puedeEditar && categoriasPermitidas.includes(doc.categoria)
                  ? (nota, fechaVencimiento) =>
                      nuevaVersion(doc.id, {
                        nombreArchivo: `${doc.nombre.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-v${doc.versiones.length + 1}.pdf`,
                        tamanoKb: 300,
                        subidoPor: "Talento Humano",
                        nota,
                        fechaVencimiento,
                      })
                  : undefined
              }
            />
          ))}
        </div>
      )}
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}
