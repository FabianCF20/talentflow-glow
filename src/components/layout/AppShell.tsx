import { useEffect, useState, type ReactNode } from "react";
import { AppSidebar } from "./AppSidebar";
import { TopBar } from "./TopBar";
import { cn } from "@/lib/utils";

/** Minutos de inactividad antes del cierre automático de sesión. */
const IDLE_MINUTES = 15;

export function AppShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [idleWarning, setIdleWarning] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const reset = () => {
      setIdleWarning(false);
      clearTimeout(timer);
      timer = setTimeout(() => setIdleWarning(true), IDLE_MINUTES * 60_000);
    };
    const events = ["mousemove", "keydown", "click", "scroll"];
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();
    return () => {
      clearTimeout(timer);
      events.forEach((e) => window.removeEventListener(e, reset));
    };
  }, []);

  return (
    <div className="flex min-h-screen w-full bg-background">
      <div className="sticky top-0 hidden h-screen shrink-0 lg:block">
        <AppSidebar collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} />
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-foreground/50"
            onClick={() => setMobileOpen(false)}
            aria-hidden
          />
          <div className="absolute inset-y-0 left-0">
            <AppSidebar collapsed={false} onToggle={() => {}} onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      <div className={cn("flex min-w-0 flex-1 flex-col")}>
        <TopBar onOpenMobileNav={() => setMobileOpen(true)} />
        {idleWarning && (
          <div className="border-b border-warning/40 bg-warning/15 px-6 py-2 text-xs text-foreground">
            Sesión inactiva por {IDLE_MINUTES} minutos. Por seguridad la sesión se cerrará
            automáticamente.
          </div>
        )}
        <main className="flex-1 px-4 py-6 lg:px-8 lg:py-8">
          <div className="mx-auto w-full max-w-[1400px] space-y-6">{children}</div>
        </main>
        <footer className="border-t border-border px-4 py-4 text-xs text-muted-foreground lg:px-8">
          SIGTH · Sistema Integral de Gestión de Talento Humano — Todos los registros son trazables y
          auditados.
        </footer>
      </div>
    </div>
  );
}
