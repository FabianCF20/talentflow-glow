import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Check, Timer, Wallet, X } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { EmptyState } from "@/components/common/EmptyState";
import { EstadoHoraExtraBadge, FlujoTraza } from "@/components/operaciones/FlujoBadges";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useRrhh } from "@/store/rrhh";
import { useOperaciones } from "@/store/operaciones";
import { esJefeOp, esNominaOp, esSupervisorOp, hoyISO, valorHoraExtra } from "@/lib/operaciones";
import { downloadCsv } from "@/lib/export";
import { esVinculado } from "@/lib/rrhh";
import { nombreEmpleado } from "@/types/rrhh";
import { formatCOP } from "@/types/organizacion";
import {
  ESTADO_HORA_EXTRA_LABEL,
  TIPO_HORA_EXTRA_LABEL,
  type TipoHoraExtra,
} from "@/types/operaciones";

export const Route = createFileRoute("/horas-extras")({
  head: () => ({
    meta: [
      { title: "Horas extras | SIGTH" },
      {
        name: "description",
        content:
          "Registro y aprobación de horas extras con flujo Supervisor → Jefe → Nómina, recargos legales colombianos y liquidación trazable.",
      },
      { property: "og:title", content: "Horas extras | SIGTH" },
      {
        property: "og:description",
        content: "Flujo de horas extras Supervisor → Jefe → Nómina con cálculo de recargos y trazabilidad.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: HorasExtrasPage,
});

function HorasExtrasPage() {
  const { empleados, rolActivo } = useRrhh();
  const op = useOperaciones();
  const actor = useMemo(() => `Usuario (${rolActivo})`, [rolActivo]);
  const supervisor = esSupervisorOp(rolActivo);
  const jefe = esJefeOp(rolActivo);
  const nomina = esNominaOp(rolActivo);

  const vinculados = empleados.filter(esVinculado);
  const salarioDe = (id: string) => empleados.find((e) => e.id === id)?.laboral.salario ?? 0;
  const nombrePor = useMemo(
    () => Object.fromEntries(empleados.map((e) => [e.id, nombreEmpleado(e)])),
    [empleados],
  );

  const [form, setForm] = useState({
    empleadoId: vinculados[0]?.id ?? "",
    fecha: hoyISO(),
    tipo: "diurna" as TipoHoraExtra,
    horas: "1",
    justificacion: "",
  });
  const [comentarios, setComentarios] = useState<Record<string, string>>({});
  const comentario = (id: string) => comentarios[id]?.trim() || undefined;

  const totalLiquidado = op.horasExtras
    .filter((h) => h.estado === "liquidada")
    .reduce((acc, h) => acc + valorHoraExtra(salarioDe(h.empleadoId), h.tipo, h.horas), 0);

  const exportar = () =>
    downloadCsv(
      `horas-extras-${hoyISO()}.csv`,
      ["Consecutivo", "Empleado", "Fecha", "Tipo", "Horas", "Valor estimado", "Estado", "Registrado por"],
      op.horasExtras.map((h) => [
        h.consecutivo,
        nombrePor[h.empleadoId] ?? h.empleadoId,
        h.fecha,
        TIPO_HORA_EXTRA_LABEL[h.tipo],
        h.horas,
        valorHoraExtra(salarioDe(h.empleadoId), h.tipo, h.horas),
        ESTADO_HORA_EXTRA_LABEL[h.estado],
        h.registradoPor,
      ]),
    );

  return (
    <AppShell>
      <PageHeader
        breadcrumb={["Operación", "Horas extras"]}
        title="Horas extras"
        description="El supervisor registra las horas, el jefe inmediato las autoriza y Nómina las liquida. Cada paso queda en el historial de novedades."
        actions={
          <Button size="sm" variant="outline" onClick={exportar}>
            Exportar
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Pendientes jefe"
          value={String(op.horasExtras.filter((h) => h.estado === "pendiente_jefe").length)}
          icon={Timer}
          hint="Autorización operativa"
        />
        <StatCard
          label="Pendientes nómina"
          value={String(op.horasExtras.filter((h) => h.estado === "pendiente_nomina").length)}
          icon={Wallet}
          hint="Por liquidar"
        />
        <StatCard label="Liquidado" value={formatCOP(totalLiquidado)} icon={Check} hint="Valor estimado acumulado" />
      </div>

      <div className="surface-panel space-y-4 p-5">
        <div>
          <h2 className="text-base font-semibold text-foreground">Registrar horas extras</h2>
          <p className="text-sm text-muted-foreground">
            Disponible para supervisores y jefes del personal a cargo.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-xs font-medium text-muted-foreground">
            Empleado
            <Select value={form.empleadoId} onValueChange={(v) => setForm((f) => ({ ...f, empleadoId: v }))}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {vinculados.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {nombreEmpleado(e)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          <label className="text-xs font-medium text-muted-foreground">
            Tipo
            <Select value={form.tipo} onValueChange={(v) => setForm((f) => ({ ...f, tipo: v as TipoHoraExtra }))}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(TIPO_HORA_EXTRA_LABEL) as TipoHoraExtra[]).map((t) => (
                  <SelectItem key={t} value={t}>
                    {TIPO_HORA_EXTRA_LABEL[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          <label className="text-xs font-medium text-muted-foreground">
            Fecha
            <Input
              type="date"
              className="mt-1"
              value={form.fecha}
              onChange={(e) => setForm((f) => ({ ...f, fecha: e.target.value }))}
            />
          </label>
          <label className="text-xs font-medium text-muted-foreground">
            Horas
            <Input
              type="number"
              min={0.5}
              step={0.5}
              className="mt-1"
              value={form.horas}
              onChange={(e) => setForm((f) => ({ ...f, horas: e.target.value }))}
            />
          </label>
        </div>
        <Input
          placeholder="Justificación operativa"
          maxLength={200}
          value={form.justificacion}
          onChange={(e) => setForm((f) => ({ ...f, justificacion: e.target.value }))}
        />
        <p className="text-xs text-muted-foreground">
          Valor estimado:{" "}
          <span className="font-medium text-foreground">
            {formatCOP(valorHoraExtra(salarioDe(form.empleadoId), form.tipo, Number(form.horas) || 0))}
          </span>
        </p>
        <Button
          disabled={!supervisor || !form.justificacion.trim() || !(Number(form.horas) > 0)}
          onClick={() => {
            op.registrarHoraExtra({
              empleadoId: form.empleadoId,
              fecha: form.fecha,
              tipo: form.tipo,
              horas: Number(form.horas),
              justificacion: form.justificacion.trim(),
              responsable: actor,
            });
            toast.success("Horas extras registradas. Enviadas al jefe inmediato.");
            setForm((f) => ({ ...f, justificacion: "" }));
          }}
        >
          <Timer className="size-4" /> Registrar
        </Button>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Novedades de horas extras
        </h2>
        {op.horasExtras.length === 0 ? (
          <EmptyState icon={Timer} title="Sin registros" description="No hay horas extras registradas." />
        ) : (
          op.horasExtras.map((h) => (
            <div key={h.id} className="surface-panel p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {nombrePor[h.empleadoId] ?? h.empleadoId} · {h.horas} h · {TIPO_HORA_EXTRA_LABEL[h.tipo]}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {h.consecutivo} · {h.fecha} · Valor estimado{" "}
                    {formatCOP(valorHoraExtra(salarioDe(h.empleadoId), h.tipo, h.horas))}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">{h.justificacion}</p>
                </div>
                <EstadoHoraExtraBadge estado={h.estado} />
              </div>
              <FlujoTraza pasos={h.flujo} />
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Input
                  className="h-9 flex-1"
                  maxLength={200}
                  placeholder="Comentario (opcional)"
                  value={comentarios[h.id] ?? ""}
                  onChange={(e) => setComentarios((c) => ({ ...c, [h.id]: e.target.value }))}
                />
                <Button
                  size="sm"
                  disabled={!jefe || h.estado !== "pendiente_jefe"}
                  onClick={() => {
                    op.aprobarHoraExtraJefe(h.id, actor, comentario(h.id));
                    toast.success("Aprobadas por el jefe. Pasan a Nómina.");
                  }}
                >
                  <Check className="size-4" /> Aprobar (jefe)
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={!nomina || h.estado !== "pendiente_nomina"}
                  onClick={() => {
                    op.liquidarHoraExtra(h.id, actor, comentario(h.id));
                    toast.success("Horas extras liquidadas en nómina.");
                  }}
                >
                  <Wallet className="size-4" /> Liquidar (nómina)
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={(!jefe && !nomina) || h.estado === "liquidada" || h.estado === "rechazada"}
                  onClick={() => {
                    op.rechazarHoraExtra(h.id, actor, nomina ? "nomina" : "jefe", comentario(h.id));
                    toast.success("Horas extras rechazadas.");
                  }}
                >
                  <X className="size-4" /> Rechazar
                </Button>
              </div>
            </div>
          ))
        )}
      </section>
    </AppShell>
  );
}
