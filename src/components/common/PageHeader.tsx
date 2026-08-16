import type { ReactNode } from "react";

export function PageHeader({
  title,
  description,
  breadcrumb,
  actions,
}: {
  title: string;
  description?: string;
  breadcrumb?: string[];
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-4 border-b border-border pb-5 md:flex-row md:items-end md:justify-between">
      <div className="space-y-1.5">
        {breadcrumb && breadcrumb.length > 0 && (
          <nav className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {breadcrumb.join(" / ")}
          </nav>
        )}
        <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
        {description && <p className="max-w-2xl text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}
