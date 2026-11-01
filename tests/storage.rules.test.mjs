import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { initializeTestEnvironment, assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import { doc, setDoc } from "firebase/firestore";
import { ref, uploadBytes, getBytes, deleteObject } from "firebase/storage";

const projectId = "demo-talentflow-rules";
let env;
const firestoreRules = readFileSync(new URL("../firestore.rules", import.meta.url), "utf8");
const storageRules = readFileSync(new URL("../storage.rules", import.meta.url), "utf8");
const storage = (uid) => env.authenticatedContext(uid).storage();
const pdf = () => new Blob(["%PDF-1.7\narchivo de prueba"], { type: "application/pdf" });

before(async () => {
  env = await initializeTestEnvironment({
    projectId,
    firestore: { rules: firestoreRules },
    storage: { rules: storageRules },
  });
  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    const profiles = [
      ["emp-a", { id: "emp-a", roles: ["empleado"], empleadoId: "trab-a", estado: "activo" }],
      ["emp-b", { id: "emp-b", roles: ["empleado"], empleadoId: "trab-b", estado: "activo" }],
      ["hr", { id: "hr", roles: ["talento_humano"], empleadoId: "hr-1", estado: "activo" }],
      ["admin", { id: "admin", roles: ["administrador"], empleadoId: "admin-1", estado: "activo" }],
      ["sst", { id: "sst", roles: ["sst"], empleadoId: "sst-1", estado: "activo" }],
      ["inactive", { id: "inactive", roles: ["administrador"], empleadoId: "trab-c", estado: "inactivo" }],
    ];
    for (const [uid, profile] of profiles) await setDoc(doc(db, "usuarios", uid), profile);
    await setDoc(doc(db, "portal_documentos", "doc-a"), {
      id: "doc-a", empleadoId: "trab-a", categoria: "personales", versiones: [],
    });
    await setDoc(doc(db, "portal_documentos", "doc-inc"), {
      id: "doc-inc", empleadoId: "trab-a", categoria: "incapacidades", versiones: [],
    });
  });
});

after(async () => {
  await env?.cleanup();
});

test("el titular puede cargar y leer su propio PDF", async () => {
  const path = "documentos/trab-a/personales/doc-a/v1-prueba.pdf";
  const ownRef = ref(storage("emp-a"), path);
  await assertSucceeds(uploadBytes(ownRef, pdf(), { contentType: "application/pdf" }));
  await assertSucceeds(getBytes(ownRef));
});

test("un empleado no puede cargar ni leer documentos de otro titular", async () => {
  const path = "documentos/trab-a/personales/doc-a/robo.pdf";
  await assertFails(uploadBytes(ref(storage("emp-b"), path), pdf(), { contentType: "application/pdf" }));
  await assertFails(getBytes(ref(storage("emp-b"), "documentos/trab-a/personales/doc-a/v1-prueba.pdf")));
});

test("Talento Humano puede cargar un documento para un empleado", async () => {
  const path = "documentos/trab-a/personales/doc-a/hr.pdf";
  await assertSucceeds(uploadBytes(ref(storage("hr"), path), pdf(), { contentType: "application/pdf" }));
});

test("los contratos solo pueden ser cargados por Talento Humano", async () => {
  const ownContract = "documentos/trab-a/contractuales/doc-contrato/empleado.pdf";
  const hrContract = "documentos/trab-a/contractuales/doc-contrato/rrhh.pdf";
  await assertFails(uploadBytes(ref(storage("emp-a"), ownContract), pdf(), { contentType: "application/pdf" }));
  await assertSucceeds(uploadBytes(ref(storage("hr"), hrContract), pdf(), { contentType: "application/pdf" }));
  // El titular conserva lectura de su contrato una vez cargado por RR. HH.
  await assertSucceeds(getBytes(ref(storage("emp-a"), hrContract)));
});

test("Administración también puede cargar contratos y SST no puede leer contratos", async () => {
  const adminContract = "documentos/trab-a/contractuales/doc-contrato/admin.pdf";
  await assertSucceeds(uploadBytes(ref(storage("admin"), adminContract), pdf(), { contentType: "application/pdf" }));
  await assertFails(getBytes(ref(storage("sst"), adminContract)));
});

test("SST puede cargar documentos ocupacionales pero no documentos personales", async () => {
  const allowed = "documentos/trab-a/incapacidades/doc-inc/incapacidad.pdf";
  const denied = "documentos/trab-a/personales/doc-a/personal.pdf";
  await assertSucceeds(uploadBytes(ref(storage("sst"), allowed), pdf(), { contentType: "application/pdf" }));
  await assertFails(uploadBytes(ref(storage("sst"), denied), pdf(), { contentType: "application/pdf" }));
  await assertSucceeds(getBytes(ref(storage("sst"), allowed)));
});

test("se deniegan perfiles inactivos, MIME no permitido y archivos mayores de 5 MB", async () => {
  await assertFails(uploadBytes(
    ref(storage("inactive"), "documentos/trab-c/personales/doc-x/inactivo.pdf"),
    pdf(),
    { contentType: "application/pdf" },
  ));
  await assertFails(uploadBytes(
    ref(storage("emp-a"), "documentos/trab-a/personales/doc-a/imagen.png"),
    new Blob(["imagen"], { type: "image/png" }),
    { contentType: "image/png" },
  ));
  await assertFails(uploadBytes(
    ref(storage("emp-a"), "documentos/trab-a/categoria-inventada/doc-a/archivo.pdf"),
    pdf(),
    { contentType: "application/pdf" },
  ));
  const oversized = new Blob([new Uint8Array(5 * 1024 * 1024 + 1)], { type: "application/pdf" });
  await assertFails(uploadBytes(
    ref(storage("emp-a"), "documentos/trab-a/personales/doc-a/grande.pdf"),
    oversized,
    { contentType: "application/pdf" },
  ));
});

test("no se permite sobrescribir ni borrar archivos", async () => {
  const fileRef = ref(storage("emp-a"), "documentos/trab-a/personales/doc-a/v1-prueba.pdf");
  await assertFails(uploadBytes(fileRef, pdf(), { contentType: "application/pdf" }));
  await assertFails(deleteObject(fileRef));
});

test("el acceso se limita por ruta privada y perfil activo, aunque aún no existan metadatos", async () => {
  const path = "documentos/trab-a/personales/doc-sin-metadata/archivo.pdf";
  await assertSucceeds(uploadBytes(ref(storage("emp-a"), path), pdf(), { contentType: "application/pdf" }));
  await assertSucceeds(getBytes(ref(storage("emp-a"), path)));
  await assertFails(getBytes(ref(storage("emp-b"), path)));
});
