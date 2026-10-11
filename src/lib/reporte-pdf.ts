/**
 * Exportación de reportes tabulares a PDF con el membrete de la empresa.
 */
import { EMPRESA } from "@/lib/empresa";
import { crearPdf, descargarBlob, type PdfLinea } from "@/lib/pdf";

/** Exporta cualquier reporte tabular a PDF con título y totales. */
export function descargarReportePdf(input: {
  titulo: string;
  subtitulo?: string;
  filtros?: string[];
  headers: string[];
  rows: (string | number)[][];
  nombreArchivo: string;
}) {
  const ancho = 92;
  const cols = input.headers.length;
  const w = Math.max(10, Math.floor(ancho / cols));
  const fila = (celdas: (string | number)[]) =>
    celdas.map((c) => String(c).slice(0, w - 1).padEnd(w)).join("");

  const lineas: PdfLinea[] = [
    { texto: EMPRESA.razonSocial, size: 12, bold: true, align: "center" },
    { texto: input.titulo, size: 13, bold: true, align: "center", espacio: 10 },
    ...(input.subtitulo ? [{ texto: input.subtitulo, size: 9, align: "center" as const }] : []),
    ...(input.filtros?.length
      ? [{ texto: `Filtros: ${input.filtros.join(" · ")}`, size: 8, align: "center" as const }]
      : []),
    { texto: fila(input.headers), size: 8, bold: true, espacio: 16 },
    ...input.rows.slice(0, 34).map((r) => ({ texto: fila(r), size: 8 })),
  ];
  if (input.rows.length > 34) {
    lineas.push({
      texto: `… ${input.rows.length - 34} filas adicionales. Exporte a Excel para el detalle completo.`,
      size: 8,
      espacio: 10,
      color: [0.45, 0.48, 0.55],
    });
  }
  descargarBlob(`${input.nombreArchivo}.pdf`, crearPdf(lineas));
}
