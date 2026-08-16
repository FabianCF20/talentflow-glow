import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Wallet, Calculator, PiggyBank, FileDown, Receipt, Plus } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { DataTable, type Column } from "@/components/common/DataTable";
import { EmptyState } from "@/components/common/EmptyState";
import { BarrasApiladas, DonaChart } from "@/components/common/Charts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { useNomina } from "@/store/nomina";
import { useRrhh } from "@/store/rrhh";
import { useOperaciones } from "@/store/operaciones";
import {
  PARAMS_NOMINA,
  calcularDetalle,
  puedeGestionarNomina,
  totalesPeriodo,
} from "@/lib/nomina";
import { descargarDesprendible, descargarLiquidacion } from "@/lib/desprendible";
import { downloadExcel } from "@/lib/excel";
import { nombreArea, nombreCargo } from "@/lib/rrhh";
import { formatCOP } from "@/types/organizacion";
import { ESTADOS_VINCULADOS, nombreEmpleado } from "@/types/rrhh";
import {
  ESTADO_PERIODO_LABEL,
  MESES_LABEL,
  MOTIVO_LIQUIDACION_LABEL,
  TIPO_RECURRENTE_LABEL,
  type ConceptoRecurrente,
  type DetalleNomina,
  type LiquidacionFinal,
  type MotivoLiquidacion,
  type TipoRecurrente,
} from "@/types/nomina";

