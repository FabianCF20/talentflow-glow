import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { initializeTestEnvironment, assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";

const projectId = "demo-talentflow-rules";
let env;
const rules = readFileSync(new URL("../firestore.rules", import.meta.url), "utf8");
const db = (uid, email = `${uid}@example.test`) =>
  env.authenticatedContext(uid, { email }).firestore();

before(async () => {
  env = await initializeTestEnvironment({
    projectId,
    firestore: { rules },
  });
  await env.withSecurityRulesDisabled(async (context) => {
    const store = context.firestore();
    const profiles = [
      ["emp-a-user", { id: "emp-a-user", email: "a@example.test", roles: ["empleado"], empleadoId: "emp-a", estado: "activo" }],
      ["emp-b-user", { id: "emp-b-user", email: "b@example.test", roles: ["empleado"], empleadoId: "emp-b", estado: "activo" }],
      ["sup-user", { id: "sup-user", email: "sup@example.test", roles: ["supervisor"], empleadoId: "sup-1", subordinadosIds: ["emp-b"], estado: "activo" }],
      ["jefe-user", { id: "jefe-user", email: "jefe@example.test", roles: ["jefe"], empleadoId: "jefe-1", subordinadosIds: ["emp-b"], estado: "activo" }],
      ["other-sup-user", { id: "other-sup-user", email: "other@example.test", roles: ["supervisor"], empleadoId: "sup-2", subordinadosIds: ["emp-c"], estado: "activo" }],
      ["hr-user", { id: "hr-user", email: "hr@example.test", roles: ["talento_humano"], empleadoId: "hr-1", estado: "activo" }],
      ["pay-user", { id: "pay-user", email: "pay@example.test", roles: ["nomina"], empleadoId: "pay-1", estado: "activo" }],
      ["director-user", { id: "director-user", email: "director@example.test", roles: ["director"], empleadoId: "dir-1", estado: "activo" }],
      ["inactive-user", { id: "inactive-user", email: "inactive@example.test", roles: ["administrador"], estado: "inactivo" }],
      ["blocked-user", { id: "blocked-user", email: "blocked@example.test", roles: ["administrador"], estado: "activo", bloqueado: true }],
      ["admin-user", { id: "admin-user", email: "admin@example.test", roles: ["administrador"], estado: "activo" }],
    ];
    for (const [uid, profile] of profiles) await setDoc(doc(store, "usuarios", uid), profile);

    await setDoc(doc(store, "org_empleados", "emp-b"), { id: "emp-b", jefeInmediatoId: "sup-1", salario: 2500000 });
    await setDoc(doc(store, "org_empleados", "emp-c"), { id: "emp-c", jefeInmediatoId: "sup-2", salario: 2700000 });
    await setDoc(doc(store, "org_empleados", "emp-a"), { id: "emp-a", jefeInmediatoId: "sup-2", salario: 2300000 });

    await setDoc(doc(store, "expedientes", "emp-a"), { empleadoId: "emp-a", datos: "privado-a" });
    await setDoc(doc(store, "expedientes", "emp-b"), { empleadoId: "emp-b", datos: "privado-b" });
    await setDoc(doc(store, "nomina_liquidaciones", "liq-a"), { empleadoId: "emp-a", neto: 2000000 });
    await setDoc(doc(store, "nomina_liquidaciones", "liq-b"), { empleadoId: "emp-b", neto: 2100000 });
    await setDoc(doc(store, "nomina_periodos", "periodo-1"), { periodo: "2026-10" });
    await setDoc(doc(store, "op_asistencia", "asis-b"), { empleadoId: "emp-b", fecha: "2026-10-01" });
    await setDoc(doc(store, "op_asistencia", "asis-c"), { empleadoId: "emp-c", fecha: "2026-10-01" });
    await setDoc(doc(store, "op_solicitudes", "sol-b"), { empleadoId: "emp-b", estado: "pendiente_jefe", flujo: [] });
    await setDoc(doc(store, "op_horas_extras", "he-b"), { empleadoId: "emp-b", estado: "pendiente_jefe", flujo: [] });
    await setDoc(doc(store, "disc_incidencias", "dis-b"), { empleadoId: "emp-b", estado: "registrada", traza: [], actuaciones: [] });
    await setDoc(doc(store, "disc_observaciones", "obs-b"), { empleadoId: "emp-b", texto: "interno" });
    await setDoc(doc(store, "portal_documentos", "doc-a"), { empleadoId: "emp-a", categoria: "personales", versiones: [] });
  });
});

after(async () => {
  await env?.cleanup();
});

test("un empleado solo puede leer su perfil y su expediente", async () => {
  const store = db("emp-a-user", "a@example.test");
  await assertSucceeds(getDoc(doc(store, "usuarios", "emp-a-user")));
  await assertFails(getDoc(doc(store, "usuarios", "emp-b-user")));
  await assertSucceeds(getDoc(doc(store, "expedientes", "emp-a")));
  await assertFails(getDoc(doc(store, "expedientes", "emp-b")));
});

test("un empleado no puede autoasignarse roles ni cambiar su vinculación", async () => {
  const store = db("new-user", "new@example.test");
  await assertSucceeds(setDoc(doc(store, "usuarios", "new-user"), {
    id: "new-user", email: "new@example.test", nombres: "Nuevo", apellidos: "Empleado",
    roles: ["empleado"], estado: "activo", creadoEn: "2026-10-31",
  }));
  await assertFails(setDoc(doc(store, "usuarios", "admin-created"), {
    id: "admin-created", email: "new@example.test", roles: ["administrador"], estado: "activo",
  }));
  await assertFails(updateDoc(doc(db("emp-a-user"), "usuarios", "emp-a-user"), {
    roles: ["administrador"],
  }));
  await assertFails(updateDoc(doc(db("emp-a-user"), "usuarios", "emp-a-user"), {
    empleadoId: "emp-b",
  }));
});

test("Talento Humano no puede elevar roles; administrador sí puede", async () => {
  await assertFails(updateDoc(doc(db("hr-user"), "usuarios", "emp-a-user"), {
    roles: ["administrador"],
  }));
  await assertSucceeds(updateDoc(doc(db("admin-user"), "usuarios", "emp-a-user"), {
    roles: ["empleado", "supervisor"],
  }));
});

test("perfiles inactivos o bloqueados no conservan permisos", async () => {
  await assertFails(getDoc(doc(db("inactive-user"), "org_areas", "area-1")));
  await assertFails(getDoc(doc(db("blocked-user"), "org_areas", "area-1")));
});

test("los mandos solo acceden a registros de subordinados directos", async () => {
  const supervisor = db("sup-user");
  const otherSupervisor = db("other-sup-user");
  await assertSucceeds(getDoc(doc(supervisor, "op_asistencia", "asis-b")));
  await assertSucceeds(updateDoc(doc(supervisor, "op_asistencia", "asis-b"), { horaIngreso: "07:30" }));
  await assertFails(updateDoc(doc(otherSupervisor, "op_asistencia", "asis-b"), { horaIngreso: "07:30" }));
  await assertFails(getDoc(doc(supervisor, "op_asistencia", "asis-c")));
  await assertSucceeds(getDoc(doc(supervisor, "op_solicitudes", "sol-b")));
  await assertSucceeds(getDoc(doc(supervisor, "op_horas_extras", "he-b")));
  await assertFails(getDoc(doc(otherSupervisor, "op_horas_extras", "he-b")));
  await assertFails(getDoc(doc(db("director-user"), "op_horas_extras", "he-b")));
  await assertSucceeds(getDoc(doc(supervisor, "disc_observaciones", "obs-b")));
  await assertFails(getDoc(doc(otherSupervisor, "disc_observaciones", "obs-b")));
  await assertFails(getDoc(doc(supervisor, "org_empleados", "emp-b")));
});

test("nómina separa consulta, liquidación y alcance personal", async () => {
  await assertSucceeds(getDoc(doc(db("emp-a-user"), "nomina_liquidaciones", "liq-a")));
  await assertFails(getDoc(doc(db("emp-a-user"), "nomina_liquidaciones", "liq-b")));
  await assertFails(getDoc(doc(db("sup-user"), "nomina_liquidaciones", "liq-b")));
  await assertSucceeds(getDoc(doc(db("director-user"), "nomina_liquidaciones", "liq-b")));
  await assertSucceeds(getDoc(doc(db("pay-user"), "nomina_periodos", "periodo-1")));
  await assertFails(getDoc(doc(db("sup-user"), "nomina_periodos", "periodo-1")));
});

test("las observaciones internas no son visibles para el empleado titular", async () => {
  await assertFails(getDoc(doc(db("emp-b-user"), "disc_observaciones", "obs-b")));
});

test("el titular no puede alterar metadatos de documentos existentes", async () => {
  await assertFails(updateDoc(doc(db("emp-a-user"), "portal_documentos", "doc-a"), {
    versiones: [{ version: 2, nombreArchivo: "otro.pdf" }],
  }));
});

test("auditoría solo permite anexar eventos atribuidos al UID autenticado", async () => {
  const store = db("emp-a-user", "a@example.test");
  await assertSucceeds(setDoc(doc(store, "auditoria", "audit-own"), {
    usuarioUid: "emp-a-user", accion: "consultar", modulo: "portal", fecha: "2026-10-31",
  }));
  await assertFails(setDoc(doc(store, "auditoria", "audit-spoof"), {
    usuarioUid: "emp-b-user", accion: "consultar", modulo: "portal", fecha: "2026-10-31",
  }));
  await assertFails(updateDoc(doc(store, "auditoria", "audit-own"), { accion: "editar" }));
});

test("colecciones no declaradas quedan denegadas", async () => {
  await assertFails(getDoc(doc(db("admin-user"), "coleccion_no_autorizada", "x")));
});

test("el alcance jerárquico solo lo puede mantener Talento Humano o administración", async () => {
  await assertFails(updateDoc(doc(db("sup-user"), "usuarios", "sup-user"), {
    subordinadosIds: ["emp-b", "emp-c"],
  }));
  await assertSucceeds(updateDoc(doc(db("hr-user"), "usuarios", "sup-user"), {
    subordinadosIds: ["emp-b", "emp-c"],
  }));
});

test("las aprobaciones de jefe y nómina respetan las etapas del flujo", async () => {
  const jefe = db("jefe-user");
  const nomina = db("pay-user");
  await assertSucceeds(updateDoc(doc(jefe, "op_solicitudes", "sol-b"), {
    estado: "pendiente_rrhh",
    flujo: [{ etapa: "jefe", accion: "aprobada", responsable: "Jefe", fecha: "2026-10-31" }],
  }));
  await assertFails(updateDoc(doc(jefe, "op_solicitudes", "sol-b"), {
    estado: "aprobada",
    flujo: [{ etapa: "rrhh", accion: "aprobada", responsable: "Jefe", fecha: "2026-10-31" }],
  }));
  await assertSucceeds(updateDoc(doc(jefe, "disc_incidencias", "dis-b"), {
    estado: "validada",
    traza: [{ etapa: "jefe", accion: "validada", actor: "Jefe", fecha: "2026-10-31", hora: "10:00" }],
  }));
  await assertFails(updateDoc(doc(jefe, "disc_incidencias", "dis-b"), {
    estado: "sancionada",
    traza: [{ etapa: "rrhh", accion: "sancion", actor: "Jefe", fecha: "2026-10-31", hora: "10:00" }],
  }));
  await assertSucceeds(updateDoc(doc(jefe, "op_horas_extras", "he-b"), {
    estado: "pendiente_nomina",
    flujo: [{ etapa: "jefe", accion: "aprobada", responsable: "Jefe", fecha: "2026-10-31" }],
  }));
  await assertFails(updateDoc(doc(jefe, "op_horas_extras", "he-b"), {
    estado: "liquidada",
    flujo: [{ etapa: "nomina", accion: "aprobada", responsable: "Jefe", fecha: "2026-10-31" }],
  }));
  await assertSucceeds(updateDoc(doc(nomina, "op_horas_extras", "he-b"), {
    estado: "liquidada",
    flujo: [{ etapa: "nomina", accion: "aprobada", responsable: "Nómina", fecha: "2026-10-31" }],
  }));
});
