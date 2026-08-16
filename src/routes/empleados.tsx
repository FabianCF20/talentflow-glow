import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Download, FileSpreadsheet, Filter, UserCheck, UserMinus, Users2 } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable, type Column } from "@/components/common/DataTable";
import { StatCard } from "@/components/common/StatCard";
import { EstadoLaboralBadge } from "@/components/rrhh/EstadoLaboralBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AREAS } from "@/data/organizacion";
import { useRrhh } from "@/store/rrhh";
import {
  antiguedadAnios,
  esVinculado,
  nombreArea,
  nombreCargo,
  nombreCentroCosto,
  nombreCentroTrabajo,
  nombreJefe,
} from "@/lib/rrhh";
import { downloadCsv } from "@/lib/export";
import { ROLES } from "@/config/roles";
import { formatCOP } from "@/types/organizacion";
import { puedeVerSalario } from "@/lib/visibilidad";
import {
  ESTADO_LABORAL_LABEL,
  ESTADOS_VINCULADOS,
  TIPO_CONTRATO_LABEL,
  nombreEmpleado,
  type EmpleadoRRHH,
  type EstadoLaboral,
} from "@/types/rrhh";

export const Route = createFileRoute("/empleados")({
  head: () => ({
    meta: [
      { title: "Gestión de empleados | SIGTH" },
      {
        name: "description",
        content:
          "Expediente laboral completo: datos personales, información laboral, estados, hoja de vida digital, reportes y exportaciones.",
      },
      { property: "og:title", content: "Gestión de empleados | SIGTH" },
      {
        property: "og:description",
        content: "Módulo central de Recursos Humanos con hoja de vida digital y trazabilidad total.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Empleados,
});

function Empleados() {
  const { empleados, eventos, rolActivo, setRolActivo, empleadoActuandoId } = useRrhh();
  const [query, setQuery] = useState("");
  const [areaFiltro, setAreaFiltro] = useState("todas");
  const [estadoFiltro, setEstadoFiltro] = useState<"todos" | EstadoLaboral>("todos");

  const verSalario = (id: string) => puedeVerSalario(empleadoActuandoId, [rolActivo], id);

  const filtrar = (rows: EmpleadoRRHH[]) =>
    rows.filter((e) => {
      const texto = `${nombreEmpleado(e)} ${e.documento} ${nombreCargo(e.laboral.cargoId)}`.toLowerCase();
      const okTexto = texto.includes(query.trim().toLowerCase());
      const okArea = areaFiltro === "todas" || e.laboral.areaId === areaFiltro;
      const okEstado = estadoFiltro === "todos" || e.estadoLaboral === estadoFiltro;
      return okTexto && okArea && okEstado;
    });

  const activos = useMemo(() => empleados.filter(esVinculado), [empleados]);
  const retirados = useMemo(
    () => empleados.filter((e) => e.estadoLaboral === "retirado"),
    [empleados],
  );

  const nomina = activos.reduce((s, e) => s + e.laboral.salario, 0);

  const columnas = (mostrarRetiro: boolean): Column<EmpleadoRRHH>[] => [
    {
      key: "empleado",
      header: "Empleado",
      render: (e) => (
        <div>
          <Link
            to="/empleados/$id"
            params={{ id: e.id }}
            className="font-medium text-foreground hover:text-primary hover:underline"
          >
            {nombreEmpleado(e)}
          </Link>
          <div className="text-xs text-muted-foreground">CC {e.documento}</div>
        </div>
      ),
    },
    {
      key: "cargo",
      header: "Cargo / Área",
      render: (e) => (
        <div>
          <div className="text-foreground">{nombreCargo(e.laboral.cargoId)}</div>
          <div className="text-xs text-muted-foreground">{nombreArea(e.laboral.areaId)}</div>
        </div>
      ),
    },
    {
      key: "centros",
      header: "Centro de trabajo / costo",
      render: (e) => (
        <div className="text-xs text-muted-foreground">
          <div>{nombreCentroTrabajo(e.laboral.centroTrabajoId)}</div>
          <div>{nombreCentroCosto(e.laboral.centroCostoId)}</div>
        </div>
      ),
    },
    { key: "jefe", header: "Jefe inmediato", render: (e) => nombreJefe(e.laboral.jefeInmediatoId) },
    {
      key: "contrato",
      header: "Contrato",
      render: (e) => (
        <div>
          <div className="text-foreground">{TIPO_CONTRATO_LABEL[e.laboral.tipoContrato]}</div>
          <div className="tabular-nums text-xs text-muted-foreground">
            Ingreso {e.laboral.fechaIngreso}
          </div>
        </div>
      ),
    },
    {
      key: "salario",
      header: "Salario",
      className: "text-right",
      render: (e) => (
        <span className="tabular-nums">
          {verSalario(e.id) ? (
            formatCOP(e.laboral.salario)
          ) : (
            <span className="text-muted-foreground">Restringido</span>
          )}
        </span>
      ),
    },
    mostrarRetiro
      ? {
          key: "retiro",
          header: "Retiro",
          render: (e) => (
            <div>
              <div className="tabular-nums text-foreground">{e.laboral.fechaRetiro ?? "—"}</div>
              <div className="max-w-[220px] text-xs text-muted-foreground">
                {e.laboral.motivoRetiro ?? "—"}
              </div>
            </div>
          ),
        }
      : {
          key: "estado",
          header: "Estado",
          render: (e) => <EstadoLaboralBadge estado={e.estadoLaboral} />,
        },
    {
      key: "acceso",
      header: "Acceso",
      render: (e) => (
        <span
          className={
            e.accesoHabilitado
              ? "text-xs font-medium text-success"
              : "text-xs font-medium text-muted-foreground"
          }
        >
          {e.accesoHabilitado ? "Habilitado" : "Desactivado"}
        </span>
      ),
    },
  ];

  const exportar = (rows: EmpleadoRRHH[], nombre: string) =>
    downloadCsv(
      nombre,
      [
        "Documento",
        "Empleado",
        "Cargo",
        "Área",
        "Centro de trabajo",
        "Centro de costo",
        "Jefe inmediato",
        "Tipo de contrato",
        "Fecha de ingreso",
        "Estado laboral",
        "Salario",
        "Acceso",
        "Fecha de retiro",
        "Motivo de retiro",
      ],
      rows.map((e) => [
        e.documento,
        nombreEmpleado(e),
        nombreCargo(e.laboral.cargoId),
        nombreArea(e.laboral.areaId),
        nombreCentroTrabajo(e.laboral.centroTrabajoId),
        nombreCentroCosto(e.laboral.centroCostoId),
        nombreJefe(e.laboral.jefeInmediatoId),
        TIPO_CONTRATO_LABEL[e.laboral.tipoContrato],
        e.laboral.fechaIngreso,
        ESTADO_LABORAL_LABEL[e.estadoLaboral],
        verSalario(e.id) ? e.laboral.salario : "Restringido",
        e.accesoHabilitado ? "Habilitado" : "Desactivado",
        e.laboral.fechaRetiro ?? "",
        e.laboral.motivoRetiro ?? "",
      ]),
    );

  /* -------------------------------- Reportes -------------------------------- */

  const porEstado = ESTADOS_VINCULADOS.concat("retirado").map((es) => ({
    estado: es as EstadoLaboral,
    total: empleados.filter((e) => e.estadoLaboral === es).length,
  }));

  const porArea = AREAS.map((a) => {
    const rows = activos.filter((e) => e.laboral.areaId === a.id);
    return {
      area: a.nombre,
      total: rows.length,
      masa: rows.reduce((s, e) => s + e.laboral.salario, 0),
      antiguedad: rows.length
        ? Math.round(
            (rows.reduce((s, e) => s + antiguedadAnios(e.laboral.fechaIngreso), 0) / rows.length) * 10,
          ) / 10
        : 0,
    };
  }).filter((r) => r.total > 0);

  const porContrato = (Object.keys(TIPO_CONTRATO_LABEL) as (keyof typeof TIPO_CONTRATO_LABEL)[]).map(
    (t) => ({ tipo: t, total: activos.filter((e) => e.laboral.tipoContrato === t).length }),
  );

  return (
    <AppShell>
      <PageHeader
        breadcrumb={["Talento Humano", "Empleados"]}
        title="Gestión de empleados"
        description="Expediente único por empleado: datos personales, familiares, académicos, bancarios y de seguridad social, información laboral y hoja de vida digital con registro automático de novedades."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => exportar(empleados, "empleados-sigth.csv")}>
              <Download className="size-4" /> Exportar todo
            </Button>
            <Button size="sm" onClick={() => exportar(activos, "empleados-activos.csv")}>
              <FileSpreadsheet className="size-4" /> Exportar activos
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Personal vinculado" value={String(activos.length)} icon={Users2} hint="estados activos" />
        <StatCard
          label="Con acceso al sistema"
          value={String(empleados.filter((e) => e.accesoHabilitado).length)}
          icon={UserCheck}
          hint="usuarios habilitados"
        />
        <StatCard label="Retirados" value={String(retirados.length)} icon={UserMinus} hint="históricos conservados" />
        <StatCard
          label="Masa salarial"
          value={puedeVerSalario(empleadoActuandoId, [rolActivo], empleadoActuandoId) && ["administrador", "gerente_general", "director", "nomina", "contabilidad"].includes(rolActivo) ? formatCOP(nomina) : "Restringido"}
          icon={FileSpreadsheet}
          hint="personal vinculado"
        />
      </div>

      <div className="surface-panel flex flex-wrap items-end gap-3 p-4">
        <div className="min-w-[200px] flex-1">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Buscar</label>
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Nombre, documento o cargo…"
          />
        </div>
        <div className="w-full sm:w-56">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Área</label>
          <Select value={areaFiltro} onValueChange={setAreaFiltro}>
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
        <div className="w-full sm:w-48">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Estado laboral</label>
          <Select value={estadoFiltro} onValueChange={(v) => setEstadoFiltro(v as typeof estadoFiltro)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              {(Object.keys(ESTADO_LABORAL_LABEL) as EstadoLaboral[]).map((e) => (
                <SelectItem key={e} value={e}>
                  {ESTADO_LABORAL_LABEL[e]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-full sm:w-52">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            Rol en sesión (simulado)
          </label>
          <Select value={rolActivo} onValueChange={(v) => setRolActivo(v as typeof rolActivo)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROLES.map((r) => (
                <SelectItem key={r.key} value={r.key}>
                  {r.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs defaultValue="activos">
        <TabsList className="flex-wrap">
          <TabsTrigger value="activos">Personal vinculado ({activos.length})</TabsTrigger>
          <TabsTrigger value="retirados">Retirados ({retirados.length})</TabsTrigger>
          <TabsTrigger value="reportes">Reportes</TabsTrigger>
        </TabsList>

        <TabsContent value="activos" className="mt-4">
          <DataTable
            columns={columnas(false)}
            rows={filtrar(activos)}
            emptyMessage="Sin empleados que cumplan el filtro."
          />
        </TabsContent>

        <TabsContent value="retirados" className="mt-4 space-y-3">
          <div className="surface-panel flex items-start gap-3 p-4 text-sm text-muted-foreground">
            <Filter className="mt-0.5 size-4 shrink-0 text-primary" />
            <p>
              Los empleados retirados se ocultan de los listados activos, tienen el acceso al sistema
              desactivado y conservan su expediente, hoja de vida e histórico para reportes.
            </p>
          </div>
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportar(retirados, "empleados-retirados.csv")}
            >
              <Download className="size-4" /> Exportar retirados
            </Button>
          </div>
          <DataTable
            columns={columnas(true)}
            rows={filtrar(retirados)}
            emptyMessage="Sin empleados retirados."
          />
        </TabsContent>

        <TabsContent value="reportes" className="mt-4 space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <section className="surface-panel p-5">
              <h2 className="text-sm font-semibold text-foreground">Distribución por estado</h2>
              <ul className="mt-3 space-y-2 text-sm">
                {porEstado.map((r) => (
                  <li key={r.estado} className="flex items-center justify-between gap-3">
                    <EstadoLaboralBadge estado={r.estado} />
                    <span className="tabular-nums font-medium text-foreground">{r.total}</span>
                  </li>
                ))}
              </ul>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() =>
                  downloadCsv(
                    "reporte-estados.csv",
                    ["Estado", "Empleados"],
                    porEstado.map((r) => [ESTADO_LABORAL_LABEL[r.estado], r.total]),
                  )
                }
              >
                <Download className="size-4" /> Exportar
              </Button>
            </section>

            <section className="surface-panel p-5">
              <h2 className="text-sm font-semibold text-foreground">Contratos vigentes por tipo</h2>
              <ul className="mt-3 space-y-2 text-sm">
                {porContrato.map((r) => (
                  <li key={r.tipo} className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">{TIPO_CONTRATO_LABEL[r.tipo]}</span>
                    <span className="tabular-nums font-medium text-foreground">{r.total}</span>
                  </li>
                ))}
              </ul>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() =>
                  downloadCsv(
                    "reporte-contratos.csv",
                    ["Tipo de contrato", "Empleados"],
                    porContrato.map((r) => [TIPO_CONTRATO_LABEL[r.tipo], r.total]),
                  )
                }
              >
                <Download className="size-4" /> Exportar
              </Button>
            </section>
          </div>

          <section className="surface-panel overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-4">
              <h2 className="text-sm font-semibold text-foreground">Planta de personal por área</h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  downloadCsv(
                    "reporte-areas.csv",
                    ["Área", "Empleados", "Masa salarial", "Antigüedad promedio (años)"],
                    porArea.map((r) => [r.area, r.total, r.masa, r.antiguedad]),
                  )
                }
              >
                <Download className="size-4" /> Exportar
              </Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-5 py-3 text-left">Área</th>
                    <th className="px-5 py-3 text-right">Empleados</th>
                    <th className="px-5 py-3 text-right">Masa salarial</th>
                    <th className="px-5 py-3 text-right">Antigüedad prom.</th>
                  </tr>
                </thead>
                <tbody>
                  {porArea.map((r) => (
                    <tr key={r.area} className="border-b border-border/70 last:border-0">
                      <td className="px-5 py-3 text-foreground">{r.area}</td>
                      <td className="px-5 py-3 text-right tabular-nums">{r.total}</td>
                      <td className="px-5 py-3 text-right tabular-nums">
                        {["administrador", "gerente_general", "director", "nomina", "contabilidad"].includes(
                          rolActivo,
                        )
                          ? formatCOP(r.masa)
                          : "Restringido"}
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums">{r.antiguedad} años</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="surface-panel p-5">
            <h2 className="text-sm font-semibold text-foreground">Novedades de hoja de vida</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {eventos.length} eventos registrados automáticamente (ingresos, ascensos, cambios
              salariales, traslados, renovaciones y terminaciones).
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() =>
                downloadCsv(
                  "reporte-hoja-de-vida.csv",
                  ["Fecha", "Empleado", "Tipo", "Título", "Valor anterior", "Valor nuevo", "Registrado por"],
                  eventos.map((ev) => {
                    const emp = empleados.find((e) => e.id === ev.empleadoId);
                    return [
                      ev.fecha,
                      emp ? nombreEmpleado(emp) : ev.empleadoId,
                      ev.tipo,
                      ev.titulo,
                      ev.valorAnterior ?? "",
                      ev.valorNuevo ?? "",
                      ev.registradoPor,
                    ];
                  }),
                )
              }
            >
              <Download className="size-4" /> Exportar novedades
            </Button>
          </section>
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}
