import { EMPLEADOS } from "@/data/organizacion";
import type {
  Evaluacion,
  Incidencia,
  ObservacionInterna,
  RespuestaEvaluacion,
} from "@/types/disciplinario";

const ACTIVOS = EMPLEADOS.filter((e) => e.estado === "activo");
const id = (i: number) => ACTIVOS[i % ACTIVOS.length]?.id ?? "e-001";

/* ----------------------------- Incidencias ----------------------------- */

export const INCIDENCIAS_INICIALES: Incidencia[] = [
  {
    id: "dis-1",
    consecutivo: "DIS-2026-0001",
    empleadoId: id(3),
    tipo: "incumplimiento_horario",
    gravedadPresunta: "leve",
    fecha: "2026-07-14",
    hora: "07:35",
    descripcion:
      "Ingreso 45 minutos después del horario asignado sin reporte previo al supervisor de turno.",
    evidencia: "Reporte de marcaciones del 14/07/2026",
    estado: "registrada",
    registradoPor: "Supervisor de turno",
    traza: [
      {
        etapa: "supervisor",
        accion: "registrada",
        actor: "Supervisor de turno",
        fecha: "2026-07-14",
        hora: "08:10",
        nota: "Segunda ocurrencia en el mes.",
      },
    ],
    actuaciones: [],
  },
  {
    id: "dis-2",
    consecutivo: "DIS-2026-0002",
    empleadoId: id(5),
    tipo: "seguridad",
    gravedadPresunta: "grave",
    fecha: "2026-07-02",
    hora: "10:20",
    descripcion:
      "Operación de equipo sin elementos de protección personal, pese a inducción SST vigente.",
    evidencia: "Registro fotográfico inspección SST",
    estado: "escalada_rrhh",
    registradoPor: "Supervisor de planta",
    traza: [
      {
        etapa: "supervisor",
        accion: "registrada",
        actor: "Supervisor de planta",
        fecha: "2026-07-02",
        hora: "10:45",
      },
      {
        etapa: "jefe",
        accion: "validada",
        actor: "Jefe de operaciones",
        fecha: "2026-07-03",
        hora: "09:00",
        nota: "Se confirma incumplimiento con evidencia de inspección.",
      },
      {
        etapa: "jefe",
        accion: "escalada",
        actor: "Jefe de operaciones",
        fecha: "2026-07-03",
        hora: "09:05",
        nota: "Escalada a Talento Humano por gravedad del hallazgo.",
      },
    ],
    actuaciones: [],
  },
  {
    id: "dis-3",
    consecutivo: "DIS-2026-0003",
    empleadoId: id(8),
    tipo: "procedimiento",
    gravedadPresunta: "grave",
    fecha: "2026-06-18",
    hora: "14:05",
    descripcion: "Omisión del procedimiento de verificación documental en despacho de mercancía.",
    estado: "sancionada",
    registradoPor: "Supervisor logístico",
    traza: [
      {
        etapa: "supervisor",
        accion: "registrada",
        actor: "Supervisor logístico",
        fecha: "2026-06-18",
        hora: "14:30",
      },
      {
        etapa: "jefe",
        accion: "validada",
        actor: "Jefe de logística",
        fecha: "2026-06-19",
        hora: "08:20",
      },
      {
        etapa: "jefe",
        accion: "escalada",
        actor: "Jefe de logística",
        fecha: "2026-06-19",
        hora: "08:25",
      },
      {
        etapa: "rrhh",
        accion: "llamado_atencion",
        actor: "Talento Humano",
        fecha: "2026-06-20",
        hora: "10:00",
      },
      {
        etapa: "rrhh",
        accion: "descargos",
        actor: "Talento Humano",
        fecha: "2026-06-24",
        hora: "09:30",
      },
      {
        etapa: "rrhh",
        accion: "sancion",
        actor: "Talento Humano",
        fecha: "2026-06-26",
        hora: "16:00",
        nota: "Suspensión de 2 días conforme al reglamento interno de trabajo.",
      },
    ],
    actuaciones: [
      {
        id: "act-1",
        tipo: "llamado_atencion",
        fecha: "2026-06-20",
        detalle:
          "Llamado de atención escrito por omisión de control documental. Se recuerda el procedimiento PR-LOG-004.",
        registradoPor: "Talento Humano",
      },
      {
        id: "act-2",
        tipo: "descargos",
        fecha: "2026-06-24",
        detalle: "Diligencia de descargos con acompañamiento de dos testigos.",
        versionEmpleado:
          "Manifiesta alta carga operativa en el turno y desconocimiento de la actualización del procedimiento.",
        registradoPor: "Talento Humano",
      },
      {
        id: "act-3",
        tipo: "sancion",
        fecha: "2026-06-26",
        detalle: "Suspensión conforme al reglamento interno de trabajo, artículo 58.",
        tipoSancion: "suspension",
        diasSuspension: 2,
        vigenteHasta: "2026-12-26",
        registradoPor: "Talento Humano",
      },
    ],
  },
  {
    id: "dis-4",
    consecutivo: "DIS-2026-0004",
    empleadoId: id(11),
    tipo: "conducta",
    gravedadPresunta: "leve",
    fecha: "2026-05-30",
    hora: "11:15",
    descripcion: "Reporte de discusión en área común durante jornada laboral.",
    estado: "desestimada",
    registradoPor: "Supervisor administrativo",
    traza: [
      {
        etapa: "supervisor",
        accion: "registrada",
        actor: "Supervisor administrativo",
        fecha: "2026-05-30",
        hora: "11:40",
      },
      {
        etapa: "jefe",
        accion: "desestimada",
        actor: "Jefe administrativo",
        fecha: "2026-06-01",
        hora: "08:45",
        nota: "Situación resuelta con acuerdo entre las partes; no configura falta.",
      },
    ],
    actuaciones: [],
  },
];

