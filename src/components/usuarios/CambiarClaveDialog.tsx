/**
 * Diálogo de cambio de contraseña.
 * - Sin `cuenta`: el usuario cambia su propia clave (pide la clave actual).
 * - Con `cuenta`: el Administrador fija una nueva clave a otra persona.
 */
import { useState } from "react";
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from "firebase/auth";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { auth } from "@/lib/firebase";
import { cambiarClaveComoAdmin } from "@/lib/claves.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/** Traduce los errores habituales de Firebase a mensajes en español. */
function mensaje(error: unknown): string {
  const code = (error as { code?: string })?.code ?? "";
  if (code.includes("wrong-password") || code.includes("invalid-credential")) return "La contraseña actual no es correcta.";
  if (code.includes("weak-password")) return "La contraseña debe tener al menos 6 caracteres.";
  if (code.includes("too-many-requests")) return "Demasiados intentos. Espere unos minutos.";
  return (error as Error)?.message ?? "No se pudo cambiar la contraseña.";
}

export function CambiarClaveDialog({
  open,
  onOpenChange,
  cuenta,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  cuenta?: { uid: string; email: string } | null;
}) {
  const [actual, setActual] = useState("");
  const [nueva, setNueva] = useState("");
  const [confirma, setConfirma] = useState("");
  const [guardando, setGuardando] = useState(false);
  const esAdmin = !!cuenta;

  const cerrar = (v: boolean) => {
    if (!v) {
      setActual("");
      setNueva("");
      setConfirma("");
    }
    onOpenChange(v);
  };

  const guardar = async () => {
    if (nueva.length < 6) return toast.error("La contraseña debe tener al menos 6 caracteres.");
    if (nueva !== confirma) return toast.error("Las contraseñas no coinciden.");
    const usuario = auth.currentUser;
    if (!usuario) return toast.error("Su sesión expiró. Vuelva a iniciar sesión.");
    setGuardando(true);
    try {
      if (esAdmin) {
        const idToken = await usuario.getIdToken(true);
        await cambiarClaveComoAdmin({ data: { idToken, uid: cuenta!.uid, password: nueva } });
        toast.success(`Contraseña actualizada para ${cuenta!.email}.`);
      } else {
        if (!actual) return toast.error("Escriba su contraseña actual.");
        const cred = EmailAuthProvider.credential(usuario.email ?? "", actual);
        await reauthenticateWithCredential(usuario, cred);
        await updatePassword(usuario, nueva);
        toast.success("Su contraseña fue actualizada.");
      }
      cerrar(false);
    } catch (error) {
      console.error("[clave] no se pudo cambiar", error);
      toast.error(mensaje(error));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={cerrar}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{esAdmin ? "Cambiar contraseña del usuario" : "Cambiar mi contraseña"}</DialogTitle>
          <DialogDescription>
            {esAdmin ? `Nueva contraseña para ${cuenta!.email}.` : "Por seguridad, confirme su contraseña actual."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {!esAdmin && (
            <div className="space-y-1.5">
              <Label htmlFor="clave-actual">Contraseña actual</Label>
              <Input id="clave-actual" type="password" autoComplete="current-password" value={actual} onChange={(e) => setActual(e.target.value)} />
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="clave-nueva">Nueva contraseña</Label>
            <Input id="clave-nueva" type="password" autoComplete="new-password" value={nueva} onChange={(e) => setNueva(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="clave-confirma">Confirmar nueva contraseña</Label>
            <Input id="clave-confirma" type="password" autoComplete="new-password" value={confirma} onChange={(e) => setConfirma(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => cerrar(false)}>Cancelar</Button>
          <Button onClick={guardar} disabled={guardando}>
            {guardando && <Loader2 className="size-4 animate-spin" />} Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
