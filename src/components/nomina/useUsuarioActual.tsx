/**
 * Hook: nombre del usuario en sesión, usado como emisor de los documentos de
 * nómina firmados (desprendibles y liquidaciones).
 */
import { useAuth } from "@/lib/auth";
import { nombreCompleto } from "@/lib/formato";

/** Devuelve "Nombres Apellidos" del perfil, el correo, o "sistema" si no hay sesión. */
export function useUsuarioActual() {
  const { perfil, usuario } = useAuth();
  return perfil ? nombreCompleto(perfil) : (usuario?.email ?? "sistema");
}
