/** Exportación de datos a CSV (descarga en el navegador). */

/** Neutraliza textos que una hoja de cálculo interpretaría como fórmula (=, +, -, @, tab, retorno). */
export function neutralizarFormula(v: string | number): string {
  if (typeof v === "number") return String(v);
  const s = String(v ?? "");
  return /^[\s]*[=+\-@\t\r]/.test(s) ? `'${s}` : s;
}

export function toCsv(headers: string[], rows: (string | number)[][]): string {
  const esc = (v: string | number) => {
    const s = neutralizarFormula(v);
    return /[",;\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.map(esc).join(";"), ...rows.map((r) => r.map(esc).join(";"))].join("\n");
}

export function downloadCsv(filename: string, headers: string[], rows: (string | number)[][]) {
  if (typeof window === "undefined") return;
  const blob = new Blob(["\uFEFF" + toCsv(headers, rows)], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
