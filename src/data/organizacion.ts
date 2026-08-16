import type {
  AreaOrg,
  CargoOrg,
  CentroCostoOrg,
  CentroTrabajo,
  Dependencia,
  EmpleadoOrg,
  NivelJerarquico,
  UsuarioSistema,
} from "@/types/organizacion";

/** Datos de demostración de la estructura organizacional. */

export const NIVELES: NivelJerarquico[] = [
  { id: "nv-1", nivel: 1, nombre: "Gerencia General", descripcion: "Dirección estratégica de la compañía", estado: "activo" },
  { id: "nv-2", nivel: 2, nombre: "Dirección", descripcion: "Responsables de una dirección completa", estado: "activo" },
  { id: "nv-3", nivel: 3, nombre: "Jefatura", descripcion: "Responsables de área o dependencia", estado: "activo" },
  { id: "nv-4", nivel: 4, nombre: "Coordinación / Supervisión", descripcion: "Control operativo de equipos", estado: "activo" },
  { id: "nv-5", nivel: 5, nombre: "Profesional / Analista", descripcion: "Ejecución especializada", estado: "activo" },
  { id: "nv-6", nivel: 6, nombre: "Operativo / Auxiliar", descripcion: "Ejecución operativa", estado: "activo" },
];

export const AREAS: AreaOrg[] = [
  { id: "ar-1", codigo: "GG", nombre: "Gerencia General", responsableId: "e-001", estado: "activo" },
  { id: "ar-2", codigo: "ADM", nombre: "Dirección Administrativa", direccionId: "ar-1", responsableId: "e-002", estado: "activo" },
  { id: "ar-3", codigo: "OPE", nombre: "Dirección de Operaciones", direccionId: "ar-1", responsableId: "e-003", estado: "activo" },
  { id: "ar-4", codigo: "TH", nombre: "Talento Humano", direccionId: "ar-2", responsableId: "e-004", estado: "activo" },
  { id: "ar-5", codigo: "FIN", nombre: "Financiera y Contabilidad", direccionId: "ar-2", responsableId: "e-005", estado: "activo" },
  { id: "ar-6", codigo: "PRD", nombre: "Producción", direccionId: "ar-3", responsableId: "e-006", estado: "activo" },
  { id: "ar-7", codigo: "SST", nombre: "Seguridad y Salud en el Trabajo", direccionId: "ar-3", estado: "inactivo" },
];

export const DEPENDENCIAS: Dependencia[] = [
  { id: "dp-1", codigo: "TH-SEL", nombre: "Selección y Contratación", areaId: "ar-4", responsableId: "e-007", estado: "activo" },
  { id: "dp-2", codigo: "TH-NOM", nombre: "Nómina y Compensación", areaId: "ar-4", responsableId: "e-008", estado: "activo" },
  { id: "dp-3", codigo: "FIN-CON", nombre: "Contabilidad", areaId: "ar-5", responsableId: "e-009", estado: "activo" },
  { id: "dp-4", codigo: "FIN-TES", nombre: "Tesorería", areaId: "ar-5", estado: "activo" },
  { id: "dp-5", codigo: "PRD-L1", nombre: "Línea de Producción 1", areaId: "ar-6", responsableId: "e-010", estado: "activo" },
  { id: "dp-6", codigo: "PRD-MTO", nombre: "Mantenimiento", areaId: "ar-6", estado: "inactivo" },
];

export const CENTROS_TRABAJO: CentroTrabajo[] = [
  { id: "ct-1", codigo: "CT-BOG", nombre: "Sede Administrativa Bogotá", ciudad: "Bogotá D.C.", direccion: "Cra 11 # 93-45", riesgoArl: "I", estado: "activo" },
  { id: "ct-2", codigo: "CT-YUM", nombre: "Planta Yumbo", ciudad: "Yumbo", direccion: "Km 5 vía Cali-Yumbo", riesgoArl: "IV", estado: "activo" },
  { id: "ct-3", codigo: "CT-MED", nombre: "Centro Logístico Medellín", ciudad: "Medellín", direccion: "Cll 30 # 65-12", riesgoArl: "III", estado: "activo" },
  { id: "ct-4", codigo: "CT-BAQ", nombre: "Oficina Barranquilla", ciudad: "Barranquilla", direccion: "Cra 53 # 82-10", riesgoArl: "I", estado: "inactivo" },
];

