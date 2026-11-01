/**
 * Reglas de gestión documental: vigencias, versiones y descarga privada.
 */
import { crearPdf, descargarBlob, envolver, type PdfLinea } from "@/lib/pdf";
import { nombreEmpleado, type EmpleadoRRHH } from "@/types/rrhh";
import { CATEGORIA_DOC_LABEL, type DocumentoEmpleado, type EstadoVigencia, type VersionDocumento } from "@/types/portal";
import { EMPRESA } from "@/lib/empresa";
import { storage } from "@/lib/firebase";
import { getBlob, ref } from "firebase/storage";

export const DIAS_ALERTA_VENCIMIENTO = 60;

export const ultimaVersion = (doc: DocumentoEmpleado): VersionDocumento =>
  (doc.versiones ?? []).reduce((a, v) => (v.version > a.version ? v : a), {
    version: 0, nombreArchivo: "Sin archivo", tamanoKb: 0, subidoPor: "—", fecha: "",
  });

export function estadoVigencia(doc: DocumentoEmpleado, hoy = new Date()): EstadoVigencia {
  if (!doc.fechaVencimiento) return "sin_vencimiento";
  const dias = Math.ceil((new Date(`${doc.fechaVencimiento}T00:00:00Z`).getTime() - hoy.getTime()) / 86_400_000);
  if (dias < 0) return "vencido";
  if (dias <= DIAS_ALERTA_VENCIMIENTO) return "por_vencer";
  return "vigente";
}

export function diasParaVencer(doc: DocumentoEmpleado, hoy = new Date()): number | null {
  if (!doc.fechaVencimiento) return null;
  return Math.ceil((new Date(`${doc.fechaVencimiento}T00:00:00Z`).getTime() - hoy.getTime()) / 86_400_000);
}

/** Descarga el binario mediante Firebase Storage SDK; no expone enlaces públicos persistentes. */
export async function descargarDocumento(
  doc: DocumentoEmpleado,
  version: VersionDocumento,
  _empleado?: EmpleadoRRHH,
): Promise<void> {
  if (!version.storagePath) {
    throw new Error("Esta versión no tiene un archivo almacenado. Solicita a Talento Humano que la vuelva a cargar.");
  }
  const blob = await getBlob(ref(storage, version.storagePath), 5 * 1024 * 1024);
  const nombre = version.nombreArchivo.replace(/[\\/:*?"<>|]/g, "_");
  descargarBlob(nombre, blob);
}

/** Genera una carátula PDF solo para documentos heredados sin binario asociado. */
export function descargarCaratulaDocumento(
  doc: DocumentoEmpleado,
  version: VersionDocumento,
  empleado?: EmpleadoRRHH,
) {
  const lineas: PdfLinea[] = [
    { texto: EMPRESA.razonSocial, size: 14, bold: true },
    { texto: `NIT ${EMPRESA.nit}`, size: 9, color: [0.4, 0.44, 0.5] },
    { texto: "GESTIÓN DOCUMENTAL — EXPEDIENTE DEL EMPLEADO", size: 12, bold: true, espacio: 22 },
    { texto: `Documento: ${doc.nombre}`, size: 11, espacio: 16 },
    { texto: `Categoría: ${CATEGORIA_DOC_LABEL[doc.categoria]}`, size: 11, espacio: 2 },
    { texto: `Empleado: ${empleado ? `${nombreEmpleado(empleado)} · CC ${empleado.documento}` : doc.empleadoId}`, size: 11, espacio: 2 },
    { texto: `Versión: v${version.version} (${version.nombreArchivo})`, size: 11, espacio: 2 },
    { texto: `Cargada por: ${version.subidoPor} el ${version.fecha}`, size: 11, espacio: 2 },
    { texto: "Esta carátula contiene metadatos; no reemplaza el archivo original.", size: 9, espacio: 24 },
  ];
  descargarBlob(`${version.nombreArchivo.replace(/\\.pdf$/i, "")}-caratula.pdf`, crearPdf(lineas));
}
