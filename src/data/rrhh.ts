import { EMPLEADOS } from "@/data/organizacion";
import type {
  EmpleadoRRHH,
  EstadoLaboral,
  EventoHojaVida,
  ExpedienteEmpleado,
  TipoContrato,
} from "@/types/rrhh";

/** Datos de demostración del módulo central de Recursos Humanos. */

interface Override {
  estadoLaboral: EstadoLaboral;
  tipoContrato: TipoContrato;
  fechaFinContrato?: string;
  fechaRetiro?: string;
  motivoRetiro?: string;
}

const OVERRIDES: Record<string, Override> = {
  "e-001": { estadoLaboral: "activo", tipoContrato: "indefinido" },
  "e-002": { estadoLaboral: "activo", tipoContrato: "indefinido" },
  "e-003": { estadoLaboral: "vacaciones", tipoContrato: "indefinido" },
  "e-004": { estadoLaboral: "activo", tipoContrato: "indefinido" },
  "e-005": { estadoLaboral: "activo", tipoContrato: "indefinido" },
  "e-006": { estadoLaboral: "incapacidad", tipoContrato: "indefinido" },
  "e-007": { estadoLaboral: "activo", tipoContrato: "fijo", fechaFinContrato: "2026-12-31" },
  "e-008": { estadoLaboral: "licencia", tipoContrato: "indefinido" },
  "e-009": { estadoLaboral: "activo", tipoContrato: "indefinido" },
  "e-010": { estadoLaboral: "activo", tipoContrato: "obra_labor", fechaFinContrato: "2026-11-30" },
  "e-011": { estadoLaboral: "activo", tipoContrato: "fijo", fechaFinContrato: "2026-10-17" },
  "e-012": { estadoLaboral: "suspendido", tipoContrato: "fijo", fechaFinContrato: "2026-09-30" },
  "e-013": { estadoLaboral: "activo", tipoContrato: "aprendizaje", fechaFinContrato: "2026-08-19" },
  "e-014": {
    estadoLaboral: "retirado",
    tipoContrato: "fijo",
    fechaRetiro: "2026-06-30",
    motivoRetiro: "Terminación de contrato a término fijo por no renovación",
  },
};

const RETIRADOS_ADICIONALES: EmpleadoRRHH[] = [
  {
    id: "e-015",
    nombres: "Óscar",
    apellidos: "Betancur",
    documento: "71.223.884",
    estadoLaboral: "retirado",
    estado: "inactivo",
    accesoHabilitado: false,
    laboral: {
      fechaIngreso: "2019-04-01",
      areaId: "ar-6",
      dependenciaId: "dp-5",
      cargoId: "cg-10",
      centroCostoId: "cc-4",
      centroTrabajoId: "ct-2",
      jefeInmediatoId: "e-006",
      tipoContrato: "indefinido",
      salario: 3750000,
      fechaRetiro: "2025-11-15",
      motivoRetiro: "Renuncia voluntaria",
    },
  },
  {
    id: "e-016",
    nombres: "Liliana",
    apellidos: "Peña",
    documento: "52.774.019",
    estadoLaboral: "retirado",
    estado: "archivado",
    accesoHabilitado: false,
    laboral: {
      fechaIngreso: "2015-08-10",
      areaId: "ar-5",
      dependenciaId: "dp-4",
      cargoId: "cg-9",
      centroCostoId: "cc-3",
      centroTrabajoId: "ct-1",
      jefeInmediatoId: "e-005",
      tipoContrato: "indefinido",
      salario: 6050000,
      fechaRetiro: "2024-12-20",
      motivoRetiro: "Terminación por mutuo acuerdo",
    },
  },
];

export const EMPLEADOS_RRHH: EmpleadoRRHH[] = [
  ...EMPLEADOS.map<EmpleadoRRHH>((e) => {
    const o = OVERRIDES[e.id] ?? { estadoLaboral: "activo", tipoContrato: "indefinido" };
    return {
      id: e.id,
      nombres: e.nombres,
      apellidos: e.apellidos,
      documento: e.documento,
      estadoLaboral: o.estadoLaboral,
      estado: o.estadoLaboral === "retirado" ? "inactivo" : "activo",
      accesoHabilitado: o.estadoLaboral !== "retirado" && o.estadoLaboral !== "suspendido",
      laboral: {
        fechaIngreso: e.fechaIngreso,
        areaId: e.areaId,
        dependenciaId: e.dependenciaId,
        cargoId: e.cargoId,
        centroCostoId: e.centroCostoId,
        centroTrabajoId: e.centroTrabajoId,
        jefeInmediatoId: e.jefeInmediatoId,
        tipoContrato: o.tipoContrato,
        salario: e.salario,
        fechaFinContrato: o.fechaFinContrato,
        fechaRetiro: o.fechaRetiro,
        motivoRetiro: o.motivoRetiro,
      },
    };
  }),
  ...RETIRADOS_ADICIONALES,
];

/* ---------------------------- Expedientes ---------------------------- */

