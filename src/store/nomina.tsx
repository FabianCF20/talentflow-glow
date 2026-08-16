import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

import {
  LIQUIDACIONES_INICIALES,
  PERIODOS_INICIALES,
  RECURRENTES_INICIALES,
  VACACIONES_PENDIENTES_DEMO,
} from "@/data/nomina";
import { calcularDetalle, calcularLiquidacionFinal, hoyISO } from "@/lib/nomina";
import { useOperaciones } from "@/store/operaciones";
import { useRrhh } from "@/store/rrhh";
import { ESTADOS_VINCULADOS } from "@/types/rrhh";
import type {
  ConceptoRecurrente,
  LiquidacionFinal,
  MotivoLiquidacion,
  PeriodoNomina,
  TipoRecurrente,
} from "@/types/nomina";

/** Estado del módulo de nómina: periodos, conceptos recurrentes y liquidaciones. */
interface NominaContextValue {
  periodos: PeriodoNomina[];
  recurrentes: ConceptoRecurrente[];
  liquidaciones: LiquidacionFinal[];
  vacacionesPendientes: Record<string, number>;
  liquidarPeriodo: (periodoId: string, responsable: string) => number;
  marcarPagado: (periodoId: string) => void;
  agregarRecurrente: (input: {
    empleadoId: string;
    tipo: TipoRecurrente;
    descripcion: string;
    valorMensual: number;
  }) => void;
  toggleRecurrente: (id: string) => void;
  generarLiquidacion: (input: {
    empleadoId: string;
    motivo: MotivoLiquidacion;
    fechaRetiro: string;
    diasVacaciones: number;
    responsable: string;
  }) => LiquidacionFinal | null;
}

const NominaContext = createContext<NominaContextValue | null>(null);

export function NominaProvider({ children }: { children: ReactNode }) {
  const { empleados } = useRrhh();
  const { horasExtras } = useOperaciones();
  const [periodos, setPeriodos] = useState<PeriodoNomina[]>(PERIODOS_INICIALES);
  const [recurrentes, setRecurrentes] = useState<ConceptoRecurrente[]>(RECURRENTES_INICIALES);
  const [liquidaciones, setLiquidaciones] = useState<LiquidacionFinal[]>(LIQUIDACIONES_INICIALES);

  const liquidarPeriodo = useCallback(
    (periodoId: string, responsable: string) => {
      let cuantos = 0;
      setPeriodos((prev) =>
        prev.map((p) => {
          if (p.id !== periodoId) return p;
          const vinculados = empleados.filter((e) => ESTADOS_VINCULADOS.includes(e.estadoLaboral));
          const detalles = vinculados.map((emp) =>
            calcularDetalle({
              periodo: p,
              empleado: emp,
              horasExtras,
              recurrentes: recurrentes.filter((r) => r.empleadoId === emp.id),
            }),
          );
          cuantos = detalles.length;
          return {
            ...p,
            detalles,
            estado: "liquidada",
            liquidadoPor: responsable,
            fechaLiquidacion: hoyISO(),
          };
        }),
      );
      return cuantos;
    },
    [empleados, horasExtras, recurrentes],
  );

  const marcarPagado = useCallback((periodoId: string) => {
    setPeriodos((prev) => prev.map((p) => (p.id === periodoId ? { ...p, estado: "pagada" } : p)));
  }, []);

  const agregarRecurrente = useCallback<NominaContextValue["agregarRecurrente"]>((input) => {
    setRecurrentes((prev) => [
      ...prev,
      { id: `rc-${prev.length + 1}-${Date.now()}`, activo: true, ...input },
    ]);
  }, []);

  const toggleRecurrente = useCallback((id: string) => {
    setRecurrentes((prev) => prev.map((r) => (r.id === id ? { ...r, activo: !r.activo } : r)));
  }, []);

  const generarLiquidacion = useCallback<NominaContextValue["generarLiquidacion"]>(
    ({ empleadoId, motivo, fechaRetiro, diasVacaciones, responsable }) => {
      const empleado = empleados.find((e) => e.id === empleadoId);
      if (!empleado) return null;
      const liq = calcularLiquidacionFinal({
        empleado,
        motivo,
        fechaRetiro,
        diasVacacionesPendientes: diasVacaciones,
        registradoPor: responsable,
        consecutivo: `LIQ-${new Date().getFullYear()}-${String(liquidaciones.length + 1).padStart(4, "0")}`,
      });
      setLiquidaciones((prev) => [liq, ...prev.filter((x) => x.id !== liq.id)]);
      return liq;
    },
    [empleados, liquidaciones.length],
  );

  const value = useMemo<NominaContextValue>(
    () => ({
      periodos,
      recurrentes,
      liquidaciones,
      vacacionesPendientes: VACACIONES_PENDIENTES_DEMO,
      liquidarPeriodo,
      marcarPagado,
      agregarRecurrente,
      toggleRecurrente,
      generarLiquidacion,
    }),
    [
      periodos,
      recurrentes,
      liquidaciones,
      liquidarPeriodo,
      marcarPagado,
      agregarRecurrente,
      toggleRecurrente,
      generarLiquidacion,
    ],
  );

  return <NominaContext.Provider value={value}>{children}</NominaContext.Provider>;
}

export function useNomina() {
  const ctx = useContext(NominaContext);
  if (!ctx) throw new Error("useNomina debe usarse dentro de NominaProvider");
  return ctx;
}
