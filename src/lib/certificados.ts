import { crearPdf, descargarBlob, envolver, type PdfLinea } from "@/lib/pdf";
import { antiguedadAnios, nombreArea, nombreCargo, nombreCentroTrabajo } from "@/lib/rrhh";
import { formatCOP } from "@/types/organizacion";
import {
  TIPO_CERTIFICADO_LABEL,
  type CertificadoEmitido,
  type TipoCertificado,
} from "@/types/portal";
import { TIPO_CONTRATO_LABEL, nombreEmpleado, type EmpleadoRRHH } from "@/types/rrhh";

/** Datos institucionales usados en la firma de los certificados. */
export const EMPRESA = {
  razonSocial: "SIGTH Servicios Empresariales S.A.S.",
  nit: "901.455.882-1",
  direccion: "Calle 100 # 19-54, Bogotá D.C., Colombia",
  telefono: "(601) 745 8800",
  firmante: "Claudia Marcela Osorio",
  cargoFirmante: "Directora de Talento Humano",
};

const PREFIJO: Record<TipoCertificado, string> = {
  laboral: "CL",
  antiguedad: "CA",
  cargo: "CC",
};

/** Código único verificable: prefijo por tipo + fecha + secuencia aleatoria. */
export function generarCodigo(tipo: TipoCertificado): string {
  const f = new Date();
  const fecha = `${f.getFullYear()}${String(f.getMonth() + 1).padStart(2, "0")}${String(f.getDate()).padStart(2, "0")}`;
  const seq = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `${PREFIJO[tipo]}-${fecha}-${seq}`;
}

const fechaLarga = (iso: string) => {
  const MESES = [
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
  ];
  const [a, m, d] = iso.split("-").map(Number);
  return `${d} de ${MESES[(m ?? 1) - 1]} de ${a}`;
};

function cuerpo(
  tipo: TipoCertificado,
  empleado: EmpleadoRRHH,
  incluyeSalario: boolean,
): string[] {
  const nombre = nombreEmpleado(empleado).toUpperCase();
  const cargo = nombreCargo(empleado.laboral.cargoId);
  const area = nombreArea(empleado.laboral.areaId);
  const antig = antiguedadAnios(empleado.laboral.fechaIngreso, empleado.laboral.fechaRetiro);
  const vinculo =
    empleado.estadoLaboral === "retirado"
      ? `estuvo vinculado(a) hasta el ${fechaLarga(empleado.laboral.fechaRetiro ?? "")}`
      : "labora actualmente";
  const salario = incluyeSalario
    ? ` con una asignación salarial mensual de ${formatCOP(empleado.laboral.salario)}`
    : "";

  switch (tipo) {
    case "laboral":
      return [
        `Que el(la) señor(a) ${nombre}, identificado(a) con cédula de ciudadanía No. ${empleado.documento}, ${vinculo} en ${EMPRESA.razonSocial} desde el ${fechaLarga(empleado.laboral.fechaIngreso)}, desempeñando el cargo de ${cargo} en el área de ${area}, mediante contrato de ${TIPO_CONTRATO_LABEL[empleado.laboral.tipoContrato].toLowerCase()}${salario}.`,
        `El(la) trabajador(a) presta sus servicios en ${nombreCentroTrabajo(empleado.laboral.centroTrabajoId)} y se encuentra afiliado(a) al Sistema de Seguridad Social Integral conforme a la legislación colombiana vigente.`,
      ];
    case "antiguedad":
      return [
        `Que el(la) señor(a) ${nombre}, identificado(a) con cédula de ciudadanía No. ${empleado.documento}, registra una antigüedad de ${antig} años en ${EMPRESA.razonSocial}, contados desde su fecha de ingreso el ${fechaLarga(empleado.laboral.fechaIngreso)}.`,
        `Durante este periodo el(la) trabajador(a) ha mantenido continuidad en su vinculación laboral, sin interrupciones que afecten el cómputo de su tiempo de servicio${salario ? `,${salario}` : ""}.`,
      ];
    default:
      return [
        `Que el(la) señor(a) ${nombre}, identificado(a) con cédula de ciudadanía No. ${empleado.documento}, ocupa el cargo de ${cargo}, adscrito al área de ${area} de ${EMPRESA.razonSocial}, desde el ${fechaLarga(empleado.laboral.fechaIngreso)}${salario}.`,
        `Las funciones asignadas corresponden al perfil del cargo aprobado en la estructura organizacional vigente de la compañía.`,
      ];
  }
}

