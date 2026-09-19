import {
  ArrowRightLeft,
  BadgeCheck,
  CalendarPlus,
  Coins,
  FileSignature,
  LogOut,
  RefreshCw,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { TIPO_EVENTO_LABEL, type EventoHojaVida, type TipoEventoHV } from "@/types/rrhh";
import { ordenarEventos } from "@/lib/rrhh";
import { cn } from "@/lib/utils";

const ICONS: Record<TipoEventoHV, LucideIcon> = {
  ingreso: CalendarPlus,
  ascenso: BadgeCheck,
  cambio_salarial: Coins,
  traslado: ArrowRightLeft,
  renovacion: FileSignature,
  terminacion: LogOut,
  cambio_estado: RefreshCw,
};

const TONE: Record<TipoEventoHV, string> = {
  ingreso: "bg-primary-soft text-primary",
  ascenso: "bg-success/15 text-success",
  cambio_salarial: "bg-accent/50 text-accent-foreground",
  traslado: "bg-secondary text-secondary-foreground",
  renovacion: "bg-primary/10 text-primary",
  terminacion: "bg-destructive/10 text-destructive",
  cambio_estado: "bg-warning/15 text-warning-foreground dark:text-warning",
};

/** Línea de tiempo laboral: hoja de vida digital del empleado. */
export function TimelineLaboral({ eventos }: { eventos: EventoHojaVida[] }) {
  const orden = ordenarEventos(eventos);

  if (orden.length === 0) {
    return (
      <div className="surface-panel p-8 text-center text-sm text-muted-foreground">
        Sin eventos registrados en la hoja de vida.
      </div>
    );
  }

  return (
    <ol className="relative space-y-4 border-l border-border pl-6">
      {orden.map((ev) => {
        const Icon = ICONS[ev.tipo];
        return (
          <li key={ev.id} className="relative">
            <span
              className={cn(
                "absolute -left-[2.1rem] grid size-7 place-items-center rounded-full border border-border",
                TONE[ev.tipo],
              )}
            >
              <Icon className="size-3.5" />
            </span>
            <div className="surface-panel p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-md border border-border bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
                    {TIPO_EVENTO_LABEL[ev.tipo]}
                  </span>
                  <h3 className="text-sm font-semibold text-foreground">{ev.titulo}</h3>
                </div>
                <span className="tabular-nums text-xs text-muted-foreground">{ev.fecha}</span>
              </div>
              <p className="mt-1.5 text-sm text-muted-foreground">{ev.detalle}</p>
              {(ev.valorAnterior || ev.valorNuevo) && (
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                  <span className="text-muted-foreground line-through decoration-destructive/60">
                    {ev.valorAnterior ?? "—"}
                  </span>
                  <ArrowRightLeft className="size-3 text-muted-foreground" />
                  <span className="font-medium text-foreground">{ev.valorNuevo ?? "—"}</span>
                </div>
              )}
              <p className="mt-2 text-xs text-muted-foreground">Registrado por {ev.registradoPor}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
