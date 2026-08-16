import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import {
  ACCIDENTES_INICIALES,
  CAPACITACIONES_INICIALES,
  ENTREGAS_INICIALES,
  EXAMENES_INICIALES,
  FORMULARIOS_INICIALES,
  RESPUESTAS_INICIALES,
  TALLAS_INICIALES,
} from "@/data/sst";
import { consecutivoSST, horaActual, hoyISO, huellaFirma, sumarMeses } from "@/lib/sst";
import type {
  AccidenteLaboral,
  CampoFormulario,
  CapacitacionSST,
  ConceptoMedico,
  ElementoDotacion,
  EntregaDotacion,
  EstadoInvestigacion,
  ExamenMedico,
  FichaTallas,
  Formulario,
  ItemEntrega,
  RespuestaFormulario,
  TallasEmpleado,
  TipoEntrega,
  TipoEventoSST,
  TipoExamen,
  ValorRespuesta,
} from "@/types/sst";
import type { AsignacionFormulario, GravedadSST, ModalidadCapacitacion } from "@/types/sst";

/**
 * Estado de SST (exámenes, accidentes, capacitaciones), dotación con aceptación
 * digital del empleado y formularios dinámicos con sus respuestas.
 */
interface SstContextValue {
  examenes: ExamenMedico[];
  accidentes: AccidenteLaboral[];
  capacitaciones: CapacitacionSST[];
  tallas: FichaTallas[];
  entregas: EntregaDotacion[];
  formularios: Formulario[];
  respuestas: RespuestaFormulario[];

  programarExamen: (input: {
    empleadoId: string;
    tipo: TipoExamen;
    entidad: string;
    fechaProgramada: string;
    responsable: string;
  }) => void;
  registrarConcepto: (
    id: string,
    concepto: ConceptoMedico,
    recomendaciones: string,
    responsable: string,
  ) => void;

  reportarEvento: (input: {
    empleadoId: string;
    tipo: TipoEventoSST;
    fecha: string;
    hora: string;
    centroTrabajoId: string;
    parteCuerpo: string;
    descripcion: string;
    gravedad: GravedadSST;
    diasIncapacidad: number;
    reportadoArl: boolean;
    responsable: string;
  }) => void;
  actualizarInvestigacion: (
    id: string,
    cambios: { estadoInvestigacion?: EstadoInvestigacion; causaRaiz?: string; accionCorrectiva?: string },
  ) => void;

  crearCapacitacion: (input: {
    tema: string;
    fecha: string;
    duracionHoras: number;
    modalidad: ModalidadCapacitacion;
    instructor: string;
    obligatoria: boolean;
    empleadoIds: string[];
  }) => void;
  marcarAsistencia: (capacitacionId: string, empleadoId: string, asistio: boolean) => void;

  guardarTallas: (empleadoId: string, tallas: TallasEmpleado, responsable: string) => void;
  registrarEntrega: (input: {
    empleadoId: string;
    tipo: TipoEntrega;
    fecha: string;
    items: ItemEntrega[];
    motivo?: string;
    responsable: string;
  }) => void;
  aceptarEntrega: (id: string, nombre: string, documento: string) => void;

  crearFormulario: (input: {
    titulo: string;
    descripcion: string;
    campos: CampoFormulario[];
    asignacion: AsignacionFormulario;
    responsable: string;
  }) => void;
  archivarFormulario: (id: string) => void;
  responderFormulario: (
    formularioId: string,
    empleadoId: string,
    valores: Record<string, ValorRespuesta>,
  ) => void;
}

const SstContext = createContext<SstContextValue | null>(null);

let seq = 500;
const nextId = (p: string) => `${p}-${Date.now()}-${seq++}`;

