import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft, Lock, Save, ShieldOff, UserCog } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/common/PageHeader";
import { EstadoLaboralBadge } from "@/components/rrhh/EstadoLaboralBadge";
import { TimelineLaboral } from "@/components/rrhh/TimelineLaboral";
import { CampoDato, GridDatos, SeccionExpediente } from "@/components/rrhh/SeccionExpediente";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { AREAS, CARGOS, CENTROS_COSTO, CENTROS_TRABAJO, EMPLEADOS } from "@/data/organizacion";
import { EXPEDIENTES } from "@/data/rrhh";
import { useRrhh } from "@/store/rrhh";
import {
  antiguedadAnios,
  nombreArea,
  nombreCargo,
  nombreCentroCosto,
  nombreCentroTrabajo,
  nombreJefe,
  puedeEditarCamposSensibles,
} from "@/lib/rrhh";
import { puedeVerSalario } from "@/lib/visibilidad";
import { formatCOP } from "@/types/organizacion";
import {
  ESTADO_LABORAL_LABEL,
  TIPO_CONTRATO_LABEL,
  iniciales,
  nombreEmpleado,
  type EstadoLaboral,
  type InformacionLaboral,
} from "@/types/rrhh";

export const Route = createFileRoute("/empleados/$id")({
  head: () => ({
    meta: [
      { title: "Expediente del empleado | SIGTH" },
      {
        name: "description",
        content:
          "Expediente digital: datos personales, familiares, académicos, bancarios, seguridad social, información laboral y línea de tiempo laboral.",
      },
      { property: "og:title", content: "Expediente del empleado | SIGTH" },
      {
        property: "og:description",
        content: "Hoja de vida digital con registro automático de novedades laborales.",
      },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ExpedienteEmpleadoPage,
});

const NIVEL_ACAD_LABEL: Record<string, string> = {
  bachiller: "Bachiller",
  tecnico: "Técnico",
  tecnologo: "Tecnólogo",
  profesional: "Profesional",
  especializacion: "Especialización",
  maestria: "Maestría",
  doctorado: "Doctorado",
};

const PARENTESCO_LABEL: Record<string, string> = {
  conyuge: "Cónyuge",
  hijo: "Hijo/a",
  padre: "Padre",
  madre: "Madre",
  hermano: "Hermano/a",
  otro: "Otro",
};

function ExpedienteEmpleadoPage() {
  const { id } = Route.useParams();
  const {
    empleados,
    eventos,
    rolActivo,
    empleadoActuandoId,
    actualizarInformacionLaboral,
    cambiarEstadoLaboral,
    toggleAcceso,
  } = useRrhh();

  const empleado = empleados.find((e) => e.id === id);
  if (!empleado) throw notFound();

  const exp = EXPEDIENTES[id];
  const esRrhh = puedeEditarCamposSensibles([rolActivo]);
  const verSalario = puedeVerSalario(empleadoActuandoId, [rolActivo], id);
  const misEventos = useMemo(() => eventos.filter((ev) => ev.empleadoId === id), [eventos, id]);

  const [form, setForm] = useState<InformacionLaboral>(empleado.laboral);
  const [motivoRetiro, setMotivoRetiro] = useState("");

  const set = <K extends keyof InformacionLaboral>(k: K, v: InformacionLaboral[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const guardar = () => {
    if (!esRrhh) {
      toast.error("Solo Recursos Humanos puede modificar la información laboral sensible.");
      return;
    }
    const n = actualizarInformacionLaboral(id, form);
    toast.success(
      n > 0
        ? `${n} novedad(es) registradas automáticamente en la hoja de vida.`
        : "Sin cambios por registrar.",
    );
  };

  return (
    <AppShell>
      <PageHeader
        breadcrumb={["Talento Humano", "Empleados", nombreEmpleado(empleado)]}
        title={nombreEmpleado(empleado)}
        description={`${nombreCargo(empleado.laboral.cargoId)} · ${nombreArea(empleado.laboral.areaId)} · CC ${empleado.documento}`}
        actions={
          <>
            <Button variant="outline" size="sm" asChild>
              <Link to="/empleados">
                <ArrowLeft className="size-4" /> Volver
              </Link>
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={empleado.estadoLaboral === "retirado"}
              onClick={() => toggleAcceso(id)}
            >
              <ShieldOff className="size-4" />
              {empleado.accesoHabilitado ? "Desactivar acceso" : "Habilitar acceso"}
            </Button>
          </>
        }
      />

      <div className="surface-panel flex flex-wrap items-center gap-4 p-5">
        <span className="grid size-14 place-items-center rounded-full bg-primary-soft font-display text-lg font-semibold text-primary">
          {iniciales(empleado)}
        </span>
        <div className="flex flex-wrap items-center gap-3">
          <EstadoLaboralBadge estado={empleado.estadoLaboral} />
          <span className="text-sm text-muted-foreground">
            Antigüedad {antiguedadAnios(empleado.laboral.fechaIngreso, empleado.laboral.fechaRetiro)} años
          </span>
          <span className="text-sm text-muted-foreground">
            Acceso: {empleado.accesoHabilitado ? "habilitado" : "desactivado"}
          </span>
          <span className="text-sm text-muted-foreground">
            Salario: {verSalario ? formatCOP(empleado.laboral.salario) : "restringido por rol"}
          </span>
        </div>
      </div>

      <Tabs defaultValue="laboral">
        <TabsList className="flex-wrap">
          <TabsTrigger value="laboral">Información laboral</TabsTrigger>
          <TabsTrigger value="personal">Datos personales</TabsTrigger>
          <TabsTrigger value="familia">Familia y emergencia</TabsTrigger>
          <TabsTrigger value="formacion">Formación y experiencia</TabsTrigger>
          <TabsTrigger value="pagos">Bancarios y seguridad social</TabsTrigger>
          <TabsTrigger value="hoja">Hoja de vida digital</TabsTrigger>
        </TabsList>

        {/* -------------------------- Información laboral -------------------------- */}
        <TabsContent value="laboral" className="mt-4 space-y-4">
          {!esRrhh && (
            <div className="surface-panel flex items-start gap-3 p-4 text-sm text-muted-foreground">
              <Lock className="mt-0.5 size-4 shrink-0 text-warning" />
              <p>
                Cargo, salario, área, centro de costo y jefe inmediato solo pueden ser modificados por
                Recursos Humanos. Con el rol actual ({rolActivo}) la información es de consulta.
              </p>
            </div>
          )}

          <SeccionExpediente
            titulo="Vinculación"
            descripcion="Cada cambio guardado genera automáticamente un evento en la hoja de vida digital."
            soloRrhh
          >
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Campo label="Fecha de ingreso">
                <Input
                  type="date"
                  value={form.fechaIngreso}
                  disabled={!esRrhh}
                  onChange={(e) => set("fechaIngreso", e.target.value)}
                />
              </Campo>

              <Campo label="Área">
                <Select
                  value={form.areaId}
                  disabled={!esRrhh}
                  onValueChange={(v) => set("areaId", v)}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {AREAS.map((a) => (
                      <SelectItem key={a.id} value={a.id}>{a.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Campo>

              <Campo label="Cargo">
                <Select
                  value={form.cargoId}
                  disabled={!esRrhh}
                  onValueChange={(v) => set("cargoId", v)}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CARGOS.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Campo>

              <Campo label="Centro de costo">
                <Select
                  value={form.centroCostoId}
                  disabled={!esRrhh}
                  onValueChange={(v) => set("centroCostoId", v)}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CENTROS_COSTO.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Campo>

              <Campo label="Centro de trabajo">
                <Select
                  value={form.centroTrabajoId}
                  disabled={!esRrhh}
                  onValueChange={(v) => set("centroTrabajoId", v)}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CENTROS_TRABAJO.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Campo>

              <Campo label="Jefe inmediato">
                <Select
                  value={form.jefeInmediatoId ?? "ninguno"}
                  disabled={!esRrhh}
                  onValueChange={(v) => set("jefeInmediatoId", v === "ninguno" ? undefined : v)}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ninguno">Sin jefe asignado</SelectItem>
                    {EMPLEADOS.filter((e) => e.id !== id).map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.nombres} {e.apellidos}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Campo>

              <Campo label="Tipo de contrato">
                <Select
                  value={form.tipoContrato}
                  disabled={!esRrhh}
                  onValueChange={(v) => set("tipoContrato", v as InformacionLaboral["tipoContrato"])}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(TIPO_CONTRATO_LABEL) as (keyof typeof TIPO_CONTRATO_LABEL)[]).map(
                      (t) => (
                        <SelectItem key={t} value={t}>{TIPO_CONTRATO_LABEL[t]}</SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
              </Campo>

              <Campo label="Fin de contrato">
                <Input
                  type="date"
                  value={form.fechaFinContrato ?? ""}
                  disabled={!esRrhh}
                  onChange={(e) => set("fechaFinContrato", e.target.value || undefined)}
                />
              </Campo>

              <Campo label="Salario mensual">
                {verSalario ? (
                  <Input
                    type="number"
                    value={form.salario}
                    disabled={!esRrhh}
                    onChange={(e) => set("salario", Number(e.target.value))}
                  />
                ) : (
                  <Input value="Restringido por rol" disabled />
                )}
              </Campo>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">
                Vigente: {nombreCargo(empleado.laboral.cargoId)} · {nombreArea(empleado.laboral.areaId)} ·{" "}
                {nombreCentroCosto(empleado.laboral.centroCostoId)} ·{" "}
                {nombreCentroTrabajo(empleado.laboral.centroTrabajoId)} · Jefe:{" "}
                {nombreJefe(empleado.laboral.jefeInmediatoId)}
              </p>
              <Button size="sm" disabled={!esRrhh} onClick={guardar}>
                <Save className="size-4" /> Guardar cambios
              </Button>
            </div>
          </SeccionExpediente>

          <SeccionExpediente
            titulo="Estado laboral"
            descripcion="El retiro desactiva el acceso, oculta al empleado de los listados activos y conserva el histórico."
            soloRrhh
          >
            <div className="flex flex-wrap items-end gap-3">
              <div className="w-full sm:w-56">
                <Campo label="Estado">
                  <Select
                    value={empleado.estadoLaboral}
                    disabled={!esRrhh}
                    onValueChange={(v) => {
                      cambiarEstadoLaboral(id, v as EstadoLaboral, motivoRetiro || undefined);
                      toast.success(`Estado actualizado a ${ESTADO_LABORAL_LABEL[v as EstadoLaboral]}.`);
                    }}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(Object.keys(ESTADO_LABORAL_LABEL) as EstadoLaboral[]).map((e) => (
                        <SelectItem key={e} value={e}>{ESTADO_LABORAL_LABEL[e]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Campo>
              </div>
              <div className="min-w-[220px] flex-1">
                <Campo label="Motivo (para retiro)">
                  <Input
                    value={motivoRetiro}
                    disabled={!esRrhh}
                    placeholder="Renuncia voluntaria, terminación de contrato…"
                    onChange={(e) => setMotivoRetiro(e.target.value)}
                  />
                </Campo>
              </div>
            </div>
            {empleado.estadoLaboral === "retirado" && (
              <p className="mt-3 text-sm text-muted-foreground">
                Retirado el {empleado.laboral.fechaRetiro} · {empleado.laboral.motivoRetiro}
              </p>
            )}
          </SeccionExpediente>
        </TabsContent>

        {/* ----------------------------- Datos personales ----------------------------- */}
        <TabsContent value="personal" className="mt-4">
          <SeccionExpediente titulo="Datos personales">
            <GridDatos>
              <CampoDato label="Documento" value={`${exp.personales.tipoDocumento} ${empleado.documento}`} />
              <CampoDato label="Fecha de nacimiento" value={exp.personales.fechaNacimiento} />
              <CampoDato label="Lugar de nacimiento" value={exp.personales.lugarNacimiento} />
              <CampoDato label="Género" value={exp.personales.genero} />
              <CampoDato label="Estado civil" value={exp.personales.estadoCivil.replace("_", " ")} />
              <CampoDato label="Grupo sanguíneo (RH)" value={exp.personales.rh} />
              <CampoDato label="Dirección" value={exp.personales.direccion} />
              <CampoDato label="Ciudad de residencia" value={exp.personales.ciudad} />
              <CampoDato label="Teléfono fijo" value={exp.personales.telefono} />
              <CampoDato label="Celular" value={exp.personales.celular} />
              <CampoDato label="Correo personal" value={exp.personales.emailPersonal} />
            </GridDatos>
          </SeccionExpediente>
        </TabsContent>

        {/* ------------------------ Familiares y emergencia ------------------------ */}
        <TabsContent value="familia" className="mt-4 space-y-4">
          <SeccionExpediente titulo="Datos familiares">
            <div className="space-y-3">
              {exp.familiares.map((f) => (
                <div
                  key={f.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border p-3"
                >
                  <div>
                    <div className="text-sm font-medium text-foreground">{f.nombre}</div>
                    <div className="text-xs text-muted-foreground">
                      {PARENTESCO_LABEL[f.parentesco]}
                      {f.fechaNacimiento ? ` · Nac. ${f.fechaNacimiento}` : ""}
                      {f.documento ? ` · Doc. ${f.documento}` : ""}
                    </div>
                  </div>
                  <span className="rounded-full border border-border bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
                    {f.aCargo ? "A cargo" : "No a cargo"}
                  </span>
                </div>
              ))}
            </div>
          </SeccionExpediente>

          <SeccionExpediente titulo="Contactos de emergencia">
            <div className="space-y-3">
              {exp.contactosEmergencia.map((c) => (
                <div
                  key={c.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border p-3"
                >
                  <div>
                    <div className="text-sm font-medium text-foreground">{c.nombre}</div>
                    <div className="text-xs text-muted-foreground">
                      {c.parentesco} · {c.telefono}
                    </div>
                  </div>
                  {c.principal && (
                    <span className="rounded-full border border-success/30 bg-success/12 px-2 py-0.5 text-xs font-medium text-success">
                      Principal
                    </span>
                  )}
                </div>
              ))}
            </div>
          </SeccionExpediente>
        </TabsContent>

        {/* ------------------------ Formación y experiencia ------------------------ */}
        <TabsContent value="formacion" className="mt-4 space-y-4">
          <SeccionExpediente titulo="Datos académicos">
            <div className="space-y-3">
              {exp.academicos.map((a) => (
                <div key={a.id} className="rounded-md border border-border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-sm font-medium text-foreground">{a.titulo}</div>
                    <span className="text-xs text-muted-foreground">{a.anioGraduacion}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {NIVEL_ACAD_LABEL[a.nivel]} · {a.institucion} ·{" "}
                    {a.certificado ? "Certificado en expediente" : "Certificado pendiente"}
                  </div>
                </div>
              ))}
            </div>
          </SeccionExpediente>

          <SeccionExpediente titulo="Experiencia laboral">
            <div className="space-y-3">
              {exp.experiencia.map((x) => (
                <div key={x.id} className="rounded-md border border-border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-sm font-medium text-foreground">
                      {x.cargo} — {x.empresa}
                    </div>
                    <span className="tabular-nums text-xs text-muted-foreground">
                      {x.desde} → {x.hasta}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {x.motivoRetiro ?? "Sin motivo registrado"} ·{" "}
                    {x.verificada ? "Referencia verificada" : "Pendiente de verificación"}
                  </div>
                </div>
              ))}
            </div>
          </SeccionExpediente>
        </TabsContent>

        {/* ------------------- Bancarios y seguridad social ------------------- */}
        <TabsContent value="pagos" className="mt-4 space-y-4">
          <SeccionExpediente titulo="Datos bancarios">
            <GridDatos>
              <CampoDato label="Banco" value={exp.bancarios.banco} />
              <CampoDato label="Tipo de cuenta" value={exp.bancarios.tipoCuenta} />
              <CampoDato label="Número de cuenta" value={exp.bancarios.numeroCuenta} />
              <CampoDato label="Titular" value={exp.bancarios.titular} />
              <CampoDato
                label="Certificación bancaria"
                value={exp.bancarios.certificacionAdjunta ? "Adjunta" : "Pendiente"}
              />
            </GridDatos>
          </SeccionExpediente>

          <SeccionExpediente titulo="Seguridad social">
            <GridDatos>
              <CampoDato label="EPS" value={exp.seguridadSocial.eps} />
              <CampoDato label="Fondo de pensiones" value={exp.seguridadSocial.afp} />
              <CampoDato label="Cesantías" value={exp.seguridadSocial.cesantias} />
              <CampoDato label="ARL" value={exp.seguridadSocial.arl} />
              <CampoDato label="Caja de compensación" value={exp.seguridadSocial.cajaCompensacion} />
              <CampoDato label="Clase de riesgo" value={`Clase ${exp.seguridadSocial.claseRiesgo}`} />
              <CampoDato label="Afiliado desde" value={exp.seguridadSocial.afiliadoDesde} />
            </GridDatos>
          </SeccionExpediente>
        </TabsContent>

        {/* -------------------------- Hoja de vida digital -------------------------- */}
        <TabsContent value="hoja" className="mt-4 space-y-4">
          <div className="surface-panel flex items-start gap-3 p-4 text-sm text-muted-foreground">
            <UserCog className="mt-0.5 size-4 shrink-0 text-primary" />
            <p>
              Línea de tiempo laboral construida automáticamente: ingreso, ascensos, cambios
              salariales, traslados, renovaciones y terminaciones. Cada modificación de la información
              laboral agrega un evento trazable.
            </p>
          </div>
          <TimelineLaboral eventos={misEventos} />
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}
