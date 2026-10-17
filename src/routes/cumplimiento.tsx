/**
 * Pantalla: Alertas de vencimiento, documentos firmados y bitácora de acceso a datos personales.
 * Ruta: /cumplimiento
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AlertTriangle, CalendarClock, Eye, FileCheck2, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { DataTable, type Column } from "@/components/common/DataTable";
import { EmptyState } from "@/components/common/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  TIPO_ALERTA_LABEL,
  useAlertasCumplimiento,
  type AlertaCumplimiento,
  type NivelAlerta,
} from "@/lib/alertas";
import { selloLegible, useDocumentosFirmados, verificarDocumento } from "@/lib/firma-digital";
import { FINALIDAD_LABEL, useAccesosDatos, type AccesoDatos } from "@/lib/habeas-data";
import { useAuth } from "@/lib/auth";
import { gestionaDocumentacion } from "@/lib/acceso-documental";
import { RegistrosFirma } from "@/components/portal/RegistrosFirma";

export const Route = createFileRoute("/cumplimiento")({
  head: () => ({
    meta: [
      { title: "Cumplimiento normativo | SIGTH" },
      {
        name: "description",
        content:
          "Alertas de vencimientos, documentos firmados electrónicamente y trazabilidad de acceso a datos personales según la Ley 1581 de 2012.",
      },
      { property: "og:title", content: "Cumplimiento normativo | SIGTH" },
      {
        property: "og:description",
        content:
          "Vencimientos de contratos y exámenes, firma electrónica de documentos y bitácora de habeas data.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CumplimientoPage,
});

const NIVEL_ESTILO: Record<NivelAlerta, string> = {
  vencido: "border-destructive/40 bg-destructive/10 text-destructive",
  por_vencer: "border-warning/40 bg-warning/10 text-warning-foreground",
  informativo: "border-border bg-muted text-muted-foreground",
};

const NIVEL_LABEL: Record<NivelAlerta, string> = {
  vencido: "Vencido",
  por_vencer: "Por vencer",
  informativo: "Informativo",
};

function CumplimientoPage() {
  const { perfil } = useAuth();
  const verBitacora = gestionaDocumentacion(perfil?.roles ?? []);
  const alertas = useAlertasCumplimiento();
  const firmas = useDocumentosFirmados();
  const accesos = useAccesosDatos();

  const [buscaAlerta, setBuscaAlerta] = useState("");
  const [buscaAcceso, setBuscaAcceso] = useState("");
  const [codigo, setCodigo] = useState("");
  const [verificando, setVerificando] = useState(false);

  const vencidas = alertas.filter((a) => a.nivel === "vencido").length;
  const porVencer = alertas.filter((a) => a.nivel === "por_vencer").length;

  const alertasFiltradas = useMemo(() => {
    const q = buscaAlerta.trim().toLowerCase();
    if (!q) return alertas;
    return alertas.filter((a) =>
      `${a.titulo} ${a.detalle} ${a.empleadoNombre} ${TIPO_ALERTA_LABEL[a.tipo]}`
        .toLowerCase()
        .includes(q),
    );
  }, [alertas, buscaAlerta]);

  const accesosFiltrados = useMemo(() => {
    const q = buscaAcceso.trim().toLowerCase();
    if (!q) return accesos;
    return accesos.filter((a) =>
      `${a.usuario} ${a.empleadoNombre} ${a.modulo} ${FINALIDAD_LABEL[a.finalidad]}`
        .toLowerCase()
        .includes(q),
    );
  }, [accesos, buscaAcceso]);

  const verificar = async () => {
    const limpio = codigo.trim();
    if (!limpio) {
      toast.error("Escribe el código único del documento.");
      return;
    }
    setVerificando(true);
    try {
      const registro = await verificarDocumento(limpio);
      if (!registro) {
        toast.error(`No existe un documento firmado con el código ${limpio}.`);
        return;
      }
      toast.success(
        `${registro.descripcion} · ${registro.empleadoNombre} · emitido ${registro.emitidoEn.slice(0, 10)}`,
        { description: `Huella ${selloLegible(registro.hash)}` },
      );
    } catch {
      toast.error("No fue posible consultar el documento; compruebe su acceso y conexión.");
    } finally {
      setVerificando(false);
    }
  };

  const colAlertas: Column<AlertaCumplimiento>[] = [
    {
      key: "gestionar", header: "Gestionar", render: (r) => {
        if (r.ruta === "/documentos") return <Link to="/documentos" className="text-primary hover:underline">Ver documento</Link>;
        if (r.ruta === "/sst") return <Link to="/sst" className="text-primary hover:underline">Ver examen</Link>;
        if (r.ruta === "/dotacion") return <Link to="/dotacion" className="text-primary hover:underline">Ver entrega</Link>;
        if (r.ruta === "/ausencias") return <Link to="/ausencias" className="text-primary hover:underline">Ver solicitud</Link>;
        return <Link to="/empleados/$id" params={{ id: r.empleadoId }} className="text-primary hover:underline">Ver ficha</Link>;
      },
    },
    {
      key: "nivel",
      header: "Estado",
      render: (r) => (
        <Badge variant="outline" className={NIVEL_ESTILO[r.nivel]}>
          {NIVEL_LABEL[r.nivel]}
        </Badge>
      ),
    },
    { key: "tipo", header: "Tipo", render: (r) => TIPO_ALERTA_LABEL[r.tipo] },
    {
      key: "titulo",
      header: "Alerta",
      render: (r) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground">{r.titulo}</p>
          <p className="truncate text-xs text-muted-foreground">{r.detalle}</p>
        </div>
      ),
    },
    {
      key: "empleado",
      header: "Empleado",
      render: (r) =>
        r.empleadoId && verBitacora ? (
          <Link to="/empleados/$id" params={{ id: r.empleadoId }} className="text-primary hover:underline">
            {r.empleadoNombre}
          </Link>
        ) : (
          r.empleadoNombre || "—"
        ),
    },
    { key: "fecha", header: "Fecha", render: (r) => r.fecha },
    {
      key: "dias",
      header: "Días",
      render: (r) =>
        r.dias === null ? "—" : r.dias < 0 ? `${Math.abs(r.dias)} vencidos` : `${r.dias} restantes`,
    },
  ];

  const colAccesos: Column<AccesoDatos>[] = [
    { key: "fecha", header: "Fecha", render: (r) => `${r.fecha} ${r.hora}` },
    { key: "usuario", header: "Usuario", render: (r) => r.usuario },
    { key: "titular", header: "Titular consultado", render: (r) => r.empleadoNombre },
    { key: "finalidad", header: "Finalidad", render: (r) => FINALIDAD_LABEL[r.finalidad] },
    { key: "modulo", header: "Módulo", render: (r) => r.modulo },
    { key: "detalle", header: "Detalle", render: (r) => r.detalle ?? "—" },
  ];

  return (
    <AppShell>
      <PageHeader
        breadcrumb={["Administración", "Cumplimiento"]}
        title="Cumplimiento normativo"
        description="Alertas de vencimientos, registro de documentos firmados electrónicamente y trazabilidad de acceso a datos personales (Ley 1581 de 2012 y Ley 527 de 1999)."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Vencidos" value={String(vencidas)} icon={AlertTriangle} hint="Requieren acción inmediata" />
        <StatCard label="Por vencer" value={String(porVencer)} icon={CalendarClock} hint="Dentro del umbral de alerta" />
        <StatCard label="Documentos firmados" value={String(firmas.length)} icon={FileCheck2} hint="Con huella SHA-256" />
        {verBitacora && <StatCard label="Accesos registrados" value={String(accesos.length)} icon={Eye} hint="Bitácora de habeas data" />}
      </div>

      <Tabs defaultValue="alertas" className="gap-4">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="alertas">Alertas de vencimiento</TabsTrigger>
          <TabsTrigger value="firmas">Documentos firmados</TabsTrigger>
          {verBitacora && <TabsTrigger value="accesos">Acceso a datos personales</TabsTrigger>}
        </TabsList>

        <TabsContent value="alertas" className="space-y-4">
          <Input
            placeholder="Buscar por empleado, tipo o detalle…"
            className="max-w-sm"
            value={buscaAlerta}
            onChange={(e) => setBuscaAlerta(e.target.value)}
          />
          {alertas.length === 0 ? (
            <EmptyState
              icon={ShieldCheck}
              title="Sin alertas pendientes"
              description="No hay contratos, exámenes ocupacionales, documentos ni licencias próximos a vencer."
            />
          ) : (
            <DataTable columns={colAlertas} rows={alertasFiltradas} emptyMessage="Ninguna alerta coincide con la búsqueda." />
          )}
        </TabsContent>

        <TabsContent value="firmas" className="space-y-4">
          <div className="surface-panel flex flex-col gap-3 p-4 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1 space-y-1.5">
              <label htmlFor="codigo-verificar" className="text-sm font-medium text-foreground">
                Verificar un documento por su código único
              </label>
              <Input
                id="codigo-verificar"
                placeholder="CERT-2026-000123"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
              />
            </div>
            <Button onClick={() => void verificar()} disabled={verificando} className="shrink-0">
              <ShieldCheck className="size-4" /> {verificando ? "Verificando…" : "Verificar"}
            </Button>
          </div>
          <Link to="/documentos" className="inline-block text-sm text-primary hover:underline">Ver en Gestión documental</Link>
          <RegistrosFirma firmas={firmas} />
        </TabsContent>

        {verBitacora && <TabsContent value="accesos" className="space-y-4">
          <Input
            placeholder="Buscar por usuario, titular o finalidad…"
            className="max-w-sm"
            value={buscaAcceso}
            onChange={(e) => setBuscaAcceso(e.target.value)}
          />
          <DataTable
            columns={colAccesos}
            rows={accesosFiltrados}
            emptyMessage="No hay consultas registradas sobre datos personales."
          />
        </TabsContent>}
      </Tabs>
    </AppShell>
  );
}
