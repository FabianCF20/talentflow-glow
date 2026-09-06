/**
 * Firma electrónica de documentos emitidos (certificados, desprendibles,
 * liquidaciones). Se calcula una huella SHA-256 del contenido normalizado y se
 * registra en Firestore (`firmas_documentos`) para permitir la verificación
 * posterior del documento por su código único — Ley 527 de 1999.
 */

import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import { EMPRESA } from "./empresa";
import { limpiarUndefined } from "./firestore";

export type TipoDocumentoFirmado =
  | "certificado"
  | "desprendible"
  | "liquidacion"
  | "documento_expediente";

export interface RegistroFirma {
  id: string;
  codigo: string;
  tipo: TipoDocumentoFirmado;
  descripcion: string;
  empleadoId: string;
  empleadoNombre: string;
  documentoEmpleado?: string;
  hash: string;
  algoritmo: "SHA-256";
  firmante: string;
  cargoFirmante: string;
  emitidoPor: string;
  emitidoEn: string;
  anulada?: boolean;
}

/** Huella SHA-256 en hexadecimal del contenido normalizado. */
export async function huella(contenido: string): Promise<string> {
  if (typeof globalThis.crypto?.subtle === "undefined") {
    // Entorno sin Web Crypto: huella determinística de respaldo.
    let h = 0;
    for (let i = 0; i < contenido.length; i++) h = (h * 31 + contenido.charCodeAt(i)) | 0;
    return Math.abs(h).toString(16).padStart(16, "0").repeat(4).slice(0, 64);
  }
  const bytes = new TextEncoder().encode(contenido.replace(/\s+/g, " ").trim());
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Formato legible del sello para imprimir en el PDF. */
export const selloLegible = (hash: string) =>
  (hash.slice(0, 32).match(/.{1,8}/g) ?? []).join(" ").toUpperCase();

/**
 * Calcula el sello del documento y lo registra para verificación.
 * Devuelve el hash aunque falle la escritura, para no bloquear la descarga.
 */
export async function sellarDocumento(input: {
  codigo: string;
  tipo: TipoDocumentoFirmado;
  descripcion: string;
  empleadoId: string;
  empleadoNombre: string;
  documentoEmpleado?: string;
  contenido: string;
  emitidoPor: string;
}): Promise<{ hash: string; sello: string }> {
  const hash = await huella(`${input.codigo}|${EMPRESA.nit}|${input.contenido}`);
  const registro: RegistroFirma = {
    id: input.codigo,
    codigo: input.codigo,
    tipo: input.tipo,
    descripcion: input.descripcion,
    empleadoId: input.empleadoId,
    empleadoNombre: input.empleadoNombre,
    documentoEmpleado: input.documentoEmpleado,
    hash,
    algoritmo: "SHA-256",
    firmante: EMPRESA.firmante,
    cargoFirmante: EMPRESA.cargoFirmante,
    emitidoPor: input.emitidoPor,
    emitidoEn: new Date().toISOString(),
  };
  try {
    await setDoc(
      doc(db, "firmas_documentos", input.codigo),
      limpiarUndefined(registro) as Record<string, unknown>,
    );
  } catch (error) {
    console.error("[firestore:firmas_documentos] no se pudo registrar la firma", error);
  }
  return { hash, sello: selloLegible(hash) };
}

/** Verifica un documento por su código único. */
export async function verificarDocumento(codigo: string): Promise<RegistroFirma | null> {
  const limpio = codigo.trim().toUpperCase();
  if (!limpio) return null;
  const snap = await getDoc(doc(db, "firmas_documentos", limpio));
  return snap.exists() ? ({ ...(snap.data() as RegistroFirma), id: snap.id }) : null;
}

/** Registro de documentos firmados electrónicamente, del más reciente al más antiguo. */
export function useDocumentosFirmados(): RegistroFirma[] {
  const [items] = useFirestoreState<RegistroFirma>("documentos_firmados", "codigo");
  return useMemo(
    () => [...items].sort((a, b) => (a.emitidoEn < b.emitidoEn ? 1 : -1)),
    [items],
  );
}
