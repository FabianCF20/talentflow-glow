import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import {
  EVALUACIONES_INICIALES,
  INCIDENCIAS_INICIALES,
  OBSERVACIONES_INICIALES,
  RESPUESTAS_EVALUACION_INICIALES,
} from "@/data/disciplinario";
import { calificar, consecutivoDisciplinario, horaActual, hoyISO } from "@/lib/disciplinario";
import type { AsignacionFormulario, ValorRespuesta } from "@/types/sst";
import type {
  ActuacionDisciplinaria,
  CampoEvaluacion,
  CategoriaObservacion,
  Evaluacion,
  GravedadFalta,
  Incidencia,
  ObservacionInterna,
  RespuestaEvaluacion,
  TipoFalta,
  TipoInstrumento,
  TipoSancion,
} from "@/types/disciplinario";
import type { RoleKey } from "@/types/entities";

/**
 * Estado del módulo disciplinario (flujo Supervisor → Jefe → RRHH),
 * observaciones internas no visibles para el empleado y evaluaciones.
 * El historial es permanente: los registros solo se archivan.
 */
interface DisciplinarioContextValue {
  incidencias: Incidencia[];
  observaciones: ObservacionInterna[];
  evaluaciones: Evaluacion[];
  respuestas: RespuestaEvaluacion[];

  registrarIncidencia: (input: {
    empleadoId: string;
    tipo: TipoFalta;
    gravedadPresunta: GravedadFalta;
    fecha: string;
    hora: string;
    descripcion: string;
    evidencia?: string;
    responsable: string;
  }) => void;
  validarIncidencia: (id: string, nota: string, responsable: string) => void;
  desestimarIncidencia: (id: string, nota: string, responsable: string) => void;
  escalarIncidencia: (id: string, nota: string, responsable: string) => void;
  registrarActuacion: (
    id: string,
    input: {
      tipo: ActuacionDisciplinaria["tipo"];
      detalle: string;
      versionEmpleado?: string;
      tipoSancion?: TipoSancion;
      diasSuspension?: number;
      responsable: string;
    },
  ) => void;
  archivarIncidencia: (id: string, responsable: string) => void;

  registrarObservacion: (input: {
    empleadoId: string;
    categoria: CategoriaObservacion;
    texto: string;
    autor: string;
    rolAutor: RoleKey;
  }) => void;

  crearEvaluacion: (input: {
    titulo: string;
    descripcion: string;
    tipo: TipoInstrumento;
    campos: CampoEvaluacion[];
    asignacion: AsignacionFormulario;
    puntajeAprobacion?: number;
    responsable: string;
  }) => void;
  archivarEvaluacion: (id: string) => void;
  responderEvaluacion: (
    evaluacionId: string,
    empleadoId: string,
    valores: Record<string, ValorRespuesta>,
  ) => void;
}

const DisciplinarioContext = createContext<DisciplinarioContextValue | null>(null);

let seq = 900;
const nextId = (p: string) => `${p}-${Date.now()}-${seq++}`;

