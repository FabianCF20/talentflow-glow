import { initializeApp, getApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

/** Configuración del proyecto Firebase (claves públicas del cliente web). */
export const firebaseConfig = {
  apiKey: "AIzaSyCx25DYnsLkmESwc_poI4NL-WpHWj1dFRU",
  authDomain: "indunilo.firebaseapp.com",
  projectId: "indunilo",
  storageBucket: "indunilo.firebasestorage.app",
  messagingSenderId: "433602647169",
  appId: "1:433602647169:web:2dbcecb41b78e21b616980",
  measurementId: "G-FCBM1B7ZVC",
};

/** App única (evita reinicializar durante HMR o SSR). */
export const app: FirebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);
export const storage: FirebaseStorage = getStorage(app);

/**
 * Analytics solo funciona en el navegador. Se carga dinámicamente para no
 * romper el renderizado en el servidor.
 */
export async function initAnalytics() {
  if (typeof window === "undefined") return null;
  const { getAnalytics, isSupported } = await import("firebase/analytics");
  if (!(await isSupported())) return null;
  return getAnalytics(app);
}
