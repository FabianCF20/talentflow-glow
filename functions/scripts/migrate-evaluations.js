#!/usr/bin/env node
"use strict";

// Migración administrativa. Nunca modifica datos sin --apply y --project=indunilo.
// Usa Application Default Credentials; no almacena ni imprime claves de servicio.
const { initializeApp, applicationDefault } = require("firebase-admin/app");
const { getFirestore, FieldPath, FieldValue } = require("firebase-admin/firestore");
const { createHash } = require("node:crypto");

const EXPECTED_PROJECT = "indunilo";
const BACKUP_COLLECTION = "disc_evaluaciones_migration_backup";
const MIGRATION_VERSION = 1;

function parseArgs(argv) {
  const args = { apply: false, all: false, project: "", batchSize: 25, limit: 100 };
  for (const arg of argv) {
    if (arg === "--apply") args.apply = true;
    else if (arg === "--all") args.all = true;
    else if (arg.startsWith("--project=")) args.project = arg.slice(10);
    else if (arg.startsWith("--batch-size=")) args.batchSize = Number(arg.slice(13));
    else if (arg.startsWith("--limit=")) args.limit = Number(arg.slice(8));
    else throw new Error("Argumento no reconocido: " + arg);
  }
  if (args.project !== EXPECTED_PROJECT) {
    throw new Error("Debes indicar --project=" + EXPECTED_PROJECT + " para confirmar el proyecto destino.");
  }
  if (!Number.isInteger(args.batchSize) || args.batchSize < 1 || args.batchSize > 100) {
    throw new Error("--batch-size debe estar entre 1 y 100.");
  }
  if (!args.all && (!Number.isInteger(args.limit) || args.limit < 1 || args.limit > 1000)) {
    throw new Error("--limit debe estar entre 1 y 1000; usa --all para procesar toda la colección.");
  }
  return args;
}

function buildMigrationPlan(publicData, privateData) {
  const fields = Array.isArray(publicData.campos) ? publicData.campos : [];
  const legacy = {};
  for (const field of fields) {
    if (!field || field.correcta === undefined) continue;
    if (typeof field.id !== "string" || !field.id) {
      throw new Error("Hay una pregunta legacy con ID inválido; requiere revisión manual.");
    }
    if (Object.prototype.hasOwnProperty.call(legacy, field.id)) {
      throw new Error("Hay IDs de pregunta duplicados; requiere revisión manual.");
    }
    legacy[field.id] = {
      correcta: field.correcta,
      peso: Number.isFinite(field.peso) && field.peso > 0 ? field.peso : 1
    };
  }
  const publicFields = fields.map(field => {
    if (!field || typeof field !== "object") return field;
    const { correcta, ...safeField } = field;
    return safeField;
  });
  const existing = privateData && privateData.claves && typeof privateData.claves === "object"
    ? privateData.claves : {};
  const missingIds = Object.keys(legacy).filter(id =>
    !Object.prototype.hasOwnProperty.call(existing, id)
  );
  return {
    hasLegacy: Object.keys(legacy).length > 0,
    publicFields,
    keys: { ...legacy, ...existing },
    missingIds
  };
}

function hashData(data) {
  return createHash("sha256").update(JSON.stringify(data)).digest("hex");
}

async function migrateOne(db, docRef) {
  return db.runTransaction(async tx => {
    const privateRef = db.doc("disc_claves_evaluacion/" + docRef.id);
    const backupRef = db.doc(BACKUP_COLLECTION + "/" + docRef.id);
    const [publicSnap, privateSnap, backupSnap] = await Promise.all([
      tx.get(docRef), tx.get(privateRef), tx.get(backupRef)
    ]);
    if (!publicSnap.exists) return "missing";
    const publicData = publicSnap.data();
    const privateData = privateSnap.exists ? privateSnap.data() : null;
    const plan = buildMigrationPlan(publicData, privateData);
    if (!plan.hasLegacy) return "already-clean";
    if (backupSnap.exists) {
      throw new Error("Ya existe respaldo para " + docRef.id + "; se detiene para evitar sobrescribirlo.");
    }

    tx.create(backupRef, {
      evaluacionId: docRef.id,
      migrationVersion: MIGRATION_VERSION,
      originalHash: hashData(publicData),
      originalData: publicData,
      backedUpAt: FieldValue.serverTimestamp()
    });
    tx.set(privateRef, {
      evaluacionId: docRef.id,
      claves: plan.keys,
      migradoEn: FieldValue.serverTimestamp(),
      migrationVersion: MIGRATION_VERSION
    }, { merge: true });
    tx.update(docRef, {
      campos: plan.publicFields,
      migradoClavesEn: FieldValue.serverTimestamp(),
      migrationVersion: MIGRATION_VERSION
    });
    return "migrated";
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  initializeApp({ credential: applicationDefault(), projectId: args.project });
  const db = getFirestore();
  if (db.projectId && db.projectId !== args.project) {
    throw new Error("El proyecto autenticado no coincide con " + args.project + ".");
  }

  console.log("Proyecto:", args.project);
  console.log("Modo:", args.apply ? "APLICAR CAMBIOS" : "SIMULACIÓN (sin escrituras)");
  console.log("Respaldo:", BACKUP_COLLECTION);
  let cursor = null;
  let scanned = 0, candidates = 0, migrated = 0, clean = 0, errors = 0;
  const max = args.all ? Number.MAX_SAFE_INTEGER : args.limit;

  while (scanned < max) {
    const pageSize = Math.min(args.batchSize, max - scanned);
    let query = db.collection("disc_evaluaciones")
      .orderBy(FieldPath.documentId()).limit(pageSize);
    if (cursor) query = query.startAfter(cursor);
    const page = await query.get();
    if (page.empty) break;

    for (const snap of page.docs) {
      scanned++;
      const plan = buildMigrationPlan(snap.data(), null);
      if (!plan.hasLegacy) { clean++; continue; }
      candidates++;
      if (!args.apply) {
        console.log("[SIMULACIÓN] Evaluación requiere migración:", snap.id);
        continue;
      }
      try {
        const result = await migrateOne(db, snap.ref);
        if (result === "migrated") migrated++;
        else clean++;
      } catch (error) {
        errors++;
        console.error("[ERROR]", snap.id, error.message);
      }
    }
    cursor = page.docs[page.docs.length - 1];
    if (page.size < pageSize) break;
  }

  console.log("\nResumen:", JSON.stringify({
    scanned, candidates, migrated, alreadyClean: clean, errors,
    truncated: !args.all && scanned >= args.limit
  }, null, 2));
  if (errors) process.exitCode = 1;
}

if (require.main === module) {
  main().catch(error => {
    console.error("Migración cancelada:", error.message);
    process.exitCode = 1;
  });
}

module.exports = { buildMigrationPlan, parseArgs };
