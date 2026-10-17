/**
 * Alertas de cumplimiento: vencimientos de contratos, documentos del
 * expediente, exámenes médicos ocupacionales, dotación pendiente, licencias en
 * curso y retención documental.
 */

import { useMemo } from "react";
import { useRrhh } from "@/store/rrhh";
import { usePortal } from "@/store/portal";
import { useSst } from "@/store/sst";
import { useOperaciones } from "@/store/operaciones";
import { EMPRESA } from "@/lib/empresa";
import { ultimaVersion } from "@/lib/documentos";
import { nombreEmpleado, type EmpleadoRRHH } from "@/types/rrhh";
import { EXPEDIENTES } from "@/data/rrhh";
import {
  aniversarioDelMes,
  diasRestantesPrueba,
  esCumpleaniosDelMes,
  esVinculado,
  mesesSinVacaciones,
} from "@/lib/rrhh";
import { TIPO_EXAMEN_LABEL } from "@/types/sst";
import { TIPO_SOLICITUD_LABEL } from "@/types/operaciones";

export type TipoAlerta =
  | "contrato"
  | "documento"
  | "examen"
  | "dotacion"
  | "licencia"
  | "retencion"
  | "vacaciones"
  | "periodo_prueba"
  | "cumpleanos"
  | "aniversario";

export const TIPO_ALERTA_LABEL: Record<TipoAlerta, string> = {
  contrato: "Contrato",
  documento: "Documento del expediente",
  examen: "Examen ocupacional",
  dotacion: "Dotación",
  licencia: "Licencia o permiso",
  retencion: "Retención documental",
  vacaciones: "Vacaciones acumuladas",
  periodo_prueba: "Periodo de prueba",
  cumpleanos: "Cumpleaños",
  aniversario: "Aniversario de ingreso",
};

export type NivelAlerta = "vencido" | "por_vencer" | "informativo";

export interface AlertaCumplimiento {
  id: string;
  tipo: TipoAlerta;
  nivel: NivelAlerta;
  titulo: string;
  detalle: string;
  empleadoId: string;
  empleadoNombre: string;
  fecha: string;
  /** Días restantes (negativo = vencido). */
  dias: number | null;
  ruta: string;
}

const HOY = () => new Date(new Date().toISOString().slice(0, 10) + "T00:00:00Z");

const diasHasta = (iso: string, hoy = HOY()) =>
  Math.ceil((new Date(`${iso}T00:00:00Z`).getTime() - hoy.getTime()) / 86_400_000);

const nivelPor = (dias: number, umbral: number): NivelAlerta =>
  dias < 0 ? "vencido" : dias <= umbral ? "por_vencer" : "informativo";

