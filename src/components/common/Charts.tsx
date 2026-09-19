import { cn } from "@/lib/utils";

/** Gráficos ligeros en SVG con tokens semánticos del sistema de diseño. */

export interface PuntoGrafico {
  label: string;
  valor: number;
}

const maxDe = (datos: PuntoGrafico[]) => Math.max(1, ...datos.map((d) => d.valor));

export function BarrasChart({
  datos,
  formato = (v: number) => String(v),
  altura = 180,
  className,
}: {
  datos: PuntoGrafico[];
  formato?: (v: number) => string;
  altura?: number;
  className?: string;
}) {
  const max = maxDe(datos);
  return (
    <div className={cn("flex items-end gap-1.5 overflow-x-auto pt-6", className)} style={{ minHeight: altura }}>
      {datos.map((d) => (
        <div key={d.label} className="flex min-w-8 flex-1 flex-col items-center gap-1.5">
          <span className="text-[10px] font-medium tabular-nums text-muted-foreground">
            {d.valor > 0 ? formato(d.valor) : ""}
          </span>
          <div
            className="w-full rounded-t bg-primary/85 transition-all"
            style={{ height: Math.max(2, (d.valor / max) * (altura - 44)) }}
            title={`${d.label}: ${formato(d.valor)}`}
          />
          <span className="text-[10px] text-muted-foreground">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

export function BarrasApiladas({
  datos,
  formato,
  altura = 200,
}: {
  datos: { label: string; series: { nombre: string; valor: number; clase: string }[] }[];
  formato: (v: number) => string;
  altura?: number;
}) {
  const max = Math.max(1, ...datos.map((d) => d.series.reduce((s, x) => s + x.valor, 0)));
  return (
    <div className="space-y-3">
      <div className="flex items-end gap-2 overflow-x-auto" style={{ minHeight: altura }}>
        {datos.map((d) => {
          const total = d.series.reduce((s, x) => s + x.valor, 0);
          return (
            <div key={d.label} className="flex min-w-10 flex-1 flex-col items-center gap-1.5">
              <div
                className="flex w-full flex-col-reverse justify-start overflow-hidden rounded-t"
                style={{ height: Math.max(2, (total / max) * (altura - 34)) }}
                title={`${d.label}: ${formato(total)}`}
              >
                {d.series.map((s) => (
                  <div
                    key={s.nombre}
                    className={s.clase}
                    style={{ height: `${total ? (s.valor / total) * 100 : 0}%` }}
                  />
                ))}
              </div>
              <span className="text-[10px] text-muted-foreground">{d.label}</span>
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        {(datos[0]?.series ?? []).map((s) => (
          <span key={s.nombre} className="inline-flex items-center gap-1.5">
            <span className={cn("size-2.5 rounded-sm", s.clase)} />
            {s.nombre}
          </span>
        ))}
      </div>
    </div>
  );
}

export function LineaChart({
  datos,
  formato = (v: number) => String(v),
  altura = 160,
}: {
  datos: PuntoGrafico[];
  formato?: (v: number) => string;
  altura?: number;
}) {
  const max = maxDe(datos);
  const w = 100;
  const puntos = datos.map((d, i) => {
    const x = datos.length > 1 ? (i / (datos.length - 1)) * w : 0;
    const y = 100 - (d.valor / max) * 92;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });
  return (
    <div className="space-y-2">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full" style={{ height: altura }}>
        <polyline
          points={puntos.join(" ")}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          vectorEffect="non-scaling-stroke"
          className="text-primary"
        />
        {datos.map((d, i) => {
          const [x, y] = (puntos[i] ?? "0,0").split(",");
          return <circle key={d.label} cx={x} cy={y} r="1.4" className="fill-primary" />;
        })}
      </svg>
      <div className="flex justify-between text-[10px] text-muted-foreground">
        {datos.map((d) => (
          <span key={d.label} title={formato(d.valor)}>
            {d.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export function DonaChart({
  datos,
  total,
  formato = (v: number) => String(v),
}: {
  datos: { label: string; valor: number; clase: string }[];
  total?: number;
  formato?: (v: number) => string;
}) {
  const suma = total ?? datos.reduce((s, d) => s + d.valor, 0);
  let acumulado = 0;
  const radio = 42;
  const circ = 2 * Math.PI * radio;
  return (
    <div className="flex flex-wrap items-center gap-5">
      <svg viewBox="0 0 100 100" className="size-32 -rotate-90">
        <circle cx="50" cy="50" r={radio} className="fill-none stroke-muted" strokeWidth="14" />
        {datos.map((d) => {
          const frac = suma ? d.valor / suma : 0;
          const dash = `${frac * circ} ${circ}`;
          const offset = -acumulado * circ;
          acumulado += frac;
          return (
            <circle
              key={d.label}
              cx="50"
              cy="50"
              r={radio}
              className={cn("fill-none", d.clase)}
              strokeWidth="14"
              strokeDasharray={dash}
              strokeDashoffset={offset}
            />
          );
        })}
      </svg>
      <ul className="space-y-1.5 text-sm">
        {datos.map((d) => (
          <li key={d.label} className="flex items-center gap-2">
            <span className={cn("size-2.5 rounded-sm", d.clase.replace("stroke-", "bg-"))} />
            <span className="text-muted-foreground">{d.label}</span>
            <span className="font-medium tabular-nums text-foreground">{formato(d.valor)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
