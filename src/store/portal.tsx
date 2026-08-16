import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { DOCUMENTOS_INICIALES, SOLICITUDES_INICIALES } from "@/data/portal";
import { EXPEDIENTES } from "@/data/rrhh";
import { generarCodigo } from "@/lib/certificados";
import type {
  CampoAutogestion,
  CategoriaDocumento,
  CertificadoEmitido,
  DocumentoEmpleado,
  SolicitudCambio,
  TipoCertificado,
} from "@/types/portal";
import type { DatosPersonales, Familiar } from "@/types/rrhh";

/**
 * Estado del Portal del Empleado.
 * Toda actualización de datos del empleado se registra como solicitud y solo
 * se aplica al expediente cuando Recursos Humanos la aprueba.
 */

type CamposPersonalesEditables = Pick<
  DatosPersonales,
  "direccion" | "telefono" | "celular" | "emailPersonal"
>;

interface PortalContextValue {
  solicitudes: SolicitudCambio[];
  documentos: DocumentoEmpleado[];
  certificados: CertificadoEmitido[];
  /** Datos personales vigentes (expediente + cambios aprobados por RRHH). */
  datosVigentes: (empleadoId: string) => DatosPersonales;
  familiaresVigentes: (empleadoId: string) => Familiar[];
  solicitarCambio: (
    empleadoId: string,
    campo: CampoAutogestion,
    valorAnterior: string,
    valorNuevo: string,
    observacion?: string,
  ) => void;
  aprobarSolicitud: (id: string, revisor: string, comentario?: string) => void;
  rechazarSolicitud: (id: string, revisor: string, comentario?: string) => void;
  cargarDocumento: (input: {
    empleadoId: string;
    categoria: CategoriaDocumento;
    nombre: string;
    nombreArchivo: string;
    tamanoKb: number;
    subidoPor: string;
    fechaVencimiento?: string;
    nota?: string;
  }) => void;
  nuevaVersion: (
    documentoId: string,
    input: { nombreArchivo: string; tamanoKb: number; subidoPor: string; nota?: string; fechaVencimiento?: string },
  ) => void;
  emitirCertificado: (
    tipo: TipoCertificado,
    empleadoId: string,
    solicitadoPor: string,
    incluyeSalario: boolean,
  ) => CertificadoEmitido;
}

const PortalContext = createContext<PortalContextValue | null>(null);

const hoy = () => new Date().toISOString().slice(0, 10);

