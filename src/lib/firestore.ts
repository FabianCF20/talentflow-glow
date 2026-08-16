import { useCallback, useEffect, useRef, useState, type SetStateAction } from "react";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  setDoc,
  writeBatch,
} from "firebase/firestore";
import { db } from "./firebase";

/** Firestore rechaza valores `undefined`: se eliminan antes de escribir. */
export function limpiarUndefined<T>(valor: T): T {
  if (Array.isArray(valor)) return valor.map((v) => limpiarUndefined(v)) as unknown as T;
  if (valor && typeof valor === "object" && !(valor instanceof Date)) {
    const salida: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(valor as Record<string, unknown>)) {
      if (v !== undefined) salida[k] = limpiarUndefined(v);
    }
    return salida as T;
  }
  return valor;
}

/** Crea o reemplaza un documento con id propio. */
export async function guardarDoc<T extends { id: string }>(coleccion: string, item: T) {
  await setDoc(doc(db, coleccion, item.id), limpiarUndefined(item) as Record<string, unknown>);
}

/** Elimina un documento. */
export async function eliminarDoc(coleccion: string, id: string) {
  await deleteDoc(doc(db, coleccion, id));
}

/** Lee una colección completa una sola vez. */
export async function leerColeccion<T extends { id: string }>(coleccion: string): Promise<T[]> {
  const snap = await getDocs(collection(db, coleccion));
  return snap.docs.map((d) => ({ ...(d.data() as T), id: d.id }));
}

/** Sincroniza en Firestore únicamente lo que cambió entre dos versiones del arreglo. */
async function persistirDiff<T extends { id: string }>(
  coleccion: string,
  previo: T[],
  siguiente: T[],
) {
  const antes = new Map(previo.map((i) => [i.id, JSON.stringify(i)]));
  const ahora = new Map(siguiente.map((i) => [i.id, i]));
  const batch = writeBatch(db);
  let cambios = 0;

  for (const [id, item] of ahora) {
    if (antes.get(id) !== JSON.stringify(item)) {
      batch.set(doc(db, coleccion, id), limpiarUndefined(item) as Record<string, unknown>);
      cambios++;
    }
  }
  for (const id of antes.keys()) {
    if (!ahora.has(id)) {
      batch.delete(doc(db, coleccion, id));
      cambios++;
    }
  }

  if (!cambios) return;
  try {
    await batch.commit();
  } catch (error) {
    console.error(`[firestore:${coleccion}] no se pudo guardar`, error);
  }
}

/**
 * Estado sincronizado con una colección de Firestore.
 * Reemplaza a `useState` en los stores: escucha cambios en tiempo real y
 * persiste automáticamente cada mutación local.
 */
export function useFirestoreState<T extends { id: string }>(
  coleccion: string,
): [T[], (accion: SetStateAction<T[]>) => void] {
  const [items, setItems] = useState<T[]>([]);
  const ref = useRef<T[]>([]);
  ref.current = items;

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, coleccion),
      (snap) => {
        const docs = snap.docs.map((d) => ({ ...(d.data() as T), id: d.id }));
        ref.current = docs;
        setItems(docs);
      },
      (error) => console.error(`[firestore:${coleccion}] no se pudo leer`, error),
    );
    return unsub;
  }, [coleccion]);

  const actualizar = useCallback(
    (accion: SetStateAction<T[]>) => {
      const previo = ref.current;
      const siguiente =
        typeof accion === "function" ? (accion as (p: T[]) => T[])(previo) : accion;
      ref.current = siguiente;
      setItems(siguiente);
      void persistirDiff(coleccion, previo, siguiente);
    },
    [coleccion],
  );

  return [items, actualizar];
}
