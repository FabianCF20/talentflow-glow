/** Desprendibles de pago y liquidaciones en PDF (usa el generador interno). */

import { EMPRESA } from "@/lib/empresa";
import { sellarDocumento } from "@/lib/firma-digital";
import { crearPdf, descargarBlob, type PdfLinea } from "@/lib/pdf";
import { nombreArea, nombreCargo } from "@/lib/rrhh";
import { formatCOP } from "@/types/organizacion";
import { nombreEmpleado, type EmpleadoRRHH } from "@/types/rrhh";
import {
  MESES_LABEL,
  MOTIVO_LIQUIDACION_LABEL,
  type DetalleNomina,
  type LiquidacionFinal,
  type PeriodoNomina,
} from "@/types/nomina";

const linea = (etiqueta: string, valor: string): PdfLinea => ({
  texto: `${etiqueta.padEnd(52, ".")} ${valor}`,
  size: 10,
});

export function codigoDesprendible(periodo: PeriodoNomina, empleadoId: string) {
  return `DP-${periodo.anio}${String(periodo.mes).padStart(2, "0")}-${empleadoId.replace("e-", "")}`;
}

export function desprendiblePdf(
  periodo: PeriodoNomina,
  detalle: DetalleNomina,
  empleado: EmpleadoRRHH,
  sello?: string,
): Blob {
  const lineas: PdfLinea[] = [
    { texto: EMPRESA.razonSocial, size: 14, bold: true, align: "center" },
    { texto: `NIT ${EMPRESA.nit} · ${EMPRESA.direccion}`, size: 9, align: "center" },
    { texto: "DESPRENDIBLE DE PAGO DE NÓMINA", size: 12, bold: true, align: "center", espacio: 18 },
    {
      texto: `Periodo ${MESES_LABEL[periodo.mes - 1]} ${periodo.anio} (${periodo.desde} al ${periodo.hasta})`,
      size: 10,
      align: "center",
    },
    { texto: `Código de verificación: ${codigoDesprendible(periodo, empleado.id)}`, size: 9, align: "center" },
    { texto: "DATOS DEL TRABAJADOR", size: 10, bold: true, espacio: 18 },
    linea("Nombre", nombreEmpleado(empleado)),
    linea("Documento", empleado.documento),
    linea("Cargo", nombreCargo(empleado.laboral.cargoId)),
    linea("Área", nombreArea(empleado.laboral.areaId)),
    linea("Salario básico mensual", formatCOP(detalle.salarioBase)),
    linea("Días liquidados", String(detalle.diasLiquidados)),
    { texto: "DEVENGADOS", size: 10, bold: true, espacio: 16 },
    ...detalle.devengados.map((d) =>
      linea(`${d.codigo} ${d.descripcion}${d.cantidad ? ` (${d.cantidad})` : ""}`, formatCOP(d.valor)),
    ),
    { texto: `Total devengado: ${formatCOP(detalle.totalDevengado)}`, size: 10, bold: true, espacio: 6 },
    { texto: "DEDUCCIONES", size: 10, bold: true, espacio: 16 },
    ...detalle.deducciones.map((d) => linea(`${d.codigo} ${d.descripcion}`, formatCOP(d.valor))),
    { texto: `Total deducido: ${formatCOP(detalle.totalDeducido)}`, size: 10, bold: true, espacio: 6 },
    { texto: `NETO A PAGAR: ${formatCOP(detalle.netoPagar)}`, size: 13, bold: true, espacio: 18 },
    { texto: "PROVISIÓN DE PRESTACIONES SOCIALES DEL PERIODO", size: 10, bold: true, espacio: 18 },
    linea("Prima de servicios", formatCOP(detalle.provisiones.prima)),
    linea("Cesantías", formatCOP(detalle.provisiones.cesantias)),
    linea("Intereses sobre cesantías", formatCOP(detalle.provisiones.interesesCesantias)),
    linea("Vacaciones", formatCOP(detalle.provisiones.vacaciones)),
    { texto: EMPRESA.firmante, size: 10, bold: true, espacio: 34 },
    { texto: EMPRESA.cargoFirmante, size: 9 },
    ...(sello
      ? [
          { texto: "FIRMA ELECTRÓNICA (SHA-256)", size: 8, bold: true, espacio: 14 } as PdfLinea,
          { texto: sello, size: 8, color: [0.45, 0.48, 0.55] } as PdfLinea,
        ]
      : []),
    {
      texto: EMPRESA.textoPie,
      size: 8,
      espacio: 14,
      color: [0.45, 0.48, 0.55],
    },
  ];
  return crearPdf(lineas);
}