/** Todas las alertas de cumplimiento, ordenadas por urgencia. */
export function useAlertasCumplimiento(): AlertaCumplimiento[] {
  const { empleados } = useRrhh();
  const { documentos } = usePortal();
  const { examenes, entregas } = useSst();
  const { solicitudes } = useOperaciones();

  return useMemo(() => {
    const umbral = EMPRESA.diasAlertaVencimiento;
    const hoy = HOY();
    const porId = new Map<string, EmpleadoRRHH>(empleados.map((e) => [e.id, e]));
    const nombre = (id: string) => {
      const e = porId.get(id);
      return e ? nombreEmpleado(e) : id;
    };
    const alertas: AlertaCumplimiento[] = [];

    // Contratos a término con fecha de finalización próxima.
    for (const e of empleados) {
      const fin = e.laboral?.fechaFinContrato;
      if (!fin || e.estadoLaboral === "retirado") continue;
      const dias = diasHasta(fin, hoy);
      if (dias > umbral) continue;
      alertas.push({
        id: `contrato-${e.id}`,
        tipo: "contrato",
        nivel: nivelPor(dias, umbral),
        titulo: dias < 0 ? "Contrato vencido sin novedad registrada" : "Contrato próximo a finalizar",
        detalle: `Finaliza el ${fin}. Debe decidirse prórroga, renovación o preaviso de terminación.`,
        empleadoId: e.id,
        empleadoNombre: nombreEmpleado(e),
        fecha: fin,
        dias,
        ruta: "/empleados",
      });
    }

    // Documentos del expediente con vigencia.
    for (const d of documentos) {
      if (!d.fechaVencimiento) continue;
      const dias = diasHasta(d.fechaVencimiento, hoy);
      if (dias > umbral) continue;
      alertas.push({
        id: `documento-${d.id}`,
        tipo: "documento",
        nivel: nivelPor(dias, umbral),
        titulo: dias < 0 ? `Documento vencido: ${d.nombre}` : `Documento por vencer: ${d.nombre}`,
        detalle: `Vence el ${d.fechaVencimiento}. Cargue una nueva versión para mantener el expediente al día.`,
        empleadoId: d.empleadoId,
        empleadoNombre: nombre(d.empleadoId),
        fecha: d.fechaVencimiento,
        dias,
        ruta: "/documentos",
      });
    }

    // Exámenes médicos ocupacionales.
    for (const x of examenes) {
      const vence = x.vigenciaHasta;
      if (vence) {
        const dias = diasHasta(vence, hoy);
        if (dias <= umbral) {
          alertas.push({
            id: `examen-${x.id}`,
            tipo: "examen",
            nivel: nivelPor(dias, umbral),
            titulo: `${TIPO_EXAMEN_LABEL[x.tipo]} ${dias < 0 ? "vencido" : "por vencer"}`,
            detalle: `Vigencia hasta ${vence} · Entidad: ${x.entidad}. Programe la valoración periódica.`,
            empleadoId: x.empleadoId,
            empleadoNombre: nombre(x.empleadoId),
            fecha: vence,
            dias,
            ruta: "/sst",
          });
        }
        continue;
      }
      if (!x.fechaRealizada) {
        const dias = diasHasta(x.fechaProgramada, hoy);
        if (dias <= umbral) {
          alertas.push({
            id: `examen-prog-${x.id}`,
            tipo: "examen",
            nivel: nivelPor(dias, umbral),
            titulo: `${TIPO_EXAMEN_LABEL[x.tipo]} sin realizar`,
            detalle: `Programado para ${x.fechaProgramada} en ${x.entidad}. Sin registro de realización ni concepto.`,
            empleadoId: x.empleadoId,
            empleadoNombre: nombre(x.empleadoId),
            fecha: x.fechaProgramada,
            dias,
            ruta: "/sst",
          });
        }
      }
    }

    // Dotación entregada sin acta de aceptación firmada.
    for (const en of entregas) {
      if (en.aceptacion?.aceptado) continue;
      const dias = diasHasta(en.fecha, hoy);
      alertas.push({
        id: `dotacion-${en.id}`,
        tipo: "dotacion",
        nivel: dias < -15 ? "vencido" : "por_vencer",
        titulo: `Entrega de dotación sin aceptación (${en.consecutivo})`,
        detalle: `Entregada el ${en.fecha} por ${en.entregadoPor}. Falta la aceptación digital del trabajador (Art. 230 CST).`,
        empleadoId: en.empleadoId,
        empleadoNombre: nombre(en.empleadoId),
        fecha: en.fecha,
        dias,
        ruta: "/dotacion",
      });
    }

    // Licencias, permisos y vacaciones en curso que terminan pronto.
    for (const s of solicitudes) {
      if (s.estado !== "aprobada") continue;
      const dias = diasHasta(s.hasta, hoy);
      if (dias < 0 || dias > 15) continue;
      alertas.push({
        id: `licencia-${s.id}`,
        tipo: "licencia",
        nivel: "por_vencer",
        titulo: `${TIPO_SOLICITUD_LABEL[s.tipo]} finaliza pronto`,
        detalle: `${s.consecutivo} · del ${s.desde} al ${s.hasta} (${s.dias} días). Confirme el reintegro.`,
        empleadoId: s.empleadoId,
        empleadoNombre: nombre(s.empleadoId),
        fecha: s.hasta,
        dias,
        ruta: "/ausencias",
      });
    }

    // Vacaciones acumuladas: más de 11 meses sin descanso (art. 186 CST).
    for (const e of empleados) {
      if (!esVinculado(e)) continue;
      const meses = mesesSinVacaciones(e, solicitudes);
      if (meses < 11) continue;
      alertas.push({
        id: `vacaciones-${e.id}`,
        tipo: "vacaciones",
        nivel: meses >= 14 ? "vencido" : "por_vencer",
        titulo: `${meses} meses sin vacaciones`,
        detalle: "Art. 186 CST: 15 días hábiles de descanso por cada año de servicio. Programe las vacaciones.",
        empleadoId: e.id,
        empleadoNombre: nombreEmpleado(e),
        fecha: e.laboral?.fechaIngreso ?? "",
        dias: null,
        ruta: "/ausencias",
      });
    }

    // Periodo de prueba próximo a vencer (contratos nuevos).
    for (const e of empleados) {
      if (!esVinculado(e)) continue;
      const dias = diasRestantesPrueba(e);
      if (dias === null || dias < 0 || dias > 15) continue;
      alertas.push({
        id: `prueba-${e.id}`,
        tipo: "periodo_prueba",
        nivel: dias <= 5 ? "por_vencer" : "informativo",
        titulo: "Periodo de prueba por vencer",
        detalle: `Quedan ${dias} días. Confirme la continuidad o tome la decisión antes del vencimiento.`,
        empleadoId: e.id,
        empleadoNombre: nombreEmpleado(e),
        fecha: e.laboral?.fechaIngreso ?? "",
        dias,
        ruta: "/empleados",
      });
    }

    // Cumpleaños y aniversarios de ingreso del mes en curso.
    const mesActual = new Date().getMonth() + 1;
    for (const e of empleados) {
      if (!esVinculado(e)) continue;
      if (esCumpleaniosDelMes(EXPEDIENTES[e.id]?.personales?.fechaNacimiento)) {
        alertas.push({
          id: `cumple-${e.id}`,
          tipo: "cumpleanos",
          nivel: "informativo",
          titulo: "Cumpleaños este mes",
          detalle: `Nació el ${EXPEDIENTES[e.id]?.personales?.fechaNacimiento}.`,
          empleadoId: e.id,
          empleadoNombre: nombreEmpleado(e),
          fecha: `${new Date().getFullYear()}-${String(mesActual).padStart(2, "0")}-01`,
          dias: null,
          ruta: "/empleados",
        });
      }
      const anios = aniversarioDelMes(e.laboral?.fechaIngreso);
      if (anios) {
        alertas.push({
          id: `aniv-${e.id}`,
          tipo: "aniversario",
          nivel: "informativo",
          titulo: `${anios} año${anios === 1 ? "" : "s"} en la empresa`,
          detalle: `Ingresó el ${e.laboral?.fechaIngreso}. Aniversario este mes.`,
          empleadoId: e.id,
          empleadoNombre: nombreEmpleado(e),
          fecha: e.laboral?.fechaIngreso ?? "",
          dias: null,
          ruta: "/empleados",
        });
      }
    }

    // Retención documental: expedientes que superan el tiempo de conservación.
    const limite = new Date(hoy);
    limite.setFullYear(limite.getFullYear() - EMPRESA.retencionAnios);
    for (const d of documentos) {
      const v = ultimaVersion(d);
      if (!v?.fecha) continue;
      const emp = porId.get(d.empleadoId);
      if (!emp || emp.estadoLaboral !== "retirado") continue;
      if (new Date(`${v.fecha}T00:00:00Z`) > limite) continue;
      alertas.push({
        id: `retencion-${d.id}`,
        tipo: "retencion",
        nivel: "informativo",
        titulo: `Documento supera la retención de ${EMPRESA.retencionAnios} años`,
        detalle: `${d.nombre} · última versión del ${v.fecha}. Evalúe transferencia al archivo histórico según la tabla de retención documental.`,
        empleadoId: d.empleadoId,
        empleadoNombre: nombre(d.empleadoId),
        fecha: v.fecha,
        dias: null,
        ruta: "/documentos",
      });
    }

    const orden: Record<NivelAlerta, number> = { vencido: 0, por_vencer: 1, informativo: 2 };
    return alertas.sort(
      (a, b) => orden[a.nivel] - orden[b.nivel] || (a.dias ?? 9999) - (b.dias ?? 9999),
    );
  }, [empleados, documentos, examenes, entregas, solicitudes]);
}
