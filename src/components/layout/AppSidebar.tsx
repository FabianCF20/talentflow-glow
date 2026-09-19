import { Link, useRouterState } from "@tanstack/react-router";
import { ChevronsLeft, Lock } from "lucide-react";
import { NAV_GROUPS } from "@/config/navigation";
import { cn } from "@/lib/utils";

export function AppSidebar({
  collapsed,
  onToggle,
  onNavigate,
}: {
  collapsed: boolean;
  onToggle: () => void;
  onNavigate?: () => void;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <aside
      className={cn(
        "flex h-full flex-col bg-sidebar text-sidebar-foreground transition-[width] duration-200",
        collapsed ? "w-[72px]" : "w-[264px]",
      )}
    >
      <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-4">
        <span className="grid size-9 shrink-0 place-items-center rounded-md bg-sidebar-primary font-display text-sm font-bold text-sidebar-primary-foreground">
          SG
        </span>
        {!collapsed && (
          <div className="min-w-0">
            <p className="truncate font-display text-sm font-bold tracking-wide">SIGTH</p>
            <p className="truncate text-[11px] text-sidebar-foreground/60">Gestión de Talento Humano</p>
          </div>
        )}
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            {!collapsed && (
              <p className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-sidebar-foreground/45">
                {group.label}
              </p>
            )}
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = item.to
                  ? item.to === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.to)
                  : false;

                const content = (
                  <>
                    <item.icon className="size-4.5 shrink-0" />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                    {!collapsed && item.proximamente && (
                      <Lock className="ml-auto size-3.5 opacity-50" />
                    )}
                  </>
                );

                const base =
                  "flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-sm transition-colors";

                if (item.proximamente || !item.to) {
                  return (
                    <li key={item.label}>
                      <span
                        title={collapsed ? `${item.label} (próximamente)` : "Módulo pendiente"}
                        className={cn(base, "cursor-not-allowed text-sidebar-foreground/40")}
                      >
                        {content}
                      </span>
                    </li>
                  );
                }

                return (
                  <li key={item.label}>
                    <Link
                      to={item.to}
                      onClick={onNavigate}
                      title={collapsed ? item.label : undefined}
                      className={cn(
                        base,
                        active
                          ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground shadow-[inset_2px_0_0_var(--sidebar-primary)]"
                          : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                      )}
                    >
                      {content}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <button
        onClick={onToggle}
        className="hidden h-11 items-center gap-3 border-t border-sidebar-border px-4 text-xs text-sidebar-foreground/70 transition-colors hover:text-sidebar-accent-foreground lg:flex"
      >
        <ChevronsLeft className={cn("size-4 transition-transform", collapsed && "rotate-180")} />
        {!collapsed && <span>Contraer menú</span>}
      </button>
    </aside>
  );
}
