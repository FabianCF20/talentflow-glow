/**
 * Trazabilidad de acceso a datos personales (Ley 1581 de 2012 · habeas data).
 * Cada consulta a un expediente o a información sensible queda registrada en la
 * colección `accesos_datos` y en la auditoría general del sistema.
 */

import { useEffect, useMemo } from "react";
import { doc, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import { limpiarUndefined, useFirestoreState } from "./firestore";

export type FinalidadAcceso =
  | "consulta_expediente"
  | "emision_certificado"
  | "emision_desprendible"
  | "descarga_documento"
  | "exportacion_reporte";

export const FINALIDAD_LABEL: Record<FinalidadAcceso, string> = {
  consulta_expediente: "Consulta de expediente",
  emision_certificado: "Emisión de certificado",
  emision_desprendible: "Emisión de desprendible",
  descarga_documento: "Descarga de documento",
  exportacion_reporte: "Exportación de reporte",
};

export interface AccesoDatos {
  id: string;
  usuario: string;
  usuarioUid?: string;
  empleadoId: string;
  empleadoNombre: string;
  finalidad: FinalidadAcceso;
  modulo: string;
  detalle?: string;
  navegador: string;
  fecha: string;
  hora: string;
}

const idAcceso = () =>
  `ac-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

/** Registra un acceso a datos personales. Nunca interrumpe la navegación. */
export async function registrarAccesoDatos(input: {
  usuario: string;
  usuarioUid?: string;
  empleadoId: string;
  empleadoNombre: string;
  finalidad: FinalidadAcceso;
  modulo: string;
  detalle?: string;
}) {
  const ahora = new Date();
  const registro: AccesoDatos = {
    id: idAcceso(),
    ...input,
    navegador: typeof navigator === "undefined" ? "—" : navigator.userAgent.slice(0, 120),
    fecha: ahora.toISOString().slice(0, 10),
    hora: ahora.toISOString().slice(11, 19),
  };

  try {
    await setDoc(
      doc(db, "accesos_datos", registro.id),
      limpiarUndefined(registro) as unknown as Record<string, unknown>,
    );
    await setDoc(doc(db, "auditoria", registro.id), {
      id: registro.id,
      usuario: registro.usuario,
      fecha: registro.fecha,
      hora: registro.hora,
      ip: "—",
      navegador: registro.navegador,
      accion: "consultar",
      modulo: registro.modulo,
      registroAfectado: `${registro.empleadoNombre} · ${FINALIDAD_LABEL[registro.finalidad]}`,
      valorNuevo: registro.detalle ?? FINALIDAD_LABEL[registro.finalidad],
    });
  } catch (error) {
    console.error("[firestore:accesos_datos] no se pudo registrar el acceso", error);
  }
}

/** Registra una única vez el acceso mientras el componente está montado. */
export function useRegistroAcceso(
  activo: boolean,
  datos: Parameters<typeof registrarAccesoDatos>[0],
) {
  const clave = `${datos.empleadoId}|${datos.finalidad}|${datos.usuario}`;
  useEffect(() => {
    if (!activo || !datos.empleadoId || !datos.usuario) return;
    void registrarAccesoDatos(datos);
    // Solo se vuelve a registrar si cambia el empleado, la finalidad o el usuario.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activo, clave]);
}

/** Bitácora de accesos a datos personales, del más reciente al más antiguo. */
export function useAccesosDatos(): AccesoDatos[] {
  const [items] = useFirestoreState<AccesoDatos>("accesos_datos");
  return useMemo(
    () =>
      [...items].sort((a, b) =>
        `${a.fecha}${a.hora}` < `${b.fecha}${b.hora}` ? 1 : -1,
      ),
    [items],
  );
}
