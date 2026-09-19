import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Search } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { SEARCH_INDEX } from "@/data/mock";

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const grupos = useMemo(() => {
    return SEARCH_INDEX.reduce<Record<string, typeof SEARCH_INDEX>>((acc, entry) => {
      (acc[entry.categoria] ||= []).push(entry);
      return acc;
    }, {});
  }, []);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex h-9 w-full max-w-md items-center gap-2 rounded-md border border-input bg-card px-3 text-sm text-muted-foreground transition-colors hover:border-ring"
      >
        <Search className="size-4" />
        <span className="truncate">Buscar empleados, módulos, registros…</span>
        <kbd className="ml-auto hidden rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium sm:inline">
          Ctrl K
        </kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Buscar en todo el sistema…" />
        <CommandList>
          <CommandEmpty>Sin resultados.</CommandEmpty>
          {Object.entries(grupos).map(([categoria, entries]) => (
            <CommandGroup key={categoria} heading={categoria}>
              {entries.map((entry) => (
                <CommandItem
                  key={entry.id}
                  value={`${entry.titulo} ${entry.detalle}`}
                  onSelect={() => {
                    setOpen(false);
                    if (entry.to) navigate({ to: entry.to });
                  }}
                >
                  <div className="flex flex-col">
                    <span className="text-sm">{entry.titulo}</span>
                    <span className="text-xs text-muted-foreground">{entry.detalle}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
        </CommandList>
      </CommandDialog>
    </>
  );
}