export const CENTROS_COSTO: CentroCostoOrg[] = [
  { id: "cc-1", codigo: "CC-100", nombre: "Administración General", areaId: "ar-2", presupuestoAnual: 1850000000, estado: "activo" },
  { id: "cc-2", codigo: "CC-200", nombre: "Talento Humano", areaId: "ar-4", presupuestoAnual: 640000000, estado: "activo" },
  { id: "cc-3", codigo: "CC-300", nombre: "Contabilidad y Finanzas", areaId: "ar-5", presupuestoAnual: 520000000, estado: "activo" },
  { id: "cc-4", codigo: "CC-400", nombre: "Producción Planta Yumbo", areaId: "ar-6", presupuestoAnual: 4200000000, estado: "activo" },
  { id: "cc-5", codigo: "CC-500", nombre: "Proyectos Especiales", areaId: "ar-3", presupuestoAnual: 310000000, estado: "inactivo" },
];

export const CARGOS: CargoOrg[] = [
  { id: "cg-1", codigo: "CG-001", nombre: "Gerente General", areaId: "ar-1", nivelId: "nv-1", salarioBase: 22000000, estado: "activo" },
  { id: "cg-2", codigo: "CG-002", nombre: "Director Administrativo", areaId: "ar-2", nivelId: "nv-2", salarioBase: 14500000, estado: "activo" },
  { id: "cg-3", codigo: "CG-003", nombre: "Director de Operaciones", areaId: "ar-3", nivelId: "nv-2", salarioBase: 14500000, estado: "activo" },
  { id: "cg-4", codigo: "CG-004", nombre: "Jefe de Talento Humano", areaId: "ar-4", nivelId: "nv-3", salarioBase: 9200000, estado: "activo" },
  { id: "cg-5", codigo: "CG-005", nombre: "Jefe Financiero", areaId: "ar-5", nivelId: "nv-3", salarioBase: 9500000, estado: "activo" },
  { id: "cg-6", codigo: "CG-006", nombre: "Jefe de Producción", areaId: "ar-6", nivelId: "nv-3", salarioBase: 8800000, estado: "activo" },
  { id: "cg-7", codigo: "CG-007", nombre: "Coordinador de Selección", areaId: "ar-4", nivelId: "nv-4", salarioBase: 5200000, estado: "activo" },
  { id: "cg-8", codigo: "CG-008", nombre: "Analista de Nómina", areaId: "ar-4", nivelId: "nv-5", salarioBase: 4100000, estado: "activo" },
  { id: "cg-9", codigo: "CG-009", nombre: "Contador General", areaId: "ar-5", nivelId: "nv-4", salarioBase: 6300000, estado: "activo" },
  { id: "cg-10", codigo: "CG-010", nombre: "Supervisor de Línea", areaId: "ar-6", nivelId: "nv-4", salarioBase: 3900000, estado: "activo" },
  { id: "cg-11", codigo: "CG-011", nombre: "Operario de Producción", areaId: "ar-6", nivelId: "nv-6", salarioBase: 1650000, estado: "activo" },
  { id: "cg-12", codigo: "CG-012", nombre: "Auxiliar Administrativo", areaId: "ar-2", nivelId: "nv-6", salarioBase: 1750000, estado: "activo" },
];

