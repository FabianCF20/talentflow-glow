import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  trend,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  trend?: { value: string; positive?: boolean };
}) {
  return (
    <div className="surface-panel p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <span className="grid size-9 place-items-center rounded-md bg-primary-soft text-primary">
          <Icon className="size-4.5" />
        </span>
      </div>
      <p className="mt-3 font-display text-3xl font-semibold tabular-nums text-foreground">{value}</p>
      <div className="mt-1 flex items-center gap-2 text-xs">
        {trend && (
          <span
            className={cn(
              "font-medium",
              trend.positive === false ? "text-destructive" : "text-success",
            )}
          >
            {trend.value}
          </span>
        )}
        {hint && <span className="text-muted-foreground">{hint}</span>}
      </div>
    </div>
  );
}
