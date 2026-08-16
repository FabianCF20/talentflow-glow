import { EMPLEADOS_RRHH } from "@/data/rrhh";
import type {
  DesprendibleNomina,
  DocumentoEmpleado,
  EntregaDotacion,
  PeriodoVacaciones,
  RegistroIncapacidad,
  SolicitudCambio,
} from "@/types/portal";

/** Datos de demostración del Portal del Empleado. */

const hash = (id: string) => id.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
const pick = <T,>(arr: readonly T[], h: number, off = 0) => arr[(h + off) % arr.length]!;
const anioIngreso = (f: string) => Number(f.slice(0, 4));

/* ------------------------------ Vacaciones ------------------------------ */

export function vacacionesDe(empleadoId: string): PeriodoVacaciones[] {
  const e = EMPLEADOS_RRHH.find((x) => x.id === empleadoId);
  if (!e) return [];
  const h = hash(empleadoId);
  const inicio = Math.max(anioIngreso(e.laboral.fechaIngreso), 2023);
  const periodos: PeriodoVacaciones[] = [];
  for (let i = 0; i < 3; i++) {
    const anio = inicio + i;
    const tomados = i === 2 ? (h % 3) * 5 : 15;
    periodos.push({
      id: `${empleadoId}-vac-${anio}`,
      periodo: `${anio} - ${anio + 1}`,
      diasCausados: 15,
      diasTomados: tomados,
      desde: tomados ? `${anio + 1}-0${((h + i) % 8) + 1}-05` : undefined,
      hasta: tomados ? `${anio + 1}-0${((h + i) % 8) + 1}-${String(5 + tomados).padStart(2, "0")}` : undefined,
      estado: tomados === 15 ? "disfrutadas" : tomados > 0 ? "programadas" : "pendientes",
    });
  }
  return periodos;
}

/* ----------------------------- Incapacidades ----------------------------- */

export function incapacidadesDe(empleadoId: string): RegistroIncapacidad[] {
  const h = hash(empleadoId);
  const cantidad = h % 3;
  return Array.from({ length: cantidad }, (_, i) => {
    const dias = 2 + ((h + i) % 8);
    const mes = String(((h + i) % 12) + 1).padStart(2, "0");
    return {
      id: `${empleadoId}-inc-${i + 1}`,
      tipo: pick(
        ["enfermedad_general", "accidente_trabajo", "licencia_maternidad"] as const,
        h,
        i,
      ),
      desde: `2026-${mes}-0${(i % 8) + 1}`,
      hasta: `2026-${mes}-${String(1 + dias + i).padStart(2, "0")}`,
      dias,
      entidad: pick(["Sura EPS", "ARL Sura", "Sanitas EPS", "Nueva EPS"], h, i),
      estado: pick(["radicada", "en_tramite", "pagada"] as const, h, i),
    };
  });
}

/* -------------------------------- Nómina -------------------------------- */

export function nominaDe(empleadoId: string): DesprendibleNomina[] {
  const e = EMPLEADOS_RRHH.find((x) => x.id === empleadoId);
  if (!e) return [];
  const base = e.laboral.salario;
  const MESES = ["Julio", "Junio", "Mayo", "Abril", "Marzo", "Febrero"];
  return MESES.map((mes, i) => {
    const devengado = Math.round(base + base * 0.04 * ((hash(empleadoId) + i) % 3));
    const deducciones = Math.round(devengado * 0.08);
    return {
      id: `${empleadoId}-nom-${i}`,
      periodo: `${mes} 2026`,
      devengado,
      deducciones,
      neto: devengado - deducciones,
      fechaPago: `2026-0${7 - i}-30`,
    };
  });
}

/* ------------------------------- Dotación ------------------------------- */

export function dotacionDe(empleadoId: string): EntregaDotacion[] {
  const h = hash(empleadoId);
  const ELEMENTOS = [
    { elemento: "Camisa institucional", talla: "M" },
    { elemento: "Pantalón dril", talla: "32" },
    { elemento: "Botas de seguridad", talla: "40" },
    { elemento: "Chaqueta impermeable", talla: "L" },
  ];
  return ELEMENTOS.slice(0, 2 + (h % 3)).map((el, i) => ({
    id: `${empleadoId}-dot-${i}`,
    elemento: el.elemento,
    talla: el.talla,
    cantidad: 1 + ((h + i) % 2),
    fechaEntrega: `2026-0${((h + i) % 5) + 1}-15`,
    proximaEntrega: `2026-${String(((h + i) % 4) + 9).padStart(2, "0")}-15`,
    firmada: (h + i) % 4 !== 0,
  }));
}

