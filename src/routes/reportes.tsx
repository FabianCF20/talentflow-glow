import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { BarChart3, FileDown, FileText, Users, Wallet, HardHat } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { DataTable } from "@/components/common/DataTable";
import { BarrasChart, LineaChart, DonaChart } from "@/components/common/Charts";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { useRrhh } from "@/store/rrhh";
import { useOperaciones } from "@/store/operaciones";
import { useSst } from "@/store/sst";
import { useNomina } from "@/store/nomina";
import {
  accidentalidadMensual,
  antiguedadDistribucion,
  ausentismo,
  capacitacionesResumen,
  costosLaborales,
  costosPorArea,
  costosPorCentroCosto,
  horasExtrasReporte,
  indicadoresGlobales,
  prestacionesPorEmpleado,
  reporteVacaciones,
  rotacionMensual,
  type FiltroReportes,
} from "@/lib/reportes";
import { downloadExcel, type HojaExcel } from "@/lib/excel";
import { descargarReportePdf } from "@/lib/desprendible";
import { nombreArea, nombreCentroCosto } from "@/lib/rrhh";
import { AREAS, CENTROS_COSTO } from "@/data/organizacion";
import { formatCOP } from "@/types/organizacion";
import { ESTADOS_VINCULADOS, nombreEmpleado } from "@/types/rrhh";
import { TIPO_HORA_EXTRA_LABEL } from "@/types/operaciones";
import { GRAVEDAD_LABEL, TIPO_EVENTO_SST_LABEL } from "@/types/sst";

