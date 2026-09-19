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

/**
 * Estructura organizacional real. Los arreglos se hidratan en caliente desde
 * Firestore (ver `src/lib/datos-live.tsx`); nunca contienen datos de prueba.
 */

export const NIVELES: NivelJerarquico[] = [];
export const AREAS: AreaOrg[] = [];
export const DEPENDENCIAS: Dependencia[] = [];
export const CENTROS_TRABAJO: CentroTrabajo[] = [];
export const CENTROS_COSTO: CentroCostoOrg[] = [];
export const CARGOS: CargoOrg[] = [];
export const EMPLEADOS: EmpleadoOrg[] = [];
export const USUARIOS: UsuarioSistema[] = [];

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
