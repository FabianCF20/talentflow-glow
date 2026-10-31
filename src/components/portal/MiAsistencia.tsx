import { useState } from "react";
import { CheckCircle2, Clock3, LogIn, LogOut, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { useOperaciones } from "@/store/operaciones";
import { fechaBogota, horaDesdeRegistro } from "@/lib/operaciones";
import type { UbicacionMarcacion } from "@/types/operaciones";

function obtenerUbicacion(): Promise<UbicacionMarcacion> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Este dispositivo o navegador no ofrece geolocalización."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve({
        latitud: coords.latitude,
        longitud: coords.longitude,
        precisionMetros: coords.accuracy,
      }),
      (error) => reject(new Error(
        error.code === error.PERMISSION_DENIED ? "Debes permitir el acceso a la ubicación para registrar asistencia."
          : error.code === error.TIMEOUT ? "No se obtuvo la ubicación a tiempo. Intenta nuevamente."
          : "No fue posible obtener tu ubicación."
      )),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 },
    );
  });
}

export function MiAsistencia() {
  const { perfil } = useAuth();
  const op = useOperaciones();
  const empleadoId = perfil?.empleadoId ?? "";
  const fecha = fechaBogota();
  const registro = op.asistencia.find((r) => r.empleadoId === empleadoId && r.fecha === fecha);
  const tieneIngreso = Boolean(registro?.ingresoRegistradoEn || registro?.horaIngreso);
  const tieneSalida = Boolean(registro?.salidaRegistradaEn || registro?.horaSalida);
  const [procesando, setProcesando] = useState(false);

  const marcar = async (tipo: "ingreso" | "salida") => {
    if (!empleadoId || procesando) return;
    setProcesando(true);
    try {
      const ubicacion = await obtenerUbicacion();
      if (tipo === "ingreso") await op.registrarIngreso({ empleadoId, fecha, ubicacion });
      else await op.registrarSalida({ empleadoId, fecha, ubicacion });
      toast.success(tipo === "ingreso" ? "Ingreso registrado correctamente." : "Salida registrada correctamente.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No fue posible registrar la marcación.");
    } finally {
      setProcesando(false);
    }
  };

  if (!empleadoId) return null;
  return <section className="surface-panel space-y-4 p-5">
    <div><h3 className="font-semibold text-foreground">Mi asistencia de hoy</h3>
      <p className="mt-1 text-sm text-muted-foreground">Registra tu ingreso y salida desde este portal. La aplicación solicitará tu ubicación GPS en cada marcación.</p></div>
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="rounded-md border border-border p-3"><p className="text-xs text-muted-foreground">Ingreso</p><p className="mt-1 text-lg font-semibold">{tieneIngreso ? horaDesdeRegistro(registro?.ingresoRegistradoEn) === "—" ? registro?.horaIngreso : horaDesdeRegistro(registro?.ingresoRegistradoEn) : "Sin registrar"}</p></div>
      <div className="rounded-md border border-border p-3"><p className="text-xs text-muted-foreground">Salida</p><p className="mt-1 text-lg font-semibold">{tieneSalida ? horaDesdeRegistro(registro?.salidaRegistradaEn) === "—" ? registro?.horaSalida : horaDesdeRegistro(registro?.salidaRegistradaEn) : "Sin registrar"}</p></div>
    </div>
    <div className="flex flex-wrap gap-2">
      <Button disabled={procesando || tieneIngreso} onClick={() => void marcar("ingreso")}>{procesando ? <Clock3 className="mr-2 size-4 animate-spin" /> : <LogIn className="mr-2 size-4" />} Registrar ingreso</Button>
      <Button variant="outline" disabled={procesando || !tieneIngreso || tieneSalida} onClick={() => void marcar("salida")}>{procesando ? <Clock3 className="mr-2 size-4 animate-spin" /> : <LogOut className="mr-2 size-4" />} Registrar salida</Button>
    </div>
    <p className="flex items-center gap-2 text-xs text-muted-foreground"><MapPin className="size-3.5" /> GPS requerido · Precisión reportada por el dispositivo.</p>
    {registro?.estadoValidacion && <p className="flex items-center gap-2 text-sm"><CheckCircle2 className="size-4" /> Estado: {registro.estadoValidacion === "validada" ? "Validada por tu superior" : registro.estadoValidacion === "observada" ? "Observada; consulta a tu superior" : "Pendiente de validación"}</p>}
    {registro?.observacionValidacion && <p className="rounded-md bg-muted p-3 text-sm">Observación: {registro.observacionValidacion}</p>}
  </section>;
}
