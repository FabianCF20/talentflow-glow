/**
 * Pantalla: Portal de autoconsulta del empleado.
 * Ruta: /portal
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  BadgeCheck,
  CalendarDays,
  Download,
  FileBadge,
  FileText,
  HeartPulse,
  Send,
  Shirt,
  Upload,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable, type Column } from "@/components/common/DataTable";
import { EstadoLaboralBadge } from "@/components/rrhh/EstadoLaboralBadge";
import { TimelineLaboral } from "@/components/rrhh/TimelineLaboral";
import { CampoDato, GridDatos, SeccionExpediente } from "@/components/rrhh/SeccionExpediente";
import { DocumentoCard } from "@/components/portal/DocumentoCard";
import { SolicitudBadge } from "@/components/portal/SolicitudBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useRrhh } from "@/store/rrhh";
import { usePortal } from "@/store/portal";
import { dotacionDe, incapacidadesDe, vacacionesDe } from "@/data/portal";
import {
  antiguedadAnios,
  nombreArea,
  nombreCargo,
  nombreCentroCosto,
  nombreCentroTrabajo,
  nombreJefe,
  ordenarEventos,
} from "@/lib/rrhh";
import { descargarCertificado } from "@/lib/certificados";
import { useAuth } from "@/lib/auth";
import { formatCOP } from "@/types/organizacion";
import {
  CAMPO_AUTOGESTION_LABEL,
  CATEGORIAS_DOC,
  CATEGORIA_DOC_LABEL,
  TIPO_CERTIFICADO_LABEL,
  TIPO_INCAPACIDAD_LABEL,
  type CampoAutogestion,
  type CategoriaDocumento,
  type EntregaDotacion,
  type PeriodoVacaciones,
  type RegistroIncapacidad,
  type TipoCertificado,
} from "@/types/portal";
import { TIPO_CONTRATO_LABEL, iniciales, nombreEmpleado } from "@/types/rrhh";
import { can } from "@/config/roles";
import { gestionaDocumentacion } from "@/lib/acceso-documental";
import { ResumenMini } from "@/components/portal/ResumenMini";
import { ResponderFormulario } from "@/components/sst/ResponderFormulario";
import { useSst } from "@/store/sst";
import { formulariosPara } from "@/lib/sst";
import { TIPO_ASIGNACION_LABEL } from "@/types/sst";

export const Route = createFileRoute("/portal")({
  head: () => ({
    meta: [
      { title: "Portal del Empleado | SIGTH" },
      {
        name: "description",
        content:
          "Autoconsulta de perfil, contrato, vacaciones, incapacidades, dotación e historial, con solicitudes de actualización aprobadas por RRHH y certificados en PDF.",
      },
      { property: "og:title", content: "Portal del Empleado | SIGTH" },
      {
        property: "og:description",
        content:
          "Autogestión del empleado: consultas, actualización con aprobación de RRHH, documentos y certificados descargables.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PortalEmpleadoPage,
});

const CAMPOS_EDITABLES: Exclude<CampoAutogestion, "familiar">[] = [
  "direccion",
  "telefono",
  "celular",
  "emailPersonal",
];

function PortalEmpleadoPage() {
  const { perfil, usuario } = useAuth();
  const perfilUsuario = perfil
    ? `${perfil.nombres} ${perfil.apellidos}`.trim()
    : (usuario?.email ?? "sistema");
  const { empleados, eventos, empleadoActuandoId, setEmpleadoActuandoId } = useRrhh();
  const puedeCambiarEmpleado = gestionaDocumentacion(perfil?.roles ?? []);
  const {
    solicitudes,
    documentos,
    certificados,
    datosVigentes,
    familiaresVigentes,
    solicitarCambio,
    cargarDocumento,
    nuevaVersion,
    emitirCertificado,
  } = usePortal();

  const empleadoSesionId = perfil?.empleadoId ?? empleadoActuandoId;
  // Un empleado sin ficha asociada nunca debe ver la ficha de otra persona.
  const empleado = puedeCambiarEmpleado
    ? (empleados.find((e) => e.id === empleadoActuandoId) ??
      empleados.find((e) => e.id === empleadoSesionId) ??
      empleados[0])
    : perfil?.empleadoId
      ? empleados.find((e) => e.id === perfil.empleadoId)
      : undefined;
  const id = empleado?.id ?? perfil?.empleadoId ?? "";
  const personales = datosVigentes(id);
  const familiares = familiaresVigentes(id);

  const misSolicitudes = useMemo(
    () => solicitudes.filter((s) => s.empleadoId === id),
    [solicitudes, id],
  );
  const misDocumentos = useMemo(() => documentos.filter((d) => d.empleadoId === id), [documentos, id]);
  const misCertificados = useMemo(
    () => certificados.filter((c) => c.empleadoId === id),
    [certificados, id],
  );
  const misEventos = useMemo(
    () => ordenarEventos(eventos.filter((ev) => ev.empleadoId === id)),
    [eventos, id],
  );

  const vacaciones = useMemo(() => vacacionesDe(id), [id]);
  const incapacidades = useMemo(() => incapacidadesDe(id), [id]);
  const dotacion = useMemo(() => dotacionDe(id), [id]);

  /* --------------------- Formularios dirigidos al empleado --------------------- */
  const { formularios, respuestas, responderFormulario } = useSst();
  // Solo los formularios asignados a esta persona (por empleado, cargo, área o empresa).
  const misFormularios = useMemo(
    () => (id ? formulariosPara(id, formularios, empleados) : []),
    [id, formularios, empleados],
  );
  const yaRespondio = (formularioId: string) =>
    respuestas.some((r) => r.formularioId === formularioId && r.empleadoId === id);
  const [formularioAbiertoId, setFormularioAbiertoId] = useState("");

  /* ------------------------- Formulario de actualización ------------------------- */
  const [campo, setCampo] = useState<CampoAutogestion>("direccion");
  const [valor, setValor] = useState("");
  const [observacion, setObservacion] = useState("");

  const valorActual = (c: CampoAutogestion) =>
    c === "familiar" ? `${familiares.length} familiares registrados` : personales[c];

  const enviarSolicitud = () => {
    const nuevo = valor.trim();
    if (nuevo.length < 4) {
      toast.error("Ingresa el nuevo valor (mínimo 4 caracteres).");
      return;
    }
    if (nuevo.length > 200) {
      toast.error("El valor no puede superar 200 caracteres.");
      return;
    }
    if (campo === "emailPersonal" && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(nuevo)) {
      toast.error("Ingresa un correo electrónico válido.");
      return;
    }
    solicitarCambio(id, campo, String(valorActual(campo)), nuevo, observacion.trim() || undefined);
    setValor("");
    setObservacion("");
    toast.success("Solicitud enviada. Queda pendiente de aprobación por Recursos Humanos.");
  };

  /* ---------------------------- Carga de documentos ---------------------------- */
  const [docNombre, setDocNombre] = useState("");
  const [docCategoria, setDocCategoria] = useState<CategoriaDocumento>("personales");
  const [docVence, setDocVence] = useState("");
  const [archivoPdf, setArchivoPdf] = useState<File | null>(null);
  const [subiendoDocumento, setSubiendoDocumento] = useState(false);

  const manejarArchivo = (event: React.ChangeEvent<HTMLInputElement>) => {
    const archivo = event.target.files?.[0];
    if (!archivo) {
      setArchivoPdf(null);
      return;
    }

    const nombre = archivo.name.toLowerCase();
    if (!nombre.endsWith(".pdf") || archivo.type !== "application/pdf") {
      toast.error("Solo se permiten archivos en formato PDF.");
      event.target.value = "";
      setArchivoPdf(null);
      return;
    }

    if (archivo.size > 5 * 1024 * 1024) {
      toast.error("El PDF no puede superar 5 MB.");
      event.target.value = "";
      setArchivoPdf(null);
      return;
    }

    setArchivoPdf(archivo);
    if (!docNombre.trim()) {
      setDocNombre(archivo.name.replace(/\.pdf$/i, "").slice(0, 120));
    }
    toast.success(`Archivo PDF listo: ${archivo.name}`);
  };

  if (!empleado) {
    return (
      <AppShell>
        <PageHeader
          breadcrumb={["Talento Humano", "Portal del Empleado"]}
          title="Portal del Empleado"
          description="Autoconsulta de tu información laboral, actualización de datos, documentos y certificados."
        />
        <div className="surface-panel p-6 text-center">
          <p className="font-medium text-foreground">No hay un empleado disponible</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Espera a que carguen los datos o solicita a Talento Humano que cree y vincule tu registro.
          </p>
        </div>
      </AppShell>
    );
  }

  const subir = async () => {
    const nombre = docNombre.trim();
    const nombreBase = nombre.length ? nombre : archivoPdf?.name.replace(/\.pdf$/i, "") ?? "documento";

    if (nombreBase.length < 4 || nombreBase.length > 120) {
      toast.error("El nombre del documento debe tener entre 4 y 120 caracteres.");
      return;
    }

    if (!archivoPdf) {
      toast.error("Adjunta el PDF que deseas almacenar.");
      return;
    }
    if (archivoPdf.type !== "application/pdf" || archivoPdf.size <= 0 || archivoPdf.size > 5 * 1024 * 1024) {
      toast.error("Selecciona un PDF válido de máximo 5 MB.");
      return;
    }
    if ((await archivoPdf.slice(0, 5).text()) !== "%PDF-") {
      toast.error("El archivo no contiene una cabecera PDF válida.");
      return;
    }
    setSubiendoDocumento(true);
    try {
      await cargarDocumento({
        empleadoId: id, categoria: docCategoria, nombre: nombreBase, archivo: archivoPdf,
        subidoPor: nombreEmpleado(empleado), fechaVencimiento: docVence || undefined,
        nota: docCategoria === "incapacidades" ? "Incapacidad cargada desde el portal del empleado" : "Cargado desde el Portal del Empleado",
      });
      setDocNombre(""); setDocVence(""); setArchivoPdf(null);
      const input = document.getElementById("portal-documento-file") as HTMLInputElement | null;
      if (input) input.value = "";
      toast.success("Documento almacenado correctamente en Firebase Storage.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo cargar el documento.");
    } finally {
      setSubiendoDocumento(false);
    }
  };

  /* ------------------------------- Certificados ------------------------------- */
  const generar = (tipo: TipoCertificado) => {
    const cert = emitirCertificado(tipo, id, nombreEmpleado(empleado), tipo !== "cargo");
    void descargarCertificado(cert, empleado, perfilUsuario);
    toast.success(`${TIPO_CERTIFICADO_LABEL[tipo]} generado con código ${cert.codigo}.`);
  };

  const colVac: Column<PeriodoVacaciones>[] = [
    { key: "p", header: "Periodo", render: (r) => r.periodo },
    { key: "c", header: "Días causados", render: (r) => r.diasCausados },
    { key: "t", header: "Días tomados", render: (r) => r.diasTomados },
    { key: "s", header: "Saldo", render: (r) => r.diasCausados - r.diasTomados },
    { key: "f", header: "Disfrute", render: (r) => (r.desde ? `${r.desde} → ${r.hasta}` : "—") },
    {
      key: "e",
      header: "Estado",
      render: (r) => <span className="capitalize text-muted-foreground">{r.estado}</span>,
    },
  ];

  const colInc: Column<RegistroIncapacidad>[] = [
    { key: "t", header: "Tipo", render: (r) => TIPO_INCAPACIDAD_LABEL[r.tipo] },
    { key: "f", header: "Periodo", render: (r) => `${r.desde} → ${r.hasta}` },
    { key: "d", header: "Días", render: (r) => r.dias },
    { key: "en", header: "Entidad", render: (r) => r.entidad },
    {
      key: "e",
      header: "Estado",
      render: (r) => <span className="capitalize text-muted-foreground">{r.estado.replace("_", " ")}</span>,
    },
  ];

  const colDot: Column<EntregaDotacion>[] = [
    { key: "e", header: "Elemento", render: (r) => r.elemento },
    { key: "t", header: "Talla", render: (r) => r.talla },
    { key: "c", header: "Cantidad", render: (r) => r.cantidad },
    { key: "f", header: "Entrega", render: (r) => r.fechaEntrega },
    { key: "p", header: "Próxima entrega", render: (r) => r.proximaEntrega },
    {
      key: "s",
      header: "Acta",
      render: (r) => (
        <span className={r.firmada ? "text-success" : "text-warning-foreground dark:text-warning"}>
          {r.firmada ? "Firmada" : "Pendiente de firma"}
        </span>
      ),
    },
  ];

  return (
    <AppShell>
      <PageHeader
        breadcrumb={["Talento Humano", "Portal del Empleado"]}
        title="Portal del Empleado"
        description="Autoconsulta de tu información laboral, actualización de datos con aprobación de Recursos Humanos, documentos y certificados descargables."
        actions={
          puedeCambiarEmpleado ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Empleado en sesión</span>
              <Select value={id} onValueChange={setEmpleadoActuandoId}>
                <SelectTrigger className="w-56">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {empleados.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {nombreEmpleado(e)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="rounded-full border border-border bg-secondary px-2 py-1">
                {perfil?.empleadoId ? "Panel personal" : "Sin empleado asociado"}
              </span>
            </div>
          )
        }
      />

      <div className="surface-panel flex flex-wrap items-center gap-4 p-5">
        <span className="grid size-14 place-items-center rounded-full bg-primary-soft font-display text-lg font-semibold text-primary">
          {iniciales(empleado)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-lg font-semibold text-foreground">{nombreEmpleado(empleado)}</p>
          <p className="text-sm text-muted-foreground">
            {nombreCargo(empleado.laboral?.cargoId)} · {nombreArea(empleado.laboral?.areaId)} · CC{" "}
            {empleado.documento}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <EstadoLaboralBadge estado={empleado.estadoLaboral} />
          <span className="text-sm text-muted-foreground">
            Antigüedad {antiguedadAnios(empleado.laboral?.fechaIngreso, empleado.laboral?.fechaRetiro)} años
          </span>
          <span className="text-sm text-muted-foreground">
            Solicitudes pendientes: {misSolicitudes.filter((s) => s.estado === "pendiente").length}
          </span>
        </div>
      </div>

      <Tabs defaultValue="perfil">
        <TabsList className="flex-wrap">
          <TabsTrigger value="perfil">Perfil</TabsTrigger>
          <TabsTrigger value="contrato">Contrato e info. laboral</TabsTrigger>
          <TabsTrigger value="ausencias">Vacaciones e incapacidades</TabsTrigger>
          <TabsTrigger value="dotacion">Dotación</TabsTrigger>
          <TabsTrigger value="historial">Historial</TabsTrigger>
          <TabsTrigger value="actualizar">Actualizar datos</TabsTrigger>
          <TabsTrigger value="documentos">Mis documentos</TabsTrigger>
          <TabsTrigger value="certificados">Certificados</TabsTrigger>
          <TabsTrigger value="formularios">
            Formularios
            {misFormularios.filter((f) => !yaRespondio(f.id)).length > 0 && (
              <span className="ml-1.5 rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
                {misFormularios.filter((f) => !yaRespondio(f.id)).length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ---------------------------------- Perfil ---------------------------------- */}
        <TabsContent value="perfil" className="mt-4 space-y-4">
          <SeccionExpediente
            titulo="Datos personales"
            descripcion="Los campos editables se actualizan mediante solicitud aprobada por Recursos Humanos."
          >
            <GridDatos>
              <CampoDato label="Documento" value={`${personales.tipoDocumento} ${empleado.documento}`} />
              <CampoDato label="Fecha de nacimiento" value={personales.fechaNacimiento} />
              <CampoDato label="Lugar de nacimiento" value={personales.lugarNacimiento} />
              <CampoDato label="Grupo sanguíneo (RH)" value={personales.rh} />
              <CampoDato label="Dirección" value={personales.direccion} />
              <CampoDato label="Ciudad" value={personales.ciudad} />
              <CampoDato label="Teléfono fijo" value={personales.telefono} />
              <CampoDato label="Celular" value={personales.celular} />
              <CampoDato label="Correo personal" value={personales.emailPersonal} />
            </GridDatos>
          </SeccionExpediente>

          <SeccionExpediente titulo="Información familiar">
            <div className="space-y-3">
              {familiares.map((f) => (
                <div
                  key={f.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border p-3"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">{f.nombre}</p>
                    <p className="text-xs capitalize text-muted-foreground">
                      {f.parentesco.replace("_", " ")}
                      {f.fechaNacimiento ? ` · Nac. ${f.fechaNacimiento}` : ""}
                    </p>
                  </div>
                  <span className="rounded-full border border-border bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
                    {f.aCargo ? "A cargo" : "No a cargo"}
                  </span>
                </div>
              ))}
            </div>
          </SeccionExpediente>
        </TabsContent>

        {/* --------------------------------- Contrato --------------------------------- */}
        <TabsContent value="contrato" className="mt-4 space-y-4">
          <SeccionExpediente titulo="Contrato">
            <GridDatos>
              <CampoDato label="Tipo de contrato" value={TIPO_CONTRATO_LABEL[empleado.laboral?.tipoContrato]} />
              <CampoDato label="Fecha de ingreso" value={empleado.laboral?.fechaIngreso} />
              <CampoDato label="Fin de contrato" value={empleado.laboral?.fechaFinContrato ?? "No aplica"} />
              <CampoDato label="Estado laboral" value={<EstadoLaboralBadge estado={empleado.estadoLaboral} />} />
              <CampoDato label="Fecha de retiro" value={empleado.laboral?.fechaRetiro ?? "—"} />
              <CampoDato label="Motivo de retiro" value={empleado.laboral?.motivoRetiro ?? "—"} />
            </GridDatos>
          </SeccionExpediente>

          <SeccionExpediente
            titulo="Información laboral"
            descripcion="Información de consulta. Cargo, salario, área, centro de costo y jefe inmediato solo los modifica Recursos Humanos."
          >
            <GridDatos>
              <CampoDato label="Cargo" value={nombreCargo(empleado.laboral?.cargoId)} />
              <CampoDato label="Área" value={nombreArea(empleado.laboral?.areaId)} />
              <CampoDato label="Centro de costo" value={nombreCentroCosto(empleado.laboral?.centroCostoId)} />
              <CampoDato label="Centro de trabajo" value={nombreCentroTrabajo(empleado.laboral?.centroTrabajoId)} />
              <CampoDato label="Jefe inmediato" value={nombreJefe(empleado.laboral?.jefeInmediatoId)} />
              <CampoDato label="Salario" value={formatCOP(empleado.laboral?.salario)} />
            </GridDatos>
          </SeccionExpediente>
        </TabsContent>

        {/* -------------------------------- Ausencias -------------------------------- */}
        <TabsContent value="ausencias" className="mt-4 space-y-4">
          <SeccionExpediente titulo="Vacaciones" descripcion="Días causados, disfrutados y saldo por periodo.">
            <DataTable columns={colVac} rows={vacaciones} emptyMessage="Sin periodos de vacaciones." />
          </SeccionExpediente>
          <SeccionExpediente titulo="Incapacidades" descripcion="Novedades radicadas ante EPS y ARL.">
            <DataTable
              columns={colInc}
              rows={incapacidades}
              emptyMessage="Sin incapacidades registradas."
            />
          </SeccionExpediente>
        </TabsContent>

        {/* --------------------------------- Dotación --------------------------------- */}
        <TabsContent value="dotacion" className="mt-4">
          <SeccionExpediente titulo="Dotación entregada" descripcion="Elementos, tallas y próximas entregas.">
            <DataTable columns={colDot} rows={dotacion} emptyMessage="Sin entregas de dotación." />
          </SeccionExpediente>
        </TabsContent>

        {/* --------------------------------- Historial --------------------------------- */}
        <TabsContent value="historial" className="mt-4 space-y-4">
          <SeccionExpediente
            titulo="Historial laboral"
            descripcion="Hoja de vida digital: ingreso, ascensos, cambios salariales, traslados, renovaciones y terminaciones."
          >
            <TimelineLaboral eventos={misEventos} />
          </SeccionExpediente>

          <SeccionExpediente titulo="Historial de solicitudes" descripcion="Trazabilidad de tus actualizaciones.">
            <div className="space-y-3">
              {misSolicitudes.length === 0 && (
                <p className="text-sm text-muted-foreground">Aún no has enviado solicitudes.</p>
              )}
              {misSolicitudes.map((s) => (
                <div key={s.id} className="rounded-md border border-border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium text-foreground">
                      {CAMPO_AUTOGESTION_LABEL[s.campo]}
                    </p>
                    <SolicitudBadge estado={s.estado} />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {s.valorAnterior} → {s.valorNuevo}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Solicitado {s.fechaSolicitud}
                    {s.fechaRevision ? ` · Revisado ${s.fechaRevision} por ${s.revisadoPor}` : ""}
                    {s.comentarioRrhh ? ` · ${s.comentarioRrhh}` : ""}
                  </p>
                </div>
              ))}
            </div>
          </SeccionExpediente>
        </TabsContent>

        {/* -------------------------------- Actualizar -------------------------------- */}
        <TabsContent value="actualizar" className="mt-4 space-y-4">
          <div className="surface-panel flex items-start gap-3 p-4 text-sm text-muted-foreground">
            <BadgeCheck className="mt-0.5 size-4 shrink-0 text-primary" />
            <p>
              Puedes solicitar la actualización de dirección, teléfono, correo e información familiar.
              Ninguna modificación se aplica de forma directa: toda solicitud queda pendiente de
              aprobación por Recursos Humanos en la bandeja de solicitudes.
            </p>
          </div>

          <SeccionExpediente titulo="Nueva solicitud de actualización">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Dato a actualizar
                </label>
                <Select value={campo} onValueChange={(v) => setCampo(v as CampoAutogestion)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[...CAMPOS_EDITABLES, "familiar" as const].map((c) => (
                      <SelectItem key={c} value={c}>
                        {CAMPO_AUTOGESTION_LABEL[c]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Valor actual
                </label>
                <Input value={String(valorActual(campo))} disabled />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Nuevo valor
                </label>
                <Input
                  value={valor}
                  maxLength={200}
                  placeholder={
                    campo === "familiar"
                      ? "Nombre · parentesco · fecha de nacimiento"
                      : "Ingresa el nuevo dato"
                  }
                  onChange={(e) => setValor(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Observación (opcional)
                </label>
                <Textarea
                  value={observacion}
                  maxLength={300}
                  rows={2}
                  placeholder="Justificación o soporte adjunto"
                  onChange={(e) => setObservacion(e.target.value)}
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <Button size="sm" onClick={enviarSolicitud}>
                <Send className="size-4" /> Enviar a aprobación de RRHH
              </Button>
            </div>
          </SeccionExpediente>
        </TabsContent>

        {/* -------------------------------- Documentos -------------------------------- */}
        <TabsContent value="documentos" className="mt-4 space-y-4">
          <SeccionExpediente
            titulo="Cargar documento"
            descripcion="Categorías: personales, académicos, contractuales, SST, disciplinarios e incapacidades."
          >
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Nombre del documento
                </label>
                <Input
                  value={docNombre}
                  maxLength={120}
                  placeholder={
                    docCategoria === "incapacidades"
                      ? "Ej. Incapacidad médica agosto"
                      : "Ej. Certificado médico ocupacional"
                  }
                  onChange={(e) => setDocNombre(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Categoría
                </label>
                <Select
                  value={docCategoria}
                  onValueChange={(v) => {
                    setDocCategoria(v as CategoriaDocumento);
                    if (v === "incapacidades") {
                      setDocNombre((prev) => prev || "Incapacidad médica");
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIAS_DOC.map((c) => (
                      <SelectItem key={c} value={c}>
                        {CATEGORIA_DOC_LABEL[c]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Vencimiento (opcional)
                </label>
                <Input type="date" value={docVence} onChange={(e) => setDocVence(e.target.value)} />
              </div>
            </div>

            <div className="mt-4 space-y-2 rounded-md border border-dashed border-border bg-secondary/40 p-3">
              <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Archivo PDF
              </label>
              <div className="flex flex-wrap items-center gap-3">
                <Input
                  id="portal-documento-file"
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={manejarArchivo}
                  className="max-w-full file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary-foreground"
                />
                <span className="text-xs text-muted-foreground">
                  {archivoPdf ? `Listo: ${archivoPdf.name}` : "Solo PDF · máximo 5 MB"}
                </span>
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <Button size="sm" onClick={() => void subir()} disabled={subiendoDocumento}>
                <Upload className="size-4" /> {subiendoDocumento ? "Cargando..." : "Cargar documento"}
              </Button>
            </div>
          </SeccionExpediente>

          <div className="grid gap-4 lg:grid-cols-2">
            {misDocumentos.map((doc) => (
              <DocumentoCard
                key={doc.id}
                documento={doc}
                empleado={empleado}
                onNuevaVersion={
                  gestionaDocumentacion(perfil?.roles ?? []) ||
                  ((perfil?.roles ?? []).includes("sst") && ["sst", "incapacidades"].includes(doc.categoria))
                    ? (archivo, nota, fechaVencimiento) =>
                        nuevaVersion(doc.id, {
                          archivo,
                          subidoPor: nombreEmpleado(empleado),
                          nota,
                          fechaVencimiento,
                        })
                    : undefined
                }
              />
            ))}
            {misDocumentos.length === 0 && (
              <p className="text-sm text-muted-foreground">Sin documentos en tu expediente.</p>
            )}
          </div>
          {can(perfil?.roles ?? [], "documentacion", "ver") && <p className="text-xs text-muted-foreground">
            ¿Necesitas la vista completa del expediente documental?{" "}
            <Link to="/documentos" className="text-primary underline-offset-2 hover:underline">
              Gestión documental
            </Link>
          </p>}
        </TabsContent>

        {/* ------------------------------- Certificados ------------------------------- */}
        <TabsContent value="certificados" className="mt-4 space-y-4">
          <SeccionExpediente
            titulo="Generación automática de certificados"
            descripcion="Cada PDF incluye código único, fecha de emisión y firma institucional. La descarga es directa."
          >
            <div className="grid gap-3 sm:grid-cols-3">
              {(
                [
                  { tipo: "laboral" as TipoCertificado, icon: FileText, detalle: "Vinculación, cargo, contrato y salario." },
                  { tipo: "antiguedad" as TipoCertificado, icon: CalendarDays, detalle: "Tiempo de servicio continuo." },
                  { tipo: "cargo" as TipoCertificado, icon: FileBadge, detalle: "Cargo y área actual, sin salario." },
                ]
              ).map((c) => (
                <div key={c.tipo} className="rounded-md border border-border p-4">
                  <span className="grid size-9 place-items-center rounded-md bg-primary-soft text-primary">
                    <c.icon className="size-4.5" />
                  </span>
                  <p className="mt-3 text-sm font-semibold text-foreground">
                    {TIPO_CERTIFICADO_LABEL[c.tipo]}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">{c.detalle}</p>
                  <Button size="sm" className="mt-3 w-full" variant="outline" disabled onClick={() => generar(c.tipo)}>
                    <Download className="size-4" /> Emisión pendiente de habilitación
                  </Button>
                </div>
              ))}
            </div>
          </SeccionExpediente>

          <SeccionExpediente titulo="Certificados emitidos" descripcion="Historial verificable por código único.">
            <div className="space-y-3">
              {misCertificados.length === 0 && (
                <p className="text-sm text-muted-foreground">Aún no has generado certificados.</p>
              )}
              {misCertificados.map((c) => (
                <div
                  key={c.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border p-3"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {TIPO_CERTIFICADO_LABEL[c.tipo]}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Código {c.codigo} · Emitido {c.fechaEmision}
                      {c.incluyeSalario ? " · Incluye salario" : ""}
                    </p>
                  </div>
                  <Button size="sm" variant="outline" disabled>
                    <Download className="size-4" /> Descarga temporalmente deshabilitada
                  </Button>
                </div>
              ))}
            </div>
          </SeccionExpediente>
        </TabsContent>

        {/* ---------------- Formularios dirigidos al empleado ---------------- */}
        <TabsContent value="formularios" className="mt-4 space-y-4">
          {misFormularios.length === 0 ? (
            <div className="surface-panel p-5 text-sm text-muted-foreground">
              No tiene formularios asignados. Aquí aparecerán las encuestas y formularios
              dirigidos a usted, a su cargo, a su área o a toda la empresa.
            </div>
          ) : (
            misFormularios.map((f) => {
              const respondido = yaRespondio(f.id);
              const abierto = formularioAbiertoId === f.id;
              return (
                <div key={f.id} className="surface-panel space-y-3 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="font-display text-base font-semibold text-foreground">{f.titulo}</h3>
                      <p className="text-xs text-muted-foreground">
                        {f.codigo} · {TIPO_ASIGNACION_LABEL[f.asignacion.tipo]} · {f.campos.length} pregunta(s)
                      </p>
                    </div>
                    {respondido ? (
                      <span className="flex items-center gap-1 rounded-full bg-primary-soft px-2.5 py-1 text-xs font-medium text-primary">
                        <BadgeCheck className="size-3.5" /> Ya respondió
                      </span>
                    ) : (
                      <Button
                        size="sm"
                        variant={abierto ? "outline" : "default"}
                        onClick={() => setFormularioAbiertoId(abierto ? "" : f.id)}
                      >
                        {abierto ? "Cerrar" : "Responder"}
                      </Button>
                    )}
                  </div>
                  {f.descripcion && <p className="text-sm text-muted-foreground">{f.descripcion}</p>}
                  {abierto && !respondido && (
                    <ResponderFormulario
                      formulario={f}
                      onEnviar={(valores) => {
                        responderFormulario(f.id, id, valores);
                        setFormularioAbiertoId("");
                        toast.success("Respuesta enviada. Gracias por su participación.");
                      }}
                    />
                  )}
                </div>
              );
            })
          )}
        </TabsContent>
      </Tabs>

      <div className="grid gap-4 sm:grid-cols-3">
        <ResumenMini icon={CalendarDays} label="Saldo de vacaciones" valor={`${vacaciones.reduce((a, v) => a + (v.diasCausados - v.diasTomados), 0)} días`} />
        <ResumenMini icon={HeartPulse} label="Incapacidades registradas" valor={String(incapacidades.length)} />
        <ResumenMini icon={Shirt} label="Dotación entregada" valor={`${dotacion.length} elementos`} />
      </div>
      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <Shirt className="size-3.5" /> Dotación vigente: {dotacion.length} elementos entregados.
      </p>
    </AppShell>
  );
}