export const EMPLEADOS: EmpleadoOrg[] = [
  { id: "e-001", nombres: "Ricardo", apellidos: "Salazar", documento: "79.442.118", cargoId: "cg-1", areaId: "ar-1", centroTrabajoId: "ct-1", centroCostoId: "cc-1", salario: 22000000, fechaIngreso: "2016-02-01", estado: "activo", usuarioId: "us-001" },
  { id: "e-002", nombres: "Laura", apellidos: "Restrepo", documento: "52.118.904", cargoId: "cg-2", areaId: "ar-2", centroTrabajoId: "ct-1", centroCostoId: "cc-1", jefeInmediatoId: "e-001", salario: 14500000, fechaIngreso: "2017-06-15", estado: "activo", usuarioId: "us-002" },
  { id: "e-003", nombres: "Jorge", apellidos: "Pineda", documento: "16.884.221", cargoId: "cg-3", areaId: "ar-3", centroTrabajoId: "ct-2", centroCostoId: "cc-4", jefeInmediatoId: "e-001", salario: 14500000, fechaIngreso: "2018-01-08", estado: "activo", usuarioId: "us-003" },
  { id: "e-004", nombres: "Sandra", apellidos: "Ruiz", documento: "43.556.900", cargoId: "cg-4", areaId: "ar-4", centroTrabajoId: "ct-1", centroCostoId: "cc-2", jefeInmediatoId: "e-002", salario: 9200000, fechaIngreso: "2019-03-04", estado: "activo", usuarioId: "us-004" },
  { id: "e-005", nombres: "Mauricio", apellidos: "Cárdenas", documento: "80.221.774", cargoId: "cg-5", areaId: "ar-5", centroTrabajoId: "ct-1", centroCostoId: "cc-3", jefeInmediatoId: "e-002", salario: 9500000, fechaIngreso: "2018-09-17", estado: "activo", usuarioId: "us-005" },
  { id: "e-006", nombres: "Diana", apellidos: "Ospina", documento: "1.094.777.102", cargoId: "cg-6", areaId: "ar-6", centroTrabajoId: "ct-2", centroCostoId: "cc-4", jefeInmediatoId: "e-003", salario: 8800000, fechaIngreso: "2020-02-10", estado: "activo", usuarioId: "us-006" },
  { id: "e-007", nombres: "Camila", apellidos: "Torres", documento: "1.020.445.331", cargoId: "cg-7", areaId: "ar-4", dependenciaId: "dp-1", centroTrabajoId: "ct-1", centroCostoId: "cc-2", jefeInmediatoId: "e-004", salario: 5200000, fechaIngreso: "2021-05-03", estado: "activo", usuarioId: "us-007" },
  { id: "e-008", nombres: "Andrés", apellidos: "Gómez", documento: "1.033.900.712", cargoId: "cg-8", areaId: "ar-4", dependenciaId: "dp-2", centroTrabajoId: "ct-1", centroCostoId: "cc-2", jefeInmediatoId: "e-004", salario: 4100000, fechaIngreso: "2022-01-24", estado: "activo", usuarioId: "us-008" },
  { id: "e-009", nombres: "Paola", apellidos: "Mendoza", documento: "52.900.114", cargoId: "cg-9", areaId: "ar-5", dependenciaId: "dp-3", centroTrabajoId: "ct-1", centroCostoId: "cc-3", jefeInmediatoId: "e-005", salario: 6300000, fechaIngreso: "2020-08-11", estado: "activo", usuarioId: "us-009" },
  { id: "e-010", nombres: "Carlos", apellidos: "Mejía", documento: "1.094.222.145", cargoId: "cg-10", areaId: "ar-6", dependenciaId: "dp-5", centroTrabajoId: "ct-2", centroCostoId: "cc-4", jefeInmediatoId: "e-006", salario: 3900000, fechaIngreso: "2021-11-02", estado: "activo", usuarioId: "us-010" },
  { id: "e-011", nombres: "Julián", apellidos: "Vargas", documento: "1.144.552.331", cargoId: "cg-11", areaId: "ar-6", dependenciaId: "dp-5", centroTrabajoId: "ct-2", centroCostoId: "cc-4", jefeInmediatoId: "e-010", salario: 1650000, fechaIngreso: "2023-04-18", estado: "activo", usuarioId: "us-011" },
  { id: "e-012", nombres: "Marcela", apellidos: "Ríos", documento: "1.152.884.010", cargoId: "cg-11", areaId: "ar-6", dependenciaId: "dp-5", centroTrabajoId: "ct-2", centroCostoId: "cc-4", jefeInmediatoId: "e-010", salario: 1650000, fechaIngreso: "2023-07-01", estado: "activo" },
  { id: "e-013", nombres: "Felipe", apellidos: "Navarro", documento: "1.018.442.900", cargoId: "cg-12", areaId: "ar-2", centroTrabajoId: "ct-3", centroCostoId: "cc-1", jefeInmediatoId: "e-002", salario: 1750000, fechaIngreso: "2024-02-19", estado: "activo", usuarioId: "us-013" },
  { id: "e-014", nombres: "Natalia", apellidos: "Cifuentes", documento: "1.077.331.220", cargoId: "cg-12", areaId: "ar-2", centroTrabajoId: "ct-1", centroCostoId: "cc-1", jefeInmediatoId: "e-002", salario: 1750000, fechaIngreso: "2024-09-09", estado: "inactivo" },
];

