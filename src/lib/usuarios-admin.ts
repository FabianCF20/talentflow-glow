import { deleteApp, initializeApp } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  getAuth,
  sendPasswordResetEmail,
  signOut,
} from "firebase/auth";
import { auth, firebaseConfig } from "./firebase";
import { guardarDoc } from "./firestore";
import type { PerfilUsuario } from "./auth";
import type { EstadoUsuario, UsuarioSistema } from "@/types/organizacion";
import type { RoleKey } from "@/types/entities";

/** Colección única de cuentas: cada documento usa el UID de Firebase Auth. */
export const COLECCION_USUARIOS = "usuarios";

/** Cuenta almacenada en Firestore, ligada 1:1 con un usuario de Firebase Auth. */
export interface CuentaUsuario extends PerfilUsuario {
  empleadoId?: string;
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
  roles: RoleKey[];
  empleadoId?: string;
}) {
  const secundaria = initializeApp(firebaseConfig, `admin-${Date.now()}`);
  const authSecundaria = getAuth(secundaria);
  try {
    const cred = await createUserWithEmailAndPassword(
      authSecundaria,
      datos.email.trim(),
      datos.password,
    );
    const cuenta: CuentaUsuario = {
      id: cred.user.uid,
      email: datos.email.trim(),
      nombres: datos.nombres.trim(),
      apellidos: datos.apellidos.trim(),
      roles: datos.roles.length ? datos.roles : ["empleado"],
      empleadoId: datos.empleadoId,
      estado: "activo",
      estadoUsuario: "activo",
      intentosFallidos: 0,
      creadoEn: new Date().toISOString(),
    };
    await guardarDoc(COLECCION_USUARIOS, cuenta);
    await signOut(authSecundaria);
    return cuenta;
  } finally {
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
