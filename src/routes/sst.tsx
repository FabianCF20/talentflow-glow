/**
 * Pantalla: Exámenes médicos, accidentes, capacitaciones e indicadores SST.
 * Ruta: /sst
 */
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  HardHat,
  Stethoscope,
  AlertTriangle,
  GraduationCap,
  Activity,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { DataTable, type Column } from "@/components/common/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ConceptoBadge,
  GravedadBadge,
  InvestigacionBadge,
  VigenciaExamenBadge,
  BarraDistribucion,
} from "@/components/sst/SstBadges";
import { useRrhh } from "@/store/rrhh";
import { useSst } from "@/store/sst";
import { calcularIndicadores, diasHasta, hoyISO, puedeGestionarSST } from "@/lib/sst";
import { downloadCsv } from "@/lib/export";
import { centroTrabajoById } from "@/data/organizacion";
import { nombreEmpleado, ESTADOS_VINCULADOS } from "@/types/rrhh";
import {
  CONCEPTO_LABEL,
  ESTADO_INVESTIGACION_LABEL,
  GRAVEDAD_LABEL,
  MODALIDAD_LABEL,
  TIPO_EVENTO_SST_LABEL,
  TIPO_EXAMEN_LABEL,
  type AccidenteLaboral,
  type CapacitacionSST,
  type ConceptoMedico,
  type EstadoInvestigacion,
  type ExamenMedico,
  type GravedadSST,
  type ModalidadCapacitacion,
  type TipoEventoSST,
  type TipoExamen,
} from "@/types/sst";
import { ExamenesTab } from "@/components/sst/ExamenesTab";
import { AccidentesTab } from "@/components/sst/AccidentesTab";
import { CapacitacionesTab } from "@/components/sst/CapacitacionesTab";
import { IndicadoresTab } from "@/components/sst/IndicadoresTab";

export const Route = createFileRoute("/sst")({
  head: () => ({
    meta: [
      { title: "SST — Seguridad y Salud en el Trabajo | SIGTH" },
      {
        name: "description",
        content:
          "Exámenes médicos ocupacionales, accidentalidad laboral, capacitaciones e indicadores del SG-SST con trazabilidad completa.",
      },
      { property: "og:title", content: "SST — Seguridad y Salud en el Trabajo | SIGTH" },
      {
        property: "og:description",
        content:
          "Gestión del SG-SST: exámenes, accidentes e incidentes, capacitaciones e indicadores de frecuencia y severidad.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SstPage,
});

function SstPage() {
  const { empleados, rolActivo } = useRrhh();
  const sst = useSst();
  const gestiona = puedeGestionarSST(rolActivo);

  const vinculados = useMemo(
    () => empleados.filter((e) => ESTADOS_VINCULADOS.includes(e.estadoLaboral)),
    [empleados],
  );
  const nombrePor = useMemo(
    () => Object.fromEntries(empleados.map((e) => [e.id, nombreEmpleado(e)])) as Record<string, string>,
    [empleados],
  );

  const indicadores = useMemo(
    () =>
      calcularIndicadores(sst.accidentes, sst.capacitaciones, sst.examenes, vinculados.length),
    [sst.accidentes, sst.capacitaciones, sst.examenes, vinculados.length],
  );

  return (
    <AppShell>
      <PageHeader
        breadcrumb={["Operación", "SST"]}
        title="Seguridad y Salud en el Trabajo"
        description="Módulo base y escalable del SG-SST: exámenes médicos ocupacionales, accidentes e incidentes laborales, capacitaciones e indicadores de gestión."
        actions={
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              downloadCsv(
                `indicadores-sst-${hoyISO()}.csv`,
                ["Indicador", "Valor"],
                [
                  ["Accidentes de trabajo", indicadores.accidentes],
                  ["Incidentes", indicadores.incidentes],
                  ["Enfermedades laborales", indicadores.enfermedades],
                  ["Días perdidos", indicadores.diasPerdidos],
                  ["Índice de frecuencia", indicadores.frecuencia],
                  ["Índice de severidad", indicadores.severidad],
                  ["ILI", indicadores.ili],
                  ["Cobertura capacitación (%)", indicadores.coberturaCapacitacion],
                  ["Exámenes vigentes", indicadores.examenesVigentes],
                  ["Exámenes pendientes", indicadores.examenesPendientes],
                ],
              )
            }
          >
            Exportar indicadores
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Eventos registrados" value={String(indicadores.totalEventos)} icon={ShieldAlert} hint={`${indicadores.investigacionesAbiertas} en investigación`} />
        <StatCard label="Días perdidos" value={String(indicadores.diasPerdidos)} icon={AlertTriangle} hint="Incapacidades por eventos SST" />
        <StatCard label="Cobertura capacitación" value={`${indicadores.coberturaCapacitacion}%`} icon={GraduationCap} hint={`${indicadores.horasCapacitacion} horas hombre`} />
        <StatCard label="Exámenes vigentes" value={String(indicadores.examenesVigentes)} icon={Stethoscope} hint={`${indicadores.examenesPorVencer} por vencer`} />
      </div>

      <Tabs defaultValue="examenes" className="space-y-4">
        <TabsList className="flex w-full flex-wrap justify-start">
          <TabsTrigger value="examenes">Exámenes médicos</TabsTrigger>
          <TabsTrigger value="accidentes">Accidentes laborales</TabsTrigger>
          <TabsTrigger value="capacitaciones">Capacitaciones</TabsTrigger>
          <TabsTrigger value="indicadores">Indicadores</TabsTrigger>
        </TabsList>

        <TabsContent value="examenes">
          <ExamenesTab gestiona={gestiona} nombrePor={nombrePor} vinculados={vinculados.map((e) => e.id)} />
        </TabsContent>
        <TabsContent value="accidentes">
          <AccidentesTab gestiona={gestiona} nombrePor={nombrePor} vinculados={vinculados.map((e) => e.id)} />
        </TabsContent>
        <TabsContent value="capacitaciones">
          <CapacitacionesTab gestiona={gestiona} nombrePor={nombrePor} vinculados={vinculados.map((e) => e.id)} />
        </TabsContent>
        <TabsContent value="indicadores">
          <IndicadoresTab indicadores={indicadores} />
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}

/* ------------------------------- Exámenes ------------------------------- */