export function SstProvider({ children }: { children: ReactNode }) {
  const [examenes, setExamenes] = useState<ExamenMedico[]>(EXAMENES_INICIALES);
  const [accidentes, setAccidentes] = useState<AccidenteLaboral[]>(ACCIDENTES_INICIALES);
  const [capacitaciones, setCapacitaciones] = useState<CapacitacionSST[]>(CAPACITACIONES_INICIALES);
  const [tallas, setTallas] = useState<FichaTallas[]>(TALLAS_INICIALES);
  const [entregas, setEntregas] = useState<EntregaDotacion[]>(ENTREGAS_INICIALES);
  const [formularios, setFormularios] = useState<Formulario[]>(FORMULARIOS_INICIALES);
  const [respuestas, setRespuestas] = useState<RespuestaFormulario[]>(RESPUESTAS_INICIALES);

  /* ------------------------------ Exámenes ------------------------------ */

  const programarExamen = useCallback<SstContextValue["programarExamen"]>(
    ({ empleadoId, tipo, entidad, fechaProgramada, responsable }) => {
      setExamenes((prev) => [
        {
          id: nextId("ex"),
          empleadoId,
          tipo,
          entidad,
          fechaProgramada,
          concepto: "pendiente",
          estado: "activo",
          registradoPor: responsable,
        },
        ...prev,
      ]);
    },
    [],
  );

  const registrarConcepto = useCallback<SstContextValue["registrarConcepto"]>(
    (id, concepto, recomendaciones, responsable) => {
      setExamenes((prev) =>
        prev.map((e) => {
          if (e.id !== id) return e;
          const fechaRealizada = hoyISO();
          return {
            ...e,
            concepto,
            recomendaciones: recomendaciones.trim() || undefined,
            fechaRealizada,
            vigenciaHasta: concepto === "pendiente" ? undefined : sumarMeses(fechaRealizada, 12),
            registradoPor: responsable,
          };
        }),
      );
    },
    [],
  );

  /* ----------------------------- Accidentes ----------------------------- */

  const reportarEvento = useCallback<SstContextValue["reportarEvento"]>(
    (input) => {
      setAccidentes((prev) => [
        {
          id: nextId("acc"),
          consecutivo: consecutivoSST("AT", prev.length + 1),
          empleadoId: input.empleadoId,
          tipo: input.tipo,
          fecha: input.fecha,
          hora: input.hora,
          centroTrabajoId: input.centroTrabajoId,
          parteCuerpo: input.parteCuerpo,
          descripcion: input.descripcion,
          gravedad: input.gravedad,
          diasIncapacidad: input.diasIncapacidad,
          reportadoArl: input.reportadoArl,
          estadoInvestigacion: "abierto",
          accionesCorrectivas: [],
          registradoPor: input.responsable,
        },
        ...prev,
      ]);
    },
    [],
  );

  const actualizarInvestigacion = useCallback<SstContextValue["actualizarInvestigacion"]>(
    (id, cambios) => {
      setAccidentes((prev) =>
        prev.map((a) =>
          a.id === id
            ? {
                ...a,
                estadoInvestigacion: cambios.estadoInvestigacion ?? a.estadoInvestigacion,
                causaRaiz: cambios.causaRaiz?.trim() ? cambios.causaRaiz : a.causaRaiz,
                accionesCorrectivas: cambios.accionCorrectiva?.trim()
                  ? [...a.accionesCorrectivas, cambios.accionCorrectiva.trim()]
                  : a.accionesCorrectivas,
              }
            : a,
        ),
      );
    },
    [],
  );

  /* --------------------------- Capacitaciones --------------------------- */

  const crearCapacitacion = useCallback<SstContextValue["crearCapacitacion"]>(
    ({ tema, fecha, duracionHoras, modalidad, instructor, obligatoria, empleadoIds }) => {
      setCapacitaciones((prev) => [
        {
          id: nextId("cap"),
          codigo: consecutivoSST("CAP", prev.length + 1),
          tema,
          fecha,
          duracionHoras,
          modalidad,
          instructor,
          obligatoria,
          asistentes: empleadoIds.map((empleadoId) => ({ empleadoId, asistio: false })),
          estado: "activo",
        },
        ...prev,
      ]);
    },
    [],
  );

  const marcarAsistencia = useCallback<SstContextValue["marcarAsistencia"]>(
    (capacitacionId, empleadoId, asistio) => {
      setCapacitaciones((prev) =>
        prev.map((c) =>
          c.id === capacitacionId
            ? {
                ...c,
                asistentes: c.asistentes.map((a) =>
                  a.empleadoId === empleadoId ? { ...a, asistio } : a,
                ),
              }
            : c,
        ),
      );
    },
    [],
  );

  /* ------------------------------ Dotación ------------------------------ */

  const guardarTallas = useCallback<SstContextValue["guardarTallas"]>(
    (empleadoId, nuevas, responsable) => {
      setTallas((prev) => {
        const ficha: FichaTallas = {
          empleadoId,
          tallas: nuevas,
          actualizadoEn: hoyISO(),
          actualizadoPor: responsable,
        };
        return prev.some((t) => t.empleadoId === empleadoId)
          ? prev.map((t) => (t.empleadoId === empleadoId ? ficha : t))
          : [...prev, ficha];
      });
    },
    [],
  );

  const registrarEntrega = useCallback<SstContextValue["registrarEntrega"]>(
    ({ empleadoId, tipo, fecha, items, motivo, responsable }) => {
      setEntregas((prev) => [
        {
          id: nextId("dot"),
          consecutivo: consecutivoSST("DOT", prev.length + 1),
          empleadoId,
          tipo,
          fecha,
          items,
          motivo: motivo?.trim() || undefined,
          entregadoPor: responsable,
        },
        ...prev,
      ]);
    },
    [],
  );

  const aceptarEntrega = useCallback<SstContextValue["aceptarEntrega"]>(
    (id, nombre, documento) => {
      setEntregas((prev) =>
        prev.map((e) => {
          if (e.id !== id || e.aceptacion?.aceptado) return e;
          const fecha = hoyISO();
          const hora = horaActual();
          return {
            ...e,
            aceptacion: {
              aceptado: true,
              nombre,
              documento,
              fecha,
              hora,
              firma: huellaFirma(e.empleadoId, e.consecutivo, `${fecha}${hora}`),
            },
          };
        }),
      );
    },
    [],
  );

  /* ----------------------------- Formularios ----------------------------- */

  const crearFormulario = useCallback<SstContextValue["crearFormulario"]>(
    ({ titulo, descripcion, campos, asignacion, responsable }) => {
      setFormularios((prev) => [
        {
          id: nextId("fm"),
          codigo: `FRM-${String(prev.length + 1).padStart(3, "0")}`,
          titulo,
          descripcion,
          campos,
          asignacion,
          estado: "activo",
          creadoPor: responsable,
          creadoEn: hoyISO(),
        },
        ...prev,
      ]);
    },
    [],
  );

  const archivarFormulario = useCallback((id: string) => {
    setFormularios((prev) =>
      prev.map((f) => (f.id === id ? { ...f, estado: f.estado === "activo" ? "archivado" : "activo" } : f)),
    );
  }, []);

  const responderFormulario = useCallback<SstContextValue["responderFormulario"]>(
    (formularioId, empleadoId, valores) => {
      setRespuestas((prev) => [
        {
          id: nextId("rf"),
          formularioId,
          empleadoId,
          fecha: hoyISO(),
          hora: horaActual(),
          valores,
        },
        ...prev,
      ]);
    },
    [],
  );

  const value = useMemo<SstContextValue>(
    () => ({
      examenes,
      accidentes,
      capacitaciones,
      tallas,
      entregas,
      formularios,
      respuestas,
      programarExamen,
      registrarConcepto,
      reportarEvento,
      actualizarInvestigacion,
      crearCapacitacion,
      marcarAsistencia,
      guardarTallas,
      registrarEntrega,
      aceptarEntrega,
      crearFormulario,
      archivarFormulario,
      responderFormulario,
    }),
    [
      examenes,
      accidentes,
      capacitaciones,
      tallas,
      entregas,
      formularios,
      respuestas,
      programarExamen,
      registrarConcepto,
      reportarEvento,
      actualizarInvestigacion,
      crearCapacitacion,
      marcarAsistencia,
      guardarTallas,
      registrarEntrega,
      aceptarEntrega,
      crearFormulario,
      archivarFormulario,
      responderFormulario,
    ],
  );

  return <SstContext.Provider value={value}>{children}</SstContext.Provider>;
}

export function useSst() {
  const ctx = useContext(SstContext);
  if (!ctx) throw new Error("useSst debe usarse dentro de SstProvider");
  return ctx;
}

export const tallasDe = (fichas: FichaTallas[], empleadoId: string) =>
  fichas.find((t) => t.empleadoId === empleadoId)?.tallas;

export const elementosPendientes = (
  entregas: EntregaDotacion[],
  empleadoId: string,
): ElementoDotacion[] => {
  const entregados = new Set(
    entregas
      .filter((e) => e.empleadoId === empleadoId && e.aceptacion?.aceptado)
      .flatMap((e) => e.items.map((i) => i.elemento)),
  );
  return (["camisa", "pantalon", "chaqueta", "guantes", "botas"] as ElementoDotacion[]).filter(
    (el) => !entregados.has(el),
  );
};
