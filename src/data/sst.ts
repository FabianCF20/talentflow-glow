import { EMPLEADOS } from "@/data/organizacion";
import type {
  AccidenteLaboral,
  CapacitacionSST,
  ElementoDotacion,
  EntregaDotacion,
  ExamenMedico,
  FichaTallas,
  Formulario,
  RespuestaFormulario,
  TallasEmpleado,
} from "@/types/sst";
import { ELEMENTOS_DOTACION, TALLAS_POR_ELEMENTO } from "@/types/sst";
import { huellaFirma, sumarMeses } from "@/lib/sst";

const ACTIVOS = EMPLEADOS.filter((e) => e.estado === "activo");
const hash = (id: string) => id.split("").reduce((a, c) => a + c.charCodeAt(0), 0);

/* ------------------------------ Exámenes ------------------------------ */

const ENTIDADES = ["IPS Salud Ocupacional SAS", "Centro Médico Laboral", "Ocupacional Andina"];

export const EXAMENES_INICIALES: ExamenMedico[] = ACTIVOS.map((e, i) => {
  const h = hash(e.id);
  const tipo = i % 5 === 0 ? "ingreso" : i % 7 === 0 ? "reubicacion" : "periodico";
  const pendiente = i % 6 === 2;
  const fechaProgramada = `2026-0${(i % 8) + 1}-${String((h % 26) + 1).padStart(2, "0")}`;
  return {
    id: `ex-${e.id}`,
    empleadoId: e.id,
    tipo,
    entidad: ENTIDADES[h % ENTIDADES.length],
    fechaProgramada,
    fechaRealizada: pendiente ? undefined : fechaProgramada,
    concepto: pendiente
      ? "pendiente"
      : i % 5 === 3
        ? "apto_con_restricciones"
        : "apto",
    recomendaciones:
      i % 5 === 3 ? "Evitar levantamiento de cargas superiores a 15 kg. Pausas activas cada 2 horas." : undefined,
    vigenciaHasta: pendiente ? undefined : sumarMeses(fechaProgramada, 12),
    estado: "activo",
    registradoPor: "Área SST",
  };
});

/* ----------------------------- Accidentes ----------------------------- */

export const ACCIDENTES_INICIALES: AccidenteLaboral[] = [
  {
    id: "acc-1",
    consecutivo: "AT-2026-0001",
    empleadoId: "e-011",
    tipo: "accidente",
    fecha: "2026-03-12",
    hora: "09:40",
    centroTrabajoId: "ct-2",
    parteCuerpo: "Mano derecha",
    descripcion: "Atrapamiento de dedo índice durante ajuste de guarda en línea de producción 1.",
    causaRaiz: "Guarda de seguridad retirada durante mantenimiento sin bloqueo LOTO.",
    gravedad: "moderado",
    diasIncapacidad: 8,
    reportadoArl: true,
    estadoInvestigacion: "cerrado",
    accionesCorrectivas: [
      "Reinducción en bloqueo y etiquetado (LOTO) a la línea 1.",
      "Instalación de sensor de enclavamiento en la guarda.",
    ],
    registradoPor: "Área SST",
  },
  {
    id: "acc-2",
    consecutivo: "AT-2026-0002",
    empleadoId: "e-012",
    tipo: "incidente",
    fecha: "2026-05-04",
    hora: "14:15",
    centroTrabajoId: "ct-2",
    parteCuerpo: "No aplica",
    descripcion: "Derrame de aceite en zona de tránsito sin lesionados.",
    causaRaiz: "Fuga en acople hidráulico sin mantenimiento preventivo.",
    gravedad: "leve",
    diasIncapacidad: 0,
    reportadoArl: false,
    estadoInvestigacion: "en_investigacion",
    accionesCorrectivas: ["Señalización temporal del área.", "Programar cambio de acople."],
    registradoPor: "Supervisor de Línea",
  },
  {
    id: "acc-3",
    consecutivo: "AT-2026-0003",
    empleadoId: "e-013",
    tipo: "accidente",
    fecha: "2026-06-21",
    hora: "07:55",
    centroTrabajoId: "ct-3",
    parteCuerpo: "Tobillo izquierdo",
    descripcion: "Caída al mismo nivel en muelle de cargue por piso húmedo.",
    gravedad: "leve",
    diasIncapacidad: 3,
    reportadoArl: true,
    estadoInvestigacion: "abierto",
    accionesCorrectivas: [],
    registradoPor: "Área SST",
  },
  {
    id: "acc-4",
    consecutivo: "AT-2026-0004",
    empleadoId: "e-010",
    tipo: "enfermedad_laboral",
    fecha: "2026-02-02",
    hora: "08:00",
    centroTrabajoId: "ct-2",
    parteCuerpo: "Columna lumbar",
    descripcion: "Lumbalgia asociada a manipulación manual de cargas, calificada por la ARL.",
    causaRaiz: "Ausencia de ayudas mecánicas en el proceso de alistamiento.",
    gravedad: "grave",
    diasIncapacidad: 21,
    reportadoArl: true,
    estadoInvestigacion: "en_investigacion",
    accionesCorrectivas: ["Adquisición de dos carros hidráulicos.", "Programa de higiene postural."],
    registradoPor: "Área SST",
  },
];

