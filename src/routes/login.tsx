import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ShieldCheck, LogIn, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { mensajeAuth, useAuth } from "@/lib/auth";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Iniciar sesión | SIGTH" },
      {
        name: "description",
        content: "Acceso seguro a SIGTH, el sistema integral de gestión de talento humano.",
      },
      { property: "og:title", content: "Iniciar sesión | SIGTH" },
      { property: "og:description", content: "Acceso seguro para colaboradores y administradores." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Login,
});

type Modo = "ingresar" | "registrar";

function Login() {
  const navigate = useNavigate();
  const { usuario, cargando, ingresar, registrar, recuperarClave } = useAuth();
  const [modo, setModo] = useState<Modo>("ingresar");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nombres, setNombres] = useState("");
  const [apellidos, setApellidos] = useState("");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (!cargando && usuario) void navigate({ to: "/" });
  }, [cargando, usuario, navigate]);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnviando(true);
    try {
      if (modo === "ingresar") {
        await ingresar(email, password);
        toast.success("Sesión iniciada");
      } else {
        await registrar({ email, password, nombres, apellidos });
        toast.success("Cuenta creada", { description: "Bienvenido a SIGTH." });
      }
      await navigate({ to: "/" });
    } catch (error) {
      toast.error(mensajeAuth(error));
    } finally {
      setEnviando(false);
    }
  };

  const recuperar = async () => {
    if (!email) {
      toast.error("Escriba su correo para enviarle el enlace de recuperación.");
      return;
    }
    try {
      await recuperarClave(email);
      toast.success("Enlace enviado", { description: "Revise su correo electrónico." });
    } catch (error) {
      toast.error(mensajeAuth(error));
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between bg-sidebar p-10 text-sidebar-foreground lg:flex">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-md bg-sidebar-primary font-display font-bold text-sidebar-primary-foreground">
            SG
          </span>
          <div>
            <p className="font-display text-base font-bold tracking-wide">SIGTH</p>
            <p className="text-xs text-sidebar-foreground/60">
              Sistema Integral de Gestión de Talento Humano
            </p>
          </div>
        </div>
        <div className="max-w-md space-y-4">
          <h1 className="font-display text-3xl font-semibold leading-tight">
            Toda la gestión del talento humano en una sola plataforma.
          </h1>
          <p className="text-sm text-sidebar-foreground/70">
            Documentación, solicitudes, nómina, SST, evaluaciones y control operativo con
            trazabilidad y auditoría completa.
          </p>
        </div>
        <p className="flex items-center gap-2 text-xs text-sidebar-foreground/60">
          <ShieldCheck className="size-4" /> Autenticación gestionada · Sesiones cifradas
        </p>
      </div>

      <div className="flex items-center justify-center px-6 py-12">
        <form className="w-full max-w-sm space-y-5" onSubmit={enviar}>
          <div className="space-y-1.5">
            <h2 className="text-2xl font-semibold">
              {modo === "ingresar" ? "Iniciar sesión" : "Crear cuenta"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {modo === "ingresar"
                ? "Ingrese sus credenciales corporativas."
                : "La primera cuenta creada obtiene el rol de administrador."}
            </p>
          </div>

          {modo === "registrar" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="nombres">Nombres</Label>
                <Input
                  id="nombres"
                  required
                  value={nombres}
                  onChange={(e) => setNombres(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="apellidos">Apellidos</Label>
                <Input
                  id="apellidos"
                  required
                  value={apellidos}
                  onChange={(e) => setApellidos(e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="email">Correo corporativo</Label>
            <Input
              id="email"
              type="email"
              required
              autoComplete="email"
              placeholder="nombre@empresa.com.co"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              type="password"
              required
              minLength={6}
              autoComplete={modo === "ingresar" ? "current-password" : "new-password"}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <Button type="submit" className="w-full" disabled={enviando}>
            {modo === "ingresar" ? (
              <>
                <LogIn className="size-4" /> Ingresar
              </>
            ) : (
              <>
                <UserPlus className="size-4" /> Crear cuenta
              </>
            )}
          </Button>

          <div className="flex justify-between text-xs text-muted-foreground">
            <button type="button" onClick={recuperar} className="hover:text-foreground">
              ¿Olvidó su contraseña?
            </button>
            <button
              type="button"
              onClick={() => setModo(modo === "ingresar" ? "registrar" : "ingresar")}
              className="hover:text-foreground"
            >
              {modo === "ingresar" ? "Crear una cuenta" : "Ya tengo cuenta"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