export interface CertificadoDatos {
  codigo: string;
  fechaEmision: string;
}

/** Construye el PDF del certificado con código único, fecha y firma institucional. */
export function construirCertificadoPdf(
  tipo: TipoCertificado,
  empleado: EmpleadoRRHH,
  datos: CertificadoDatos,
  incluyeSalario: boolean,
): Blob {
  const lineas: PdfLinea[] = [
    { texto: EMPRESA.razonSocial, size: 15, bold: true },
    { texto: `NIT ${EMPRESA.nit} · ${EMPRESA.direccion}`, size: 9, color: [0.4, 0.44, 0.5] },
    { texto: `Tel. ${EMPRESA.telefono}`, size: 9, color: [0.4, 0.44, 0.5] },
    {
      texto: TIPO_CERTIFICADO_LABEL[tipo].toUpperCase(),
      size: 14,
      bold: true,
      align: "center",
      espacio: 26,
    },
    { texto: `Código único: ${datos.codigo}`, size: 9, align: "center", color: [0.4, 0.44, 0.5] },
    {
      texto: `Fecha de emisión: ${fechaLarga(datos.fechaEmision)}`,
      size: 9,
      align: "center",
      color: [0.4, 0.44, 0.5],
    },
    { texto: "LA DIRECCIÓN DE TALENTO HUMANO CERTIFICA:", size: 11, bold: true, espacio: 24 },
  ];

  for (const parrafo of cuerpo(tipo, empleado, incluyeSalario)) {
    envolver(parrafo, 11).forEach((l, i) => lineas.push({ texto: l, size: 11, espacio: i === 0 ? 12 : 0 }));
  }

  envolver(
    `Se expide la presente certificación a solicitud del interesado el ${fechaLarga(datos.fechaEmision)}. Este documento puede ser verificado con el código único ${datos.codigo} en el Portal del Empleado de ${EMPRESA.razonSocial}.`,
    10,
  ).forEach((l, i) =>
    lineas.push({ texto: l, size: 10, espacio: i === 0 ? 18 : 0, color: [0.3, 0.34, 0.42] }),
  );

  lineas.push(
    { texto: "_______________________________", size: 11, espacio: 46 },
    { texto: EMPRESA.firmante, size: 11, bold: true, espacio: 2 },
    { texto: EMPRESA.cargoFirmante, size: 10, color: [0.4, 0.44, 0.5] },
    { texto: `Firma institucional autorizada · ${EMPRESA.razonSocial}`, size: 9, color: [0.4, 0.44, 0.5] },
    {
      texto: "Documento generado electrónicamente por SIGTH. Válido sin firma manuscrita.",
      size: 8,
      espacio: 26,
      color: [0.5, 0.54, 0.6],
    },
  );

  return crearPdf(lineas);
}

export function descargarCertificado(
  cert: CertificadoEmitido,
  empleado: EmpleadoRRHH,
) {
  const blob = construirCertificadoPdf(
    cert.tipo,
    empleado,
    { codigo: cert.codigo, fechaEmision: cert.fechaEmision },
    cert.incluyeSalario,
  );
  descargarBlob(`${cert.codigo}-${TIPO_CERTIFICADO_LABEL[cert.tipo].replace(/\s+/g, "-").toLowerCase()}.pdf`, blob);
}
