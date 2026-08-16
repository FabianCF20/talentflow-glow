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
  Wallet,
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
import { dotacionDe, incapacidadesDe, nominaDe, vacacionesDe } from "@/data/portal";
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
import { formatCOP } from "@/types/organizacion";
import {
  CAMPO_AUTOGESTION_LABEL,
  CATEGORIAS_DOC,
  CATEGORIA_DOC_LABEL,
  TIPO_CERTIFICADO_LABEL,
  TIPO_INCAPACIDAD_LABEL,
  type CampoAutogestion,
  type CategoriaDocumento,
  type DesprendibleNomina,
  type EntregaDotacion,
  type PeriodoVacaciones,
  type RegistroIncapacidad,
  type TipoCertificado,
} from "@/types/portal";
import { TIPO_CONTRATO_LABEL, iniciales, nombreEmpleado } from "@/types/rrhh";

export const Route = createFileRoute("/portal")({
  head: () => ({
    meta: [
      { title: "Portal del Empleado | SIGTH" },
      {
        name: "description",
        content:
          "Autoconsulta de perfil, contrato, vacaciones, incapacidades, nómina, dotación e historial, con solicitudes de actualización aprobadas por RRHH y certificados en PDF.",
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
  const { empleados, eventos, empleadoActuandoId, setEmpleadoActuandoId } = useRrhh();
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

  const empleado = empleados.find((e) => e.id === empleadoActuandoId) ?? empleados[0]!;
  const id = empleado.id;
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
  const nomina = useMemo(() => nominaDe(id), [id]);
  const dotacion = useMemo(() => dotacionDe(id), [id]);

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

  const subir = () => {
    const nombre = docNombre.trim();
    if (nombre.length < 4 || nombre.length > 120) {
      toast.error("El nombre del documento debe tener entre 4 y 120 caracteres.");
      return;
    }
    cargarDocumento({
      empleadoId: id,
      categoria: docCategoria,
      nombre,
      nombreArchivo: `${nombre.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-v1.pdf`,
      tamanoKb: 240,
      subidoPor: nombreEmpleado(empleado),
      fechaVencimiento: docVence || undefined,
      nota: "Cargado desde el Portal del Empleado",
    });
    setDocNombre("");
    setDocVence("");
    toast.success("Documento cargado en la categoría seleccionada.");
  };

  /* ------------------------------- Certificados ------------------------------- */
  const generar = (tipo: TipoCertificado) => {
    const cert = emitirCertificado(tipo, id, nombreEmpleado(empleado), tipo !== "cargo");
    descargarCertificado(cert, empleado);
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

  const colNom: Column<DesprendibleNomina>[] = [
    { key: "p", header: "Periodo", render: (r) => r.periodo },
    { key: "d", header: "Devengado", render: (r) => formatCOP(r.devengado) },
    { key: "de", header: "Deducciones", render: (r) => formatCOP(r.deducciones) },
    {
      key: "n",
      header: "Neto pagado",
      render: (r) => <span className="font-medium text-foreground">{formatCOP(r.neto)}</span>,
    },
    { key: "f", header: "Fecha de pago", render: (r) => r.fechaPago },
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
        }
      />

      <div className="surface-panel flex flex-wrap items-center gap-4 p-5">
        <span className="grid size-14 place-items-center rounded-full bg-primary-soft font-display text-lg font-semibold text-primary">
          {iniciales(empleado)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-lg font-semibold text-foreground">{nombreEmpleado(empleado)}</p>
          <p className="text-sm text-muted-foreground">
            {nombreCargo(empleado.laboral.cargoId)} · {nombreArea(empleado.laboral.areaId)} · CC{" "}
            {empleado.documento}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <EstadoLaboralBadge estado={empleado.estadoLaboral} />
          <span className="text-sm text-muted-foreground">
            Antigüedad {antiguedadAnios(empleado.laboral.fechaIngreso, empleado.laboral.fechaRetiro)} años
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
          <TabsTrigger value="nomina">Nómina</TabsTrigger>
          <TabsTrigger value="dotacion">Dotación</TabsTrigger>
          <TabsTrigger value="historial">Historial</TabsTrigger>
          <TabsTrigger value="actualizar">Actualizar datos</TabsTrigger>
          <TabsTrigger value="documentos">Mis documentos</TabsTrigger>
          <TabsTrigger value="certificados">Certificados</TabsTrigger>
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
              <CampoDato label="Tipo de contrato" value={TIPO_CONTRATO_LABEL[empleado.laboral.tipoContrato]} />
              <CampoDato label="Fecha de ingreso" value={empleado.laboral.fechaIngreso} />
              <CampoDato label="Fin de contrato" value={empleado.laboral.fechaFinContrato ?? "No aplica"} />
              <CampoDato label="Estado laboral" value={<EstadoLaboralBadge estado={empleado.estadoLaboral} />} />
              <CampoDato label="Fecha de retiro" value={empleado.laboral.fechaRetiro ?? "—"} />
              <CampoDato label="Motivo de retiro" value={empleado.laboral.motivoRetiro ?? "—"} />
            </GridDatos>
          </SeccionExpediente>

          <SeccionExpediente
            titulo="Información laboral"
            descripcion="Información de consulta. Cargo, salario, área, centro de costo y jefe inmediato solo los modifica Recursos Humanos."
          >
            <GridDatos>
              <CampoDato label="Cargo" value={nombreCargo(empleado.laboral.cargoId)} />
              <CampoDato label="Área" value={nombreArea(empleado.laboral.areaId)} />
              <CampoDato label="Centro de costo" value={nombreCentroCosto(empleado.laboral.centroCostoId)} />
              <CampoDato label="Centro de trabajo" value={nombreCentroTrabajo(empleado.laboral.centroTrabajoId)} />
              <CampoDato label="Jefe inmediato" value={nombreJefe(empleado.laboral.jefeInmediatoId)} />
              <CampoDato label="Salario" value={formatCOP(empleado.laboral.salario)} />
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

        {/* ---------------------------------- Nómina ---------------------------------- */}
        <TabsContent value="nomina" className="mt-4">
          <SeccionExpediente
            titulo="Desprendibles de nómina"
            descripcion="Consulta de los últimos periodos liquidados."
          >
            <DataTable columns={colNom} rows={nomina} emptyMessage="Sin liquidaciones registradas." />
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
                  placeholder="Ej. Certificado médico ocupacional"
                  onChange={(e) => setDocNombre(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Categoría
                </label>
                <Select value={docCategoria} onValueChange={(v) => setDocCategoria(v as CategoriaDocumento)}>
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
            <div className="mt-4 flex justify-end">
              <Button size="sm" onClick={subir}>
                <Upload className="size-4" /> Cargar documento
              </Button>
            </div>
          </SeccionExpediente>

          <div className="grid gap-4 lg:grid-cols-2">
            {misDocumentos.map((doc) => (
              <DocumentoCard
                key={doc.id}
                documento={doc}
                empleado={empleado}
                onNuevaVersion={(nota) =>
                  nuevaVersion(doc.id, {
                    nombreArchivo: `${doc.nombre.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-v${doc.versiones.length + 1}.pdf`,
                    tamanoKb: 260,
                    subidoPor: nombreEmpleado(empleado),
                    nota,
                  })
                }
              />
            ))}
            {misDocumentos.length === 0 && (
              <p className="text-sm text-muted-foreground">Sin documentos en tu expediente.</p>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            ¿Necesitas la vista completa del expediente documental?{" "}
            <Link to="/documentos" className="text-primary underline-offset-2 hover:underline">
              Gestión documental
            </Link>
          </p>
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
                  <Button size="sm" className="mt-3 w-full" onClick={() => generar(c.tipo)}>
                    <Download className="size-4" /> Generar y descargar
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
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => descargarCertificado(c, empleado)}
                  >
                    <Download className="size-4" /> Descargar PDF
                  </Button>
                </div>
              ))}
            </div>
          </SeccionExpediente>
        </TabsContent>
      </Tabs>

      <div className="grid gap-4 sm:grid-cols-3">
        <ResumenMini icon={CalendarDays} label="Saldo de vacaciones" valor={`${vacaciones.reduce((a, v) => a + (v.diasCausados - v.diasTomados), 0)} días`} />
        <ResumenMini icon={HeartPulse} label="Incapacidades registradas" valor={String(incapacidades.length)} />
        <ResumenMini
          icon={Wallet}
          label="Último neto pagado"
          valor={nomina[0] ? formatCOP(nomina[0].neto) : "—"}
        />
      </div>
      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <Shirt className="size-3.5" /> Dotación vigente: {dotacion.length} elementos entregados.
      </p>
    </AppShell>
  );
}

function ResumenMini({
  icon: Icon,
  label,
  valor,
}: {
  icon: typeof CalendarDays;
  label: string;
  valor: string;
}) {
  return (
    <div className="surface-panel flex items-center gap-3 p-4">
      <span className="grid size-9 place-items-center rounded-md bg-primary-soft text-primary">
        <Icon className="size-4.5" />
      </span>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-display text-lg font-semibold text-foreground">{valor}</p>
      </div>
    </div>
  );
}
