import { cn } from "@/lib/utils";
import {
  CONCEPTO_LABEL,
  ESTADO_INVESTIGACION_LABEL,
  GRAVEDAD_LABEL,
  type ConceptoMedico,
  type EstadoInvestigacion,
  type GravedadSST,
} from "@/types/sst";

const base =
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap";

const CONCEPTO_STYLES: Record<ConceptoMedico, string> = {
  pendiente: "bg-muted text-muted-foreground border-border",
  apto: "bg-success/12 text-success border-success/30",
  apto_con_restricciones: "bg-warning/15 text-warning-foreground border-warning/40 dark:text-warning",
  no_apto: "bg-destructive/12 text-destructive border-destructive/30",
};

export function ConceptoBadge({ concepto }: { concepto: ConceptoMedico }) {
  return (
    <span className={cn(base, CONCEPTO_STYLES[concepto])}>
      <span className="size-1.5 rounded-full bg-current" />
      {CONCEPTO_LABEL[concepto]}
    </span>
  );
}

const GRAVEDAD_STYLES: Record<GravedadSST, string> = {
  leve: "bg-success/12 text-success border-success/30",
  moderado: "bg-warning/15 text-warning-foreground border-warning/40 dark:text-warning",
  grave: "bg-destructive/12 text-destructive border-destructive/30",
  mortal: "bg-destructive text-destructive-foreground border-destructive",
};

export function GravedadBadge({ gravedad }: { gravedad: GravedadSST }) {
  return <span className={cn(base, GRAVEDAD_STYLES[gravedad])}>{GRAVEDAD_LABEL[gravedad]}</span>;
}

const INVESTIGACION_STYLES: Record<EstadoInvestigacion, string> = {
  abierto: "bg-destructive/12 text-destructive border-destructive/30",
  en_investigacion: "bg-warning/15 text-warning-foreground border-warning/40 dark:text-warning",
  cerrado: "bg-success/12 text-success border-success/30",
};

export function InvestigacionBadge({ estado }: { estado: EstadoInvestigacion }) {
  return (
    <span className={cn(base, INVESTIGACION_STYLES[estado])}>{ESTADO_INVESTIGACION_LABEL[estado]}</span>
  );
}

export function VigenciaExamenBadge({ dias }: { dias: number | null }) {
  if (dias === null) {
    return <span className={cn(base, "bg-muted text-muted-foreground border-border")}>Sin vigencia</span>;
  }
  if (dias < 0) {
    return (
      <span className={cn(base, "bg-destructive/12 text-destructive border-destructive/30")}>
        Vencido hace {Math.abs(dias)} días
      </span>
    );
  }
  if (dias <= 60) {
    return (
      <span className={cn(base, "bg-warning/15 text-warning-foreground border-warning/40 dark:text-warning")}>
        Vence en {dias} días
      </span>
    );
  }
  return <span className={cn(base, "bg-success/12 text-success border-success/30")}>Vigente ({dias} días)</span>;
}

export function AceptacionBadge({ aceptado }: { aceptado: boolean }) {
  return aceptado ? (
    <span className={cn(base, "bg-success/12 text-success border-success/30")}>
      <span className="size-1.5 rounded-full bg-current" />
      Aceptada digitalmente
    </span>
  ) : (
    <span className={cn(base, "bg-warning/15 text-warning-foreground border-warning/40 dark:text-warning")}>
      <span className="size-1.5 rounded-full bg-current" />
      Pendiente de aceptación
    </span>
  );
}

/** Barra simple de distribución para estadísticas de formularios. */
export function BarraDistribucion({
  etiqueta,
  total,
  porcentaje,
}: {
  etiqueta: string;
  total: number;
  porcentaje: number;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-foreground">{etiqueta}</span>
        <span className="tabular-nums text-muted-foreground">
          {total} · {porcentaje}%
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary" style={{ width: `${porcentaje}%` }} />
      </div>
    </div>
  );
}
