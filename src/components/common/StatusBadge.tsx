import { cn } from "@/lib/utils";
import { RECORD_STATUS_LABEL, type RecordStatus } from "@/types/entities";

const STYLES: Record<RecordStatus, string> = {
  activo: "bg-success/12 text-success border-success/30",
  inactivo: "bg-muted text-muted-foreground border-border",
  archivado: "bg-warning/15 text-warning-foreground border-warning/40 dark:text-warning",
};

export function StatusBadge({ status, className }: { status: RecordStatus; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        STYLES[status],
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {RECORD_STATUS_LABEL[status]}
    </span>
  );
}
