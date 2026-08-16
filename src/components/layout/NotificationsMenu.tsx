import { useState } from "react";
import { Bell, CheckCheck } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { NOTIFICACIONES } from "@/data/mock";
import type { NotificationLevel } from "@/types/entities";
import { cn } from "@/lib/utils";

const LEVEL_DOT: Record<NotificationLevel, string> = {
  info: "bg-info",
  exito: "bg-success",
  alerta: "bg-warning",
  critico: "bg-destructive",
};

export function NotificationsMenu() {
  const [items, setItems] = useState(NOTIFICACIONES);
  const unread = items.filter((n) => !n.leida).length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          aria-label="Notificaciones internas"
          className="relative grid size-9 place-items-center rounded-md border border-input bg-card text-muted-foreground transition-colors hover:text-foreground"
        >
          <Bell className="size-4.5" />
          {unread > 0 && (
            <span className="absolute -right-1 -top-1 grid min-w-4.5 place-items-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
              {unread}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-90 p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <p className="text-sm font-semibold">Notificaciones</p>
          <button
            onClick={() => setItems((prev) => prev.map((n) => ({ ...n, leida: true })))}
            className="flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <CheckCheck className="size-3.5" /> Marcar leídas
          </button>
        </div>
        <ul className="max-h-90 overflow-y-auto">
          {items.map((n) => (
            <li
              key={n.id}
              className={cn(
                "flex gap-3 border-b border-border/70 px-4 py-3 last:border-0",
                !n.leida && "bg-primary-soft/40",
              )}
            >
              <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", LEVEL_DOT[n.nivel])} />
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{n.titulo}</p>
                <p className="text-xs text-muted-foreground">{n.mensaje}</p>
                <p className="mt-1 text-[11px] text-muted-foreground/80">
                  {n.modulo} · {n.fecha}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
