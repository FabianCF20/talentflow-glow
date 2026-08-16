import { cn } from "@/lib/utils";
import { ESTADO_SOLICITUD_LABEL, type EstadoSolicitud } from "@/types/portal";

const STYLES: Record<EstadoSolicitud, string> = {
  pendiente: "bg-warning/15 text-warning-foreground border-warning/40 dark:text-warning",
  aprobada: "bg-success/12 text-success border-success/30",
  rechazada: "bg-destructive/10 text-destructive border-destructive/30",
};

export function SolicitudBadge({
  estado,
  className,
}: {
  estado: EstadoSolicitud;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        STYLES[estado],
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {ESTADO_SOLICITUD_LABEL[estado]}
    </span>
  );
}
