/**
 * Estado compartido del módulo disciplinario sincronizado con Firestore.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useFirestoreState } from "@/lib/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "@/lib/firebase";
import { useAuth } from "@/lib/auth";
import { alcancePorEmpleado } from "@/lib/acceso-operativo";
import {
  EVALUACIONES_INICIALES,
  INCIDENCIAS_INICIALES,
  OBSERVACIONES_INICIALES,
  RESPUESTAS_EVALUACION_INICIALES,
} from "@/data/disciplinario";
import { consecutivoDisciplinario, horaActual, hoyISO } from "@/lib/disciplinario";
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
    abreEn?: string;
    cierraEn?: string;
    maxIntentos?: number;
    responsable: string;
  }) => Promise<void>;
  archivarEvaluacion: (id: string) => Promise<void>;
  responderEvaluacion: (
    evaluacionId: string,
    empleadoId: string,
    valores: Record<string, ValorRespuesta>,
  ) => Promise<void>;
}

const DisciplinarioContext = createContext<DisciplinarioContextValue | null>(null);

let seq = 900;
const nextId = (p: string) => `${p}-${Date.now()}-${seq++}`;

export function DisciplinarioProvider({ children }: { children: ReactNode }) {
  const { perfil } = useAuth();
  const roles = perfil?.roles ?? [];
  const empleadoId = perfil?.empleadoId ?? "";
  const subordinadosIds = perfil?.subordinadosIds ?? [];
  const rrhh = ["administrador", "talento_humano"] as RoleKey[];
  const sst = ["administrador", "talento_humano", "sst"] as RoleKey[];
  const [incidencias, setIncidencias] = useFirestoreState<Incidencia>(
    "disc_incidencias",
    "id",
    alcancePorEmpleado(roles, empleadoId, subordinadosIds, rrhh, { incluirPropio: false }),
  );
  const [observaciones, setObservaciones] = useFirestoreState<ObservacionInterna>(
    "disc_observaciones",
    "id",
    alcancePorEmpleado(roles, empleadoId, subordinadosIds, rrhh, { incluirPropio: false }),
  );
  // Las evaluaciones publicadas no contienen claves correctas.
  const [evaluaciones, setEvaluaciones] = useState<Evaluacion[]>([]);
  const [respuestas] = useFirestoreState<RespuestaEvaluacion>(
    "disc_respuestas",
    "id",
    alcancePorEmpleado(roles, empleadoId, subordinadosIds, sst),
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

  const funciones = getFunctions(app);
  const cargarEvaluaciones = useCallback(async () => {
    const resultado = await httpsCallable<void, Evaluacion[]>(funciones, "listarEvaluaciones")();
    setEvaluaciones(Array.isArray(resultado.data) ? resultado.data : []);
  }, [funciones]);

  useEffect(() => {
    if (!perfil?.id) {
      setEvaluaciones([]);
      return;
    }
    let vigente = true;
    httpsCallable<void, Evaluacion[]>(funciones, "listarEvaluaciones")()
      .then((resultado) => {
        if (vigente) setEvaluaciones(Array.isArray(resultado.data) ? resultado.data : []);
      })
      .catch((error) => console.error("[evaluaciones] carga", error));
    return () => { vigente = false; };
  }, [funciones, perfil?.id, perfil?.empleadoId, perfil?.roles?.join(",")]);
  const crearEvaluacion = useCallback<DisciplinarioContextValue["crearEvaluacion"]>(
    async (input) => {
      await httpsCallable(funciones, "crearEvaluacion")({
        titulo: input.titulo, descripcion: input.descripcion, tipo: input.tipo,
        campos: input.campos, asignacion: input.asignacion,
        puntajeAprobacion: input.puntajeAprobacion, abreEn: input.abreEn,
        cierraEn: input.cierraEn, maxIntentos: input.maxIntentos,
      });
      await cargarEvaluaciones();
    }, [funciones, cargarEvaluaciones],
  );

  const archivarEvaluacion = useCallback(async (id: string) => {
    await httpsCallable(funciones, "archivarEvaluacion")({ evaluacionId: id });
    await cargarEvaluaciones();
  }, [funciones, cargarEvaluaciones]);

  const responderEvaluacion = useCallback<DisciplinarioContextValue["responderEvaluacion"]>(
    async (evaluacionId, _empleadoId, valores) => {
      await httpsCallable(funciones, "responderEvaluacion")({ evaluacionId, valores });
    }, [funciones],
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
