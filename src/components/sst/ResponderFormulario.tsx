/**
 * Componente compartido para diligenciar un formulario dinámico.
 * Lo usan el constructor (/formularios) y el Portal del Empleado.
 */
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Formulario, ValorRespuesta } from "@/types/sst";

export function ResponderFormulario({
  formulario,
  onEnviar,
}: {
  formulario: Formulario;
  /** Recibe los valores ya validados; el padre decide dónde guardarlos. */
  onEnviar: (valores: Record<string, ValorRespuesta>) => void;
}) {
  const [respuesta, setRespuesta] = useState<Record<string, ValorRespuesta>>({});

  const enviar = () => {
    const faltante = formulario.campos.find((c) => {
      if (!c.requerido) return false;
      const v = respuesta[c.id];
      return v === undefined || v === "" || (Array.isArray(v) && v.length === 0);
    });
    if (faltante) return toast.error(`Responda la pregunta obligatoria: ${faltante.etiqueta}`);
    onEnviar(respuesta);
    setRespuesta({});
  };

  return (
    <div className="space-y-4">
      {formulario.campos.map((c) => (
        <div key={c.id} className="space-y-2 rounded-lg border border-border p-4">
          <Label>
            {c.etiqueta} {c.requerido && <span className="text-destructive">*</span>}
          </Label>

          {c.tipo === "texto" && (
            <Textarea
              maxLength={500}
              value={String(respuesta[c.id] ?? "")}
              onChange={(e) => setRespuesta({ ...respuesta, [c.id]: e.target.value })}
            />
          )}

          {c.tipo === "seleccion_unica" && (
            <Select value={String(respuesta[c.id] ?? "")} onValueChange={(v) => setRespuesta({ ...respuesta, [c.id]: v })}>
              <SelectTrigger><SelectValue placeholder="Seleccione" /></SelectTrigger>
              <SelectContent>
                {(c.opciones ?? []).map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
              </SelectContent>
            </Select>
          )}

          {c.tipo === "seleccion_multiple" && (
            <div className="grid gap-2 sm:grid-cols-2">
              {(c.opciones ?? []).map((o) => {
                const actuales = (respuesta[c.id] as string[] | undefined) ?? [];
                return (
                  <label key={o} className="flex items-center gap-2 text-sm text-foreground">
                    <Checkbox
                      checked={actuales.includes(o)}
                      onCheckedChange={(v) =>
                        setRespuesta({
                          ...respuesta,
                          [c.id]: v ? [...actuales, o] : actuales.filter((x) => x !== o),
                        })
                      }
                    />
                    {o}
                  </label>
                );
              })}
            </div>
          )}

          {c.tipo === "booleano" && (
            <div className="flex items-center gap-3">
              <Switch
                checked={Boolean(respuesta[c.id])}
                onCheckedChange={(v) => setRespuesta({ ...respuesta, [c.id]: v })}
              />
              <span className="text-sm text-muted-foreground">
                {respuesta[c.id] ? "Verdadero" : "Falso"}
              </span>
            </div>
          )}

          {c.tipo === "escala" && (
            <div className="flex flex-wrap gap-2">
              {Array.from(
                { length: (c.escalaMax ?? 5) - (c.escalaMin ?? 1) + 1 },
                (_, i) => (c.escalaMin ?? 1) + i,
              ).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRespuesta({ ...respuesta, [c.id]: n })}
                  className={
                    respuesta[c.id] === n
                      ? "size-9 rounded-md border border-primary bg-primary text-sm font-semibold text-primary-foreground"
                      : "size-9 rounded-md border border-border text-sm text-muted-foreground hover:bg-muted"
                  }
                >
                  {n}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}

      <Button size="sm" onClick={enviar}>Enviar respuesta</Button>
    </div>
  );
}
