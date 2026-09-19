import { cn } from "@/lib/utils";
import { ESTADO_LABORAL_LABEL, type EstadoLaboral } from "@/types/rrhh";

const STYLES: Record<EstadoLaboral, string> = {
  activo: "bg-success/12 text-success border-success/30",
  vacaciones: "bg-primary/10 text-primary border-primary/30",
  incapacidad: "bg-warning/15 text-warning-foreground border-warning/40 dark:text-warning",
  licencia: "bg-accent/40 text-accent-foreground border-border",
  suspendido: "bg-destructive/10 text-destructive border-destructive/30",
  retirado: "bg-muted text-muted-foreground border-border",
};

export function EstadoLaboralBadge({
  estado,
  className,
}: {
  estado: EstadoLaboral;
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
      {ESTADO_LABORAL_LABEL[estado]}
    </span>
  );
}
