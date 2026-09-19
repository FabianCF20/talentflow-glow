import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Shirt, PackageCheck, Ruler, PenLine } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { DataTable, type Column } from "@/components/common/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AceptacionBadge } from "@/components/sst/SstBadges";
import { useRrhh } from "@/store/rrhh";
import { useSst, tallasDe } from "@/store/sst";
import { hoyISO, puedeGestionarSST } from "@/lib/sst";
import { downloadCsv } from "@/lib/export";
import { nombreEmpleado, ESTADOS_VINCULADOS } from "@/types/rrhh";
import {
  ELEMENTOS_DOTACION,
  ELEMENTO_LABEL,
  TALLAS_POR_ELEMENTO,
  TIPO_ENTREGA_LABEL,
  type ElementoDotacion,
  type EntregaDotacion,
  type ItemEntrega,
  type TallasEmpleado,
  type TipoEntrega,
} from "@/types/sst";

export const Route = createFileRoute("/dotacion")({
  head: () => ({
    meta: [
      { title: "Dotación y elementos de protección | SIGTH" },
      {
        name: "description",
        content:
          "Registro de tallas por empleado, entregas y reposiciones de dotación con aceptación digital del empleado e historial completo.",
      },
      { property: "og:title", content: "Dotación y elementos de protección | SIGTH" },
      {
        property: "og:description",
        content: "Tallas de camisa, pantalón, chaqueta, guantes y botas; entregas, reposiciones e historial firmado.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DotacionPage,
});

function DotacionPage() {
  const { empleados, rolActivo, empleadoActuandoId } = useRrhh();
  const { tallas, entregas, guardarTallas, registrarEntrega, aceptarEntrega } = useSst();
  const gestiona = puedeGestionarSST(rolActivo);

  const vinculados = useMemo(
    () => empleados.filter((e) => ESTADOS_VINCULADOS.includes(e.estadoLaboral)),
    [empleados],
  );
  const nombrePor = useMemo(
    () => Object.fromEntries(empleados.map((e) => [e.id, nombreEmpleado(e)])) as Record<string, string>,
    [empleados],
  );

  const [fichaId, setFichaId] = useState(vinculados[0]?.id ?? "");
  const fichaActual = tallasDe(tallas, fichaId);
  const [borrador, setBorrador] = useState<TallasEmpleado | null>(null);
  const tallasEnEdicion = borrador ?? fichaActual ?? ({} as TallasEmpleado);

  const [entrega, setEntrega] = useState<{
    empleadoId: string;
    tipo: TipoEntrega;
    fecha: string;
    motivo: string;
    elementos: ElementoDotacion[];
  }>({ empleadoId: vinculados[0]?.id ?? "", tipo: "entrega", fecha: hoyISO(), motivo: "", elementos: [] });

  const pendientes = entregas.filter((e) => !e.aceptacion?.aceptado);
  const misPendientes = pendientes.filter((e) => e.empleadoId === empleadoActuandoId);

  const columns: Column<EntregaDotacion>[] = [
    {
      key: "consecutivo",
      header: "Consecutivo",
      render: (e) => (
        <div>
          <div className="font-medium text-foreground">{e.consecutivo}</div>
          <div className="text-xs text-muted-foreground">{TIPO_ENTREGA_LABEL[e.tipo]}</div>
        </div>
      ),
    },
    {
      key: "empleado",
      header: "Empleado",
      render: (e) => (
        <div>
          <div className="text-foreground">{nombrePor[e.empleadoId] ?? e.empleadoId}</div>
          <div className="text-xs tabular-nums text-muted-foreground">{e.fecha}</div>
        </div>
      ),
    },
    {
      key: "items",
      header: "Elementos entregados",
      render: (e) => (
        <div className="flex flex-wrap gap-1.5">
          {e.items.map((i) => (
            <span key={i.elemento} className="rounded-md border border-border bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
              {ELEMENTO_LABEL[i.elemento]} · {i.talla} × {i.cantidad}
            </span>
          ))}
        </div>
      ),
    },
    { key: "motivo", header: "Motivo", render: (e) => <span className="text-xs text-muted-foreground">{e.motivo ?? "—"}</span> },
    {
      key: "aceptacion",
      header: "Aceptación digital",
      render: (e) => (
        <div className="space-y-1">
          <AceptacionBadge aceptado={Boolean(e.aceptacion?.aceptado)} />
          {e.aceptacion && (
            <div className="text-xs tabular-nums text-muted-foreground">
              {e.aceptacion.fecha} {e.aceptacion.hora} · {e.aceptacion.firma}
            </div>
          )}
        </div>
      ),
    },
    {
      key: "accion",
      header: "Acción",
      render: (e) =>
        e.aceptacion?.aceptado ? (
          <span className="text-xs text-muted-foreground">Firmada</span>
        ) : e.empleadoId === empleadoActuandoId ? (
          <Button size="sm" onClick={() => aceptar(e)}>Aceptar entrega</Button>
        ) : (
          <span className="text-xs text-muted-foreground">Pendiente del empleado</span>
        ),
    },
  ];

  const aceptar = (e: EntregaDotacion) => {
    const emp = empleados.find((x) => x.id === e.empleadoId);
    if (!emp) return;
    aceptarEntrega(e.id, nombreEmpleado(emp), emp.documento);
    toast.success(`Entrega ${e.consecutivo} aceptada digitalmente.`);
  };

  return (
    <AppShell>
      <PageHeader
        breadcrumb={["Talento Humano", "Dotación"]}
        title="Dotación y elementos de protección"
        description="Ficha de tallas por empleado, entregas y reposiciones con aceptación digital obligatoria e historial trazable."
        actions={
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              downloadCsv(
                `historial-dotacion-${hoyISO()}.csv`,
                ["Consecutivo", "Empleado", "Tipo", "Fecha", "Elementos", "Motivo", "Aceptación", "Firma"],
                entregas.map((e) => [
                  e.consecutivo,
                  nombrePor[e.empleadoId] ?? e.empleadoId,
                  TIPO_ENTREGA_LABEL[e.tipo],
                  e.fecha,
                  e.items.map((i) => `${ELEMENTO_LABEL[i.elemento]} ${i.talla} x${i.cantidad}`).join(" | "),
                  e.motivo ?? "",
                  e.aceptacion?.aceptado ? `${e.aceptacion.fecha} ${e.aceptacion.hora}` : "Pendiente",
                  e.aceptacion?.firma ?? "",
                ]),
              )
            }
          >
            Exportar historial
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Entregas registradas" value={String(entregas.length)} icon={PackageCheck} hint="Entregas y reposiciones" />
        <StatCard label="Reposiciones" value={String(entregas.filter((e) => e.tipo === "reposicion").length)} icon={Shirt} hint="Por desgaste o daño" />
        <StatCard label="Pendientes de aceptación" value={String(pendientes.length)} icon={PenLine} hint="Requieren firma digital" />
        <StatCard label="Fichas de tallas" value={String(tallas.length)} icon={Ruler} hint={`${vinculados.length} empleados vinculados`} />
      </div>

      {misPendientes.length > 0 && (
        <div className="surface-panel border-warning/40 bg-warning/10 p-4 text-sm text-foreground">
          Tiene {misPendientes.length} entrega(s) pendiente(s) de aceptación digital:{" "}
          {misPendientes.map((e) => e.consecutivo).join(", ")}.
        </div>
      )}

      <Tabs defaultValue="entregas" className="space-y-4">
        <TabsList className="flex w-full flex-wrap justify-start">
          <TabsTrigger value="entregas">Entregas y reposiciones</TabsTrigger>
          <TabsTrigger value="tallas">Ficha de tallas</TabsTrigger>
        </TabsList>

        <TabsContent value="entregas" className="space-y-4">
          {gestiona && (
            <div className="surface-panel space-y-4 p-5">
              <h2 className="font-display text-lg font-semibold text-foreground">Registrar entrega</h2>
              <div className="grid gap-3 md:grid-cols-3">
                <div className="space-y-1.5">
                  <Label>Empleado</Label>
                  <Select value={entrega.empleadoId} onValueChange={(v) => setEntrega({ ...entrega, empleadoId: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {vinculados.map((e) => <SelectItem key={e.id} value={e.id}>{nombreEmpleado(e)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Tipo</Label>
                  <Select value={entrega.tipo} onValueChange={(v) => setEntrega({ ...entrega, tipo: v as TipoEntrega })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(Object.keys(TIPO_ENTREGA_LABEL) as TipoEntrega[]).map((t) => (
                        <SelectItem key={t} value={t}>{TIPO_ENTREGA_LABEL[t]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Fecha</Label>
                  <Input type="date" value={entrega.fecha} onChange={(e) => setEntrega({ ...entrega, fecha: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Elementos ({entrega.elementos.length})</Label>
                <div className="flex flex-wrap gap-2">
                  {ELEMENTOS_DOTACION.map((el) => {
                    const activo = entrega.elementos.includes(el);
                    const talla = tallasDe(tallas, entrega.empleadoId)?.[el];
                    return (
                      <button
                        key={el}
                        type="button"
                        onClick={() =>
                          setEntrega((prev) => ({
                            ...prev,
                            elementos: activo ? prev.elementos.filter((x) => x !== el) : [...prev.elementos, el],
                          }))
                        }
                        className={
                          activo
                            ? "rounded-full border border-primary bg-primary-soft px-3 py-1 text-xs font-medium text-primary"
                            : "rounded-full border border-border px-3 py-1 text-xs text-muted-foreground hover:bg-muted"
                        }
                      >
                        {ELEMENTO_LABEL[el]} {talla ? `· ${talla}` : ""}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Motivo (obligatorio en reposiciones)</Label>
                <Textarea
                  value={entrega.motivo}
                  maxLength={300}
                  onChange={(e) => setEntrega({ ...entrega, motivo: e.target.value })}
                  placeholder="Desgaste por uso, daño en operación, cambio de talla…"
                />
              </div>
              <Button
                size="sm"
                onClick={() => {
                  const fichaEmp = tallasDe(tallas, entrega.empleadoId);
                  if (!entrega.elementos.length) return toast.error("Seleccione al menos un elemento.");
                  if (!fichaEmp) return toast.error("Registre primero la ficha de tallas del empleado.");
                  if (entrega.tipo === "reposicion" && entrega.motivo.trim().length < 5)
                    return toast.error("Indique el motivo de la reposición.");
                  const items: ItemEntrega[] = entrega.elementos.map((el) => ({
                    elemento: el,
                    talla: fichaEmp[el],
                    cantidad: 1,
                  }));
                  registrarEntrega({
                    empleadoId: entrega.empleadoId,
                    tipo: entrega.tipo,
                    fecha: entrega.fecha,
                    items,
                    motivo: entrega.motivo,
                    responsable: "Almacén / SST",
                  });
                  setEntrega({ ...entrega, elementos: [], motivo: "" });
                  toast.success("Entrega registrada. Queda pendiente la aceptación digital del empleado.");
                }}
              >
                Registrar entrega
              </Button>
            </div>
          )}

          <DataTable columns={columns} rows={entregas} emptyMessage="Sin entregas de dotación registradas." />
        </TabsContent>

        <TabsContent value="tallas" className="space-y-4">
          <div className="surface-panel space-y-4 p-5">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Empleado</Label>
                <Select
                  value={fichaId}
                  onValueChange={(v) => { setFichaId(v); setBorrador(null); }}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {vinculados.map((e) => <SelectItem key={e.id} value={e.id}>{nombreEmpleado(e)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end text-xs text-muted-foreground">
                {fichaActual
                  ? `Actualizada el ${tallas.find((t) => t.empleadoId === fichaId)?.actualizadoEn} por ${tallas.find((t) => t.empleadoId === fichaId)?.actualizadoPor}`
                  : "Sin ficha de tallas registrada"}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {ELEMENTOS_DOTACION.map((el) => (
                <div key={el} className="space-y-1.5">
                  <Label>{ELEMENTO_LABEL[el]}</Label>
                  <Select
                    value={tallasEnEdicion[el] ?? ""}
                    disabled={!gestiona}
                    onValueChange={(v) =>
                      setBorrador({ ...(tallasEnEdicion as TallasEmpleado), [el]: v } as TallasEmpleado)
                    }
                  >
                    <SelectTrigger><SelectValue placeholder="Talla" /></SelectTrigger>
                    <SelectContent>
                      {TALLAS_POR_ELEMENTO[el].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>

            {gestiona && (
              <Button
                size="sm"
                onClick={() => {
                  const completo = ELEMENTOS_DOTACION.every((el) => tallasEnEdicion[el]);
                  if (!completo) return toast.error("Registre la talla de los cinco elementos.");
                  guardarTallas(fichaId, tallasEnEdicion as TallasEmpleado, "Talento Humano");
                  setBorrador(null);
                  toast.success("Ficha de tallas actualizada.");
                }}
              >
                Guardar tallas
              </Button>
            )}
          </div>

          <div className="surface-panel overflow-x-auto p-0">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3 text-left">Empleado</th>
                  {ELEMENTOS_DOTACION.map((el) => (
                    <th key={el} className="px-4 py-3 text-left">{ELEMENTO_LABEL[el]}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tallas.map((t) => (
                  <tr key={t.empleadoId} className="border-b border-border/70 last:border-0 hover:bg-muted/40">
                    <td className="px-4 py-3 font-medium text-foreground">{nombrePor[t.empleadoId] ?? t.empleadoId}</td>
                    {ELEMENTOS_DOTACION.map((el) => (
                      <td key={el} className="px-4 py-3 tabular-nums text-muted-foreground">{t.tallas[el]}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}