const BANCOS = ["Bancolombia", "Banco de Bogotá", "Davivienda", "BBVA Colombia", "Banco de Occidente"];
const EPS = ["Sura EPS", "Sanitas EPS", "Compensar EPS", "Nueva EPS", "Salud Total EPS"];
const AFP = ["Protección", "Porvenir", "Colfondos", "Skandia", "Colpensiones"];
const CAJAS = ["Compensar", "Colsubsidio", "Comfama", "Comfenalco", "Cafam"];
const CIUDADES = ["Bogotá D.C.", "Yumbo", "Medellín", "Cali", "Barranquilla"];
const RH = ["O+", "A+", "B+", "O-", "AB+"];
const NIVELES_ACAD = ["profesional", "tecnologo", "especializacion", "tecnico", "maestria"] as const;

const hash = (id: string) => id.split("").reduce((a, c) => a + c.charCodeAt(0), 0);

function expedienteDe(e: EmpleadoRRHH): ExpedienteEmpleado {
  const h = hash(e.id);
  const pick = <T,>(arr: readonly T[], off = 0) => arr[(h + off) % arr.length]!;
  const anioNac = 1972 + (h % 26);
  const nombre = `${e.nombres} ${e.apellidos}`;
  return {
    empleadoId: e.id,
    personales: {
      tipoDocumento: "CC",
      fechaNacimiento: `${anioNac}-${String((h % 12) + 1).padStart(2, "0")}-${String((h % 27) + 1).padStart(2, "0")}`,
      lugarNacimiento: pick(CIUDADES, 1),
      genero: h % 2 === 0 ? "F" : "M",
      estadoCivil: (["soltero", "casado", "union_libre", "separado"] as const)[h % 4]!,
      rh: pick(RH, 2),
      direccion: `Cra ${(h % 60) + 5} # ${(h % 90) + 10}-${(h % 40) + 12}`,
      ciudad: pick(CIUDADES),
      telefono: `60${(h % 8) + 1} ${300 + (h % 600)} ${1000 + (h % 8999)}`,
      celular: `31${h % 10} ${400 + (h % 500)} ${1000 + (h % 8999)}`,
      emailPersonal: `${e.nombres.toLowerCase()}.${e.apellidos.toLowerCase()}@correo.com`,
    },
    familiares:
      h % 3 === 0
        ? [
            {
              id: `${e.id}-f1`,
              nombre: `${pick(["Ana", "Luis", "Sofía", "Miguel", "Clara"], 3)} ${e.apellidos}`,
              parentesco: "conyuge",
              fechaNacimiento: `${anioNac + 2}-05-14`,
              documento: `${10 + (h % 80)}.${100 + (h % 800)}.${100 + (h % 800)}`,
              aCargo: true,
            },
          ]
        : [
            {
              id: `${e.id}-f1`,
              nombre: `${pick(["Mateo", "Valentina", "Samuel", "Isabella"], 4)} ${e.apellidos}`,
              parentesco: "hijo",
              fechaNacimiento: `${2008 + (h % 14)}-03-08`,
              aCargo: true,
            },
            {
              id: `${e.id}-f2`,
              nombre: `${pick(["Rosa", "Jorge", "Elena", "Pedro"], 5)} ${e.apellidos}`,
              parentesco: h % 2 === 0 ? "madre" : "padre",
              aCargo: false,
            },
          ],
    contactosEmergencia: [
      {
        id: `${e.id}-ce1`,
        nombre: `${pick(["Marta", "Andrés", "Lucía", "Iván"], 6)} ${e.apellidos}`,
        parentesco: h % 2 === 0 ? "Cónyuge" : "Hermano/a",
        telefono: `31${(h + 3) % 10} ${400 + (h % 500)} ${1000 + (h % 8999)}`,
        principal: true,
      },
      {
        id: `${e.id}-ce2`,
        nombre: `${pick(["Hernán", "Patricia", "Alberto", "Yolanda"], 7)} Gutiérrez`,
        parentesco: "Amigo/a",
        telefono: `32${(h + 5) % 10} ${300 + (h % 600)} ${1000 + (h % 8999)}`,
        principal: false,
      },
    ],
    academicos: [
      {
        id: `${e.id}-ac1`,
        nivel: NIVELES_ACAD[h % NIVELES_ACAD.length]!,
        titulo: pick(
          [
            "Administración de Empresas",
            "Ingeniería Industrial",
            "Contaduría Pública",
            "Psicología",
            "Tecnología en Producción",
          ],
          8,
        ),
        institucion: pick(
          [
            "Universidad Nacional de Colombia",
            "Universidad de Antioquia",
            "Universidad del Valle",
            "Politécnico Grancolombiano",
            "SENA",
          ],
          9,
        ),
        anioGraduacion: anioNac + 23,
        certificado: h % 4 !== 0,
      },
      {
        id: `${e.id}-ac2`,
        nivel: "bachiller",
        titulo: "Bachiller académico",
        institucion: pick(["Colegio San José", "I.E. Santa Teresa", "Liceo Moderno"], 10),
        anioGraduacion: anioNac + 18,
        certificado: true,
      },
    ],
    experiencia: [
      {
        id: `${e.id}-ex1`,
        empresa: pick(["Grupo Andino S.A.S.", "Inversiones Delta Ltda.", "Servicios Integrales S.A."], 11),
        cargo: pick(["Analista", "Coordinador", "Auxiliar", "Supervisor"], 12),
        desde: `${Number(e.laboral.fechaIngreso.slice(0, 4)) - 4}-02-01`,
        hasta: `${Number(e.laboral.fechaIngreso.slice(0, 4)) - 1}-12-15`,
        motivoRetiro: "Mejor oportunidad laboral",
        verificada: h % 3 !== 0,
      },
    ],
    bancarios: {
      banco: pick(BANCOS, 13),
      tipoCuenta: h % 5 === 0 ? "corriente" : "ahorros",
      numeroCuenta: `****${3000 + (h % 6999)}`,
      titular: nombre,
      certificacionAdjunta: h % 6 !== 0,
    },
    seguridadSocial: {
      eps: pick(EPS, 14),
      afp: pick(AFP, 15),
      cesantias: pick(AFP, 16),
      arl: "ARL Sura",
      cajaCompensacion: pick(CAJAS, 17),
      claseRiesgo: e.laboral.centroTrabajoId === "ct-2" ? "IV" : "I",
      afiliadoDesde: e.laboral.fechaIngreso,
    },
  };
}