export function DisciplinarioProvider({ children }: { children: ReactNode }) {
  const [incidencias, setIncidencias] = useState<Incidencia[]>(INCIDENCIAS_INICIALES);
  const [observaciones, setObservaciones] = useState<ObservacionInterna[]>(OBSERVACIONES_INICIALES);
  const [evaluaciones, setEvaluaciones] = useState<Evaluacion[]>(EVALUACIONES_INICIALES);
  const [respuestas, setRespuestas] = useState<RespuestaEvaluacion[]>(
    RESPUESTAS_EVALUACION_INICIALES,
  );

  /* ---------------------------- Disciplinario ---------------------------- */

  const registrarIncidencia = useCallback<DisciplinarioContextValue["registrarIncidencia"]>(
    ({ empleadoId, tipo, gravedadPresunta, fecha, hora, descripcion, evidencia, responsable }) => {
      setIncidencias((prev) => [
        {
          id: nextId("dis"),
          consecutivo: consecutivoDisciplinario(prev.length + 1),
          empleadoId,
          tipo,
          gravedadPresunta,
          fecha,
          hora,
          descripcion,
          evidencia: evidencia?.trim() || undefined,
          estado: "registrada",
          registradoPor: responsable,
          traza: [
            {
              etapa: "supervisor",
              accion: "registrada",
              actor: responsable,
              fecha: hoyISO(),
              hora: horaActual(),
            },
          ],
          actuaciones: [],
        },
        ...prev,
      ]);
    },
    [],
  );

  const agregarPaso = useCallback(
    (
      id: string,
      paso: Incidencia["traza"][number],
      estado: Incidencia["estado"],
      actuacion?: ActuacionDisciplinaria,
    ) => {
      setIncidencias((prev) =>
        prev.map((i) =>
          i.id === id
            ? {
                ...i,
                estado,
                traza: [...i.traza, paso],
                actuaciones: actuacion ? [...i.actuaciones, actuacion] : i.actuaciones,
              }
            : i,
        ),
      );
    },
    [],
  );

  const validarIncidencia = useCallback<DisciplinarioContextValue["validarIncidencia"]>(
    (id, nota, responsable) => {
      agregarPaso(
        id,
        {
          etapa: "jefe",
          accion: "validada",
          actor: responsable,
          fecha: hoyISO(),
          hora: horaActual(),
          nota: nota.trim() || undefined,
        },
        "validada",
      );
    },
    [agregarPaso],
  );

  const desestimarIncidencia = useCallback<DisciplinarioContextValue["desestimarIncidencia"]>(
    (id, nota, responsable) => {
      agregarPaso(
        id,
        {
          etapa: "jefe",
          accion: "desestimada",
          actor: responsable,
          fecha: hoyISO(),
          hora: horaActual(),
          nota: nota.trim() || undefined,
        },
        "desestimada",
      );
    },
    [agregarPaso],
  );

  const escalarIncidencia = useCallback<DisciplinarioContextValue["escalarIncidencia"]>(
    (id, nota, responsable) => {
      agregarPaso(
        id,
        {
          etapa: "jefe",
          accion: "escalada",
          actor: responsable,
          fecha: hoyISO(),
          hora: horaActual(),
          nota: nota.trim() || undefined,
        },
        "escalada_rrhh",
      );
    },
    [agregarPaso],
  );

  const registrarActuacion = useCallback<DisciplinarioContextValue["registrarActuacion"]>(
    (id, { tipo, detalle, versionEmpleado, tipoSancion, diasSuspension, responsable }) => {
      const fecha = hoyISO();
      const actuacion: ActuacionDisciplinaria = {
        id: nextId("act"),
        tipo,
        fecha,
        detalle,
        versionEmpleado: versionEmpleado?.trim() || undefined,
        tipoSancion: tipo === "sancion" ? tipoSancion : undefined,
        diasSuspension: tipo === "sancion" ? diasSuspension : undefined,
        vigenteHasta:
          tipo === "sancion"
            ? new Date(new Date(`${fecha}T00:00:00`).setMonth(new Date(`${fecha}T00:00:00`).getMonth() + 6))
                .toISOString()
                .slice(0, 10)
            : undefined,
        registradoPor: responsable,
      };
      const estado: Incidencia["estado"] =
        tipo === "sancion" ? "sancionada" : tipo === "descargos" ? "en_descargos" : "escalada_rrhh";
      agregarPaso(
        id,
        {
          etapa: "rrhh",
          accion: tipo,
          actor: responsable,
          fecha,
          hora: horaActual(),
          nota: detalle,
        },
        estado,
        actuacion,
      );
    },
    [agregarPaso],
  );

  const archivarIncidencia = useCallback<DisciplinarioContextValue["archivarIncidencia"]>(
    (id, responsable) => {
      agregarPaso(
        id,
        {
          etapa: "rrhh",
          accion: "archivada",
          actor: responsable,
          fecha: hoyISO(),
          hora: horaActual(),
          nota: "Caso cerrado. El historial se conserva de forma permanente.",
        },
        "archivada",
      );
    },
    [agregarPaso],
  );

  /* ------------------------ Observaciones internas ------------------------ */

  const registrarObservacion = useCallback<DisciplinarioContextValue["registrarObservacion"]>(
    ({ empleadoId, categoria, texto, autor, rolAutor }) => {
      setObservaciones((prev) => [
        {
          id: nextId("obs"),
          empleadoId,
          categoria,
          texto,
          fecha: hoyISO(),
          hora: horaActual(),
          autor,
          rolAutor,
          estado: "activo",
        },
        ...prev,
      ]);
    },
    [],
  );

  /* ----------------------------- Evaluaciones ----------------------------- */

  const crearEvaluacion = useCallback<DisciplinarioContextValue["crearEvaluacion"]>(
    ({ titulo, descripcion, tipo, campos, asignacion, puntajeAprobacion, responsable }) => {
      setEvaluaciones((prev) => [
        {
          id: nextId("ev"),
          codigo: `EVA-${String(prev.length + 1).padStart(3, "0")}`,
          titulo,
          descripcion,
          tipo,
          campos,
          asignacion,
          puntajeAprobacion,
          estado: "activo",
          creadoPor: responsable,
          creadoEn: hoyISO(),
        },
        ...prev,
      ]);
    },
    [],
  );

  const archivarEvaluacion = useCallback((id: string) => {
    setEvaluaciones((prev) =>
      prev.map((e) =>
        e.id === id ? { ...e, estado: e.estado === "activo" ? "archivado" : "activo" } : e,
      ),
    );
  }, []);

  const responderEvaluacion = useCallback<DisciplinarioContextValue["responderEvaluacion"]>(
    (evaluacionId, empleadoId, valores) => {
      setEvaluaciones((evs) => {
        const evaluacion = evs.find((e) => e.id === evaluacionId);
        if (evaluacion) {
          const { puntaje, aprobado } = calificar(evaluacion, valores);
          setRespuestas((prev) => [
            {
              id: nextId("rev"),
              evaluacionId,
              empleadoId,
              fecha: hoyISO(),
              hora: horaActual(),
              valores,
              puntaje,
              aprobado,
            },
            ...prev,
          ]);
        }
        return evs;
      });
    },
    [],
  );

  const value = useMemo<DisciplinarioContextValue>(
    () => ({
      incidencias,
      observaciones,
      evaluaciones,
      respuestas,
      registrarIncidencia,
      validarIncidencia,
      desestimarIncidencia,
      escalarIncidencia,
      registrarActuacion,
      archivarIncidencia,
      registrarObservacion,
      crearEvaluacion,
      archivarEvaluacion,
      responderEvaluacion,
    }),
    [
      incidencias,
      observaciones,
      evaluaciones,
      respuestas,
      registrarIncidencia,
      validarIncidencia,
      desestimarIncidencia,
      escalarIncidencia,
      registrarActuacion,
      archivarIncidencia,
      registrarObservacion,
      crearEvaluacion,
      archivarEvaluacion,
      responderEvaluacion,
    ],
  );

  return <DisciplinarioContext.Provider value={value}>{children}</DisciplinarioContext.Provider>;
}

export function useDisciplinario() {
  const ctx = useContext(DisciplinarioContext);
  if (!ctx) throw new Error("useDisciplinario debe usarse dentro de DisciplinarioProvider");
  return ctx;
}
