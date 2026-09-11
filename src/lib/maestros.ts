import { useFirestoreState } from "./firestore";
import type {
  AreaOrg,
  CargoOrg,
  CentroCostoOrg,
  CentroTrabajo,
  Dependencia,
  EmpleadoOrg,
  NivelJerarquico,
} from "@/types/organizacion";


/** Colecciones de Firestore que respaldan los datos maestros. */
export const COL_MAESTROS = {
  niveles: "org_niveles",
  areas: "org_areas",
  dependencias: "org_dependencias",
  centrosTrabajo: "org_centros_trabajo",
  centrosCosto: "org_centros_costo",
  cargos: "org_cargos",
  empleados: "org_empleados",
} as const;

/** Genera un id legible y único para un registro maestro nuevo. */
export const nuevoId = (prefijo: string) =>
  `${prefijo}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export const useNiveles = () => useFirestoreState<NivelJerarquico>(COL_MAESTROS.niveles);
export const useAreas = () => useFirestoreState<AreaOrg>(COL_MAESTROS.areas);
export const useDependencias = () => useFirestoreState<Dependencia>(COL_MAESTROS.dependencias);
export const useCentrosTrabajo = () => useFirestoreState<CentroTrabajo>(COL_MAESTROS.centrosTrabajo);
export const useCentrosCosto = () => useFirestoreState<CentroCostoOrg>(COL_MAESTROS.centrosCosto);
export const useCargos = () => useFirestoreState<CargoOrg>(COL_MAESTROS.cargos);
export const useEmpleadosOrg = () => useFirestoreState<EmpleadoOrg>(COL_MAESTROS.empleados);