/* --------------------------- Capacitaciones --------------------------- */

const asistentes = (ids: string[], sinAsistir: string[] = []) =>
  ids.map((empleadoId, i) => ({
    empleadoId,
    asistio: !sinAsistir.includes(empleadoId),
    calificacion: sinAsistir.includes(empleadoId) ? undefined : 70 + ((hash(empleadoId) + i) % 31),
  }));

export const CAPACITACIONES_INICIALES: CapacitacionSST[] = [
  {
    id: "cap-1",
    codigo: "CAP-2026-001",
    tema: "Inducción al SG-SST y política de seguridad",
    fecha: "2026-01-20",
    duracionHoras: 4,
    modalidad: "presencial",
    instructor: "ARL Sura",
    obligatoria: true,
    asistentes: asistentes(ACTIVOS.map((e) => e.id), ["e-014"]),
    estado: "activo",
  },
  {
    id: "cap-2",
    codigo: "CAP-2026-002",
    tema: "Manipulación manual de cargas e higiene postural",
    fecha: "2026-03-05",
    duracionHoras: 3,
    modalidad: "presencial",
    instructor: "Fisioterapeuta ocupacional",
    obligatoria: true,
    asistentes: asistentes(["e-006", "e-010", "e-011", "e-012"], ["e-012"]),
    estado: "activo",
  },
  {
    id: "cap-3",
    codigo: "CAP-2026-003",
    tema: "Trabajo seguro en alturas — reentrenamiento",
    fecha: "2026-04-18",
    duracionHoras: 8,
    modalidad: "mixta",
    instructor: "Centro de Entrenamiento Alturas",
    obligatoria: true,
    asistentes: asistentes(["e-010", "e-011"]),
    estado: "activo",
  },
  {
    id: "cap-4",
    codigo: "CAP-2026-004",
    tema: "Riesgo psicosocial y pausas activas",
    fecha: "2026-06-10",
    duracionHoras: 2,
    modalidad: "virtual",
    instructor: "Talento Humano",
    obligatoria: false,
    asistentes: asistentes(["e-004", "e-007", "e-008", "e-009", "e-013"], ["e-009"]),
    estado: "activo",
  },
];

/* ------------------------------ Dotación ------------------------------ */

const tallaPara = (empleadoId: string, elemento: ElementoDotacion) => {
  const opciones = TALLAS_POR_ELEMENTO[elemento];
  return opciones[hash(empleadoId + elemento) % opciones.length];
};

const tallasDe = (empleadoId: string): TallasEmpleado =>
  Object.fromEntries(
    ELEMENTOS_DOTACION.map((el) => [el, tallaPara(empleadoId, el)]),
  ) as TallasEmpleado;

export const TALLAS_INICIALES: FichaTallas[] = ACTIVOS.map((e) => ({
  empleadoId: e.id,
  tallas: tallasDe(e.id),
  actualizadoEn: "2026-01-15",
  actualizadoPor: "Talento Humano",
}));

const entrega = (
  n: number,
  empleadoId: string,
  fecha: string,
  tipo: "entrega" | "reposicion",
  elementos: ElementoDotacion[],
  aceptada: boolean,
  motivo?: string,
): EntregaDotacion => {
  const consecutivo = `DOT-2026-${String(n).padStart(4, "0")}`;
  return {
    id: `dot-${n}`,
    consecutivo,
    empleadoId,
    tipo,
    fecha,
    motivo,
    items: elementos.map((el) => ({ elemento: el, talla: tallaPara(empleadoId, el), cantidad: 1 })),
    entregadoPor: "Almacén / SST",
    aceptacion: aceptada
      ? {
          aceptado: true,
          nombre: `${EMPLEADOS.find((e) => e.id === empleadoId)?.nombres ?? ""} ${
            EMPLEADOS.find((e) => e.id === empleadoId)?.apellidos ?? ""
          }`.trim(),
          documento: EMPLEADOS.find((e) => e.id === empleadoId)?.documento ?? "",
          fecha,
          hora: "10:30",
          firma: huellaFirma(empleadoId, consecutivo, `${fecha}10:30`),
        }
      : undefined,
  };
};