/* --------------------------- Documentos base --------------------------- */

const PLANTILLA_DOCS: {
  categoria: DocumentoEmpleado["categoria"];
  nombre: string;
  vence?: number;
}[] = [
  { categoria: "personales", nombre: "Documento de identidad" },
  { categoria: "personales", nombre: "Certificado de cuenta bancaria" },
  { categoria: "academicos", nombre: "Diploma y acta de grado" },
  { categoria: "contractuales", nombre: "Contrato de trabajo firmado" },
  { categoria: "contractuales", nombre: "Otrosí de modificación salarial", vence: 0 },
  { categoria: "sst", nombre: "Examen médico ocupacional", vence: 9 },
  { categoria: "sst", nombre: "Certificado de trabajo en alturas", vence: -2 },
  { categoria: "incapacidades", nombre: "Soporte de incapacidad EPS", vence: 1 },
  { categoria: "disciplinarios", nombre: "Llamado de atención escrito" },
];

function fechaRelativa(meses: number) {
  const d = new Date("2026-08-02T00:00:00Z");
  d.setUTCMonth(d.getUTCMonth() + meses);
  return d.toISOString().slice(0, 10);
}

export const DOCUMENTOS_INICIALES: DocumentoEmpleado[] = EMPLEADOS_RRHH.flatMap((e) => {
  const h = hash(e.id);
  return PLANTILLA_DOCS.filter((_, i) => (h + i) % 3 !== 0).map((p, i) => {
    const versiones = Array.from({ length: 1 + ((h + i) % 3) }, (_, v) => ({
      version: v + 1,
      nombreArchivo: `${p.nombre.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-v${v + 1}.pdf`,
      tamanoKb: 120 + ((h + i + v) % 800),
      subidoPor: v === 0 ? "Talento Humano" : `${e.nombres} ${e.apellidos}`,
      fecha: fechaRelativa(-18 + v * 5 + (i % 3)),
      nota: v === 0 ? "Carga inicial del expediente" : "Actualización de documento",
    }));
    return {
      id: `${e.id}-doc-${i}`,
      empleadoId: e.id,
      categoria: p.categoria,
      nombre: p.nombre,
      fechaVencimiento: p.vence === undefined ? undefined : fechaRelativa(p.vence),
      versiones,
    };
  });
});

/* --------------------- Solicitudes de actualización --------------------- */

export const SOLICITUDES_INICIALES: SolicitudCambio[] = [
  {
    id: "sol-001",
    empleadoId: "e-004",
    campo: "direccion",
    valorAnterior: "Cra 21 # 45-18",
    valorNuevo: "Calle 138 # 52-30 Torre 2 Apto 803",
    observacionEmpleado: "Cambio de residencia desde julio.",
    estado: "pendiente",
    fechaSolicitud: "2026-07-28",
  },
  {
    id: "sol-002",
    empleadoId: "e-007",
    campo: "celular",
    valorAnterior: "313 455 2210",
    valorNuevo: "310 887 4402",
    estado: "pendiente",
    fechaSolicitud: "2026-07-30",
  },
  {
    id: "sol-003",
    empleadoId: "e-002",
    campo: "emailPersonal",
    valorAnterior: "correo.anterior@correo.com",
    valorNuevo: "carolina.moreno@gmail.com",
    estado: "aprobada",
    fechaSolicitud: "2026-07-12",
    fechaRevision: "2026-07-14",
    revisadoPor: "Talento Humano",
    comentarioRrhh: "Verificado con el empleado.",
  },
  {
    id: "sol-004",
    empleadoId: "e-009",
    campo: "familiar",
    valorAnterior: "2 familiares registrados",
    valorNuevo: "Agregar hijo: Tomás Restrepo · 2024-02-11 · a cargo",
    estado: "rechazada",
    fechaSolicitud: "2026-06-20",
    fechaRevision: "2026-06-22",
    revisadoPor: "Talento Humano",
    comentarioRrhh: "Falta registro civil de nacimiento.",
  },
];