/* ------------------------ Observaciones internas ------------------------ */

export const OBSERVACIONES_INICIALES: ObservacionInterna[] = [
  {
    id: "obs-1",
    empleadoId: id(3),
    categoria: "seguimiento",
    texto:
      "Se acuerda plan de mejora de puntualidad con seguimiento semanal durante el próximo trimestre.",
    fecha: "2026-07-15",
    hora: "09:00",
    autor: "Jefe de operaciones",
    rolAutor: "jefe",
    estado: "activo",
  },
  {
    id: "obs-2",
    empleadoId: id(6),
    categoria: "reconocimiento",
    texto: "Liderazgo destacado en el cierre del inventario trimestral sin novedades.",
    fecha: "2026-07-08",
    hora: "16:20",
    autor: "Dirección de operaciones",
    rolAutor: "director",
    estado: "activo",
  },
  {
    id: "obs-3",
    empleadoId: id(5),
    categoria: "riesgo",
    texto:
      "Reiteración de observaciones sobre uso de EPP. Requiere refuerzo en capacitación SST antes de la próxima inspección.",
    fecha: "2026-07-04",
    hora: "10:30",
    autor: "Talento Humano",
    rolAutor: "talento_humano",
    estado: "activo",
  },
  {
    id: "obs-4",
    empleadoId: id(9),
    categoria: "desempeno",
    texto: "Cumplimiento sostenido de indicadores del área; candidato a plan de sucesión.",
    fecha: "2026-06-27",
    hora: "14:10",
    autor: "Supervisor logístico",
    rolAutor: "supervisor",
    estado: "activo",
  },
];

/* ----------------------------- Evaluaciones ----------------------------- */

