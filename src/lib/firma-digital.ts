/**
 * Registro de huellas de integridad SHA-256 para documentos emitidos.
 * Una huella calculada en el navegador NO constituye por sí sola una firma
 * electrónica confiable ni acredita la identidad o voluntad del firmante.
 * La emisión legalmente confiable requiere un servicio backend autenticado.
 */

import { useMemo } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import { auth } from "./firebase";
import { EMPRESA } from "./empresa";
import { limpiarUndefined, useFirestoreState } from "./firestore";
import { useAuth } from "./auth";
import { alcanceConsultaDocumental, puedeLeerDocumento } from "./acceso-documental";

export type TipoDocumentoFirmado =
  | "certificado"
  | "desprendible"
  | "liquidacion"
  | "documento_expediente";

export interface RegistroFirma {
  categoria?: string;
  id: string;
  codigo: string;
  usuarioUid: string;
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
    throw new Error("Este entorno no soporta SHA-256 seguro. No se generará una huella de respaldo.");
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
 * Calcula y registra una huella de integridad.
 * La operación falla si no puede persistir el registro: nunca informa éxito
 * cuando Firestore rechaza o no confirma la escritura.
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
  const actor = auth.currentUser;
  const registro: RegistroFirma = {
    id: input.codigo,
    usuarioUid: actor?.uid ?? "",
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
  if (!actor) throw new Error("Se requiere una sesión autenticada para registrar la huella.");
  await setDoc(
    doc(db, "firmas_documentos", input.codigo),
    limpiarUndefined(registro) as unknown as Record<string, unknown>,
  );
  return { hash, sello: selloLegible(hash) };
}

/** Verifica un documento por su código único. */
export async function verificarDocumento(codigo: string): Promise<RegistroFirma | null> {
  const limpio = codigo.trim().toUpperCase();
  if (!limpio) return null;
  const snap = await getDoc(doc(db, "firmas_documentos", limpio));
  if (!snap.exists() || !auth.currentUser) return null;
  const perfil = await getDoc(doc(db, "usuarios", auth.currentUser.uid));
  const datos = perfil.data();
  const registro = { ...(snap.data() as RegistroFirma), id: snap.id };
  if (!datos || datos.estado !== "activo" || !puedeLeerDocumento(datos.roles ?? [], datos.empleadoId ?? "", registro)) return null;
  return registro;
}

/** Registro de documentos firmados electrónicamente, del más reciente al más antiguo. */
export function useDocumentosFirmados(): RegistroFirma[] {
  const { perfil } = useAuth();
  const roles = perfil?.roles ?? [];
  const propioId = perfil?.empleadoId ?? "";
  const [items] = useFirestoreState<RegistroFirma>("firmas_documentos", "codigo", alcanceConsultaDocumental(roles, propioId, true));
  return useMemo(
    () => items.filter((f) => puedeLeerDocumento(roles, propioId, f) && !["desprendible", "liquidacion"].includes(f.tipo)).sort((a, b) => (a.emitidoEn < b.emitidoEn ? 1 : -1)),
    [items, roles, propioId],
  );
}
