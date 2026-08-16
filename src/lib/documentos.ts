import { crearPdf, descargarBlob, envolver, type PdfLinea } from "@/lib/pdf";
import { nombreEmpleado, type EmpleadoRRHH } from "@/types/rrhh";
import {
  CATEGORIA_DOC_LABEL,
  type DocumentoEmpleado,
  type EstadoVigencia,
  type VersionDocumento,
} from "@/types/portal";
import { EMPRESA } from "@/lib/certificados";

/** Días de anticipación para marcar un documento como "por vencer". */
export const DIAS_ALERTA_VENCIMIENTO = 60;

export const ultimaVersion = (doc: DocumentoEmpleado): VersionDocumento =>
  doc.versiones.reduce((a, v) => (v.version > a.version ? v : a), doc.versiones[0]!);

export function estadoVigencia(doc: DocumentoEmpleado, hoy = new Date()): EstadoVigencia {
  if (!doc.fechaVencimiento) return "sin_vencimiento";
  const dias = Math.ceil(
    (new Date(`${doc.fechaVencimiento}T00:00:00Z`).getTime() - hoy.getTime()) / 86_400_000,
  );
  if (dias < 0) return "vencido";
  if (dias <= DIAS_ALERTA_VENCIMIENTO) return "por_vencer";
  return "vigente";
}

export function diasParaVencer(doc: DocumentoEmpleado, hoy = new Date()): number | null {
  if (!doc.fechaVencimiento) return null;
  return Math.ceil(
    (new Date(`${doc.fechaVencimiento}T00:00:00Z`).getTime() - hoy.getTime()) / 86_400_000,
  );
}

/**
 * Descarga del documento: en esta versión de demostración se genera una carátula
 * PDF con los metadatos y el historial de versiones del archivo almacenado.
 */
export function descargarDocumento(
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
    {
      texto: `Empleado: ${empleado ? `${nombreEmpleado(empleado)} · CC ${empleado.documento}` : doc.empleadoId}`,
      size: 11,
      espacio: 2,
    },
    { texto: `Versión descargada: v${version.version} (${version.nombreArchivo})`, size: 11, espacio: 2 },
    { texto: `Cargada por: ${version.subidoPor} el ${version.fecha}`, size: 11, espacio: 2 },
    {
      texto: `Vencimiento: ${doc.fechaVencimiento ?? "No aplica"}`,
      size: 11,
      espacio: 2,
    },
    { texto: "Historial de versiones", size: 11, bold: true, espacio: 20 },
  ];

  for (const v of [...doc.versiones].sort((a, b) => a.version - b.version)) {
    envolver(
      `v${v.version} · ${v.fecha} · ${v.subidoPor} · ${v.tamanoKb} KB · ${v.nota ?? "Sin observaciones"}`,
      10,
    ).forEach((l, i) => lineas.push({ texto: l, size: 10, espacio: i === 0 ? 8 : 0 }));
  }

  lineas.push({
    texto: "Documento generado electrónicamente por SIGTH · Trazabilidad conservada sin eliminación física.",
    size: 8,
    espacio: 24,
    color: [0.5, 0.54, 0.6],
  });

  descargarBlob(`${version.nombreArchivo.replace(/\.pdf$/, "")}-sigth.pdf`, crearPdf(lineas));
}