export const EVALUACIONES_INICIALES: Evaluacion[] = [
  {
    id: "ev-1",
    codigo: "EVA-001",
    titulo: "Prueba de conocimiento SST — Uso de EPP",
    descripcion: "Verificación de conocimientos sobre elementos de protección personal y reporte de riesgos.",
    tipo: "prueba_sst",
    puntajeAprobacion: 80,
    campos: [
      {
        id: "c1",
        etiqueta: "El uso de EPP es opcional cuando la tarea dura menos de 10 minutos.",
        tipo: "booleano",
        requerido: true,
        correcta: false,
      },
      {
        id: "c2",
        etiqueta: "¿A quién se reporta de inmediato un incidente de trabajo?",
        tipo: "seleccion_unica",
        requerido: true,
        opciones: ["Supervisor inmediato", "Un compañero", "Nadie", "Al final del turno"],
        correcta: "Supervisor inmediato",
      },
      {
        id: "c3",
        etiqueta: "Seleccione los EPP obligatorios en planta",
        tipo: "seleccion_multiple",
        requerido: true,
        opciones: ["Casco", "Botas de seguridad", "Gafas", "Reloj"],
        correcta: ["Casco", "Botas de seguridad", "Gafas"],
        peso: 2,
      },
    ],
    asignacion: { tipo: "empresa", valores: [] },
    estado: "activo",
    creadoPor: "Área SST",
    creadoEn: "2026-06-02",
  },
  {
    id: "ev-2",
    codigo: "EVA-002",
    titulo: "Encuesta de clima laboral",
    descripcion: "Percepción del ambiente de trabajo, comunicación y liderazgo.",
    tipo: "encuesta",
    campos: [
      {
        id: "c1",
        etiqueta: "Califique la comunicación con su jefe inmediato",
        tipo: "escala",
        requerido: true,
        escalaMin: 1,
        escalaMax: 5,
      },
      {
        id: "c2",
        etiqueta: "Recomendaría la empresa como lugar para trabajar",
        tipo: "booleano",
        requerido: true,
      },
      {
        id: "c3",
        etiqueta: "Comentarios y sugerencias",
        tipo: "texto",
        requerido: false,
      },
    ],
    asignacion: { tipo: "empresa", valores: [] },
    estado: "activo",
    creadoPor: "Talento Humano",
    creadoEn: "2026-05-18",
  },
  {
    id: "ev-3",
    codigo: "EVA-003",
    titulo: "Evaluación de desempeño semestral",
    descripcion: "Evaluación de competencias técnicas y comportamentales del periodo.",
    tipo: "evaluacion",
    puntajeAprobacion: 70,
    campos: [
      {
        id: "c1",
        etiqueta: "Cumplimiento de metas del periodo",
        tipo: "escala",
        requerido: true,
        escalaMin: 1,
        escalaMax: 10,
      },
      {
        id: "c2",
        etiqueta: "Trabajo en equipo",
        tipo: "escala",
        requerido: true,
        escalaMin: 1,
        escalaMax: 10,
      },
      {
        id: "c3",
        etiqueta: "Plan de desarrollo acordado",
        tipo: "texto",
        requerido: true,
      },
    ],
    asignacion: { tipo: "empresa", valores: [] },
    estado: "activo",
    creadoPor: "Talento Humano",
    creadoEn: "2026-06-30",
  },
];

export const RESPUESTAS_EVALUACION_INICIALES: RespuestaEvaluacion[] = ACTIVOS.slice(0, 9).map(
  (e, i) => {
    const acierta = i % 3 !== 0;
    const puntaje = acierta ? 100 : 50;
    return {
      id: `rev-${e.id}`,
      evaluacionId: "ev-1",
      empleadoId: e.id,
      fecha: `2026-06-${String((i % 20) + 5).padStart(2, "0")}`,
      hora: "09:30",
      valores: {
        c1: false,
        c2: acierta ? "Supervisor inmediato" : "Al final del turno",
        c3: acierta ? ["Casco", "Botas de seguridad", "Gafas"] : ["Casco", "Reloj"],
      },
      puntaje,
      aprobado: puntaje >= 80,
    };
  },
);

RESPUESTAS_EVALUACION_INICIALES.push(
  ...ACTIVOS.slice(0, 7).map((e, i) => ({
    id: `rev-clima-${e.id}`,
    evaluacionId: "ev-2",
    empleadoId: e.id,
    fecha: `2026-05-${String((i % 20) + 6).padStart(2, "0")}`,
    hora: "11:00",
    valores: {
      c1: (i % 5) + 1,
      c2: i % 4 !== 0,
      c3: i % 2 === 0 ? "Más espacios de retroalimentación con el equipo." : "",
    },
  })),
);
