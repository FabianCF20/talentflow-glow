/**
 * Estado compartido del Portal del Empleado (solicitudes de cambio, documentos, certificados).
 */
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useFirestoreState, limpiarUndefined } from "@/lib/firestore";
import { auth, db, storage } from "@/lib/firebase";
import { doc as firestoreDoc, setDoc } from "firebase/firestore";
import { ref as storageRef, uploadBytes } from "firebase/storage";
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
import { hoyISO as hoy } from "@/lib/fechas";
import { useAuth } from "@/lib/auth";
import { alcancePorEmpleado } from "@/lib/acceso-operativo";
import { alcanceConsultaDocumental, puedeLeerDocumento, categoriasGestionables, gestionaDocumentacion } from "@/lib/acceso-documental";

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
    subidoPor: string;
    fechaVencimiento?: string;
    nota?: string;
    archivo: File;
  }) => Promise<void>;
  nuevaVersion: (
    documentoId: string,
    input: { archivo: File; subidoPor: string; nota?: string; fechaVencimiento?: string },
  ) => Promise<void>;
  emitirCertificado: (
    tipo: TipoCertificado,
    empleadoId: string,
    solicitadoPor: string,
    incluyeSalario: boolean,
  ) => CertificadoEmitido;
}

// Se conserva una sola instancia del contexto aunque el módulo se recargue en caliente.
const claveContexto = "__sigthPortalContext";
const globalCtx = globalThis as unknown as Record<string, React.Context<PortalContextValue | null> | undefined>;
const PortalContext = (globalCtx[claveContexto] ??= createContext<PortalContextValue | null>(null));


export function PortalProvider({ children }: { children: ReactNode }) {
  const { perfil } = useAuth();
  const roles = perfil?.roles ?? [];
  const propioId = perfil?.empleadoId ?? "";
  const propio = alcanceConsultaDocumental(roles, propioId);
  const [solicitudes, setSolicitudes] = useFirestoreState<SolicitudCambio>("portal_solicitudes", "id", propio);
  const [documentosLeidos, setDocumentos] = useFirestoreState<DocumentoEmpleado>("portal_documentos", "id", alcanceConsultaDocumental(roles, propioId, true));
  const documentos = documentosLeidos.filter((d) => puedeLeerDocumento(roles, propioId, d));
  const alcanceCertificados = alcancePorEmpleado(
    roles,
    propioId,
    [],
    ["administrador", "talento_humano", "nomina"],
    { incluirSubordinados: false },
  );
  const [certificados, setCertificados] = useFirestoreState<CertificadoEmitido>(
    "portal_certificados",
    "id",
    alcanceCertificados,
  );
  const [aprobados, setAprobados] = useState<Record<string, Partial<CamposPersonalesEditables>>>({});
  const [familiaresExtra, setFamiliaresExtra] = useState<Record<string, Familiar[]>>({});

  const datosVigentes = useCallback(
    (empleadoId: string): DatosPersonales => ({
      ...((EXPEDIENTES[empleadoId]?.personales ?? {}) as DatosPersonales),
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
    [setSolicitudes],
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
    [setSolicitudes],
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
    [setSolicitudes],
  );

  const cargarDocumento = useCallback<PortalContextValue["cargarDocumento"]>(async (input) => {
    const actor = auth.currentUser;
    if (!actor) throw new Error("Debes iniciar sesión para cargar documentos.");
    if (!gestionaDocumentacion(roles) && input.empleadoId !== propioId && !(roles.includes("sst") && categoriasGestionables(roles).includes(input.categoria))) {
      throw new Error("No tienes permiso para cargar documentos de este empleado.");
    }
    if (input.archivo.type !== "application/pdf" || input.archivo.size <= 0 || input.archivo.size > 5 * 1024 * 1024 || (await input.archivo.slice(0, 5).text()) !== "%PDF-") {
      throw new Error("Selecciona un PDF válido de máximo 5 MB.");
    }
    const id = crypto.randomUUID();
    const safeName = input.archivo.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-100);
    const path = "documentos/" + input.empleadoId + "/" + input.categoria + "/" + id + "/v1-" + safeName;
    await uploadBytes(storageRef(storage, path), input.archivo, {
      contentType: "application/pdf",
      customMetadata: { empleadoId: input.empleadoId, categoria: input.categoria, documentoId: id, uploadedBy: actor.uid },
    });
    const documento: DocumentoEmpleado = {
      id, empleadoId: input.empleadoId, categoria: input.categoria, nombre: input.nombre,
      fechaVencimiento: input.fechaVencimiento,
      versiones: [{
        version: 1, nombreArchivo: input.archivo.name,
        tamanoKb: Math.max(1, Math.ceil(input.archivo.size / 1024)),
        subidoPor: input.subidoPor, fecha: hoy(),
        nota: input.nota ?? "Carga inicial", storagePath: path,
      }],
    };
    try {
      await setDoc(firestoreDoc(db, "portal_documentos", id), limpiarUndefined(documento) as Record<string, unknown>);
    } catch (error) {
      console.error("[portal_documentos] el archivo se cargó pero no se guardaron los metadatos", error);
      throw new Error("El archivo se almacenó, pero no se pudo registrar el expediente. Contacta a Talento Humano para regularizarlo.");
    }
  }, [roles, propioId]);

  const nuevaVersion = useCallback<PortalContextValue["nuevaVersion"]>(async (documentoId, input) => {
    const actual = documentosLeidos.find((d) => d.id === documentoId);
    const actor = auth.currentUser;
    if (!actual || !actor) throw new Error("No se encontró el documento o la sesión expiró.");
    if (!gestionaDocumentacion(roles) && !(roles.includes("sst") && ["sst", "incapacidades"].includes(actual.categoria))) {
      throw new Error("No tienes permiso para versionar este documento.");
    }
    if (input.archivo.type !== "application/pdf" || input.archivo.size <= 0 || input.archivo.size > 5 * 1024 * 1024 || (await input.archivo.slice(0, 5).text()) !== "%PDF-") {
      throw new Error("Selecciona un PDF válido de máximo 5 MB.");
    }
    const siguiente = Math.max(...actual.versiones.map((v) => v.version), 0) + 1;
    const safeName = input.archivo.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-100);
    const path = "documentos/" + actual.empleadoId + "/" + actual.categoria + "/" + actual.id + "/v" + siguiente + "-" + safeName;
    await uploadBytes(storageRef(storage, path), input.archivo, {
      contentType: "application/pdf",
      customMetadata: { empleadoId: actual.empleadoId, categoria: actual.categoria, documentoId: actual.id, uploadedBy: actor.uid },
    });
    const actualizado: DocumentoEmpleado = {
      ...actual, fechaVencimiento: input.fechaVencimiento ?? actual.fechaVencimiento,
      versiones: [...actual.versiones, {
        version: siguiente, nombreArchivo: input.archivo.name,
        tamanoKb: Math.max(1, Math.ceil(input.archivo.size / 1024)),
        subidoPor: input.subidoPor, fecha: hoy(),
        nota: input.nota ?? ("Nueva versión v" + siguiente), storagePath: path,
      }],
    };
    await setDoc(firestoreDoc(db, "portal_documentos", documentoId), limpiarUndefined(actualizado) as Record<string, unknown>);
  }, [roles, documentosLeidos]);
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
    [setCertificados],
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
