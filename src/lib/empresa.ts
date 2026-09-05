/**
 * Configuración institucional y plantillas de documentos.
 * Vive en Firestore (`configuracion/empresa`) y se puede editar desde
 * Configuración → Plantillas y firma. El objeto `EMPRESA` se muta en sitio para
 * que los generadores de PDF (certificados, desprendibles, carátulas
 * documentales) usen siempre los valores vigentes.
 */

import { useEffect, useState } from "react";
import { doc, getDoc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "./firebase";

export interface ConfigEmpresa {
  razonSocial: string;
  nit: string;
  direccion: string;
  telefono: string;
  ciudad: string;
  firmante: string;
  cargoFirmante: string;
  /** Texto de cierre de los certificados (se muestra antes de la firma). */
  textoCierre: string;
  /** Nota legal al pie de todos los documentos generados. */
  textoPie: string;
  /** Días de anticipación para marcar vencimientos como "por vencer". */
  diasAlertaVencimiento: number;
  /** Años de retención documental (Ley 594 de 2000 / tablas de retención). */
  retencionAnios: number;
  /** Incluir el salario en los certificados laborales por defecto. */
  incluirSalarioPorDefecto: boolean;
  /** Sellar los documentos con firma electrónica verificable (SHA-256). */
  firmaElectronicaActiva: boolean;
}

export const CONFIG_EMPRESA_DEFECTO: ConfigEmpresa = {
  razonSocial: "SIGTH Servicios Empresariales S.A.S.",
  nit: "901.455.882-1",
  direccion: "Calle 100 # 19-54, Bogotá D.C., Colombia",
  telefono: "(601) 745 8800",
  ciudad: "Bogotá D.C.",
  firmante: "Claudia Marcela Osorio",
  cargoFirmante: "Directora de Talento Humano",
  textoCierre:
    "Se expide la presente certificación a solicitud del interesado y puede ser verificada con su código único en el Portal del Empleado.",
  textoPie:
    "Documento generado electrónicamente por SIGTH. Válido sin firma manuscrita conforme a la Ley 527 de 1999.",
  diasAlertaVencimiento: 60,
  retencionAnios: 10,
  incluirSalarioPorDefecto: true,
  firmaElectronicaActiva: true,
};

/** Configuración vigente (mutable en sitio, leída por los generadores de PDF). */
export const EMPRESA: ConfigEmpresa = { ...CONFIG_EMPRESA_DEFECTO };

const COLECCION = "configuracion";
const DOC_ID = "empresa";

function aplicar(parcial: Partial<ConfigEmpresa>) {
  Object.assign(EMPRESA, CONFIG_EMPRESA_DEFECTO, parcial);
}

/** Configuración institucional sincronizada en tiempo real. */
export function useConfigEmpresa() {
  const [config, setConfig] = useState<ConfigEmpresa>({ ...EMPRESA });
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, COLECCION, DOC_ID),
      (snap) => {
        const data = snap.data() as Partial<ConfigEmpresa> | undefined;
        if (data) aplicar(data);
        setConfig({ ...EMPRESA });
        setCargando(false);
      },
      (error) => {
        console.error("[firestore:configuracion/empresa] no se pudo leer", error);
        setCargando(false);
      },
    );
    return unsub;
  }, []);

  return { config, setConfig, cargando };
}

/** Guarda la configuración institucional (solo administradores por reglas). */
export async function guardarConfigEmpresa(config: ConfigEmpresa) {
  aplicar(config);
  await setDoc(
    doc(db, COLECCION, DOC_ID),
    { ...config, actualizadoEn: new Date().toISOString() },
    { merge: true },
  );
}

/** Carga puntual (útil fuera de React, antes de generar un documento). */
export async function cargarConfigEmpresa(): Promise<ConfigEmpresa> {
  try {
    const snap = await getDoc(doc(db, COLECCION, DOC_ID));
    if (snap.exists()) aplicar(snap.data() as Partial<ConfigEmpresa>);
  } catch (error) {
    console.error("[firestore:configuracion/empresa] no se pudo cargar", error);
  }
  return { ...EMPRESA };
}
