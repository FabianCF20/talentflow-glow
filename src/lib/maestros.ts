/**
 * Nombres de colecciones y hooks de los datos maestros (niveles, áreas, cargos, etc.).
 */
import { useFirestoreState } from "./firestore";
import { useAuth } from "./auth";
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
/** Las colecciones con datos salariales solo se consultan con roles autorizados. */
function usePuedeConsultarEstructuraSensible() {
  const { perfil } = useAuth();
  return (perfil?.roles ?? []).some((rol) =>
    ["administrador", "talento_humano", "gerente_general", "director", "nomina", "contabilidad"].includes(rol),
  );
}

export const useCentrosCosto = () => {
  const enabled = usePuedeConsultarEstructuraSensible();
  return useFirestoreState<CentroCostoOrg>(COL_MAESTROS.centrosCosto, "id", { enabled });
};
export const useCargos = () => {
  const enabled = usePuedeConsultarEstructuraSensible();
  return useFirestoreState<CargoOrg>(COL_MAESTROS.cargos, "id", { enabled });
};
export const useEmpleadosOrg = () => {
  const enabled = usePuedeConsultarEstructuraSensible();
  return useFirestoreState<EmpleadoOrg>(COL_MAESTROS.empleados, "id", { enabled });
};