export const USUARIOS: UsuarioSistema[] = [
  { id: "us-001", empleadoId: "e-001", username: "rsalazar", email: "ricardo.salazar@empresa.com.co", roles: ["gerente_general"], estadoUsuario: "activo", ultimoAcceso: "31/07/2026 07:42", intentosFallidos: 0, creadoEn: "2016-02-01" },
  { id: "us-002", empleadoId: "e-002", username: "lrestrepo", email: "laura.restrepo@empresa.com.co", roles: ["administrador", "director"], estadoUsuario: "activo", ultimoAcceso: "31/07/2026 08:10", intentosFallidos: 0, creadoEn: "2017-06-15" },
  { id: "us-003", empleadoId: "e-003", username: "jpineda", email: "jorge.pineda@empresa.com.co", roles: ["director"], estadoUsuario: "activo", ultimoAcceso: "30/07/2026 18:22", intentosFallidos: 1, creadoEn: "2018-01-08" },
  { id: "us-004", empleadoId: "e-004", username: "sruiz", email: "sandra.ruiz@empresa.com.co", roles: ["jefe", "talento_humano"], estadoUsuario: "activo", ultimoAcceso: "31/07/2026 06:58", intentosFallidos: 0, creadoEn: "2019-03-04" },
  { id: "us-005", empleadoId: "e-005", username: "mcardenas", email: "mauricio.cardenas@empresa.com.co", roles: ["jefe", "contabilidad"], estadoUsuario: "activo", ultimoAcceso: "30/07/2026 16:05", intentosFallidos: 0, creadoEn: "2018-09-17" },
  { id: "us-006", empleadoId: "e-006", username: "dospina", email: "diana.ospina@empresa.com.co", roles: ["jefe"], estadoUsuario: "activo", ultimoAcceso: "30/07/2026 19:31", intentosFallidos: 2, creadoEn: "2020-02-10" },
  { id: "us-007", empleadoId: "e-007", username: "ctorres", email: "camila.torres@empresa.com.co", roles: ["talento_humano"], estadoUsuario: "activo", ultimoAcceso: "29/07/2026 15:44", intentosFallidos: 0, creadoEn: "2021-05-03" },
  { id: "us-008", empleadoId: "e-008", username: "agomez", email: "andres.gomez@empresa.com.co", roles: ["nomina"], estadoUsuario: "activo", ultimoAcceso: "31/07/2026 07:03", intentosFallidos: 0, creadoEn: "2022-01-24" },
  { id: "us-009", empleadoId: "e-009", username: "pmendoza", email: "paola.mendoza@empresa.com.co", roles: ["contabilidad"], estadoUsuario: "bloqueado", ultimoAcceso: "28/07/2026 11:12", intentosFallidos: 5, creadoEn: "2020-08-11" },
  { id: "us-010", empleadoId: "e-010", username: "cmejia", email: "carlos.mejia@empresa.com.co", roles: ["supervisor"], estadoUsuario: "activo", ultimoAcceso: "30/07/2026 14:50", intentosFallidos: 0, creadoEn: "2021-11-02" },
  { id: "us-011", empleadoId: "e-011", username: "jvargas", email: "julian.vargas@empresa.com.co", roles: ["empleado"], estadoUsuario: "pendiente", intentosFallidos: 0, creadoEn: "2026-07-28" },
  { id: "us-013", empleadoId: "e-013", username: "fnavarro", email: "felipe.navarro@empresa.com.co", roles: ["empleado"], estadoUsuario: "inactivo", ultimoAcceso: "12/06/2026 09:20", intentosFallidos: 0, creadoEn: "2024-02-19" },
];

