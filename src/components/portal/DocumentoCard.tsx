/**
 * Tarjeta de documento del expediente con versiones, vigencia y descarga.
 */
import { useState } from "react";
import { toast } from "sonner";
import { ChevronDown, Download, History, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { descargarDocumento, diasParaVencer, estadoVigencia, ultimaVersion } from "@/lib/documentos";
import {
  CATEGORIA_DOC_LABEL,
  VIGENCIA_LABEL,
  type DocumentoEmpleado,
  type EstadoVigencia,
} from "@/types/portal";
import type { EmpleadoRRHH } from "@/types/rrhh";

const VIGENCIA_STYLE: Record<EstadoVigencia, string> = {
  vigente: "bg-success/12 text-success border-success/30",
  por_vencer: "bg-warning/15 text-warning-foreground border-warning/40 dark:text-warning",
  vencido: "bg-destructive/10 text-destructive border-destructive/30",
  sin_vencimiento: "bg-muted text-muted-foreground border-border",
};

export function VigenciaBadge({ documento }: { documento: DocumentoEmpleado }) {
  const estado = estadoVigencia(documento);
  const dias = diasParaVencer(documento);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        VIGENCIA_STYLE[estado],
      )}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {VIGENCIA_LABEL[estado]}
      {dias !== null && estado !== "sin_vencimiento" && (
        <span className="opacity-70">
          {dias < 0 ? `hace ${Math.abs(dias)} d` : `en ${dias} d`}
        </span>
      )}
    </span>
  );
}

/** Tarjeta de documento con descarga, versionamiento e historial. */
export function DocumentoCard({
  documento,
  empleado,
  onNuevaVersion,
  subtitulo,
}: {
  documento: DocumentoEmpleado;
  empleado?: EmpleadoRRHH;
  onNuevaVersion?: (archivo: File, nota: string, fechaVencimiento?: string) => Promise<void>;
  subtitulo?: string;
}) {
  const [abierto, setAbierto] = useState(false);
  const [nota, setNota] = useState("");
  const [vence, setVence] = useState(documento.fechaVencimiento ?? "");
  const [archivoVersion, setArchivoVersion] = useState<File | null>(null);
  const [subiendoVersion, setSubiendoVersion] = useState(false);
  const ultima = ultimaVersion(documento);

  return (
    <div className="surface-panel p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{documento.nombre}</p>
          <p className="text-xs text-muted-foreground">
            {CATEGORIA_DOC_LABEL[documento.categoria]} · v{ultima.version} · {ultima.tamanoKb} KB ·{" "}
            {ultima.fecha}
            {subtitulo ? ` · ${subtitulo}` : ""}
          </p>
        </div>
        <VigenciaBadge documento={documento} />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button size="sm" variant="outline" disabled={!ultima.storagePath} onClick={() => void descargarDocumento(documento, ultima, empleado).catch((error) => toast.error(error instanceof Error ? error.message : "No se pudo descargar el archivo."))}>
          <Download className="size-4" /> {ultima.storagePath ? "Descargar v" + ultima.version : "Archivo no disponible"}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setAbierto((v) => !v)}>
          <History className="size-4" /> Historial ({documento.versiones.length})
          <ChevronDown className={cn("size-4 transition-transform", abierto && "rotate-180")} />
        </Button>
      </div>

      {abierto && (
        <div className="mt-3 space-y-2 border-t border-border pt-3">
          {[...documento.versiones]
            .sort((a, b) => b.version - a.version)
            .map((v) => (
              <div key={v.version} className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div>
                  <p className="font-medium text-foreground">
                    v{v.version} · {v.nombreArchivo}
                  </p>
                  <p className="text-muted-foreground">
                    {v.fecha} · {v.subidoPor} · {v.tamanoKb} KB · {v.nota ?? "Sin observaciones"}
                  </p>
                </div>
                <Button size="sm" variant="ghost" disabled={!v.storagePath} onClick={() => void descargarDocumento(documento, v, empleado).catch((error) => toast.error(error instanceof Error ? error.message : "No se pudo descargar el archivo."))}>
                  <Download className="size-3.5" /> {v.storagePath ? "Descargar" : "Sin archivo"}
                </Button>
              </div>
            ))}

          {onNuevaVersion && (
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <Input
                value={nota}
                maxLength={140}
                placeholder="Nota de la nueva versión"
                className="h-9 flex-1"
                onChange={(e) => setNota(e.target.value)}
              />
              <Input type="file" accept=".pdf,application/pdf" className="max-w-xs" onChange={(event) => setArchivoVersion(event.target.files?.[0] ?? null)} />
              <Button size="sm" disabled={!archivoVersion || subiendoVersion} onClick={async () => {
                if (!archivoVersion) return;
                if (archivoVersion.type !== "application/pdf" || archivoVersion.size <= 0 || archivoVersion.size > 5 * 1024 * 1024 || (await archivoVersion.slice(0, 5).text()) !== "%PDF-") {
                  toast.error("Selecciona un PDF válido de máximo 5 MB.");
                  return;
                }
                setSubiendoVersion(true);
                try {
                  await onNuevaVersion(archivoVersion, nota.trim() || ("Nueva versión v" + (documento.versiones.length + 1)), vence || undefined);
                  setArchivoVersion(null);
                  setNota("");
                  toast.success("Nueva versión almacenada correctamente.");
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : "No se pudo cargar la nueva versión.");
                } finally {
                  setSubiendoVersion(false);
                }
              }}>
                <Upload className="size-4" /> {subiendoVersion ? "Cargando..." : "Cargar nueva versión"}
              </Button>
              <div className="w-full space-y-1">
                <label htmlFor={`vence-${documento.id}`} className="text-xs text-muted-foreground">Nueva fecha de vencimiento</label>
                <Input id={`vence-${documento.id}`} type="date" value={vence} onChange={(e) => setVence(e.target.value)} className="max-w-xs" />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
