/**
 * Suscripción en tiempo real a los datos maestros de Firestore; mantiene actualizados los arreglos de `src/data`.
 */
import { useEffect, useState, type ReactNode } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "./firebase";
import {
  AREAS,
  CARGOS,
  CENTROS_COSTO,
  CENTROS_TRABAJO,
  DEPENDENCIAS,
  EMPLEADOS,
  NIVELES,
  USUARIOS,
} from "@/data/organizacion";
import { EMPLEADOS_RRHH, EXPEDIENTES } from "@/data/rrhh";
import { COLECCION_USUARIOS, aUsuarioSistema, type CuentaUsuario } from "./usuarios-admin";
import type { ExpedienteEmpleado } from "@/types/rrhh";

/**
 * Colecciones maestras de Firestore que alimentan los arreglos compartidos de
 * `src/data`. Se hidratan en sitio para que las utilidades sincrónicas
 * (organigrama, índices por id, visibilidad por rol) trabajen con datos reales.
 */
const COLECCIONES: { nombre: string; destino: { id: string }[] }[] = [
  { nombre: "org_niveles", destino: NIVELES },
  { nombre: "org_areas", destino: AREAS },
  { nombre: "org_dependencias", destino: DEPENDENCIAS },
  { nombre: "org_centros_trabajo", destino: CENTROS_TRABAJO },
  { nombre: "org_centros_costo", destino: CENTROS_COSTO },
  { nombre: "org_cargos", destino: CARGOS },
  { nombre: "org_empleados", destino: EMPLEADOS },
  
  { nombre: "empleados_rrhh", destino: EMPLEADOS_RRHH },
];

export function DatosMaestrosProvider({ children }: { children: ReactNode }) {
  const [version, setVersionReal] = useState(0);

  useEffect(() => {
    // Agrupa las actualizaciones: en lugar de rehacer la pantalla con cada
    // colección (10 veces al iniciar), se rehace una sola vez cada 250 ms.
    let pendiente: ReturnType<typeof setTimeout> | null = null;
    const setVersion = (_: (v: number) => number) => {
      if (pendiente) return;
      pendiente = setTimeout(() => {
        pendiente = null;
        setVersionReal((v) => v + 1);
      }, 250);
    };

    const subs = COLECCIONES.map(({ nombre, destino }) =>
      onSnapshot(
        collection(db, nombre),
        (snap) => {
          const docs = snap.docs.map((d) => ({ ...(d.data() as { id: string }), id: d.id }));
          destino.splice(0, destino.length, ...docs);
          setVersion((v) => v + 1);
        },
        (error) => console.error(`[firestore:${nombre}] no se pudo leer`, error),
      ),
    );

    // Las cuentas viven en `usuarios` (mismo id que el UID de Firebase Auth).
    const unsubUsuarios = onSnapshot(
      collection(db, COLECCION_USUARIOS),
      (snap) => {
        const cuentas = snap.docs.map((d) =>
          aUsuarioSistema({ ...(d.data() as CuentaUsuario), id: d.id }),
        );
        USUARIOS.splice(0, USUARIOS.length, ...cuentas);
        setVersion((v) => v + 1);
      },
      (error) => console.error("[firestore:usuarios] no se pudo leer", error),
    );

    const unsubExpedientes = onSnapshot(
      collection(db, "expedientes"),
      (snap) => {
        for (const key of Object.keys(EXPEDIENTES)) delete EXPEDIENTES[key];
        for (const d of snap.docs) {
          EXPEDIENTES[d.id] = { ...(d.data() as ExpedienteEmpleado) };
        }
        setVersion((v) => v + 1);
      },
      (error) => console.error("[firestore:expedientes] no se pudo leer", error),
    );

    return () => {
      if (pendiente) clearTimeout(pendiente);
      subs.forEach((u) => u());
      unsubUsuarios();
      unsubExpedientes();
    };
  }, []);

  // Al cambiar los datos maestros se rehace el árbol para reflejar los valores nuevos.
  return <div key={version} className="contents">{children}</div>;
}
