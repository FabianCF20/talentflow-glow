import { useEffect, useState } from "react";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import { PERMISSION_MATRIX, type PermissionMatrix } from "@/config/roles";

/** Documento único donde vive la matriz de permisos editable. */
const COLECCION = "configuracion";
const DOC_ID = "permisos";

/**
 * Matriz de permisos sincronizada con Firestore. Si el documento no existe,
 * se usa la matriz base del código como valor inicial.
 */
export function usePermisos() {
  const [matriz, setMatriz] = useState<PermissionMatrix>(PERMISSION_MATRIX);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, COLECCION, DOC_ID),
      (snap) => {
        const data = snap.data() as { matriz?: PermissionMatrix } | undefined;
        if (data?.matriz) {
          setMatriz({ ...PERMISSION_MATRIX, ...data.matriz });
          Object.assign(PERMISSION_MATRIX, data.matriz);
        }
        setCargando(false);
      },
      (error) => {
        console.error("[firestore:configuracion/permisos] no se pudo leer", error);
        setCargando(false);
      },
    );
    return unsub;
  }, []);

  return { matriz, setMatriz, cargando };
}

/** Guarda la matriz completa en Firestore (solo administradores por reglas). */
export async function guardarPermisos(matriz: PermissionMatrix) {
  await setDoc(
    doc(db, COLECCION, DOC_ID),
    { matriz, actualizadoEn: new Date().toISOString() },
    { merge: true },
  );
  Object.assign(PERMISSION_MATRIX, matriz);
}
