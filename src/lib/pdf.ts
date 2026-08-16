/**
 * Generador mínimo de PDF (texto) sin dependencias externas.
 * Produce un PDF 1.4 de una página con fuentes Helvetica y codificación WinAnsi,
 * suficiente para certificados institucionales descargables.
 */

export interface PdfLinea {
  texto: string;
  size?: number;
  bold?: boolean;
  align?: "left" | "center" | "right";
  /** Espacio adicional (pt) antes de la línea. */
  espacio?: number;
  color?: [number, number, number];
}

const PAGE_W = 595.28; // A4
const PAGE_H = 841.89;
const MARGIN = 64;
const CONTENT_W = PAGE_W - MARGIN * 2;

const anchoAprox = (texto: string, size: number, bold: boolean) =>
  texto.length * size * (bold ? 0.55 : 0.5);

const escapar = (s: string) => s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");

/** Divide un texto en líneas que caben en el ancho de contenido. */
export function envolver(texto: string, size: number, bold = false): string[] {
  const palabras = texto.split(/\s+/);
  const lineas: string[] = [];
  let actual = "";
  for (const p of palabras) {
    const prueba = actual ? `${actual} ${p}` : p;
    if (anchoAprox(prueba, size, bold) > CONTENT_W && actual) {
      lineas.push(actual);
      actual = p;
    } else {
      actual = prueba;
    }
  }
  if (actual) lineas.push(actual);
  return lineas;
}

function contentStream(lineas: PdfLinea[]): string {
  let y = PAGE_H - MARGIN;
  const partes: string[] = [];
  for (const l of lineas) {
    const size = l.size ?? 11;
    const bold = l.bold ?? false;
    y -= (l.espacio ?? 0) + size * 1.5;
    const ancho = anchoAprox(l.texto, size, bold);
    const x =
      l.align === "center"
        ? MARGIN + (CONTENT_W - ancho) / 2
        : l.align === "right"
          ? MARGIN + CONTENT_W - ancho
          : MARGIN;
    const [r, g, b] = l.color ?? [0.1, 0.13, 0.2];
    partes.push(
      `BT /${bold ? "F2" : "F1"} ${size} Tf ${r} ${g} ${b} rg 1 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)} Tm (${escapar(l.texto)}) Tj ET`,
    );
  }
  return partes.join("\n");
}

/** Construye el PDF y devuelve un Blob listo para descargar. */
export function crearPdf(lineas: PdfLinea[]): Blob {
  const stream = contentStream(lineas);
  const objetos: string[] = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> /Contents 4 0 R >>`,
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>",
  ];

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  objetos.forEach((obj, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${obj}\nendobj\n`;
  });
  const xrefPos = pdf.length;
  pdf += `xref\n0 ${objetos.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) pdf += `${String(off).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objetos.length + 1} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF`;

  const bytes = new Uint8Array(pdf.length);
  for (let i = 0; i < pdf.length; i++) bytes[i] = pdf.charCodeAt(i) & 0xff;
  return new Blob([bytes], { type: "application/pdf" });
}

export function descargarBlob(nombre: string, blob: Blob) {
  if (typeof window === "undefined") return;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombre;
  a.click();
  URL.revokeObjectURL(url);
}