export function PortalProvider({ children }: { children: ReactNode }) {
  const [solicitudes, setSolicitudes] = useState<SolicitudCambio[]>(SOLICITUDES_INICIALES);
  const [documentos, setDocumentos] = useState<DocumentoEmpleado[]>(DOCUMENTOS_INICIALES);
  const [certificados, setCertificados] = useState<CertificadoEmitido[]>([]);
  const [aprobados, setAprobados] = useState<Record<string, Partial<CamposPersonalesEditables>>>({});
  const [familiaresExtra, setFamiliaresExtra] = useState<Record<string, Familiar[]>>({});

  const datosVigentes = useCallback(
    (empleadoId: string): DatosPersonales => ({
      ...(EXPEDIENTES[empleadoId]!.personales),
      ...(aprobados[empleadoId] ?? {}),
    }),
    [aprobados],
  );

  const familiaresVigentes = useCallback(
    (empleadoId: string): Familiar[] => [
      ...(EXPEDIENTES[empleadoId]?.familiares ?? []),
      ...(familiaresExtra[empleadoId] ?? []),
    ],
    [familiaresExtra],
  );

  const solicitarCambio = useCallback<PortalContextValue["solicitarCambio"]>(
    (empleadoId, campo, valorAnterior, valorNuevo, observacion) => {
      setSolicitudes((prev) => [
        {
          id: `sol-${Date.now()}`,
          empleadoId,
          campo,
          valorAnterior,
          valorNuevo,
          observacionEmpleado: observacion,
          estado: "pendiente",
          fechaSolicitud: hoy(),
        },
        ...prev,
      ]);
    },
    [],
  );

  const aprobarSolicitud = useCallback<PortalContextValue["aprobarSolicitud"]>(
    (id, revisor, comentario) => {
      setSolicitudes((prev) => {
        const sol = prev.find((s) => s.id === id);
        if (sol && sol.estado === "pendiente") {
          if (sol.campo === "familiar") {
            setFamiliaresExtra((f) => ({
              ...f,
              [sol.empleadoId]: [
                ...(f[sol.empleadoId] ?? []),
                {
                  id: `${sol.empleadoId}-f-${Date.now()}`,
                  nombre: sol.valorNuevo,
                  parentesco: "otro",
                  aCargo: true,
                },
              ],
            }));
          } else {
            setAprobados((a) => ({
              ...a,
              [sol.empleadoId]: { ...(a[sol.empleadoId] ?? {}), [sol.campo]: sol.valorNuevo },
            }));
          }
        }
        return prev.map((s) =>
          s.id === id
            ? {
                ...s,
                estado: "aprobada",
                fechaRevision: hoy(),
                revisadoPor: revisor,
                comentarioRrhh: comentario,
              }
            : s,
        );
      });
    },
    [],
  );

  const rechazarSolicitud = useCallback<PortalContextValue["rechazarSolicitud"]>(
    (id, revisor, comentario) => {
      setSolicitudes((prev) =>
        prev.map((s) =>
          s.id === id
            ? {
                ...s,
                estado: "rechazada",
                fechaRevision: hoy(),
                revisadoPor: revisor,
                comentarioRrhh: comentario,
              }
            : s,
        ),
      );
    },
    [],
  );

  const cargarDocumento = useCallback<PortalContextValue["cargarDocumento"]>((input) => {
    setDocumentos((prev) => [
      {
        id: `doc-${Date.now()}`,
        empleadoId: input.empleadoId,
        categoria: input.categoria,
        nombre: input.nombre,
        fechaVencimiento: input.fechaVencimiento,
        versiones: [
          {
            version: 1,
            nombreArchivo: input.nombreArchivo,
            tamanoKb: input.tamanoKb,
            subidoPor: input.subidoPor,
            fecha: hoy(),
            nota: input.nota ?? "Carga inicial",
          },
        ],
      },
      ...prev,
    ]);
  }, []);

  const nuevaVersion = useCallback<PortalContextValue["nuevaVersion"]>((documentoId, input) => {
    setDocumentos((prev) =>
      prev.map((d) => {
        if (d.id !== documentoId) return d;
        const siguiente = Math.max(...d.versiones.map((v) => v.version)) + 1;
        return {
          ...d,
          fechaVencimiento: input.fechaVencimiento ?? d.fechaVencimiento,
          versiones: [
            ...d.versiones,
            {
              version: siguiente,
              nombreArchivo: input.nombreArchivo,
              tamanoKb: input.tamanoKb,
              subidoPor: input.subidoPor,
              fecha: hoy(),
              nota: input.nota ?? `Nueva versión v${siguiente}`,
            },
          ],
        };
      }),
    );
  }, []);

  const emitirCertificado = useCallback<PortalContextValue["emitirCertificado"]>(
    (tipo, empleadoId, solicitadoPor, incluyeSalario) => {
      const cert: CertificadoEmitido = {
        id: `cert-${Date.now()}`,
        codigo: generarCodigo(tipo),
        tipo,
        empleadoId,
        fechaEmision: hoy(),
        incluyeSalario,
        solicitadoPor,
      };
      setCertificados((prev) => [cert, ...prev]);
      return cert;
    },
    [],
  );

  const value = useMemo<PortalContextValue>(
    () => ({
      solicitudes,
      documentos,
      certificados,
      datosVigentes,
      familiaresVigentes,
      solicitarCambio,
      aprobarSolicitud,
      rechazarSolicitud,
      cargarDocumento,
      nuevaVersion,
      emitirCertificado,
    }),
    [
      solicitudes,
      documentos,
      certificados,
      datosVigentes,
      familiaresVigentes,
      solicitarCambio,
      aprobarSolicitud,
      rechazarSolicitud,
      cargarDocumento,
      nuevaVersion,
      emitirCertificado,
    ],
  );

  return <PortalContext.Provider value={value}>{children}</PortalContext.Provider>;
}

export function usePortal() {
  const ctx = useContext(PortalContext);
  if (!ctx) throw new Error("usePortal debe usarse dentro de PortalProvider");
  return ctx;
}
