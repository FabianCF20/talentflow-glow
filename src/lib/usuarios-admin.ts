import { useEffect, useState } from "react";
import { deleteApp, initializeApp } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  getAuth,
  sendPasswordResetEmail,
  signOut,
} from "firebase/auth";
import { collection, onSnapshot } from "firebase/firestore";
import { auth, db, firebaseConfig } from "./firebase";
import { guardarDoc } from "./firestore";
import type { PerfilUsuario } from "./auth";
import type { EstadoUsuario, UsuarioSistema } from "@/types/organizacion";
import type { RoleKey } from "@/types/entities";
import { rolesPredeterminadosPorNivel } from "@/config/roles";

/** Colección única de cuentas: cada documento usa el UID de Firebase Auth. */
export const COLECCION_USUARIOS = "usuarios";

/** Cuenta almacenada en Firestore, ligada 1:1 con un usuario de Firebase Auth. */
export interface CuentaUsuario extends PerfilUsuario {
  empleadoId?: string;
  nivelJerarquico?: number;
  estadoUsuario?: EstadoUsuario;
  ultimoAcceso?: string;
  intentosFallidos?: number;
}

/** Adapta una cuenta de Firebase Auth al modelo que consumen las tablas. */
export function aUsuarioSistema(cuenta: CuentaUsuario): UsuarioSistema {
  return {
    id: cuenta.id,
    empleadoId: cuenta.empleadoId ?? "",
    username: cuenta.email?.split("@")[0] ?? cuenta.id,
    email: cuenta.email ?? "",
    roles: (cuenta.roles ?? []) as RoleKey[],
    estadoUsuario: cuenta.estadoUsuario ?? (cuenta.estado === "inactivo" ? "inactivo" : "activo"),
    ultimoAcceso: cuenta.ultimoAcceso,
    intentosFallidos: cuenta.intentosFallidos ?? 0,
    creadoEn: cuenta.creadoEn ?? new Date().toISOString(),
  };
}

/**
 * Crea la cuenta en Firebase Auth usando una app secundaria para no cerrar la
 * sesión del administrador, y registra su perfil en Firestore.
 */
export async function crearCuentaUsuario(datos: {
  email: string;
  password: string;
  nombres: string;
  apellidos: string;
  roles?: RoleKey[];
  empleadoId?: string;
  nivelJerarquico?: number;
}) {
  const email = datos.email.trim().toLowerCase();
  const nombres = datos.nombres.trim();
  const apellidos = datos.apellidos.trim();
  if (!email || !nombres || !apellidos) {
    throw new Error("Los datos obligatorios del usuario están incompletos.");
  }
  if (datos.password.length < 6) {
    throw new Error("La contraseña debe tener al menos 6 caracteres.");
  }
  const roles = datos.roles?.length
    ? [...new Set(datos.roles)]
    : rolesPredeterminadosPorNivel(datos.nivelJerarquico);
  const secundaria = initializeApp(firebaseConfig, `admin-${Date.now()}`);
  const authSecundaria = getAuth(secundaria);
  let uid: string | undefined;
  let perfilGuardado = false;
  try {
    const cred = await createUserWithEmailAndPassword(
      authSecundaria,
      email,
      datos.password,
    );
    uid = cred.user.uid;
    const cuenta: CuentaUsuario = {
      id: cred.user.uid,
      email,
      nombres,
      apellidos,
      roles,
      empleadoId: datos.empleadoId,
      nivelJerarquico: datos.nivelJerarquico,
      estado: "activo",
      estadoUsuario: "activo",
      intentosFallidos: 0,
      creadoEn: new Date().toISOString(),
    };
    await guardarDoc(COLECCION_USUARIOS, cuenta);
    perfilGuardado = true;
    return cuenta;
  } finally {
    if (uid && !perfilGuardado) {
      await authSecundaria.currentUser?.delete().catch((error) =>
        console.error("[usuarios] no se pudo limpiar la cuenta de Auth", error),
      );
    } else if (uid) {
      await signOut(authSecundaria).catch((error) =>
        console.error("[usuarios] no se pudo cerrar la sesión secundaria", error),
      );
    }
    await deleteApp(secundaria);
  }
}

/** Actualiza roles, estado o empleado vinculado de una cuenta existente. */
export async function actualizarCuentaUsuario(
  cuenta: CuentaUsuario,
  cambios: Partial<Pick<CuentaUsuario, "roles" | "estadoUsuario" | "empleadoId" | "nombres" | "apellidos">>,
) {
  const actualizada: CuentaUsuario = {
    ...cuenta,
    ...cambios,
    estado: (cambios.estadoUsuario ?? cuenta.estadoUsuario) === "activo" ? "activo" : "inactivo",
  };
  await guardarDoc(COLECCION_USUARIOS, actualizada);
  return actualizada;
}

/** Envía el correo de restablecimiento de contraseña de Firebase Auth. */
export async function enviarResetClave(email: string) {
  await sendPasswordResetEmail(auth, email.trim());
}

/** Suscripción en tiempo real a las cuentas de usuario. */
export function useCuentas(): CuentaUsuario[] {
  const [cuentas, setCuentas] = useState<CuentaUsuario[]>([]);
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, COLECCION_USUARIOS),
      (snap) => setCuentas(snap.docs.map((d) => ({ ...(d.data() as CuentaUsuario), id: d.id }))),
      (error) => console.error("[firestore:usuarios] no se pudo leer", error),
    );
    return unsub;
  }, []);
  return cuentas;
}
