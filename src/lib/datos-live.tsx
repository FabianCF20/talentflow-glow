/**
 * Suscripciones a datos maestros con separación de información pública y sensible.
 * Las colecciones con salarios, cuentas y expedientes solo se cargan para roles autorizados.
 */
import { useEffect, useState, type ReactNode } from "react";
import { collection, doc, onSnapshot } from "firebase/firestore";
import { db } from "./firebase";
import { useUidSesion } from "./firestore";
import { useAuth } from "./auth";
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
import { EXPEDIENTES } from "@/data/rrhh";
import { COLECCION_USUARIOS, aUsuarioSistema, type CuentaUsuario } from "./usuarios-admin";
import type { ExpedienteEmpleado } from "@/types/rrhh";

const COLECCIONES_PUBLICAS: { nombre: string; destino: { id: string }[] }[] = [
  { nombre: "org_niveles", destino: NIVELES },
  { nombre: "org_areas", destino: AREAS },
  { nombre: "org_dependencias", destino: DEPENDENCIAS },
  { nombre: "org_centros_trabajo", destino: CENTROS_TRABAJO },
];

function limpiarDatosPrivados() {
  CENTROS_COSTO.splice(0, CENTROS_COSTO.length);
  EMPLEADOS.splice(0, EMPLEADOS.length);
  USUARIOS.splice(0, USUARIOS.length);
  for (const key of Object.keys(EXPEDIENTES)) delete EXPEDIENTES[key];
}

export function DatosMaestrosProvider({ children }: { children: ReactNode }) {
  const [version, setVersionReal] = useState(0);
  const uid = useUidSesion();
  const { perfil } = useAuth();
  const roles = perfil?.roles ?? [];
  const esRrhh = roles.some((r) => r === "administrador" || r === "talento_humano");
  const esNomina = roles.some((r) => r === "administrador" || r === "nomina" || r === "contabilidad");
  const empleadoId = perfil?.empleadoId ?? "";

  useEffect(() => {
    limpiarDatosPrivados();
    if (!uid) return;

    let pendiente: ReturnType<typeof setTimeout> | null = null;
    const notificarCambio = () => {
      if (pendiente) return;
      pendiente = setTimeout(() => {
        pendiente = null;
        setVersionReal((v) => v + 1);
      }, 250);
    };

    const subs = COLECCIONES_PUBLICAS.map(({ nombre, destino }) =>
      onSnapshot(
        collection(db, nombre),
        (snap) => {
          const docs = snap.docs.map((d) => ({ ...(d.data() as { id: string }), id: d.id }));
          destino.splice(0, destino.length, ...docs);
          notificarCambio();
        },
        (error) => console.error(`[firestore:${nombre}] no se pudo leer`, error),
      ),
    );

    // Salarios y datos laborales completos: solo RRHH, Nómina y Contabilidad.
    if (esRrhh || esNomina) {
      for (const { nombre, destino } of [
        { nombre: "org_centros_costo", destino: CENTROS_COSTO },
        { nombre: "org_cargos", destino: CARGOS },
        { nombre: "org_empleados", destino: EMPLEADOS },
      ]) {
        subs.push(onSnapshot(
          collection(db, nombre),
          (snap) => {
            const docs = snap.docs.map((d) => ({ ...(d.data() as { id: string }), id: d.id }));
            destino.splice(0, destino.length, ...docs);
            notificarCambio();
          },
          (error) => console.error(`[firestore:${nombre}] no se pudo leer`, error),
        ));
      }
    }

    // La lista de cuentas no se descarga para empleados ni mandos.
    if (esRrhh) {
      subs.push(onSnapshot(
        collection(db, COLECCION_USUARIOS),
        (snap) => {
          const cuentas = snap.docs.map((d) =>
            aUsuarioSistema({ ...(d.data() as CuentaUsuario), id: d.id }),
          );
          USUARIOS.splice(0, USUARIOS.length, ...cuentas);
          notificarCambio();
        },
        (error) => console.error("[firestore:usuarios] no se pudo leer", error),
      ));
    }

    // Expedientes completos solo para RRHH; el empleado recibe únicamente el suyo.
    if (esRrhh) {
      subs.push(onSnapshot(
        collection(db, "expedientes"),
        (snap) => {
          for (const key of Object.keys(EXPEDIENTES)) delete EXPEDIENTES[key];
          for (const d of snap.docs) EXPEDIENTES[d.id] = { ...(d.data() as ExpedienteEmpleado) };
          notificarCambio();
        },
        (error) => console.error("[firestore:expedientes] no se pudo leer", error),
      ));
    } else if (empleadoId) {
      subs.push(onSnapshot(
        doc(db, "expedientes", empleadoId),
        (snap) => {
          for (const key of Object.keys(EXPEDIENTES)) delete EXPEDIENTES[key];
          if (snap.exists()) EXPEDIENTES[snap.id] = { ...(snap.data() as ExpedienteEmpleado) };
          notificarCambio();
        },
        (error) => console.error("[firestore:expediente propio] no se pudo leer", error),
      ));
    }

    return () => {
      if (pendiente) clearTimeout(pendiente);
      subs.forEach((unsub) => unsub());
      limpiarDatosPrivados();
    };
  }, [uid, esRrhh, esNomina, empleadoId]);

  return <div key={version} className="contents">{children}</div>;
}