export const Route = createFileRoute("/nomina")({
  head: () => ({
    meta: [
      { title: "Nómina Colombia — Devengados, deducciones y prestaciones | SIGTH" },
      {
        name: "description",
        content:
          "Liquidación mensual de nómina con devengados, deducciones legales, provisión de prestaciones sociales, liquidaciones definitivas y desprendibles en PDF.",
      },
      { property: "og:title", content: "Nómina Colombia | SIGTH" },
      {
        property: "og:description",
        content:
          "Liquide nómina, prestaciones y liquidaciones definitivas con desprendibles de pago descargables e histórico de 12 meses.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: NominaPage,
});

const mesLabel = (mes: number, anio: number) => `${MESES_LABEL[mes - 1]} ${anio}`;

function NominaPage() {
  const { empleados, rolActivo, empleadoActuandoId } = useRrhh();
  const { horasExtras } = useOperaciones();
  const nomina = useNomina();
  const gestiona = puedeGestionarNomina(rolActivo);

  const periodosOrdenados = useMemo(
    () => [...nomina.periodos].sort((a, b) => (a.id < b.id ? 1 : -1)),
    [nomina.periodos],
  );
  const [periodoId, setPeriodoId] = useState(periodosOrdenados[0]?.id ?? "");
  const periodo = periodosOrdenados.find((p) => p.id === periodoId) ?? periodosOrdenados[0];

  const empleadosById = useMemo(() => new Map(empleados.map((e) => [e.id, e])), [empleados]);
  const vinculados = useMemo(
    () => empleados.filter((e) => ESTADOS_VINCULADOS.includes(e.estadoLaboral)),
    [empleados],
  );

  /** Previsualización cuando el periodo aún está abierto. */
  const detalles: DetalleNomina[] = useMemo(() => {
    if (!periodo) return [];
    if (periodo.detalles.length > 0) return periodo.detalles;
    return vinculados.map((emp) =>
      calcularDetalle({
        periodo,
        empleado: emp,
        horasExtras,
        recurrentes: nomina.recurrentes.filter((r) => r.empleadoId === emp.id),
      }),
    );
  }, [periodo, vinculados, horasExtras, nomina.recurrentes]);

  const totales = useMemo(
    () => (periodo ? totalesPeriodo({ ...periodo, detalles }) : null),
    [periodo, detalles],
  );

  const columnasLiquidacion: Column<DetalleNomina>[] = [
    {
      key: "empleado",
      header: "Empleado",
      render: (d) => {
        const e = empleadosById.get(d.empleadoId);
        return (
          <div>
            <p className="font-medium text-foreground">{e ? nombreEmpleado(e) : d.empleadoId}</p>
            <p className="text-xs text-muted-foreground">
              {nombreCargo(e?.laboral.cargoId)} · {nombreArea(e?.laboral.areaId)}
            </p>
          </div>
        );
      },
    },
    { key: "dias", header: "Días", render: (d) => <span className="tabular-nums">{d.diasLiquidados}</span> },
    {
      key: "devengado",
      header: "Devengado",
      render: (d) => <span className="tabular-nums">{formatCOP(d.totalDevengado)}</span>,
    },
    {
      key: "deducido",
      header: "Deducciones",
      render: (d) => <span className="tabular-nums text-destructive">{formatCOP(d.totalDeducido)}</span>,
    },
    {
      key: "neto",
      header: "Neto a pagar",
      render: (d) => <span className="font-semibold tabular-nums">{formatCOP(d.netoPagar)}</span>,
    },
    {
      key: "acciones",
      header: "Desprendible",
      render: (d) => {
        const e = empleadosById.get(d.empleadoId);
        return (
          <Button
            size="sm"
            variant="outline"
            disabled={!e || !periodo || periodo.detalles.length === 0}
            onClick={() => {
              if (e && periodo) descargarDesprendible(periodo, d, e);
            }}
          >
            <FileDown className="size-4" /> PDF
          </Button>
        );
      },
    },
  ];

  const exportarPeriodo = () => {
    if (!periodo) return;
    downloadExcel(`nomina-${periodo.codigo}`, [
      {
        nombre: "Liquidación",
        headers: ["Empleado", "Documento", "Área", "Días", "Devengado", "Deducciones", "Neto"],
        rows: detalles.map((d) => {
          const e = empleadosById.get(d.empleadoId);
          return [
            e ? nombreEmpleado(e) : d.empleadoId,
            e?.documento ?? "",
            nombreArea(e?.laboral.areaId),
            d.diasLiquidados,
            d.totalDevengado,
            d.totalDeducido,
            d.netoPagar,
          ];
        }),
      },
      {
        nombre: "Prestaciones",
        headers: ["Empleado", "Prima", "Cesantías", "Intereses", "Vacaciones"],
        rows: detalles.map((d) => {
          const e = empleadosById.get(d.empleadoId);
          return [
            e ? nombreEmpleado(e) : d.empleadoId,
            d.provisiones.prima,
            d.provisiones.cesantias,
            d.provisiones.interesesCesantias,
            d.provisiones.vacaciones,
          ];
        }),
      },
    ]);
    toast.success("Nómina exportada a Excel");
  };

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader
          title="Nómina Colombia"
          description="Devengados, deducciones legales, provisión de prestaciones sociales, liquidaciones definitivas y desprendibles de pago."
          breadcrumb={["Operación", "Nómina"]}
          actions={
            <>
              <Select value={periodoId} onValueChange={setPeriodoId}>
                <SelectTrigger className="w-56">
                  <SelectValue placeholder="Periodo" />
                </SelectTrigger>
                <SelectContent>
                  {periodosOrdenados.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {mesLabel(p.mes, p.anio)} · {ESTADO_PERIODO_LABEL[p.estado]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={exportarPeriodo}>
                <FileDown className="size-4" /> Excel
              </Button>
            </>
          }
        />

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Total devengado"
            value={formatCOP(totales?.devengado ?? 0)}
            hint={`${totales?.empleados ?? 0} empleados`}
            icon={Wallet}
          />
          <StatCard
            label="Deducciones"
            value={formatCOP(totales?.deducido ?? 0)}
            hint="Salud, pensión, libranzas y embargos"
            icon={Calculator}
          />
          <StatCard
            label="Neto a pagar"
            value={formatCOP(totales?.neto ?? 0)}
            hint={periodo ? ESTADO_PERIODO_LABEL[periodo.estado] : ""}
            icon={Receipt}
          />
          <StatCard
            label="Costo total con prestaciones"
            value={formatCOP(totales?.costoTotal ?? 0)}
            hint="Incluye provisión prestacional"
            icon={PiggyBank}
          />
        </div>

        <Tabs defaultValue="liquidacion" className="space-y-4">
          <TabsList className="flex-wrap">
            <TabsTrigger value="liquidacion">Liquidación</TabsTrigger>
            <TabsTrigger value="conceptos">Conceptos fijos</TabsTrigger>
            <TabsTrigger value="prestaciones">Prestaciones</TabsTrigger>
            <TabsTrigger value="liquidaciones">Liquidaciones definitivas</TabsTrigger>
            <TabsTrigger value="desprendibles">Desprendibles</TabsTrigger>
          </TabsList>

          <TabsContent value="liquidacion" className="space-y-4">
            {periodo && (
              <div className="surface-panel flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="text-sm">
                  <p className="font-medium text-foreground">
                    {periodo.codigo} · {periodo.desde} al {periodo.hasta}
                  </p>
                  <p className="text-muted-foreground">
                    {periodo.detalles.length === 0
                      ? "Previsualización: el periodo aún no ha sido liquidado."
                      : `Liquidado por ${periodo.liquidadoPor} el ${periodo.fechaLiquidacion}`}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    disabled={!gestiona || periodo.estado !== "abierta"}
                    onClick={() => {
                      const n = nomina.liquidarPeriodo(periodo.id, `Usuario (${rolActivo})`);
                      toast.success(`Periodo liquidado para ${n} empleados`);
                    }}
                  >
                    Liquidar periodo
                  </Button>
                  <Button
                    variant="outline"
                    disabled={!gestiona || periodo.estado !== "liquidada"}
                    onClick={() => {
                      nomina.marcarPagado(periodo.id);
                      toast.success("Periodo marcado como pagado");
                    }}
                  >
                    Marcar pagado
                  </Button>
                </div>
              </div>
            )}
            {!gestiona && (
              <p className="text-xs text-muted-foreground">
                Consulta de solo lectura: la liquidación es exclusiva de los roles Nómina y Administrador.
              </p>
            )}
            <DataTable columns={columnasLiquidacion} rows={detalles} />
            <div className="surface-panel p-5">
              <h3 className="text-sm font-semibold text-foreground">Composición del devengado</h3>
              <div className="mt-4">
                <DonaChart
                  formato={formatCOP}
                  datos={[
                    {
                      label: "Salario",
                      valor: detalles.reduce(
                        (s, d) => s + (d.devengados.find((x) => x.codigo === "101")?.valor ?? 0),
                        0,
                      ),
                      clase: "stroke-primary",
                    },
                    {
                      label: "Auxilio transporte",
                      valor: detalles.reduce(
                        (s, d) => s + (d.devengados.find((x) => x.codigo === "102")?.valor ?? 0),
                        0,
                      ),
                      clase: "stroke-success",
                    },
                    {
                      label: "Bonificaciones",
                      valor: detalles.reduce(
                        (s, d) =>
                          s + d.devengados.filter((x) => x.codigo === "103").reduce((a, b) => a + b.valor, 0),
                        0,
                      ),
                      clase: "stroke-warning",
                    },
                    {
                      label: "Horas extras y recargos",
                      valor: detalles.reduce(
                        (s, d) =>
                          s +
                          d.devengados
                            .filter((x) => x.codigo === "104" || x.codigo === "105")
                            .reduce((a, b) => a + b.valor, 0),
                        0,
                      ),
                      clase: "stroke-destructive",
                    },
                  ]}
                />
              </div>
              <p className="mt-4 text-xs text-muted-foreground">
                Parámetros vigentes: SMMLV {formatCOP(PARAMS_NOMINA.smmlv)} · auxilio de transporte{" "}
                {formatCOP(PARAMS_NOMINA.auxilioTransporte)} (hasta {PARAMS_NOMINA.topeAuxilioSmmlv} SMMLV) ·
                salud 4% · pensión 4% · FSP 1% desde {PARAMS_NOMINA.fspDesdeSmmlv} SMMLV.
              </p>
            </div>
          </TabsContent>

          <TabsContent value="conceptos">
            <ConceptosFijos gestiona={gestiona} />
          </TabsContent>

          <TabsContent value="prestaciones" className="space-y-4">
            <div className="surface-panel p-5">
              <h3 className="text-sm font-semibold text-foreground">
                Provisión de prestaciones del periodo
              </h3>
              <div className="mt-4">
                <BarrasApiladas
                  formato={formatCOP}
                  datos={[
                    {
                      label: "Periodo",
                      series: [
                        { nombre: "Prima", valor: totales?.provisiones.prima ?? 0, clase: "bg-primary" },
                        { nombre: "Cesantías", valor: totales?.provisiones.cesantias ?? 0, clase: "bg-success" },
                        {
                          nombre: "Intereses",
                          valor: totales?.provisiones.interesesCesantias ?? 0,
                          clase: "bg-warning",
                        },
                        {
                          nombre: "Vacaciones",
                          valor: totales?.provisiones.vacaciones ?? 0,
                          clase: "bg-accent",
                        },
                      ],
                    },
                  ]}
                />
              </div>
            </div>
            <DataTable
              rows={detalles}
              columns={[
                {
                  key: "empleado",
                  header: "Empleado",
                  render: (d) => {
                    const e = empleadosById.get(d.empleadoId);
                    return e ? nombreEmpleado(e) : d.empleadoId;
                  },
                },
                { key: "prima", header: "Prima", render: (d) => formatCOP(d.provisiones.prima) },
                { key: "ces", header: "Cesantías", render: (d) => formatCOP(d.provisiones.cesantias) },
                {
                  key: "int",
                  header: "Intereses cesantías",
                  render: (d) => formatCOP(d.provisiones.interesesCesantias),
                },
                { key: "vac", header: "Vacaciones", render: (d) => formatCOP(d.provisiones.vacaciones) },
              ]}
            />
          </TabsContent>

          <TabsContent value="liquidaciones">
            <Liquidaciones gestiona={gestiona} />
          </TabsContent>

          <TabsContent value="desprendibles">
            <Desprendibles empleadoActuandoId={empleadoActuandoId} />
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}

/* ----------------------------- Conceptos fijos ----------------------------- */

function ConceptosFijos({ gestiona }: { gestiona: boolean }) {
  const { empleados } = useRrhh();
  const { recurrentes, agregarRecurrente, toggleRecurrente } = useNomina();
  const [empleadoId, setEmpleadoId] = useState(empleados[0]?.id ?? "");
  const [tipo, setTipo] = useState<TipoRecurrente>("bonificacion");
  const [descripcion, setDescripcion] = useState("");
  const [valor, setValor] = useState("");

  const columnas: Column<ConceptoRecurrente>[] = [
    {
      key: "empleado",
      header: "Empleado",
      render: (c) => {
        const e = empleados.find((x) => x.id === c.empleadoId);
        return e ? nombreEmpleado(e) : c.empleadoId;
      },
    },
    { key: "tipo", header: "Tipo", render: (c) => TIPO_RECURRENTE_LABEL[c.tipo] },
    { key: "desc", header: "Descripción", render: (c) => c.descripcion },
    {
      key: "valor",
      header: "Valor mensual",
      render: (c) => <span className="tabular-nums">{formatCOP(c.valorMensual)}</span>,
    },
    {
      key: "activo",
      header: "Activo",
      render: (c) => (
        <Switch checked={c.activo} disabled={!gestiona} onCheckedChange={() => toggleRecurrente(c.id)} />
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {gestiona && (
        <div className="surface-panel grid gap-4 p-5 md:grid-cols-5">
          <div className="space-y-1.5">
            <Label>Empleado</Label>
            <Select value={empleadoId} onValueChange={setEmpleadoId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {empleados.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {nombreEmpleado(e)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Tipo</Label>
            <Select value={tipo} onValueChange={(v) => setTipo(v as TipoRecurrente)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(TIPO_RECURRENTE_LABEL).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label>Descripción</Label>
            <Input value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Entidad o motivo" />
          </div>
          <div className="space-y-1.5">
            <Label>Valor mensual</Label>
            <Input value={valor} inputMode="numeric" onChange={(e) => setValor(e.target.value)} placeholder="0" />
          </div>
          <div className="md:col-span-5">
            <Button
              onClick={() => {
                const v = Number(valor.replace(/\D/g, ""));
                if (!descripcion.trim() || !v) {
                  toast.error("Registre descripción y valor del concepto");
                  return;
                }
                agregarRecurrente({ empleadoId, tipo, descripcion: descripcion.trim(), valorMensual: v });
                setDescripcion("");
                setValor("");
                toast.success("Concepto registrado");
              }}
            >
              <Plus className="size-4" /> Registrar concepto
            </Button>
          </div>
        </div>
      )}
      <DataTable columns={columnas} rows={recurrentes} />
    </div>
  );
}

/* -------------------------- Liquidaciones definitivas -------------------------- */

function Liquidaciones({ gestiona }: { gestiona: boolean }) {
  const { empleados, rolActivo } = useRrhh();
  const { liquidaciones, generarLiquidacion, vacacionesPendientes } = useNomina();
  const [empleadoId, setEmpleadoId] = useState(empleados[0]?.id ?? "");
  const [motivo, setMotivo] = useState<MotivoLiquidacion>("renuncia");
  const [fechaRetiro, setFechaRetiro] = useState(new Date().toISOString().slice(0, 10));
  const [dias, setDias] = useState("");

  const columnas: Column<LiquidacionFinal>[] = [
    { key: "cons", header: "Consecutivo", render: (l) => l.consecutivo },
    {
      key: "empleado",
      header: "Empleado",
      render: (l) => {
        const e = empleados.find((x) => x.id === l.empleadoId);
        return e ? nombreEmpleado(e) : l.empleadoId;
      },
    },
    { key: "motivo", header: "Motivo", render: (l) => MOTIVO_LIQUIDACION_LABEL[l.motivo] },
    { key: "retiro", header: "Retiro", render: (l) => l.fechaRetiro },
    { key: "dias", header: "Días", render: (l) => <span className="tabular-nums">{l.diasLaborados}</span> },
    {
      key: "total",
      header: "Total a pagar",
      render: (l) => <span className="font-semibold tabular-nums">{formatCOP(l.totalPagar)}</span>,
    },
    {
      key: "pdf",
      header: "Documento",
      render: (l) => {
        const e = empleados.find((x) => x.id === l.empleadoId);
        return (
          <Button size="sm" variant="outline" disabled={!e} onClick={() => e && descargarLiquidacion(l, e)}>
            <FileDown className="size-4" /> PDF
          </Button>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      {gestiona && (
        <div className="surface-panel grid gap-4 p-5 md:grid-cols-5">
          <div className="space-y-1.5">
            <Label>Empleado</Label>
            <Select value={empleadoId} onValueChange={setEmpleadoId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {empleados.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {nombreEmpleado(e)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Motivo</Label>
            <Select value={motivo} onValueChange={(v) => setMotivo(v as MotivoLiquidacion)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(MOTIVO_LIQUIDACION_LABEL).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Fecha de retiro</Label>
            <Input type="date" value={fechaRetiro} onChange={(e) => setFechaRetiro(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Días de vacaciones pendientes</Label>
            <Input
              inputMode="numeric"
              value={dias}
              placeholder={String(vacacionesPendientes[empleadoId] ?? 0)}
              onChange={(e) => setDias(e.target.value)}
            />
          </div>
          <div className="flex items-end">
            <Button
              className="w-full"
              onClick={() => {
                const liq = generarLiquidacion({
                  empleadoId,
                  motivo,
                  fechaRetiro,
                  diasVacaciones: Number(dias) || vacacionesPendientes[empleadoId] || 0,
                  responsable: `Usuario (${rolActivo})`,
                });
                if (!liq) {
                  toast.error("No fue posible calcular la liquidación");
                  return;
                }
                toast.success(`Liquidación ${liq.consecutivo} calculada por ${formatCOP(liq.totalPagar)}`);
              }}
            >
              Calcular liquidación
            </Button>
          </div>
        </div>
      )}
      <DataTable columns={columnas} rows={liquidaciones} emptyMessage="Sin liquidaciones registradas." />
    </div>
  );
}

/* ------------------------------ Desprendibles ------------------------------ */

function Desprendibles({ empleadoActuandoId }: { empleadoActuandoId: string }) {
  const { empleados } = useRrhh();
  const { periodos } = useNomina();
  const [empleadoId, setEmpleadoId] = useState(empleadoActuandoId);
  const empleado = empleados.find((e) => e.id === empleadoId);

  const historico = useMemo(
    () =>
      [...periodos]
        .filter((p) => p.detalles.some((d) => d.empleadoId === empleadoId))
        .sort((a, b) => (a.id < b.id ? 1 : -1))
        .slice(0, 12),
    [periodos, empleadoId],
  );

  return (
    <div className="space-y-4">
      <div className="surface-panel flex flex-wrap items-end gap-4 p-5">
        <div className="min-w-56 space-y-1.5">
          <Label>Empleado</Label>
          <Select value={empleadoId} onValueChange={setEmpleadoId}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {empleados.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {nombreEmpleado(e)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <p className="text-xs text-muted-foreground">
          Consulta histórica de los últimos 12 meses con descarga individual del desprendible en PDF.
        </p>
      </div>

      {historico.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="Sin desprendibles disponibles"
          description="Este empleado aún no tiene periodos de nómina liquidados."
        />
      ) : (
        <DataTable
          rows={historico.map((p) => ({ id: p.id, periodo: p }))}
          columns={[
            { key: "mes", header: "Periodo", render: (r) => mesLabel(r.periodo.mes, r.periodo.anio) },
            { key: "codigo", header: "Código", render: (r) => r.periodo.codigo },
            { key: "estado", header: "Estado", render: (r) => ESTADO_PERIODO_LABEL[r.periodo.estado] },
            {
              key: "neto",
              header: "Neto pagado",
              render: (r) => {
                const d = r.periodo.detalles.find((x) => x.empleadoId === empleadoId);
                return <span className="tabular-nums">{formatCOP(d?.netoPagar ?? 0)}</span>;
              },
            },
            {
              key: "pdf",
              header: "Descarga",
              render: (r) => {
                const d = r.periodo.detalles.find((x) => x.empleadoId === empleadoId);
                return (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!d || !empleado}
                    onClick={() => {
                      if (d && empleado) descargarDesprendible(r.periodo, d, empleado);
                    }}
                  >
                    <FileDown className="size-4" /> PDF
                  </Button>
                );
              },
            },
          ]}
        />
      )}
    </div>
  );
}