/* ---------- Índices y utilidades derivadas (organigrama automático) ---------- */

export const areaById = (id?: string) => AREAS.find((a) => a.id === id);
export const cargoById = (id?: string) => CARGOS.find((c) => c.id === id);
export const nivelById = (id?: string) => NIVELES.find((n) => n.id === id);
export const dependenciaById = (id?: string) => DEPENDENCIAS.find((d) => d.id === id);
export const centroTrabajoById = (id?: string) => CENTROS_TRABAJO.find((c) => c.id === id);
export const centroCostoById = (id?: string) => CENTROS_COSTO.find((c) => c.id === id);
export const empleadoById = (id?: string) => EMPLEADOS.find((e) => e.id === id);
export const usuarioByEmpleado = (empleadoId: string) =>
  USUARIOS.find((u) => u.empleadoId === empleadoId);

export interface OrgNode {
  empleado: EmpleadoOrg;
  hijos: OrgNode[];
}

/**
 * Construye el organigrama automáticamente a partir de cargo, área y jefe inmediato.
 * Cualquier cambio en los datos regenera la estructura completa.
 */
export function buildOrgTree(empleados: EmpleadoOrg[] = EMPLEADOS): OrgNode[] {
  const activos = empleados.filter((e) => e.estado !== "archivado");
  const map = new Map<string, OrgNode>(activos.map((e) => [e.id, { empleado: e, hijos: [] }]));
  const raices: OrgNode[] = [];
  for (const node of map.values()) {
    const padre = node.empleado.jefeInmediatoId
      ? map.get(node.empleado.jefeInmediatoId)
      : undefined;
    if (padre) padre.hijos.push(node);
    else raices.push(node);
  }
  const ordenar = (nodes: OrgNode[]) => {
    nodes.sort((a, b) => {
      const na = nivelById(cargoById(a.empleado.cargoId)?.nivelId)?.nivel ?? 99;
      const nb = nivelById(cargoById(b.empleado.cargoId)?.nivelId)?.nivel ?? 99;
      return na - nb || a.empleado.nombres.localeCompare(b.empleado.nombres);
    });
    nodes.forEach((n) => ordenar(n.hijos));
  };
  ordenar(raices);
  return raices;
}

/** IDs de todos los subordinados (directos e indirectos) de un empleado. */
export function subordinadosDe(empleadoId: string, empleados: EmpleadoOrg[] = EMPLEADOS): string[] {
  const directos = empleados.filter((e) => e.jefeInmediatoId === empleadoId);
  return directos.flatMap((d) => [d.id, ...subordinadosDe(d.id, empleados)]);
}

/** Áreas descendientes de una dirección (incluye la propia). */
export function areasDeDireccion(areaId: string, areas: AreaOrg[] = AREAS): string[] {
  const hijas = areas.filter((a) => a.direccionId === areaId);
  return [areaId, ...hijas.flatMap((h) => areasDeDireccion(h.id, areas))];
}