export const Route = createFileRoute("/reportes")({
  head: () => ({
    meta: [
      { title: "Dashboards ejecutivos y reportes | SIGTH" },
      {
        name: "description",
        content:
          "Reportes de rotación, antigüedad, ausentismo, vacaciones, costos laborales, prestaciones, horas extras, SST y costos por área con exportación a Excel y PDF.",
      },
      { property: "og:title", content: "Dashboards ejecutivos y reportes | SIGTH" },
      {
        property: "og:description",
        content:
          "Indicadores globales y reportes gerenciales de talento humano, nómina y SST con filtros avanzados y exportación.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ReportesPage,
});

function ReportesPage() {
  const { empleados } = useRrhh();
  const { solicitudes, incapacidades, asistencia, horasExtras } = useOperaciones();
  const { accidentes, capacitaciones } = useSst();
  const { periodos, vacacionesPendientes } = useNomina();

  const anios = useMemo(
    () => Array.from(new Set(periodos.map((p) => p.anio))).sort((a, b) => b - a),
    [periodos],
  );
  const [filtro, setFiltro] = useState<FiltroReportes>({
    anio: anios[0] ?? new Date().getFullYear(),
    areaId: "todas",
    centroCostoId: "todos",
  });

  const filtrados = useMemo(
    () =>
      empleados.filter(
        (e) =>
          (filtro.areaId === "todas" || e.laboral.areaId === filtro.areaId) &&
          (filtro.centroCostoId === "todos" || e.laboral.centroCostoId === filtro.centroCostoId),
      ),
    [empleados, filtro],
  );
  const activos = filtrados.filter((e) => ESTADOS_VINCULADOS.includes(e.estadoLaboral));
  const nombre = (id: string) => {
    const e = empleados.find((x) => x.id === id);
    return e ? nombreEmpleado(e) : id;
  };

  const ind = useMemo(
    () =>
      indicadoresGlobales({
        empleados: filtrados,
        periodos,
        incapacidades,
        asistencia,
        accidentes,
        capacitaciones,
        anio: filtro.anio,
      }),
    [filtrados, periodos, incapacidades, asistencia, accidentes, capacitaciones, filtro.anio],
  );

  const rotacion = rotacionMensual(filtrados, filtro.anio);
  const antiguedad = antiguedadDistribucion(filtrados);
  const aus = ausentismo(activos, incapacidades, asistencia);
  const vac = reporteVacaciones(activos, solicitudes, vacacionesPendientes);
  const costos = costosLaborales(periodos, filtro.anio);
  const prest = prestacionesPorEmpleado(periodos, filtro.anio);
  const he = horasExtrasReporte(horasExtras, empleados, filtro.anio);
  const accMes = accidentalidadMensual(accidentes, filtro.anio);
  const cap = capacitacionesResumen(capacitaciones, filtro.anio);
  const ultimoLiquidado = [...periodos].reverse().find((p) => p.detalles.length > 0);
  const porArea = costosPorArea(ultimoLiquidado, filtrados);
  const porCC = costosPorCentroCosto(ultimoLiquidado, filtrados);

  const filtrosTexto = [
    `Año ${filtro.anio}`,
    filtro.areaId === "todas" ? "Todas las áreas" : nombreArea(filtro.areaId),
    filtro.centroCostoId === "todos" ? "Todos los centros de costo" : nombreCentroCosto(filtro.centroCostoId),
  ];

  const hojas = (): HojaExcel[] => [
    {
      nombre: "Rotación",
      headers: ["Mes", "Rotación %"],
      rows: rotacion.map((r) => [r.label, r.valor]),
    },
    {
      nombre: "Antigüedad",
      headers: ["Rango", "Empleados"],
      rows: antiguedad.map((r) => [r.label, r.valor]),
    },
    {
      nombre: "Ausentismo",
      headers: ["Empleado", "Días incapacidad", "Ausencias", "Minutos tardanza", "Tasa %"],
      rows: aus.map((a) => [nombre(a.empleadoId), a.diasIncapacidad, a.ausenciasInjustificadas, a.minutosTardanza, a.tasa]),
    },
    {
      nombre: "Vacaciones",
      headers: ["Empleado", "Días tomados", "Días pendientes", "Solicitudes en trámite"],
      rows: vac.map((v) => [nombre(v.empleadoId), v.diasTomados, v.diasPendientes, v.solicitudesPendientes]),
    },
    {
      nombre: "Costos laborales",
      headers: ["Mes", "Devengado", "Prestaciones", "Costo total", "Neto pagado"],
      rows: costos.map((c) => [c.label, c.devengado, c.prestaciones, c.costoTotal, c.neto]),
    },
    {
      nombre: "Prestaciones",
      headers: ["Empleado", "Prima", "Cesantías", "Intereses", "Vacaciones"],
      rows: [...prest.entries()].map(([id, p]) => [nombre(id), p.prima, p.cesantias, p.intereses, p.vacaciones]),
    },
    {
      nombre: "Horas extras",
      headers: ["Consecutivo", "Empleado", "Fecha", "Tipo", "Horas", "Valor"],
      rows: he.map((h) => [h.consecutivo, nombre(h.empleadoId), h.fecha, TIPO_HORA_EXTRA_LABEL[h.tipo], h.horas, h.valor]),
    },
    {
      nombre: "Accidentes",
      headers: ["Consecutivo", "Empleado", "Fecha", "Tipo", "Gravedad", "Días incapacidad"],
      rows: accidentes
        .filter((a) => a.fecha.startsWith(String(filtro.anio)))
        .map((a) => [
          a.consecutivo,
          nombre(a.empleadoId),
          a.fecha,
          TIPO_EVENTO_SST_LABEL[a.tipo],
          GRAVEDAD_LABEL[a.gravedad],
          a.diasIncapacidad,
        ]),
    },
    {
      nombre: "Capacitaciones",
      headers: ["Código", "Tema", "Fecha", "Horas", "Convocados", "Asistieron"],
      rows: cap.detalle.map((c) => [
        c.codigo,
        c.tema,
        c.fecha,
        c.duracionHoras,
        c.asistentes.length,
        c.asistentes.filter((a) => a.asistio).length,
      ]),
    },
    {
      nombre: "Costos por área",
      headers: ["Área", "Empleados", "Devengado", "Prestaciones", "Costo total"],
      rows: porArea.map((a) => [a.nombre, a.empleados, a.devengado, a.prestaciones, a.costoTotal]),
    },
    {
      nombre: "Costos por CC",
      headers: ["Centro de costo", "Empleados", "Devengado", "Prestaciones", "Costo total"],
      rows: porCC.map((a) => [a.nombre, a.empleados, a.devengado, a.prestaciones, a.costoTotal]),
    },
  ];

  const exportarExcel = () => {
    downloadExcel(`reportes-sigth-${filtro.anio}`, hojas());
    toast.success("Reportes exportados a Excel");
  };

  const exportarPdf = () => {
    descargarReportePdf({
      titulo: "Indicadores globales y costos por área",
      subtitulo: `Periodo de referencia ${ultimoLiquidado?.codigo ?? filtro.anio}`,
      filtros: filtrosTexto,
      headers: ["Área", "Emp.", "Devengado", "Prestaciones", "Costo total"],
      rows: porArea.map((a) => [
        a.nombre,
        a.empleados,
        formatCOP(a.devengado),
        formatCOP(a.prestaciones),
        formatCOP(a.costoTotal),
      ]),
      nombreArchivo: `reporte-gerencial-${filtro.anio}`,
    });
    toast.success("Reporte gerencial exportado a PDF");
  };

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader
          title="Dashboards ejecutivos"
          description="Indicadores y reportes consolidados de talento humano, nómina, SST y gerencia con filtros avanzados y exportación."
          breadcrumb={["Administración", "Reportes"]}
          actions={
            <>
              <Button variant="outline" onClick={exportarExcel}>
                <FileDown className="size-4" /> Excel
              </Button>
              <Button variant="outline" onClick={exportarPdf}>
                <FileText className="size-4" /> PDF
              </Button>
            </>
          }
        />

        <div className="surface-panel grid gap-4 p-5 md:grid-cols-3">
          <div className="space-y-1.5">
            <Label>Año</Label>
            <Select value={String(filtro.anio)} onValueChange={(v) => setFiltro({ ...filtro, anio: Number(v) })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {anios.map((a) => (
                  <SelectItem key={a} value={String(a)}>
                    {a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Área</Label>
            <Select value={filtro.areaId} onValueChange={(v) => setFiltro({ ...filtro, areaId: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas las áreas</SelectItem>
                {AREAS.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Centro de costo</Label>
            <Select
              value={filtro.centroCostoId}
              onValueChange={(v) => setFiltro({ ...filtro, centroCostoId: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los centros de costo</SelectItem>
                {CENTROS_COSTO.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.codigo} · {c.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Headcount" value={String(ind.headcount)} hint={`Antigüedad ${ind.antiguedadPromedio} años`} icon={Users} />
          <StatCard label="Rotación anual" value={`${ind.rotacionAnual}%`} hint="Retiros / personal vinculado" icon={BarChart3} />
          <StatCard
            label="Costo nómina mes"
            value={formatCOP(ind.costoNominaMes)}
            hint={`Promedio ${formatCOP(ind.costoPromedioEmpleado)}`}
            icon={Wallet}
          />
          <StatCard
            label="Ausentismo / SST"
            value={`${ind.tasaAusentismo}%`}
            hint={`${ind.accidentesAnio} eventos · cobertura ${ind.coberturaCapacitacion}%`}
            icon={HardHat}
          />
        </div>

        <Tabs defaultValue="rrhh" className="space-y-4">
          <TabsList className="flex-wrap">
            <TabsTrigger value="rrhh">RRHH</TabsTrigger>
            <TabsTrigger value="nomina">Nómina</TabsTrigger>
            <TabsTrigger value="sst">SST</TabsTrigger>
            <TabsTrigger value="gerencia">Gerencia</TabsTrigger>
          </TabsList>

          <TabsContent value="rrhh" className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="surface-panel p-5">
                <h3 className="text-sm font-semibold text-foreground">Rotación mensual (%)</h3>
                <LineaChart datos={rotacion} formato={(v) => `${v}%`} />
              </div>
              <div className="surface-panel p-5">
                <h3 className="text-sm font-semibold text-foreground">Distribución por antigüedad</h3>
                <BarrasChart datos={antiguedad} />
              </div>
            </div>
            <div className="surface-panel p-5">
              <h3 className="text-sm font-semibold text-foreground">Ausentismo</h3>
            </div>
            <DataTable
              rows={aus.map((a) => ({ ...a, id: a.empleadoId }))}
              columns={[
                { key: "emp", header: "Empleado", render: (r) => nombre(r.empleadoId) },
                { key: "inc", header: "Días incapacidad", render: (r) => r.diasIncapacidad },
                { key: "ausen", header: "Ausencias", render: (r) => r.ausenciasInjustificadas },
                { key: "tar", header: "Minutos tardanza", render: (r) => r.minutosTardanza },
                { key: "tasa", header: "Tasa", render: (r) => `${r.tasa}%` },
              ]}
            />
            <DataTable
              rows={vac.map((v) => ({ ...v, id: v.empleadoId }))}
              columns={[
                { key: "emp", header: "Empleado", render: (r) => nombre(r.empleadoId) },
                { key: "tom", header: "Días tomados", render: (r) => r.diasTomados },
                { key: "pend", header: "Días pendientes", render: (r) => r.diasPendientes },
                { key: "sol", header: "Solicitudes en trámite", render: (r) => r.solicitudesPendientes },
              ]}
            />
          </TabsContent>

          <TabsContent value="nomina" className="space-y-4">
            <div className="surface-panel p-5">
              <h3 className="text-sm font-semibold text-foreground">Costos laborales por mes</h3>
              <BarrasChart
                datos={costos.map((c) => ({ label: c.label, valor: c.costoTotal }))}
                formato={(v) => `${Math.round(v / 1_000_000)}M`}
              />
            </div>
            <DataTable
              rows={costos.map((c) => ({ ...c, id: c.label }))}
              columns={[
                { key: "mes", header: "Mes", render: (r) => r.label },
                { key: "dev", header: "Devengado", render: (r) => formatCOP(r.devengado) },
                { key: "pres", header: "Prestaciones", render: (r) => formatCOP(r.prestaciones) },
                { key: "neto", header: "Neto pagado", render: (r) => formatCOP(r.neto) },
                { key: "tot", header: "Costo total", render: (r) => formatCOP(r.costoTotal) },
              ]}
            />
            <DataTable
              rows={[...prest.entries()].map(([id, p]) => ({ id, ...p }))}
              columns={[
                { key: "emp", header: "Empleado", render: (r) => nombre(r.id) },
                { key: "prima", header: "Prima", render: (r) => formatCOP(r.prima) },
                { key: "ces", header: "Cesantías", render: (r) => formatCOP(r.cesantias) },
                { key: "int", header: "Intereses", render: (r) => formatCOP(r.intereses) },
                { key: "vac", header: "Vacaciones", render: (r) => formatCOP(r.vacaciones) },
              ]}
            />
            <DataTable
              rows={he}
              emptyMessage="Sin horas extras registradas en el año."
              columns={[
                { key: "cons", header: "Consecutivo", render: (r) => r.consecutivo },
                { key: "emp", header: "Empleado", render: (r) => nombre(r.empleadoId) },
                { key: "fecha", header: "Fecha", render: (r) => r.fecha },
                { key: "tipo", header: "Tipo", render: (r) => TIPO_HORA_EXTRA_LABEL[r.tipo] },
                { key: "horas", header: "Horas", render: (r) => r.horas },
                { key: "valor", header: "Valor", render: (r) => formatCOP(r.valor) },
              ]}
            />
          </TabsContent>

          <TabsContent value="sst" className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="surface-panel p-5">
                <h3 className="text-sm font-semibold text-foreground">Accidentalidad mensual</h3>
                <BarrasChart datos={accMes} />
              </div>
              <div className="surface-panel p-5">
                <h3 className="text-sm font-semibold text-foreground">Cobertura de capacitación</h3>
                <DonaChart
                  datos={[
                    { label: "Asistieron", valor: cap.asistieron, clase: "stroke-success" },
                    { label: "No asistieron", valor: cap.convocados - cap.asistieron, clase: "stroke-destructive" },
                  ]}
                />
                <p className="mt-3 text-xs text-muted-foreground">
                  {cap.sesiones} sesiones · {cap.horas} horas · calificación promedio {cap.promedio}
                </p>
              </div>
            </div>
            <DataTable
              rows={accidentes.filter((a) => a.fecha.startsWith(String(filtro.anio)))}
              emptyMessage="Sin eventos registrados en el año."
              columns={[
                { key: "cons", header: "Consecutivo", render: (a) => a.consecutivo },
                { key: "emp", header: "Empleado", render: (a) => nombre(a.empleadoId) },
                { key: "fecha", header: "Fecha", render: (a) => a.fecha },
                { key: "tipo", header: "Tipo", render: (a) => TIPO_EVENTO_SST_LABEL[a.tipo] },
                { key: "grav", header: "Gravedad", render: (a) => GRAVEDAD_LABEL[a.gravedad] },
                { key: "dias", header: "Días incapacidad", render: (a) => a.diasIncapacidad },
              ]}
            />
          </TabsContent>

          <TabsContent value="gerencia" className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="surface-panel p-5">
                <h3 className="text-sm font-semibold text-foreground">Costo por área</h3>
                <BarrasChart
                  datos={porArea.map((a) => ({ label: a.nombre.slice(0, 8), valor: a.costoTotal }))}
                  formato={(v) => `${Math.round(v / 1_000_000)}M`}
                />
              </div>
              <div className="surface-panel p-5">
                <h3 className="text-sm font-semibold text-foreground">Costo por centro de costo</h3>
                <BarrasChart
                  datos={porCC.map((a) => ({ label: a.nombre.slice(0, 8), valor: a.costoTotal }))}
                  formato={(v) => `${Math.round(v / 1_000_000)}M`}
                />
              </div>
            </div>
            <DataTable
              rows={porArea}
              columns={[
                { key: "area", header: "Área", render: (r) => r.nombre },
                { key: "emp", header: "Empleados", render: (r) => r.empleados },
                { key: "dev", header: "Devengado", render: (r) => formatCOP(r.devengado) },
                { key: "pres", header: "Prestaciones", render: (r) => formatCOP(r.prestaciones) },
                { key: "tot", header: "Costo total", render: (r) => formatCOP(r.costoTotal) },
              ]}
            />
            <DataTable
              rows={porCC}
              columns={[
                { key: "cc", header: "Centro de costo", render: (r) => r.nombre },
                { key: "emp", header: "Empleados", render: (r) => r.empleados },
                { key: "dev", header: "Devengado", render: (r) => formatCOP(r.devengado) },
                { key: "pres", header: "Prestaciones", render: (r) => formatCOP(r.prestaciones) },
                { key: "tot", header: "Costo total", render: (r) => formatCOP(r.costoTotal) },
              ]}
            />
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}
