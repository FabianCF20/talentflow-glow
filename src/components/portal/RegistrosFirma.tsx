/** Consulta compartida de registros de firma, sin simular archivos originales. */
import { DataTable, type Column } from "@/components/common/DataTable";
import { selloLegible, type RegistroFirma } from "@/lib/firma-digital";

const columnas: Column<RegistroFirma>[] = [
  { key: "codigo", header: "Código", render: (r) => <span className="font-mono text-xs">{r.codigo}</span> },
  { key: "descripcion", header: "Documento", render: (r) => r.descripcion },
  { key: "titular", header: "Titular", render: (r) => r.empleadoNombre },
  { key: "fecha", header: "Emisión", render: (r) => r.emitidoEn?.slice(0, 16).replace("T", " ") ?? "—" },
  { key: "emisor", header: "Emitido por", render: (r) => r.emitidoPor },
  { key: "huella", header: "Huella SHA-256", render: (r) => <span className="font-mono text-xs">{selloLegible(r.hash ?? "")}</span> },
  { key: "archivo", header: "Archivo original", render: () => "No archivado en este registro" },
];

/** Las dos pantallas consultan exactamente la misma fuente de firmas. */
export function RegistrosFirma({ firmas }: { firmas: RegistroFirma[] }) {
  return <DataTable columns={columnas} rows={firmas} emptyMessage="No hay registros de firma disponibles para esta consulta." />;
}