export const ENTREGAS_INICIALES: EntregaDotacion[] = [
  entrega(1, "e-011", "2026-01-16", "entrega", ["camisa", "pantalon", "botas"], true),
  entrega(2, "e-012", "2026-01-16", "entrega", ["camisa", "pantalon", "botas"], true),
  entrega(3, "e-010", "2026-02-10", "entrega", ["camisa", "pantalon", "chaqueta", "botas"], true),
  entrega(
    4,
    "e-011",
    "2026-05-08",
    "reposicion",
    ["guantes"],
    false,
    "Desgaste por uso en línea de producción",
  ),
  entrega(5, "e-006", "2026-06-02", "entrega", ["camisa", "chaqueta"], false),
];

/* ----------------------------- Formularios ----------------------------- */

export const FORMULARIOS_INICIALES: Formulario[] = [
  {
    id: "fm-1",
    codigo: "FRM-001",
    titulo: "Autorreporte de condiciones de salud",
    descripcion: "Encuesta anual obligatoria del SG-SST para toda la organización.",
    campos: [
      { id: "c1", etiqueta: "¿Ha presentado molestias osteomusculares en el último mes?", tipo: "booleano", requerido: true },
      {
        id: "c2",
        etiqueta: "Zona del cuerpo con mayor molestia",
        tipo: "seleccion_unica",
        requerido: false,
        opciones: ["Cuello", "Espalda", "Hombros", "Manos", "Piernas", "Ninguna"],
      },
      {
        id: "c3",
        etiqueta: "Riesgos que percibe en su puesto de trabajo",
        tipo: "seleccion_multiple",
        requerido: true,
        opciones: ["Ruido", "Carga física", "Iluminación", "Químicos", "Psicosocial", "Locativo"],
      },
      { id: "c4", etiqueta: "Califique su bienestar general", tipo: "escala", requerido: true, escalaMin: 1, escalaMax: 5 },
      { id: "c5", etiqueta: "Observaciones adicionales", tipo: "texto", requerido: false },
    ],
    asignacion: { tipo: "empresa", valores: [] },
    estado: "activo",
    creadoPor: "Área SST",
    creadoEn: "2026-01-10",
  },
  {
    id: "fm-2",
    codigo: "FRM-002",
    titulo: "Inspección de elementos de protección personal",
    descripcion: "Verificación mensual del estado de la dotación y EPP entregados.",
    campos: [
      { id: "c1", etiqueta: "¿La dotación entregada está en buen estado?", tipo: "booleano", requerido: true },
      {
        id: "c2",
        etiqueta: "Elementos que requieren reposición",
        tipo: "seleccion_multiple",
        requerido: false,
        opciones: ["Camisa", "Pantalón", "Chaqueta", "Guantes", "Botas"],
      },
      { id: "c3", etiqueta: "Nivel de comodidad de la dotación", tipo: "escala", requerido: true, escalaMin: 1, escalaMax: 10 },
    ],
    asignacion: { tipo: "area", valores: ["ar-6"] },
    estado: "activo",
    creadoPor: "Área SST",
    creadoEn: "2026-02-01",
  },
  {
    id: "fm-3",
    codigo: "FRM-003",
    titulo: "Evaluación de capacitación en alturas",
    descripcion: "Evaluación de conocimiento posterior al reentrenamiento.",
    campos: [
      {
        id: "c1",
        etiqueta: "El sistema de detención de caídas debe inspeccionarse:",
        tipo: "seleccion_unica",
        requerido: true,
        opciones: ["Antes de cada uso", "Una vez al mes", "Solo al comprarlo"],
      },
      { id: "c2", etiqueta: "El arnés puede usarse con costuras rotas", tipo: "booleano", requerido: true },
      { id: "c3", etiqueta: "Comentarios del participante", tipo: "texto", requerido: false },
    ],
    asignacion: { tipo: "cargo", valores: ["cg-10", "cg-11"] },
    estado: "activo",
    creadoPor: "Área SST",
    creadoEn: "2026-04-19",
  },
];

const OPCIONES_C2 = ["Cuello", "Espalda", "Hombros", "Manos", "Piernas", "Ninguna"];
const OPCIONES_C3 = ["Ruido", "Carga física", "Iluminación", "Químicos", "Psicosocial", "Locativo"];

export const RESPUESTAS_INICIALES: RespuestaFormulario[] = ACTIVOS.slice(0, 9).map((e, i) => {
  const h = hash(e.id);
  return {
    id: `rf-1-${e.id}`,
    formularioId: "fm-1",
    empleadoId: e.id,
    fecha: `2026-01-${String((i % 20) + 5).padStart(2, "0")}`,
    hora: "09:15",
    valores: {
      c1: i % 3 === 0,
      c2: OPCIONES_C2[h % OPCIONES_C2.length],
      c3: [OPCIONES_C3[h % OPCIONES_C3.length], OPCIONES_C3[(h + 2) % OPCIONES_C3.length]],
      c4: (h % 5) + 1,
      c5: i % 4 === 0 ? "Solicito silla ergonómica y pausas activas guiadas." : "",
    },
  };
});