export async function descargarDesprendible(
  periodo: PeriodoNomina,
  detalle: DetalleNomina,
  empleado: EmpleadoRRHH,
  usuario?: string,
) {
  const codigo = codigoDesprendible(periodo, empleado.id);
  let sello: string | undefined;
  if (EMPRESA.firmaElectronicaActiva) {
    const r = await sellarDocumento({
      codigo,
      tipo: "desprendible",
      descripcion: `Desprendible ${MESES_LABEL[periodo.mes - 1]} ${periodo.anio}`,
      empleadoId: empleado.id,
      empleadoNombre: nombreEmpleado(empleado),
      documentoEmpleado: empleado.documento,
      contenido: `${detalle.totalDevengado}|${detalle.totalDeducido}|${detalle.netoPagar}|${detalle.diasLiquidados}`,
      emitidoPor: usuario ?? "sistema",
    });
    sello = r.sello;
  }
  descargarBlob(`${codigo}.pdf`, desprendiblePdf(periodo, detalle, empleado, sello));
}

export async function descargarLiquidacion(
  liq: LiquidacionFinal,
  empleado: EmpleadoRRHH,
  usuario?: string,
) {
  let sello: string | undefined;
  if (EMPRESA.firmaElectronicaActiva) {
    const r = await sellarDocumento({
      codigo: liq.consecutivo,
      tipo: "liquidacion",
      descripcion: "Liquidación definitiva de prestaciones sociales",
      empleadoId: empleado.id,
      empleadoNombre: nombreEmpleado(empleado),
      documentoEmpleado: empleado.documento,
      contenido: `${liq.fechaIngreso}|${liq.fechaRetiro}|${liq.totalPagar}`,
      emitidoPor: usuario ?? "sistema",
    });
    sello = r.sello;
  }
  const lineas: PdfLinea[] = [
    { texto: EMPRESA.razonSocial, size: 14, bold: true, align: "center" },
    { texto: `NIT ${EMPRESA.nit}`, size: 9, align: "center" },
    { texto: "LIQUIDACIÓN DEFINITIVA DE PRESTACIONES SOCIALES", size: 12, bold: true, align: "center", espacio: 18 },
    { texto: `Consecutivo ${liq.consecutivo} · Emitida el ${liq.fechaCalculo}`, size: 9, align: "center" },
    { texto: "DATOS DEL TRABAJADOR", size: 10, bold: true, espacio: 18 },
    linea("Nombre", nombreEmpleado(empleado)),
    linea("Documento", empleado.documento),
    linea("Cargo", nombreCargo(empleado.laboral.cargoId)),
    linea("Fecha de ingreso", liq.fechaIngreso),
    linea("Fecha de retiro", liq.fechaRetiro),
    linea("Motivo", MOTIVO_LIQUIDACION_LABEL[liq.motivo]),
    linea("Días laborados (base 360)", String(liq.diasLaborados)),
    linea("Salario base", formatCOP(liq.salarioBase)),
    { texto: "CONCEPTOS A FAVOR", size: 10, bold: true, espacio: 16 },
    ...liq.conceptos.map((c) =>
      linea(`${c.codigo} ${c.descripcion}${c.cantidad ? ` (${c.cantidad} días)` : ""}`, formatCOP(c.valor)),
    ),
    { texto: "DEDUCCIONES", size: 10, bold: true, espacio: 16 },
    ...liq.deducciones.map((d) => linea(`${d.codigo} ${d.descripcion}`, formatCOP(d.valor))),
    { texto: `TOTAL NETO A PAGAR: ${formatCOP(liq.totalPagar)}`, size: 13, bold: true, espacio: 18 },
    { texto: EMPRESA.firmante, size: 10, bold: true, espacio: 40 },
    { texto: EMPRESA.cargoFirmante, size: 9 },
    ...(sello
      ? [
          { texto: "FIRMA ELECTRÓNICA (SHA-256)", size: 8, bold: true, espacio: 14 } as PdfLinea,
          { texto: sello, size: 8, color: [0.45, 0.48, 0.55] } as PdfLinea,
        ]
      : []),
    { texto: EMPRESA.textoPie, size: 8, espacio: 12, color: [0.45, 0.48, 0.55] },
  ];
  descargarBlob(`${liq.consecutivo}.pdf`, crearPdf(lineas));
}

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
