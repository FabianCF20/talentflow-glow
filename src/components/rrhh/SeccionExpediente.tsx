import type { ReactNode } from "react";
import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";

export function SeccionExpediente({
  titulo,
  descripcion,
  soloRrhh,
  children,
}: {
  titulo: string;
  descripcion?: string;
  soloRrhh?: boolean;
  children: ReactNode;
}) {
  return (
    <section className="surface-panel p-5">
      <header className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {titulo}
          </h2>
          {descripcion && <p className="mt-1 text-xs text-muted-foreground">{descripcion}</p>}
        </div>
        {soloRrhh && (
          <span className="inline-flex items-center gap-1 rounded-full border border-warning/40 bg-warning/15 px-2 py-0.5 text-xs font-medium text-warning-foreground dark:text-warning">
            <Lock className="size-3" /> Solo RRHH
          </span>
        )}
      </header>
      {children}
    </section>
  );
}

export function CampoDato({
  label,
  value,
  className,
}: {
  label: string;
  value: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-0.5", className)}>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="text-sm text-foreground">{value}</dd>
    </div>
  );
}

export function GridDatos({ children }: { children: ReactNode }) {
  return <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</dl>;
}
