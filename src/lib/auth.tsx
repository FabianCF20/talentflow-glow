import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from "firebase/auth";
import { collection, doc, getDoc, getDocs, limit, query, setDoc } from "firebase/firestore";
import { auth, db } from "./firebase";
import type { RoleKey } from "@/types/entities";

export interface PerfilUsuario {
  id: string;
  email: string;
  nombres: string;
  apellidos: string;
  roles: RoleKey[];
  empleadoId?: string;
  estado: "activo" | "inactivo";
  creadoEn: string;
}

interface AuthContextValue {
  usuario: User | null;
  perfil: PerfilUsuario | null;
  cargando: boolean;
  iniciales: string;
  ingresar: (email: string, password: string) => Promise<void>;
  registrar: (datos: {
    email: string;
    password: string;
    nombres: string;
    apellidos: string;
  }) => Promise<void>;
  recuperarClave: (email: string) => Promise<void>;
  salir: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const COLECCION = "usuarios";

async function esPrimerUsuario() {
  const snap = await getDocs(query(collection(db, COLECCION), limit(1)));
  return snap.empty;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<User | null>(null);
  const [perfil, setPerfil] = useState<PerfilUsuario | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUsuario(u);
      if (u) {
        try {
          const snap = await getDoc(doc(db, COLECCION, u.uid));
          setPerfil(snap.exists() ? ({ ...(snap.data() as PerfilUsuario), id: u.uid }) : null);
        } catch (error) {
          console.error("[auth] no se pudo leer el perfil", error);
          setPerfil(null);
        }
      } else {
        setPerfil(null);
      }
      setCargando(false);
    });
    return unsub;
  }, []);

  const ingresar = useCallback(async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email.trim(), password);
  }, []);

  const registrar = useCallback<AuthContextValue["registrar"]>(async (datos) => {
    const primero = await esPrimerUsuario();
    const cred = await createUserWithEmailAndPassword(auth, datos.email.trim(), datos.password);
    const nuevo: PerfilUsuario = {
      id: cred.user.uid,
      email: datos.email.trim(),
      nombres: datos.nombres.trim(),
      apellidos: datos.apellidos.trim(),
      roles: primero ? ["administrador", "talento_humano"] : ["empleado"],
      estado: "activo",
      creadoEn: new Date().toISOString(),
    };
    await setDoc(doc(db, COLECCION, cred.user.uid), nuevo);
    setPerfil(nuevo);
  }, []);

  const recuperarClave = useCallback(async (email: string) => {
    await sendPasswordResetEmail(auth, email.trim());
  }, []);

  const salir = useCallback(async () => {
    await signOut(auth);
  }, []);

  const iniciales = perfil
    ? `${perfil.nombres.charAt(0)}${perfil.apellidos.charAt(0)}`.toUpperCase()
    : (usuario?.email?.charAt(0).toUpperCase() ?? "?");

  return (
    <AuthContext.Provider
      value={{
        usuario,
        perfil,
        cargando,
        iniciales,
        ingresar,
        registrar,
        recuperarClave,
        salir,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
}

/** Mensajes de error de Firebase Auth en español. */
export function mensajeAuth(error: unknown): string {
  const code = (error as { code?: string })?.code ?? "";
  const mapa: Record<string, string> = {
    "auth/invalid-credential": "Correo o contraseña incorrectos.",
    "auth/invalid-email": "El correo no es válido.",
    "auth/user-not-found": "No existe una cuenta con ese correo.",
    "auth/wrong-password": "Correo o contraseña incorrectos.",
    "auth/too-many-requests": "Demasiados intentos. Intente más tarde.",
    "auth/email-already-in-use": "Ya existe una cuenta con ese correo.",
    "auth/weak-password": "La contraseña debe tener al menos 6 caracteres.",
    "auth/network-request-failed": "Sin conexión con el servidor.",
    "auth/operation-not-allowed":
      "Habilite el método Correo/Contraseña en Firebase Authentication.",
  };
  return mapa[code] ?? "No fue posible completar la operación.";
}
