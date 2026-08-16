import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { EMPLEADOS_RRHH, EVENTOS_HV } from "@/data/rrhh";
import type { EmpleadoRRHH, EstadoLaboral, EventoHojaVida, InformacionLaboral } from "@/types/rrhh";
import { eventoPorEstado, generarEventosPorCambio } from "@/lib/rrhh";
import { ESTADO_LABORAL_LABEL } from "@/types/rrhh";
import type { RoleKey } from "@/types/entities";

interface RrhhContextValue {
  empleados: EmpleadoRRHH[];
  eventos: EventoHojaVida[];
  /** Rol simulado del usuario en sesión (mientras no exista autenticación real). */
  rolActivo: RoleKey;
  setRolActivo: (r: RoleKey) => void;
  empleadoActuandoId: string;
  setEmpleadoActuandoId: (id: string) => void;
  actualizarInformacionLaboral: (id: string, cambios: Partial<InformacionLaboral>) => number;
  cambiarEstadoLaboral: (id: string, estado: EstadoLaboral, motivo?: string) => void;
  toggleAcceso: (id: string) => void;
}

const RrhhContext = createContext<RrhhContextValue | null>(null);

export function RrhhProvider({ children }: { children: ReactNode }) {
  const [empleados, setEmpleados] = useState<EmpleadoRRHH[]>(EMPLEADOS_RRHH);
  const [eventos, setEventos] = useState<EventoHojaVida[]>(EVENTOS_HV);
  const [rolActivo, setRolActivo] = useState<RoleKey>("talento_humano");
  const [empleadoActuandoId, setEmpleadoActuandoId] = useState("e-004");

  const actor = useMemo(() => `Usuario (${rolActivo})`, [rolActivo]);

  const actualizarInformacionLaboral = useCallback(
    (id: string, cambios: Partial<InformacionLaboral>) => {
      let nuevos: EventoHojaVida[] = [];
      setEmpleados((prev) =>
        prev.map((e) => {
          if (e.id !== id) return e;
          const laboral = { ...e.laboral, ...cambios };
          nuevos = generarEventosPorCambio(id, e.laboral, laboral, actor);
          return { ...e, laboral };
        }),
      );
      if (nuevos.length) setEventos((prev) => [...prev, ...nuevos]);
      return nuevos.length;
    },
    [actor],
  );

  const cambiarEstadoLaboral = useCallback(
    (id: string, estado: EstadoLaboral, motivo?: string) => {
      let evento: EventoHojaVida | null = null;
      setEmpleados((prev) =>
        prev.map((e) => {
          if (e.id !== id || e.estadoLaboral === estado) return e;
          evento = eventoPorEstado(
            id,
            ESTADO_LABORAL_LABEL[e.estadoLaboral],
            ESTADO_LABORAL_LABEL[estado],
            actor,
          );
          const retirado = estado === "retirado";
          return {
            ...e,
            estadoLaboral: estado,
            estado: retirado ? "inactivo" : "activo",
            accesoHabilitado: retirado || estado === "suspendido" ? false : e.accesoHabilitado,
            laboral: {
              ...e.laboral,
              fechaRetiro: retirado ? new Date().toISOString().slice(0, 10) : undefined,
              motivoRetiro: retirado ? motivo ?? "Retiro registrado por Talento Humano" : undefined,
            },
          };
        }),
      );
      if (evento) setEventos((prev) => [...prev, evento!]);
    },
    [actor],
  );

  const toggleAcceso = useCallback((id: string) => {
    setEmpleados((prev) =>
      prev.map((e) =>
        e.id === id && e.estadoLaboral !== "retirado"
          ? { ...e, accesoHabilitado: !e.accesoHabilitado }
          : e,
      ),
    );
  }, []);

  const value = useMemo<RrhhContextValue>(
    () => ({
      empleados,
      eventos,
      rolActivo,
      setRolActivo,
      empleadoActuandoId,
      setEmpleadoActuandoId,
      actualizarInformacionLaboral,
      cambiarEstadoLaboral,
      toggleAcceso,
    }),
    [
      empleados,
      eventos,
      rolActivo,
      empleadoActuandoId,
      actualizarInformacionLaboral,
      cambiarEstadoLaboral,
      toggleAcceso,
    ],
  );

  return <RrhhContext.Provider value={value}>{children}</RrhhContext.Provider>;
}

export function useRrhh() {
  const ctx = useContext(RrhhContext);
  if (!ctx) throw new Error("useRrhh debe usarse dentro de RrhhProvider");
  return ctx;
}
