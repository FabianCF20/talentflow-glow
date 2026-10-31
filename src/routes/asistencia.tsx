/**
 * Pantalla: consulta y validación individual/masiva de asistencia.
 * Ruta: /asistencia
 */
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AlarmClock, CheckCircle2, Clock, MapPin, Users } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useRrhh } from "@/store/rrhh";
import { useOperaciones } from "@/store/operaciones";
import { calcularAsistencia, formatoHoras, fechaBogota, horaDesdeRegistro, resumenAsistencia } from "@/lib/operaciones";
import { downloadCsv } from "@/lib/export";
import { nombreEmpleado } from "@/types/rrhh";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/asistencia")({ component: AsistenciaPage });

function AsistenciaPage() {
  const { empleados } = useRrhh();
  const { perfil } = useAuth();
  const op = useOperaciones();
  const [fecha, setFecha] = useState(fechaBogota());
  const [busqueda, setBusqueda] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState("todos");
  const [seleccionados, setSeleccionados] = useState<string[]>([]);
  const [observacionMasiva, setObservacionMasiva] = useState("");
  const [observaciones, setObservaciones] = useState<Record<string, string>>({});
  const roles = perfil?.roles ?? [];
  const puedeValidar = roles.some((r) => ["administrador", "talento_humano", "supervisor", "jefe", "director", "gerente_general"].includes(r));
  const delDia = op.asistencia.filter((r) => r.fecha === fecha);
  const registros = useMemo(() => delDia.filter((r) => {
    const empleado = empleados.find((e) => e.id === r.empleadoId);
    const nombre = empleado ? nombreEmpleado(empleado) : r.empleadoId;
    const coincideTexto = nombre.toLowerCase().includes(busqueda.toLowerCase()) || r.empleadoId.toLowerCase().includes(busqueda.toLowerCase());
    const estado = r.estadoValidacion ?? "historico";
    return coincideTexto && (estadoFiltro === "todos" || estado === estadoFiltro);
  }), [delDia, empleados, busqueda, estadoFiltro]);
  const pendientes = registros.filter((r) => r.estadoValidacion === "pendiente" && r.ingresoRegistradoEn && r.salidaRegistradaEn);
  const resumen = resumenAsistencia(delDia);

  const validar = async (id: string, estado: "validada" | "observada", observacion?: string) => {
    try {
      await op.validarAsistencia(id, estado, perfil?.id ?? "", observacion);
      toast.success(estado === "validada" ? "Asistencia validada." : "Registro observado.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No fue posible validar el registro.");
    }
  };

  const validarSeleccion = async (estado: "validada" | "observada") => {
    try {
      await op.validarAsistenciaMasiva(seleccionados, estado, perfil?.id ?? "", observacionMasiva);
      toast.success(`${seleccionados.length} registro(s) procesado(s).`);
      setSeleccionados([]);
      setObservacionMasiva("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No fue posible completar la validación masiva.");
    }
  };

  const exportar = () => downloadCsv(`asistencia-${fecha}.csv`, [
    "Empleado", "ID", "Fecha", "Ingreso servidor", "Salida servidor", "GPS ingreso", "GPS salida", "Estado", "Validado por", "Observación",
  ], registros.map((r) => {
    const empleado = empleados.find((e) => e.id === r.empleadoId);
    return [empleado ? nombreEmpleado(empleado) : r.empleadoId, r.empleadoId, r.fecha,
      horaDesdeRegistro(r.ingresoRegistradoEn), horaDesdeRegistro(r.salidaRegistradaEn),
      r.ubicacionIngreso ? `${r.ubicacionIngreso.latitud},${r.ubicacionIngreso.longitud} (±${r.ubicacionIngreso.precisionMetros}m)` : "",
      r.ubicacionSalida ? `${r.ubicacionSalida.latitud},${r.ubicacionSalida.longitud} (±${r.ubicacionSalida.precisionMetros}m)` : "",
      r.estadoValidacion ?? "histórico", r.validadoPorUid ?? "", r.observacionValidacion ?? ""];
  }));

  return <AppShell>
    <PageHeader breadcrumb={["Operación", "Control de asistencia"]} title="Control de asistencia"
      description="Consulta los registros de ingreso y salida capturados por los empleados. Valida individualmente o por selección masiva."
      actions={<div className="flex flex-wrap items-center gap-2"><Input type="date" value={fecha} className="h-9 w-40" onChange={(e) => { setFecha(e.target.value); setSeleccionados([]); }} /><Button size="sm" variant="outline" onClick={exportar}>Exportar</Button></div>} />
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard label="Registros del día" value={String(delDia.length)} icon={Users} hint="Marcaciones recibidas" />
      <StatCard label="Pendientes" value={String(delDia.filter((r) => r.estadoValidacion === "pendiente").length)} icon={Clock} hint="Por revisar" />
      <StatCard label="Tardanzas" value={String(resumen.tardanzas)} icon={AlarmClock} hint={`${resumen.minutosTardanza} minutos acumulados`} />
      <StatCard label="Validadas" value={String(delDia.filter((r) => r.estadoValidacion === "validada").length)} icon={CheckCircle2} hint="Confirmadas por superior" />
    </div>
    <div className="surface-panel space-y-3 p-4">
      <div className="grid gap-2 sm:grid-cols-2"><Input placeholder="Buscar empleado o identificación" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
        <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={estadoFiltro} onChange={(e) => setEstadoFiltro(e.target.value)}>
          <option value="todos">Todos los estados</option><option value="pendiente">Pendientes</option><option value="validada">Validadas</option><option value="observada">Observadas</option><option value="historico">Históricos anteriores</option>
        </select></div>
      {puedeValidar && <div className="flex flex-wrap items-end gap-2 border-b border-border pb-3">
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={pendientes.length > 0 && pendientes.every((r) => seleccionados.includes(r.id))} onChange={(e) => setSeleccionados(e.target.checked ? pendientes.map((r) => r.id) : [])} /> Seleccionar pendientes completos</label>
        <Input className="min-w-48 flex-1" placeholder="Motivo común (obligatorio al observar)" value={observacionMasiva} onChange={(e) => setObservacionMasiva(e.target.value)} />
        <Button size="sm" disabled={!seleccionados.length} onClick={() => void validarSeleccion("validada")}>Validar seleccionados ({seleccionados.length})</Button>
        <Button size="sm" variant="outline" disabled={!seleccionados.length || !observacionMasiva.trim()} onClick={() => void validarSeleccion("observada")}>Observar seleccionados</Button>
      </div>}
      {registros.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">No hay registros para los filtros seleccionados.</p> : <div className="space-y-3">
        {registros.map((r) => {
          const empleado = empleados.find((e) => e.id === r.empleadoId);
          const nombre = empleado ? nombreEmpleado(empleado) : r.empleadoId;
          const calculo = calcularAsistencia(r);
          const estado = r.estadoValidacion ?? "histórico";
          const completo = Boolean(r.ingresoRegistradoEn && r.salidaRegistradaEn) || Boolean(r.horaIngreso && r.horaSalida);
          const validable = Boolean(r.ingresoRegistradoEn && r.salidaRegistradaEn);
          return <article key={r.id} className="rounded-lg border border-border p-3 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2"><div><p className="font-semibold text-sm">{nombre}</p><p className="text-xs text-muted-foreground">{r.empleadoId} · {r.fecha}</p></div>
              <span className="rounded-full bg-secondary px-2.5 py-1 text-xs">{estado}</span></div>
            <div className="grid gap-2 sm:grid-cols-3 text-sm">
              <div><span className="text-muted-foreground">Ingreso:</span> {horaDesdeRegistro(r.ingresoRegistradoEn) === "—" ? r.horaIngreso ?? "—" : horaDesdeRegistro(r.ingresoRegistradoEn)}</div>
              <div><span className="text-muted-foreground">Salida:</span> {horaDesdeRegistro(r.salidaRegistradaEn) === "—" ? r.horaSalida ?? "—" : horaDesdeRegistro(r.salidaRegistradaEn)}</div>
              <div><span className="text-muted-foreground">Tiempo:</span> {formatoHoras(calculo.minutosTrabajados)} {calculo.minutosTardanza ? `· Tardanza ${calculo.minutosTardanza} min` : ""}</div>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1"><MapPin className="size-3.5" /> Ingreso: {r.ubicacionIngreso ? <a className="underline" href={`https://www.google.com/maps?q=${r.ubicacionIngreso.latitud},${r.ubicacionIngreso.longitud}`} target="_blank" rel="noreferrer">{r.ubicacionIngreso.latitud.toFixed(5)}, {r.ubicacionIngreso.longitud.toFixed(5)} (±{Math.round(r.ubicacionIngreso.precisionMetros)} m)</a> : "Sin GPS histórico"}</span>
              <span>Salida: {r.ubicacionSalida ? <a className="underline" href={`https://www.google.com/maps?q=${r.ubicacionSalida.latitud},${r.ubicacionSalida.longitud}`} target="_blank" rel="noreferrer">{r.ubicacionSalida.latitud.toFixed(5)}, {r.ubicacionSalida.longitud.toFixed(5)} (±{Math.round(r.ubicacionSalida.precisionMetros)} m)</a> : "Sin GPS"}</span>
            </div>
            {r.validadoPorUid && <p className="text-xs text-muted-foreground">Validado por UID {r.validadoPorUid}{r.validadoEn ? ` · ${horaDesdeRegistro(r.validadoEn)}` : ""}</p>}
            {r.observacionValidacion && <p className="text-xs text-muted-foreground">Observación: {r.observacionValidacion}</p>}
            {puedeValidar && estado !== "validada" && validable && <div className="flex flex-wrap items-end gap-2 pt-1">
              <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={seleccionados.includes(r.id)} onChange={(e) => setSeleccionados((p) => e.target.checked ? [...p, r.id] : p.filter((id) => id !== r.id))} /> Seleccionar</label>
              <Button size="sm" onClick={() => void validar(r.id, "validada")}>Validar</Button>
              <div className="min-w-48 flex-1"><Input className="h-9" placeholder="Motivo de observación" value={observaciones[r.id] ?? ""} onChange={(e) => setObservaciones((p) => ({ ...p, [r.id]: e.target.value }))} /></div>
              <Button size="sm" variant="outline" disabled={!observaciones[r.id]?.trim()} onClick={() => void validar(r.id, "observada", observaciones[r.id])}>Observar</Button>
            </div>}
            {!completo && <p className="text-xs text-warning">Marcación incompleta: falta registrar la salida.</p>}
            {completo && !validable && <p className="text-xs text-muted-foreground">Registro histórico anterior al GPS; se conserva para consulta y no admite validación nueva.</p>}
          </article>;
        })}
      </div>}
    </div>
    <p className="text-xs text-muted-foreground">La ubicación GPS es evidencia aportada por el dispositivo y puede tener imprecisiones o ser manipulada; no equivale a verificación biométrica ni antifraude.</p>
  </AppShell>;
}
