/**
 * Cambio de contraseña de cualquier cuenta por parte del Administrador.
 *
 * Firebase no permite cambiar la clave de otra persona desde el navegador, así
 * que esto corre en el servidor con la cuenta de servicio del proyecto
 * (secreto FIREBASE_SERVICE_ACCOUNT, JSON descargado de Firebase Console).
 * Se verifica que quien llama tenga sesión válida y el rol 'administrador'.
 */
import { createServerFn } from "@tanstack/react-start";
import { firebaseConfig } from "./firebase";

interface Entrada {
  idToken: string;
  uid: string;
  password: string;
}

/** Convierte bytes o texto a base64url (formato de los JWT). */
function b64url(datos: ArrayBuffer | string): string {
  const bytes = typeof datos === "string" ? new TextEncoder().encode(datos) : new Uint8Array(datos);
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Obtiene un token de acceso de Google firmando un JWT con la cuenta de servicio. */
async function tokenServicio(): Promise<string> {
  const crudo = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!crudo) throw new Error("Falta configurar la cuenta de servicio de Firebase.");
  const cuenta = JSON.parse(crudo) as { client_email: string; private_key: string };
  const ahora = Math.floor(Date.now() / 1000);
  const cabecera = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const cuerpo = b64url(
    JSON.stringify({
      iss: cuenta.client_email,
      scope: "https://www.googleapis.com/auth/identitytoolkit https://www.googleapis.com/auth/cloud-platform",
      aud: "https://oauth2.googleapis.com/token",
      iat: ahora,
      exp: ahora + 3600,
    }),
  );
  const pem = cuenta.private_key.replace(/-----[^-]+-----/g, "").replace(/\s/g, "");
  const der = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
  const llave = await crypto.subtle.importKey(
    "pkcs8",
    der,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const firma = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", llave, new TextEncoder().encode(`${cabecera}.${cuerpo}`));
  const jwt = `${cabecera}.${cuerpo}.${b64url(firma)}`;
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: jwt }),
  });
  const d = (await r.json()) as { access_token?: string };
  if (!d.access_token) throw new Error("No se pudo autenticar la cuenta de servicio.");
  return d.access_token;
}

/** Confirma la sesión de quien llama y que sea Administrador. */
async function verificarAdmin(idToken: string): Promise<void> {
  const r = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${firebaseConfig.apiKey}`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ idToken }) },
  );
  const d = (await r.json()) as { users?: { localId: string }[] };
  const uid = d.users?.[0]?.localId;
  if (!uid) throw new Error("Sesión no válida. Vuelva a iniciar sesión.");
  const p = await fetch(
    `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents/usuarios/${uid}`,
    { headers: { Authorization: `Bearer ${idToken}` } },
  );
  const perfil = (await p.json()) as {
    fields?: { roles?: { arrayValue?: { values?: { stringValue?: string }[] } } };
  };
  const roles = perfil.fields?.roles?.arrayValue?.values?.map((v) => v.stringValue) ?? [];
  if (!roles.includes("administrador")) throw new Error("Solo un Administrador puede cambiar contraseñas de otros usuarios.");
}

/** Establece una nueva contraseña para la cuenta indicada. */
export const cambiarClaveComoAdmin = createServerFn({ method: "POST" })
  .inputValidator((d: Entrada) => {
    if (!d?.idToken || !d?.uid) throw new Error("Datos incompletos.");
    if (typeof d.password !== "string" || d.password.length < 6)
      throw new Error("La contraseña debe tener al menos 6 caracteres.");
    return d;
  })
  .handler(async ({ data }) => {
    await verificarAdmin(data.idToken);
    const token = await tokenServicio();
    const r = await fetch(
      `https://identitytoolkit.googleapis.com/v1/projects/${firebaseConfig.projectId}/accounts:update`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ localId: data.uid, password: data.password }),
      },
    );
    if (!r.ok) {
      const e = (await r.json().catch(() => ({}))) as { error?: { message?: string } };
      throw new Error(`Firebase rechazó el cambio: ${e.error?.message ?? r.status}`);
    }
    return { ok: true };
  });