export const EXPEDIENTES: Record<string, ExpedienteEmpleado> = Object.fromEntries(
  EMPLEADOS_RRHH.map((e) => [e.id, expedienteDe(e)]),
);

/* ------------------------- Hoja de vida digital ------------------------- */

const anio = (f: string) => Number(f.slice(0, 4));

/** Eventos base generados a partir de la vinculación y los hitos históricos conocidos. */
function eventosIniciales(): EventoHojaVida[] {
  const eventos: EventoHojaVida[] = [];
  for (const e of EMPLEADOS_RRHH) {
    eventos.push({
      id: `${e.id}-ev-ing`,
      empleadoId: e.id,
      tipo: "ingreso",
      fecha: e.laboral.fechaIngreso,
      titulo: "Ingreso a la compañía",
      detalle: `Vinculación con contrato ${e.laboral.tipoContrato.replace("_", " ")}.`,
      valorNuevo: `Cargo inicial · ${e.laboral.cargoId}`,
      registradoPor: "Talento Humano",
    });
    const h = hash(e.id);
    if (h % 3 === 0) {
      eventos.push({
        id: `${e.id}-ev-sal`,
        empleadoId: e.id,
        tipo: "cambio_salarial",
        fecha: `${anio(e.laboral.fechaIngreso) + 1}-01-01`,
        titulo: "Incremento salarial anual",
        detalle: "Ajuste por política de compensación e IPC.",
        valorAnterior: String(Math.round(e.laboral.salario * 0.92)),
        valorNuevo: String(e.laboral.salario),
        registradoPor: "Nómina",
      });
    }
    if (h % 4 === 0) {
      eventos.push({
        id: `${e.id}-ev-asc`,
        empleadoId: e.id,
        tipo: "ascenso",
        fecha: `${anio(e.laboral.fechaIngreso) + 2}-04-01`,
        titulo: "Ascenso de cargo",
        detalle: "Promoción por desempeño sobresaliente.",
        valorAnterior: "Cargo anterior de menor nivel",
        valorNuevo: e.laboral.cargoId,
        registradoPor: "Talento Humano",
      });
    }
    if (h % 5 === 0) {
      eventos.push({
        id: `${e.id}-ev-tra`,
        empleadoId: e.id,
        tipo: "traslado",
        fecha: `${anio(e.laboral.fechaIngreso) + 1}-07-15`,
        titulo: "Traslado de centro de trabajo",
        detalle: "Reubicación por necesidad operativa.",
        valorAnterior: "CT-BOG",
        valorNuevo: e.laboral.centroTrabajoId,
        registradoPor: "Talento Humano",
      });
    }
    if (e.laboral.tipoContrato === "fijo" || e.laboral.tipoContrato === "obra_labor") {
      eventos.push({
        id: `${e.id}-ev-ren`,
        empleadoId: e.id,
        tipo: "renovacion",
        fecha: `${anio(e.laboral.fechaIngreso) + 1}-01-15`,
        titulo: "Renovación de contrato",
        detalle: "Prórroga del contrato por un periodo adicional.",
        valorNuevo: e.laboral.fechaFinContrato ?? "Periodo adicional",
        registradoPor: "Talento Humano",
      });
    }
    if (e.estadoLaboral === "retirado" && e.laboral.fechaRetiro) {
      eventos.push({
        id: `${e.id}-ev-ter`,
        empleadoId: e.id,
        tipo: "terminacion",
        fecha: e.laboral.fechaRetiro,
        titulo: "Terminación de la relación laboral",
        detalle: e.laboral.motivoRetiro ?? "Terminación registrada.",
        valorAnterior: "Activo",
        valorNuevo: "Retirado",
        registradoPor: "Talento Humano",
      });
    }
  }
  return eventos;
}

export const EVENTOS_HV: EventoHojaVida[] = eventosIniciales();

export const empleadoRRHHById = (id?: string) => EMPLEADOS_RRHH.find((e) => e.id === id);
