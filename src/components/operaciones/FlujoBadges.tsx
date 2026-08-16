import { cn } from "@/lib/utils";
import {
  ESTADO_HORA_EXTRA_LABEL,
  ESTADO_INCAPACIDAD_OP_LABEL,
  ESTADO_SOLICITUD_OP_LABEL,
  ETAPA_LABEL,
  type EstadoHoraExtra,
  type EstadoIncapacidadOp,
  type EstadoSolicitudOperativa,
  type PasoFlujo,
} from "@/types/operaciones";

const PEND = "bg-warning/15 text-warning-foreground border-warning/40 dark:text-warning";
const OK = "bg-success/12 text-success border-success/30";
const NO = "bg-destructive/10 text-destructive border-destructive/30";
const INFO = "bg-primary-soft text-primary border-primary/25";

const BASE =
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium";

const ESTILO_SOLICITUD: Record<EstadoSolicitudOperativa, string> = {
  pendiente_jefe: PEND,
  pendiente_rrhh: PEND,
  aprobada: OK,
  rechazada: NO,
  reprogramada: INFO,
};

const ESTILO_INCAPACIDAD: Record<EstadoIncapacidadOp, string> = {
  radicada: PEND,
  validada: OK,
  rechazada: NO,
  en_transcripcion: INFO,
  pagada: OK,
};

const ESTILO_HORA_EXTRA: Record<EstadoHoraExtra, string> = {
  pendiente_jefe: PEND,
  pendiente_nomina: PEND,
  liquidada: OK,
  rechazada: NO,
};

export function EstadoSolicitudOpBadge({ estado }: { estado: EstadoSolicitudOperativa }) {
  return (
    <span className={cn(BASE, ESTILO_SOLICITUD[estado])}>
      <span className="size-1.5 rounded-full bg-current" />
      {ESTADO_SOLICITUD_OP_LABEL[estado]}
    </span>
  );
}

export function EstadoIncapacidadBadge({ estado }: { estado: EstadoIncapacidadOp }) {
  return (
    <span className={cn(BASE, ESTILO_INCAPACIDAD[estado])}>
      <span className="size-1.5 rounded-full bg-current" />
      {ESTADO_INCAPACIDAD_OP_LABEL[estado]}
    </span>
  );
}

export function EstadoHoraExtraBadge({ estado }: { estado: EstadoHoraExtra }) {
  return (
    <span className={cn(BASE, ESTILO_HORA_EXTRA[estado])}>
      <span className="size-1.5 rounded-full bg-current" />
      {ESTADO_HORA_EXTRA_LABEL[estado]}
    </span>
  );
}

const ACCION_LABEL: Record<PasoFlujo["accion"], string> = {
  radicada: "Radicada",
  aprobada: "Aprobada",
  rechazada: "Rechazada",
  fechas_modificadas: "Fechas modificadas",
  reprogramada: "Reprogramada",
  notificada: "Notificada",
};

/** Traza del flujo de aprobación paso a paso. */
export function FlujoTraza({ pasos }: { pasos: PasoFlujo[] }) {
  return (
    <ol className="mt-3 space-y-2 border-l border-border pl-4">
      {pasos.map((p, i) => (
        <li key={`${p.etapa}-${i}`} className="relative text-xs">
          <span
            className={cn(
              "absolute -left-[21px] top-1 size-2.5 rounded-full border-2 border-background",
              p.accion === "rechazada" ? "bg-destructive" : "bg-primary",
            )}
          />
          <p className="font-medium text-foreground">
            {ETAPA_LABEL[p.etapa]} · {ACCION_LABEL[p.accion]}
          </p>
          <p className="text-muted-foreground">
            {p.responsable} · {p.fecha}
            {p.comentario ? ` · ${p.comentario}` : ""}
          </p>
        </li>
      ))}
    </ol>
  );
}
