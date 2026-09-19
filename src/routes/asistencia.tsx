import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AlarmClock, CalendarX, Clock, Coffee, UserCheck } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useRrhh } from "@/store/rrhh";
import { useOperaciones } from "@/store/operaciones";
import {
  calcularAsistencia,
  esSupervisorOp,
  formatoHoras,
  hoyISO,
  resumenAsistencia,
} from "@/lib/operaciones";
import { downloadCsv } from "@/lib/export";
import { esVinculado } from "@/lib/rrhh";
import { nombreEmpleado } from "@/types/rrhh";
import { JORNADA } from "@/types/operaciones";

export const Route = createFileRoute("/asistencia")({
  head: () => ({
    meta: [
      { title: "Control de asistencia | SIGTH" },
      {
        name: "description",
        content:
          "Registro diario del supervisor: hora de ingreso, almuerzo, recesos y salida, con cálculo automático de horas trabajadas, tardanzas y ausencias.",
      },
      { property: "og:title", content: "Control de asistencia | SIGTH" },
      {
        property: "og:description",
        content: "Marcaciones diarias por supervisor con cálculo de horas trabajadas, tardanzas y ausencias.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AsistenciaPage,
});

function AsistenciaPage() {
  const { empleados, rolActivo } = useRrhh();
  const op = useOperaciones();
  const puede = esSupervisorOp(rolActivo);
  const actor = useMemo(() => `Usuario (${rolActivo})`, [rolActivo]);

  const [fecha, setFecha] = useState("2026-08-01");
  const [receso, setReceso] = useState<Record<string, { inicio: string; fin: string }>>({});
  const [motivo, setMotivo] = useState<Record<string, string>>({});

  const vinculados = empleados.filter(esVinculado);
  const delDia = op.asistencia.filter((r) => r.fecha === fecha);
  const resumen = resumenAsistencia(delDia);

  const registroDe = (empleadoId: string) =>
    delDia.find((r) => r.empleadoId === empleadoId) ?? {
      id: `tmp-${empleadoId}`,
      empleadoId,
      fecha,
      recesos: [],
      ausente: false,
      registradoPor: actor,
    };

  const exportar = () =>
    downloadCsv(
      `asistencia-${fecha}.csv`,
      [
        "Empleado",
        "Fecha",
        "Ingreso",
        "Inicio almuerzo",
        "Fin almuerzo",
        "Recesos (min)",
        "Salida",
        "Horas trabajadas",
        "Tardanza (min)",
        "Ausencia",
      ],
      delDia.map((r) => {
        const c = calcularAsistencia(r);
        const emp = empleados.find((e) => e.id === r.empleadoId);
        return [
          emp ? nombreEmpleado(emp) : r.empleadoId,
          r.fecha,
          r.horaIngreso ?? "",
          r.inicioAlmuerzo ?? "",
          r.finAlmuerzo ?? "",
          c.minutosRecesos,
          r.horaSalida ?? "",
          formatoHoras(c.minutosTrabajados),
          c.minutosTardanza,
          c.ausencia ? "Sí" : "No",
        ];
      }),
    );

  return (
    <AppShell>
      <PageHeader
        breadcrumb={["Operación", "Control de asistencia"]}
        title="Control de asistencia"
        description={`El supervisor registra diariamente ingreso, almuerzo, recesos y salida. La jornada estándar es ${JORNADA.horaEntrada}–${JORNADA.horaSalida} con ${JORNADA.toleranciaMinutos} minutos de tolerancia.`}
        actions={
          <div className="flex items-center gap-2">
            <Input type="date" value={fecha} className="h-9 w-40" onChange={(e) => setFecha(e.target.value)} />
            <Button size="sm" variant="outline" onClick={exportar}>
              Exportar día
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Horas trabajadas" value={formatoHoras(resumen.minutosTrabajados)} icon={Clock} hint="Total del día" />
        <StatCard label="Tardanzas" value={String(resumen.tardanzas)} icon={AlarmClock} hint={`${resumen.minutosTardanza} min acumulados`} />
        <StatCard label="Ausencias" value={String(resumen.ausencias)} icon={CalendarX} hint="Registradas por supervisor" />
        <StatCard label="Jornadas completas" value={String(resumen.jornadasCompletas)} icon={UserCheck} hint="≥ 8 horas efectivas" />
      </div>

      {!puede && (
        <div className="surface-panel p-4 text-sm text-muted-foreground">
          Con el rol actual ({rolActivo}) la asistencia es de consulta. Solo supervisores y jefes registran marcaciones.
        </div>
      )}

      <div className="space-y-3">
        {vinculados.map((e) => {
          const r = registroDe(e.id);
          const c = calcularAsistencia(r);
          const rec = receso[e.id] ?? { inicio: "", fin: "" };
          return (
            <div key={e.id} className="surface-panel p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">{nombreEmpleado(e)}</p>
                  <p className="text-xs text-muted-foreground">
                    Registrado por {r.registradoPor}
                    {r.justificacion ? ` · ${r.justificacion}` : ""}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-md border border-border bg-secondary px-2 py-0.5 font-medium text-secondary-foreground">
                    Trabajado: {formatoHoras(c.minutosTrabajados)}
                  </span>
                  {c.minutosTardanza > 0 && (
                    <span className="rounded-md border border-warning/40 bg-warning/15 px-2 py-0.5 font-medium text-warning-foreground dark:text-warning">
                      Tardanza {c.minutosTardanza} min
                    </span>
                  )}
                  {c.ausencia && (
                    <span className="rounded-md border border-destructive/30 bg-destructive/10 px-2 py-0.5 font-medium text-destructive">
                      Ausente
                    </span>
                  )}
                  {c.incompleto && !c.ausencia && (
                    <span className="rounded-md border border-border bg-muted px-2 py-0.5 text-muted-foreground">
                      Marcaciones incompletas
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {(
                  [
                    ["horaIngreso", "Hora ingreso"],
                    ["inicioAlmuerzo", "Inicio almuerzo"],
                    ["finAlmuerzo", "Fin almuerzo"],
                    ["horaSalida", "Hora salida"],
                  ] as const
                ).map(([campo, label]) => (
                  <label key={campo} className="text-xs text-muted-foreground">
                    {label}
                    <Input
                      type="time"
                      className="mt-1 h-9"
                      disabled={!puede}
                      value={r[campo] ?? ""}
                      onChange={(ev) =>
                        ev.target.value &&
                        op.registrarMarcacion({
                          empleadoId: e.id,
                          fecha,
                          campo,
                          valor: ev.target.value,
                          responsable: actor,
                        })
                      }
                    />
                  </label>
                ))}
              </div>

              <div className="mt-3 flex flex-wrap items-end gap-2">
                <label className="text-xs text-muted-foreground">
                  Receso desde
                  <Input
                    type="time"
                    className="mt-1 h-9 w-32"
                    disabled={!puede}
                    value={rec.inicio}
                    onChange={(ev) => setReceso((p) => ({ ...p, [e.id]: { ...rec, inicio: ev.target.value } }))}
                  />
                </label>
                <label className="text-xs text-muted-foreground">
                  Receso hasta
                  <Input
                    type="time"
                    className="mt-1 h-9 w-32"
                    disabled={!puede}
                    value={rec.fin}
                    onChange={(ev) => setReceso((p) => ({ ...p, [e.id]: { ...rec, fin: ev.target.value } }))}
                  />
                </label>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={!puede || !rec.inicio || !rec.fin}
                  onClick={() => {
                    op.agregarReceso(e.id, fecha, rec.inicio, rec.fin, actor);
                    setReceso((p) => ({ ...p, [e.id]: { inicio: "", fin: "" } }));
                    toast.success("Receso registrado.");
                  }}
                >
                  <Coffee className="size-4" /> Agregar receso
                </Button>
                <Input
                  className="h-9 flex-1"
                  placeholder="Justificación de ausencia"
                  disabled={!puede}
                  value={motivo[e.id] ?? ""}
                  onChange={(ev) => setMotivo((p) => ({ ...p, [e.id]: ev.target.value }))}
                />
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!puede}
                  onClick={() => {
                    op.marcarAusencia(e.id, fecha, motivo[e.id]?.trim() ?? "", actor);
                    toast.success("Ausencia registrada.");
                  }}
                >
                  <CalendarX className="size-4" /> Marcar ausencia
                </Button>
              </div>

              {r.recesos.length > 0 && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Recesos: {r.recesos.map((x) => `${x.inicio}–${x.fin}`).join(", ")} ·{" "}
                  {c.minutosRecesos} min · Almuerzo {c.minutosAlmuerzo} min
                </p>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground">Fecha de referencia del sistema: {hoyISO()}</p>
    </AppShell>
  );
}
