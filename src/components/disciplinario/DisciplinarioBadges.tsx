import { cn } from "@/lib/utils";
import {
  ACCION_DISCIPLINARIA_LABEL,
  CATEGORIA_OBSERVACION_LABEL,
  ESTADO_INCIDENCIA_LABEL,
  ETAPA_DISCIPLINARIA_LABEL,
  GRAVEDAD_FALTA_LABEL,
  TIPO_INSTRUMENTO_LABEL,
  type CategoriaObservacion,
  type EstadoIncidencia,
  type GravedadFalta,
  type PasoDisciplinario,
  type TipoInstrumento,
} from "@/types/disciplinario";

const BASE =
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap";
const PEND = "bg-warning/15 text-warning-foreground border-warning/40 dark:text-warning";
const OK = "bg-success/12 text-success border-success/30";
const NO = "bg-destructive/12 text-destructive border-destructive/30";
const INFO = "bg-primary-soft text-primary border-primary/25";
const MUTED = "bg-muted text-muted-foreground border-border";

const ESTILO_INCIDENCIA: Record<EstadoIncidencia, string> = {
  registrada: PEND,
  validada: INFO,
  desestimada: MUTED,
  escalada_rrhh: PEND,
  en_descargos: INFO,
  sancionada: NO,
  archivada: MUTED,
};

export function EstadoIncidenciaBadge({ estado }: { estado: EstadoIncidencia }) {
  return (
    <span className={cn(BASE, ESTILO_INCIDENCIA[estado])}>
      <span className="size-1.5 rounded-full bg-current" />
      {ESTADO_INCIDENCIA_LABEL[estado]}
    </span>
  );
}

const ESTILO_GRAVEDAD: Record<GravedadFalta, string> = {
  leve: OK,
  grave: PEND,
  gravisima: NO,
};

export function GravedadFaltaBadge({ gravedad }: { gravedad: GravedadFalta }) {
  return <span className={cn(BASE, ESTILO_GRAVEDAD[gravedad])}>{GRAVEDAD_FALTA_LABEL[gravedad]}</span>;
}

const ESTILO_CATEGORIA: Record<CategoriaObservacion, string> = {
  desempeno: INFO,
  comportamiento: MUTED,
  reconocimiento: OK,
  seguimiento: PEND,
  riesgo: NO,
};

export function CategoriaObservacionBadge({ categoria }: { categoria: CategoriaObservacion }) {
  return (
    <span className={cn(BASE, ESTILO_CATEGORIA[categoria])}>
      {CATEGORIA_OBSERVACION_LABEL[categoria]}
    </span>
  );
}

export function TipoInstrumentoBadge({ tipo }: { tipo: TipoInstrumento }) {
  return <span className={cn(BASE, INFO)}>{TIPO_INSTRUMENTO_LABEL[tipo]}</span>;
}

export function ResultadoBadge({ puntaje, aprobado }: { puntaje?: number; aprobado?: boolean }) {
  if (typeof puntaje !== "number") {
    return <span className={cn(BASE, MUTED)}>Sin calificación</span>;
  }
  return (
    <span className={cn(BASE, aprobado ? OK : NO)}>
      {puntaje}% · {aprobado ? "Aprobado" : "Reprobado"}
    </span>
  );
}

/** Traza permanente del flujo disciplinario. */
export function TrazaDisciplinaria({ pasos }: { pasos: PasoDisciplinario[] }) {
  return (
    <ol className="space-y-3">
      {pasos.map((p, i) => (
        <li key={`${p.fecha}-${p.hora}-${i}`} className="flex gap-3">
          <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />
          <div className="min-w-0 space-y-0.5">
            <p className="text-sm font-medium text-foreground">
              {ACCION_DISCIPLINARIA_LABEL[p.accion]}
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                {ETAPA_DISCIPLINARIA_LABEL[p.etapa]} · {p.actor}
              </span>
            </p>
            <p className="text-xs text-muted-foreground">
              {p.fecha} · {p.hora}
            </p>
            {p.nota && <p className="text-sm text-muted-foreground">{p.nota}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}
