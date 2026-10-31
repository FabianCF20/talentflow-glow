import { useEffect, useState } from "react";
import { doc, getDoc, onSnapshot, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { MapPin, LogIn, LogOut, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth";

type PuntoGps = {
  latitud: number;
  longitud: number;
  precisionMetros: number;
  marcadoEn: { toDate: () => Date } | null;
};

type RegistroDia = {
  id: string;
  empleadoId: string;
  fecha: string;
  ingreso?: PuntoGps;
  salida?: PuntoGps;
  validacion?: {
    estado: "pendiente" | "validada" | "observada";
    usuarioUid?: string;
    fecha?: { toDate: () => Date };
    observacion?: string;
  };
};

const fechaBogota = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

const horaBogota = (punto?: PuntoGps) => {
  const fecha = punto?.marcadoEn?.toDate();
  return fecha
    ? fecha.toLocaleTimeString("es-CO", {
        timeZone: "America/Bogota",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : "Pendiente de sincronización";
};

function obtenerGps(): Promise<{ latitud: number; longitud: number; precisionMetros: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Este dispositivo o navegador no permite obtener ubicación GPS."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) =>
        resolve({
          latitud: coords.latitude,
          longitud: coords.longitude,
          precisionMetros: coords.accuracy,
        }),
      (error) => {
        const mensaje =
          error.code === error.PERMISSION_DENIED
            ? "Debes permitir el acceso a la ubicación para registrar asistencia."
            : error.code === error.TIMEOUT
              ? "No fue posible obtener GPS a tiempo. Intenta nuevamente en un lugar abierto."
              : "No se pudo obtener la ubicación GPS.";
        reject(new Error(mensaje));
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
    );
  });
}

export function MarcacionAsistencia() {
  const { perfil } = useAuth();
  const empleadoId = perfil?.empleadoId ?? "";
  const [fecha] = useState(fechaBogota);
  const [registro, setRegistro] = useState<RegistroDia | null>(null);
  const [cargando, setCargando] = useState(true);
  const [marcando, setMarcando] = useState(false);

  useEffect(() => {
    if (!empleadoId) {
      setRegistro(null);
      setCargando(false);
      return;
    }
    const id = `${empleadoId}_${fecha}`;
    return onSnapshot(
      doc(db, "op_asistencia", id),
      (snap) => {
        setRegistro(snap.exists() ? ({ ...snap.data(), id: snap.id } as RegistroDia) : null);
        setCargando(false);
      },
      (error) => {
        console.error("[asistencia] No se pudo consultar el registro", error);
        toast.error("No fue posible consultar tu asistencia.");
        setCargando(false);
      },
    );
  }, [empleadoId, fecha]);

  const marcar = async (tipo: "ingreso" | "salida") => {
    if (!empleadoId || marcando) return;
    setMarcando(true);
    try {
      const gps = await obtenerGps();
      const id = `${empleadoId}_${fecha}`;
      const referencia = doc(db, "op_asistencia", id);
      const actual = await getDoc(referencia);
      const punto = { ...gps, marcadoEn: serverTimestamp() };

      if (tipo === "ingreso") {
        if (actual.exists()) {
          throw new Error("Ya existe un registro de asistencia para hoy. Si hay un error, solicita revisión a tu superior.");
        }
        await setDoc(referencia, {
          id,
          empleadoId,
          fecha,
          ingreso: punto,
          validacion: { estado: "pendiente" },
        });
        toast.success("Ingreso registrado con hora del servidor y ubicación GPS.");
      } else {
        if (!actual.exists() || !actual.data().ingreso) {
          throw new Error("Primero debes registrar tu ingreso.");
        }
        if (actual.data().salida) {
          throw new Error("La salida de hoy ya fue registrada.");
        }
        await updateDoc(referencia, { salida: punto });
        toast.success("Salida registrada con hora del servidor y ubicación GPS.");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo registrar la asistencia.");
    } finally {
      setMarcando(false);
    }
  };

  if (!empleadoId) {
    return (
      <div className="rounded-lg border border-border p-4 text-sm text-muted-foreground">
        Tu cuenta aún no está vinculada a una ficha de empleado. Contacta a Talento Humano.
      </div>
    );
  }

  const estado = registro?.validacion?.estado ?? "pendiente";
  const etiquetaEstado =
    estado === "validada" ? "Validada por tu superior" :
    estado === "observada" ? "Requiere revisión" : "Pendiente de validación";

  return (
    <section className="space-y-4 rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold text-foreground">Mi asistencia de hoy</h3>
          <p className="text-sm text-muted-foreground">{fecha} · Hora oficial de Colombia</p>
        </div>
        <span className="rounded-full border border-border bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
          {etiquetaEstado}
        </span>
      </div>

      {cargando ? (
        <p className="text-sm text-muted-foreground">Consultando registro…</p>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground">Ingreso</p>
              <p className="mt-1 flex items-center gap-2 font-semibold">
                <LogIn className="size-4 text-emerald-600" />
                {registro?.ingreso ? horaBogota(registro.ingreso) : "Sin registrar"}
              </p>
              {registro?.ingreso && (
                <p className="mt-1 text-xs text-muted-foreground">
                  GPS: precisión ±{Math.round(registro.ingreso.precisionMetros)} m
                </p>
              )}
            </div>
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground">Salida</p>
              <p className="mt-1 flex items-center gap-2 font-semibold">
                <LogOut className="size-4 text-primary" />
                {registro?.salida ? horaBogota(registro.salida) : "Sin registrar"}
              </p>
              {registro?.salida && (
                <p className="mt-1 text-xs text-muted-foreground">
                  GPS: precisión ±{Math.round(registro.salida.precisionMetros)} m
                </p>
              )}
            </div>
          </div>

          {registro?.validacion?.observacion && (
            <p className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
              Observación del superior: {registro.validacion.observacion}
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <Button onClick={() => void marcar("ingreso")} disabled={marcando || !!registro}>
              <LogIn className="mr-2 size-4" />
              Registrar ingreso
            </Button>
            <Button
              variant="outline"
              onClick={() => void marcar("salida")}
              disabled={marcando || !registro?.ingreso || !!registro.salida}
            >
              <LogOut className="mr-2 size-4" />
              Registrar salida
            </Button>
          </div>
          <p className="flex items-start gap-2 text-xs text-muted-foreground">
            <MapPin className="mt-0.5 size-3.5 shrink-0" />
            La ubicación es obligatoria. La hora se guarda con sello de tiempo del servidor; la precisión GPS queda visible para revisión.
          </p>
          <p className="flex items-start gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="mt-0.5 size-3.5 shrink-0" />
            Después de marcar, no podrás editar la hora ni las coordenadas. Cualquier corrección debe solicitarse al superior.
          </p>
        </>
      )}
    </section>
  );
}
