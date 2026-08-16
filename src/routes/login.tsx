import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ShieldCheck, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

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
    ],
  }),
  component: Login,
});

function Login() {
  const navigate = useNavigate();
  const [intentos, setIntentos] = useState(0);
  const bloqueado = intentos >= 5;

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between bg-sidebar p-10 text-sidebar-foreground lg:flex">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-md bg-sidebar-primary font-display font-bold text-sidebar-primary-foreground">
            SG
          </span>
          <div>
            <p className="font-display text-base font-bold tracking-wide">SIGTH</p>
            <p className="text-xs text-sidebar-foreground/60">Sistema Integral de Gestión de Talento Humano</p>
          </div>
        </div>
        <div className="max-w-md space-y-4">
          <h1 className="font-display text-3xl font-semibold leading-tight">
            Toda la gestión del talento humano en una sola plataforma.
          </h1>
          <p className="text-sm text-sidebar-foreground/70">
            Documentación, solicitudes, nómina, SST, evaluaciones y control operativo con trazabilidad
            y auditoría completa.
          </p>
        </div>
        <p className="flex items-center gap-2 text-xs text-sidebar-foreground/60">
          <ShieldCheck className="size-4" /> Sesiones seguras · Bloqueo por intentos fallidos
        </p>
      </div>

      <div className="flex items-center justify-center px-6 py-12">
        <form
          className="w-full max-w-sm space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            if (bloqueado) return;
            setIntentos((n) => n + 1);
            toast.success("Acceso concedido", { description: "Sesión iniciada correctamente." });
            navigate({ to: "/" });
          }}
        >
          <div className="space-y-1.5">
            <h2 className="text-2xl font-semibold">Iniciar sesión</h2>
            <p className="text-sm text-muted-foreground">Ingrese sus credenciales corporativas.</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">Correo corporativo</Label>
            <Input id="email" type="email" required placeholder="nombre@empresa.com.co" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">Contraseña</Label>
            <Input id="password" type="password" required placeholder="••••••••" />
          </div>

          {bloqueado && (
            <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              Cuenta bloqueada por 5 intentos fallidos. Contacte al administrador.
            </p>
          )}

          <Button type="submit" className="w-full" disabled={bloqueado}>
            <LogIn className="size-4" /> Ingresar
          </Button>

          <div className="flex justify-between text-xs text-muted-foreground">
            <button type="button" className="hover:text-foreground">
              ¿Olvidó su contraseña?
            </button>
            <Link to="/" className="hover:text-foreground">
              Volver al inicio
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
