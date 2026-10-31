import {
  collection,
  getDocs,
  query,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

/**
 * Recalcula la proyección de autorización de cada jefe inmediato afectado.
 * Debe invocarse desde operaciones autorizadas de RR. HH. después de guardar
 * org_empleados. Las reglas impiden que empleados o mandos alteren esta lista.
 */
export async function sincronizarSubordinadosDeMandos(
  empleadoIds: Array<string | undefined | null>,
): Promise<void> {
  const ids = [...new Set(empleadoIds.filter((id): id is string => Boolean(id?.trim())))];

  for (const empleadoId of ids) {
    const [subordinadosSnap, cuentasSnap] = await Promise.all([
      getDocs(
        query(
          collection(db, "org_empleados"),
          where("jefeInmediatoId", "==", empleadoId),
        ),
      ),
      getDocs(
        query(
          collection(db, "usuarios"),
          where("empleadoId", "==", empleadoId),
        ),
      ),
    ]);

    if (cuentasSnap.empty) continue;

    const subordinadosIds = subordinadosSnap.docs
      .filter((item) => item.id !== empleadoId && item.data().estado === "activo")
      .map((item) => item.id);

    const batch = writeBatch(db);
    for (const cuenta of cuentasSnap.docs) {
      batch.update(cuenta.ref, { subordinadosIds });
    }
    await batch.commit();
  }
}
