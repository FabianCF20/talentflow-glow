import { useMemo, useState } from "react";
import { Plus, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { guardarDoc } from "@/lib/firestore";
import { nuevoId } from "@/lib/maestros";
import { AREAS, CARGOS, CENTROS_COSTO, CENTROS_TRABAJO, DEPENDENCIAS } from "@/data/organizacion";
import { EXPEDIENTES } from "@/data/rrhh";
import { TIPO_CONTRATO_LABEL, nombreEmpleado } from "@/types/rrhh";
import type {
  ContactoEmergencia,
  DatoAcademico,
  EmpleadoRRHH,
  ExperienciaLaboral,
  ExpedienteEmpleado,
  Familiar,
  InformacionLaboral,
  TipoContrato,
} from "@/types/rrhh";
import type { EmpleadoOrg } from "@/types/organizacion";
import type { EventoHojaVida } from "@/types/rrhh";

const hoy = () => new Date().toISOString().slice(0, 10);

const expedienteVacio = (empleadoId: string): ExpedienteEmpleado => ({
  empleadoId,
  personales: {
    tipoDocumento: "CC",
    fechaNacimiento: "",
    lugarNacimiento: "",
    genero: "M",
    estadoCivil: "soltero",
    rh: "",
    direccion: "",
    ciudad: "",
    telefono: "",
    celular: "",
    emailPersonal: "",
  },
  familiares: [],
  contactosEmergencia: [],
  academicos: [],
  experiencia: [],
  bancarios: {
    banco: "",
    tipoCuenta: "ahorros",
    numeroCuenta: "",
    titular: "",
    certificacionAdjunta: false,
  },
  seguridadSocial: {
    eps: "",
    afp: "",
    cesantias: "",
    arl: "",
    cajaCompensacion: "",
    claseRiesgo: "I",
    afiliadoDesde: "",
  },
});

const laboralVacia = (): InformacionLaboral => ({
  fechaIngreso: hoy(),
  areaId: "",
  dependenciaId: "",
  cargoId: "",
  centroCostoId: "",
  centroTrabajoId: "",
  jefeInmediatoId: "",
  tipoContrato: "indefinido",
  salario: 0,
  fechaFinContrato: "",
});

function Campo({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function Opciones({
  value,
  onChange,
  opciones,
  placeholder = "Seleccione…",
  permitirVacio,
}: {
  value: string;
  onChange: (v: string) => void;
  opciones: { value: string; label: string }[];
  placeholder?: string;
  permitirVacio?: boolean;
}) {
  return (
    <Select value={value || ""} onValueChange={(v) => onChange(v === "__vacio" ? "" : v)}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {permitirVacio && <SelectItem value="__vacio">Sin asignar</SelectItem>}
        {opciones.length === 0 && (
          <SelectItem value="__vacio" disabled>
            Sin datos maestros creados
          </SelectItem>
        )}
        {opciones.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function EmpleadoDialog({
  empleado,
  empleados,
  actor,
  puedeEditar,
  trigger,
}: {
  empleado?: EmpleadoRRHH;
  empleados: EmpleadoRRHH[];
  actor: string;
  puedeEditar: boolean;
  trigger?: React.ReactNode;
}) {
  const editando = Boolean(empleado);
  const [abierto, setAbierto] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const [nombres, setNombres] = useState(empleado?.nombres ?? "");
  const [apellidos, setApellidos] = useState(empleado?.apellidos ?? "");
  const [documento, setDocumento] = useState(empleado?.documento ?? "");
  const [acceso, setAcceso] = useState(empleado?.accesoHabilitado ?? false);
  const [laboral, setLaboral] = useState<InformacionLaboral>(empleado?.laboral ?? laboralVacia());
  const [exp, setExp] = useState<ExpedienteEmpleado>(
    (empleado && EXPEDIENTES[empleado.id]) ?? expedienteVacio(empleado?.id ?? ""),
  );

  const setLab = <K extends keyof InformacionLaboral>(k: K, v: InformacionLaboral[K]) =>
    setLaboral((l) => ({ ...l, [k]: v }));
  const setPers = <K extends keyof ExpedienteEmpleado["personales"]>(
    k: K,
    v: ExpedienteEmpleado["personales"][K],
  ) => setExp((e) => ({ ...e, personales: { ...e.personales, [k]: v } }));
  const setBanc = <K extends keyof ExpedienteEmpleado["bancarios"]>(
    k: K,
    v: ExpedienteEmpleado["bancarios"][K],
  ) => setExp((e) => ({ ...e, bancarios: { ...e.bancarios, [k]: v } }));
  const setSs = <K extends keyof ExpedienteEmpleado["seguridadSocial"]>(
    k: K,
    v: ExpedienteEmpleado["seguridadSocial"][K],
  ) => setExp((e) => ({ ...e, seguridadSocial: { ...e.seguridadSocial, [k]: v } }));

  const opcAreas = AREAS.filter((a) => a.estado === "activo").map((a) => ({
    value: a.id,
    label: `${a.codigo} · ${a.nombre}`,
  }));
  const opcDeps = DEPENDENCIAS.filter((d) => !laboral.areaId || d.areaId === laboral.areaId).map(
    (d) => ({ value: d.id, label: d.nombre }),
  );
  const opcCargos = CARGOS.filter((c) => !laboral.areaId || c.areaId === laboral.areaId).map((c) => ({
    value: c.id,
    label: `${c.codigo} · ${c.nombre}`,
  }));
  const opcCt = CENTROS_TRABAJO.map((c) => ({ value: c.id, label: c.nombre }));
  const opcCc = CENTROS_COSTO.map((c) => ({ value: c.id, label: c.nombre }));
  const opcJefes = useMemo(
    () =>
      empleados
        .filter((e) => e.id !== empleado?.id)
        .map((e) => ({ value: e.id, label: nombreEmpleado(e) })),
    [empleados, empleado?.id],
  );

  const listaAdd = <T,>(key: keyof ExpedienteEmpleado, item: T) =>
    setExp((e) => ({ ...e, [key]: [...(e[key] as T[]), item] }));
  const listaDel = (key: keyof ExpedienteEmpleado, id: string) =>
    setExp((e) => ({
      ...e,
      [key]: (e[key] as { id: string }[]).filter((i) => i.id !== id),
    }));
  const listaSet = (key: keyof ExpedienteEmpleado, id: string, campo: string, valor: unknown) =>
    setExp((e) => ({
      ...e,
      [key]: (e[key] as { id: string }[]).map((i) =>
        i.id === id ? { ...i, [campo]: valor } : i,
      ),
    }));

  const guardar = async () => {
    if (!puedeEditar) {
      toast.error("Solo Recursos Humanos puede crear o editar empleados.");
      return;
    }
    if (!nombres.trim() || !apellidos.trim() || !documento.trim()) {
      toast.error("Nombres, apellidos y documento son obligatorios.");
      return;
    }
    if (!laboral.cargoId || !laboral.areaId || !laboral.centroTrabajoId || !laboral.centroCostoId) {
      toast.error("Complete área, cargo, centro de trabajo y centro de costo (pestaña Laboral).");
      return;
    }
    const duplicado = empleados.some(
      (e) => e.documento === documento.trim() && e.id !== empleado?.id,
    );
    if (duplicado) {
      toast.error("Ya existe un empleado con ese número de documento.");
      return;
    }

    setGuardando(true);
    try {
      const id = empleado?.id ?? nuevoId("emp");
      const registro: EmpleadoRRHH = {
        id,
        nombres: nombres.trim(),
        apellidos: apellidos.trim(),
        documento: documento.trim(),
        estadoLaboral: empleado?.estadoLaboral ?? "activo",
        estado: empleado?.estado ?? "activo",
        accesoHabilitado: acceso,
        laboral,
      };
      const orgRow: EmpleadoOrg = {
        id,
        nombres: registro.nombres,
        apellidos: registro.apellidos,
        documento: registro.documento,
        cargoId: laboral.cargoId,
        areaId: laboral.areaId,
        dependenciaId: laboral.dependenciaId || undefined,
        centroTrabajoId: laboral.centroTrabajoId,
        centroCostoId: laboral.centroCostoId,
        jefeInmediatoId: laboral.jefeInmediatoId || undefined,
        salario: laboral.salario,
        fechaIngreso: laboral.fechaIngreso,
        estado: registro.estado,
      };

      await guardarDoc("empleados_rrhh", registro);
      await guardarDoc("org_empleados", orgRow);
      await guardarDoc("expedientes", { ...exp, empleadoId: id, id }, "id");

      if (!editando) {
        const evento: EventoHojaVida = {
          id: nuevoId("hv"),
          empleadoId: id,
          tipo: "ingreso",
          fecha: laboral.fechaIngreso || hoy(),
          titulo: "Ingreso registrado",
          detalle: `Alta del empleado ${registro.nombres} ${registro.apellidos} por Talento Humano.`,
          registradoPor: actor,
        };
        await guardarDoc("eventos_hoja_vida", evento);
      }

      toast.success(editando ? "Expediente actualizado." : "Empleado creado con su expediente.");
      setAbierto(false);
      if (!editando) {
        setNombres("");
        setApellidos("");
        setDocumento("");
        setLaboral(laboralVacia());
        setExp(expedienteVacio(""));
      }
    } catch (error) {
      console.error("[rrhh] no se pudo guardar el empleado", error);
      toast.error("No se pudo guardar. Verifique su conexión y permisos en Firebase.");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" disabled={!puedeEditar}>
            <UserPlus className="size-4" /> Nuevo empleado
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{editando ? "Editar expediente" : "Nuevo empleado"}</DialogTitle>
          <DialogDescription>
            Registro completo a cargo de Recursos Humanos: datos personales, familiares, académicos,
            bancarios, seguridad social e información laboral.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="basicos">
          <TabsList className="flex-wrap">
            <TabsTrigger value="basicos">Identificación</TabsTrigger>
            <TabsTrigger value="laboral">Laboral</TabsTrigger>
            <TabsTrigger value="familia">Familia y emergencia</TabsTrigger>
            <TabsTrigger value="formacion">Formación y experiencia</TabsTrigger>
            <TabsTrigger value="pagos">Bancarios y seguridad social</TabsTrigger>
          </TabsList>

          {/* --------------------------- Identificación --------------------------- */}
          <TabsContent value="basicos" className="mt-4 grid gap-4 sm:grid-cols-3">
            <Campo label="Nombres *">
              <Input value={nombres} onChange={(e) => setNombres(e.target.value)} />
            </Campo>
            <Campo label="Apellidos *">
              <Input value={apellidos} onChange={(e) => setApellidos(e.target.value)} />
            </Campo>
            <Campo label="Tipo de documento">
              <Opciones
                value={exp.personales.tipoDocumento}
                onChange={(v) => setPers("tipoDocumento", v as "CC")}
                opciones={["CC", "CE", "PA", "PEP", "TI"].map((v) => ({ value: v, label: v }))}
              />
            </Campo>
            <Campo label="Número de documento *">
              <Input value={documento} onChange={(e) => setDocumento(e.target.value)} />
            </Campo>
            <Campo label="Fecha de nacimiento">
              <Input
                type="date"
                value={exp.personales.fechaNacimiento}
                onChange={(e) => setPers("fechaNacimiento", e.target.value)}
              />
            </Campo>
            <Campo label="Lugar de nacimiento">
              <Input
                value={exp.personales.lugarNacimiento}
                onChange={(e) => setPers("lugarNacimiento", e.target.value)}
              />
            </Campo>
            <Campo label="Género">
              <Opciones
                value={exp.personales.genero}
                onChange={(v) => setPers("genero", v as "M")}
                opciones={[
                  { value: "M", label: "Masculino" },
                  { value: "F", label: "Femenino" },
                  { value: "O", label: "Otro" },
                ]}
              />
            </Campo>
            <Campo label="Estado civil">
              <Opciones
                value={exp.personales.estadoCivil}
                onChange={(v) => setPers("estadoCivil", v as "soltero")}
                opciones={[
                  { value: "soltero", label: "Soltero/a" },
                  { value: "casado", label: "Casado/a" },
                  { value: "union_libre", label: "Unión libre" },
                  { value: "separado", label: "Separado/a" },
                  { value: "viudo", label: "Viudo/a" },
                ]}
              />
            </Campo>
            <Campo label="RH">
              <Input value={exp.personales.rh} onChange={(e) => setPers("rh", e.target.value)} />
            </Campo>
            <Campo label="Dirección">
              <Input
                value={exp.personales.direccion}
                onChange={(e) => setPers("direccion", e.target.value)}
              />
            </Campo>
            <Campo label="Ciudad">
              <Input
                value={exp.personales.ciudad}
                onChange={(e) => setPers("ciudad", e.target.value)}
              />
            </Campo>
            <Campo label="Teléfono">
              <Input
                value={exp.personales.telefono}
                onChange={(e) => setPers("telefono", e.target.value)}
              />
            </Campo>
            <Campo label="Celular">
              <Input
                value={exp.personales.celular}
                onChange={(e) => setPers("celular", e.target.value)}
              />
            </Campo>
            <Campo label="Correo personal">
              <Input
                type="email"
                value={exp.personales.emailPersonal}
                onChange={(e) => setPers("emailPersonal", e.target.value)}
              />
            </Campo>
            <div className="flex items-center gap-3 pt-6">
              <Switch checked={acceso} onCheckedChange={setAcceso} id="acceso" />
              <Label htmlFor="acceso">Habilitar acceso al portal</Label>
            </div>
          </TabsContent>

          {/* ------------------------------- Laboral ------------------------------ */}
          <TabsContent value="laboral" className="mt-4 grid gap-4 sm:grid-cols-3">
            <Campo label="Fecha de ingreso">
              <Input
                type="date"
                value={laboral.fechaIngreso}
                onChange={(e) => setLab("fechaIngreso", e.target.value)}
              />
            </Campo>
            <Campo label="Área *">
              <Opciones
                value={laboral.areaId}
                onChange={(v) => setLab("areaId", v)}
                opciones={opcAreas}
              />
            </Campo>
            <Campo label="Dependencia">
              <Opciones
                value={laboral.dependenciaId ?? ""}
                onChange={(v) => setLab("dependenciaId", v)}
                opciones={opcDeps}
                permitirVacio
              />
            </Campo>
            <Campo label="Cargo *">
              <Opciones
                value={laboral.cargoId}
                onChange={(v) => setLab("cargoId", v)}
                opciones={opcCargos}
              />
            </Campo>
            <Campo label="Centro de trabajo *">
              <Opciones
                value={laboral.centroTrabajoId}
                onChange={(v) => setLab("centroTrabajoId", v)}
                opciones={opcCt}
              />
            </Campo>
            <Campo label="Centro de costo *">
              <Opciones
                value={laboral.centroCostoId}
                onChange={(v) => setLab("centroCostoId", v)}
                opciones={opcCc}
              />
            </Campo>
            <Campo label="Jefe inmediato">
              <Opciones
                value={laboral.jefeInmediatoId ?? ""}
                onChange={(v) => setLab("jefeInmediatoId", v)}
                opciones={opcJefes}
                permitirVacio
              />
            </Campo>
            <Campo label="Tipo de contrato">
              <Opciones
                value={laboral.tipoContrato}
                onChange={(v) => setLab("tipoContrato", v as TipoContrato)}
                opciones={Object.entries(TIPO_CONTRATO_LABEL).map(([value, label]) => ({
                  value,
                  label,
                }))}
              />
            </Campo>
            <Campo label="Salario">
              <Input
                type="number"
                value={laboral.salario}
                onChange={(e) => setLab("salario", Number(e.target.value))}
              />
            </Campo>
            <Campo label="Fin de contrato">
              <Input
                type="date"
                value={laboral.fechaFinContrato ?? ""}
                onChange={(e) => setLab("fechaFinContrato", e.target.value)}
              />
            </Campo>
          </TabsContent>

          {/* ------------------------ Familia y emergencia ------------------------ */}
          <TabsContent value="familia" className="mt-4 space-y-6">
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold">Familiares</h4>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    listaAdd<Familiar>("familiares", {
                      id: nuevoId("fam"),
                      nombre: "",
                      parentesco: "hijo",
                      aCargo: false,
                    })
                  }
                >
                  <Plus className="size-4" /> Agregar
                </Button>
              </div>
              {exp.familiares.length === 0 && (
                <p className="text-xs text-muted-foreground">Sin familiares registrados.</p>
              )}
              {exp.familiares.map((f) => (
                <div key={f.id} className="grid gap-3 rounded-lg border border-border p-3 sm:grid-cols-5">
                  <Campo label="Nombre">
                    <Input
                      value={f.nombre}
                      onChange={(e) => listaSet("familiares", f.id, "nombre", e.target.value)}
                    />
                  </Campo>
                  <Campo label="Parentesco">
                    <Opciones
                      value={f.parentesco}
                      onChange={(v) => listaSet("familiares", f.id, "parentesco", v)}
                      opciones={[
                        { value: "conyuge", label: "Cónyuge" },
                        { value: "hijo", label: "Hijo/a" },
                        { value: "padre", label: "Padre" },
                        { value: "madre", label: "Madre" },
                        { value: "hermano", label: "Hermano/a" },
                        { value: "otro", label: "Otro" },
                      ]}
                    />
                  </Campo>
                  <Campo label="Documento">
                    <Input
                      value={f.documento ?? ""}
                      onChange={(e) => listaSet("familiares", f.id, "documento", e.target.value)}
                    />
                  </Campo>
                  <Campo label="Nacimiento">
                    <Input
                      type="date"
                      value={f.fechaNacimiento ?? ""}
                      onChange={(e) =>
                        listaSet("familiares", f.id, "fechaNacimiento", e.target.value)
                      }
                    />
                  </Campo>
                  <div className="flex items-end justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={f.aCargo}
                        onCheckedChange={(v) => listaSet("familiares", f.id, "aCargo", v)}
                      />
                      <span className="text-xs text-muted-foreground">A cargo</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => listaDel("familiares", f.id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </section>

            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold">Contactos de emergencia</h4>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    listaAdd<ContactoEmergencia>("contactosEmergencia", {
                      id: nuevoId("ce"),
                      nombre: "",
                      parentesco: "",
                      telefono: "",
                      principal: exp.contactosEmergencia.length === 0,
                    })
                  }
                >
                  <Plus className="size-4" /> Agregar
                </Button>
              </div>
              {exp.contactosEmergencia.length === 0 && (
                <p className="text-xs text-muted-foreground">Sin contactos registrados.</p>
              )}
              {exp.contactosEmergencia.map((c) => (
                <div key={c.id} className="grid gap-3 rounded-lg border border-border p-3 sm:grid-cols-4">
                  <Campo label="Nombre">
                    <Input
                      value={c.nombre}
                      onChange={(e) =>
                        listaSet("contactosEmergencia", c.id, "nombre", e.target.value)
                      }
                    />
                  </Campo>
                  <Campo label="Parentesco">
                    <Input
                      value={c.parentesco}
                      onChange={(e) =>
                        listaSet("contactosEmergencia", c.id, "parentesco", e.target.value)
                      }
                    />
                  </Campo>
                  <Campo label="Teléfono">
                    <Input
                      value={c.telefono}
                      onChange={(e) =>
                        listaSet("contactosEmergencia", c.id, "telefono", e.target.value)
                      }
                    />
                  </Campo>
                  <div className="flex items-end justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={c.principal}
                        onCheckedChange={(v) =>
                          listaSet("contactosEmergencia", c.id, "principal", v)
                        }
                      />
                      <span className="text-xs text-muted-foreground">Principal</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => listaDel("contactosEmergencia", c.id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </section>
          </TabsContent>

          {/* ----------------------- Formación y experiencia ---------------------- */}
          <TabsContent value="formacion" className="mt-4 space-y-6">
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold">Formación académica</h4>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    listaAdd<DatoAcademico>("academicos", {
                      id: nuevoId("aca"),
                      nivel: "profesional",
                      titulo: "",
                      institucion: "",
                      anioGraduacion: new Date().getFullYear(),
                      certificado: false,
                    })
                  }
                >
                  <Plus className="size-4" /> Agregar
                </Button>
              </div>
              {exp.academicos.length === 0 && (
                <p className="text-xs text-muted-foreground">Sin formación registrada.</p>
              )}
              {exp.academicos.map((a) => (
                <div key={a.id} className="grid gap-3 rounded-lg border border-border p-3 sm:grid-cols-5">
                  <Campo label="Nivel">
                    <Opciones
                      value={a.nivel}
                      onChange={(v) => listaSet("academicos", a.id, "nivel", v)}
                      opciones={[
                        { value: "bachiller", label: "Bachiller" },
                        { value: "tecnico", label: "Técnico" },
                        { value: "tecnologo", label: "Tecnólogo" },
                        { value: "profesional", label: "Profesional" },
                        { value: "especializacion", label: "Especialización" },
                        { value: "maestria", label: "Maestría" },
                        { value: "doctorado", label: "Doctorado" },
                      ]}
                    />
                  </Campo>
                  <Campo label="Título">
                    <Input
                      value={a.titulo}
                      onChange={(e) => listaSet("academicos", a.id, "titulo", e.target.value)}
                    />
                  </Campo>
                  <Campo label="Institución">
                    <Input
                      value={a.institucion}
                      onChange={(e) => listaSet("academicos", a.id, "institucion", e.target.value)}
                    />
                  </Campo>
                  <Campo label="Año">
                    <Input
                      type="number"
                      value={a.anioGraduacion}
                      onChange={(e) =>
                        listaSet("academicos", a.id, "anioGraduacion", Number(e.target.value))
                      }
                    />
                  </Campo>
                  <div className="flex items-end justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={a.certificado}
                        onCheckedChange={(v) => listaSet("academicos", a.id, "certificado", v)}
                      />
                      <span className="text-xs text-muted-foreground">Certificado</span>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => listaDel("academicos", a.id)}>
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </section>

            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold">Experiencia laboral</h4>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    listaAdd<ExperienciaLaboral>("experiencia", {
                      id: nuevoId("exp"),
                      empresa: "",
                      cargo: "",
                      desde: "",
                      hasta: "",
                      verificada: false,
                    })
                  }
                >
                  <Plus className="size-4" /> Agregar
                </Button>
              </div>
              {exp.experiencia.length === 0 && (
                <p className="text-xs text-muted-foreground">Sin experiencia registrada.</p>
              )}
              {exp.experiencia.map((x) => (
                <div key={x.id} className="grid gap-3 rounded-lg border border-border p-3 sm:grid-cols-3">
                  <Campo label="Empresa">
                    <Input
                      value={x.empresa}
                      onChange={(e) => listaSet("experiencia", x.id, "empresa", e.target.value)}
                    />
                  </Campo>
                  <Campo label="Cargo">
                    <Input
                      value={x.cargo}
                      onChange={(e) => listaSet("experiencia", x.id, "cargo", e.target.value)}
                    />
                  </Campo>
                  <div className="grid grid-cols-2 gap-2">
                    <Campo label="Desde">
                      <Input
                        type="date"
                        value={x.desde}
                        onChange={(e) => listaSet("experiencia", x.id, "desde", e.target.value)}
                      />
                    </Campo>
                    <Campo label="Hasta">
                      <Input
                        type="date"
                        value={x.hasta}
                        onChange={(e) => listaSet("experiencia", x.id, "hasta", e.target.value)}
                      />
                    </Campo>
                  </div>
                  <Campo label="Motivo de retiro">
                    <Textarea
                      rows={2}
                      value={x.motivoRetiro ?? ""}
                      onChange={(e) =>
                        listaSet("experiencia", x.id, "motivoRetiro", e.target.value)
                      }
                    />
                  </Campo>
                  <div className="flex items-end justify-between gap-2 sm:col-span-2">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={x.verificada}
                        onCheckedChange={(v) => listaSet("experiencia", x.id, "verificada", v)}
                      />
                      <span className="text-xs text-muted-foreground">Verificada</span>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => listaDel("experiencia", x.id)}>
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </section>
          </TabsContent>

          {/* ---------------------- Bancarios y seguridad social ------------------ */}
          <TabsContent value="pagos" className="mt-4 grid gap-4 sm:grid-cols-3">
            <Campo label="Banco">
              <Input value={exp.bancarios.banco} onChange={(e) => setBanc("banco", e.target.value)} />
            </Campo>
            <Campo label="Tipo de cuenta">
              <Opciones
                value={exp.bancarios.tipoCuenta}
                onChange={(v) => setBanc("tipoCuenta", v as "ahorros")}
                opciones={[
                  { value: "ahorros", label: "Ahorros" },
                  { value: "corriente", label: "Corriente" },
                ]}
              />
            </Campo>
            <Campo label="Número de cuenta">
              <Input
                value={exp.bancarios.numeroCuenta}
                onChange={(e) => setBanc("numeroCuenta", e.target.value)}
              />
            </Campo>
            <Campo label="Titular">
              <Input
                value={exp.bancarios.titular}
                onChange={(e) => setBanc("titular", e.target.value)}
              />
            </Campo>
            <div className="flex items-center gap-3 pt-6">
              <Switch
                checked={exp.bancarios.certificacionAdjunta}
                onCheckedChange={(v) => setBanc("certificacionAdjunta", v)}
              />
              <Label>Certificación bancaria adjunta</Label>
            </div>
            <Campo label="EPS">
              <Input value={exp.seguridadSocial.eps} onChange={(e) => setSs("eps", e.target.value)} />
            </Campo>
            <Campo label="Fondo de pensiones (AFP)">
              <Input value={exp.seguridadSocial.afp} onChange={(e) => setSs("afp", e.target.value)} />
            </Campo>
            <Campo label="Cesantías">
              <Input
                value={exp.seguridadSocial.cesantias}
                onChange={(e) => setSs("cesantias", e.target.value)}
              />
            </Campo>
            <Campo label="ARL">
              <Input value={exp.seguridadSocial.arl} onChange={(e) => setSs("arl", e.target.value)} />
            </Campo>
            <Campo label="Caja de compensación">
              <Input
                value={exp.seguridadSocial.cajaCompensacion}
                onChange={(e) => setSs("cajaCompensacion", e.target.value)}
              />
            </Campo>
            <Campo label="Clase de riesgo">
              <Opciones
                value={exp.seguridadSocial.claseRiesgo}
                onChange={(v) => setSs("claseRiesgo", v as "I")}
                opciones={["I", "II", "III", "IV", "V"].map((v) => ({
                  value: v,
                  label: `Clase ${v}`,
                }))}
              />
            </Campo>
            <Campo label="Afiliado desde">
              <Input
                type="date"
                value={exp.seguridadSocial.afiliadoDesde}
                onChange={(e) => setSs("afiliadoDesde", e.target.value)}
              />
            </Campo>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => setAbierto(false)}>
            Cancelar
          </Button>
          <Button onClick={guardar} disabled={guardando}>
            {guardando ? "Guardando…" : editando ? "Guardar expediente" : "Crear empleado"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
