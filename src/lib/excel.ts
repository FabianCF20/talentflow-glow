/** Exportación a Excel (SpreadsheetML 2003, compatible con Excel y LibreOffice). */

export interface HojaExcel {
  nombre: string;
  headers: string[];
  rows: (string | number)[][];
}

const esc = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const celda = (v: string | number) =>
  typeof v === "number"
    ? `<Cell><Data ss:Type="Number">${v}</Data></Cell>`
    : `<Cell><Data ss:Type="String">${esc(String(v ?? ""))}</Data></Cell>`;

export function construirExcel(hojas: HojaExcel[]): Blob {
  const cuerpo = hojas
    .map((h) => {
      const filas = [
        `<Row>${h.headers.map((x) => `<Cell ss:StyleID="th"><Data ss:Type="String">${esc(x)}</Data></Cell>`).join("")}</Row>`,
        ...h.rows.map((r) => `<Row>${r.map(celda).join("")}</Row>`),
      ].join("");
      return `<Worksheet ss:Name="${esc(h.nombre.slice(0, 31))}"><Table>${filas}</Table></Worksheet>`;
    })
    .join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Styles>
  <Style ss:ID="th"><Font ss:Bold="1"/><Interior ss:Color="#E7ECF3" ss:Pattern="Solid"/></Style>
 </Styles>
 ${cuerpo}
</Workbook>`;

  return new Blob([xml], { type: "application/vnd.ms-excel" });
}

export function downloadExcel(filename: string, hojas: HojaExcel[]) {
  if (typeof window === "undefined") return;
  const url = URL.createObjectURL(construirExcel(hojas));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".xls") ? filename : `${filename}.xls`;
  a.click();
  URL.revokeObjectURL(url);
}
