"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { buildMigrationPlan, parseArgs } = require("./migrate-evaluations");

test("detecta IDs legacy faltantes aunque ambos mapas tengan igual cantidad de claves", () => {
  const plan = buildMigrationPlan({
    campos: [
      { id: "pregunta-antigua", tipo: "seleccion_unica", correcta: "A", peso: 2 },
      { id: "pregunta-publica", tipo: "texto" }
    ]
  }, {
    claves: { "otra-pregunta": { correcta: "B", peso: 1 } }
  });
  assert.deepEqual(plan.missingIds, ["pregunta-antigua"]);
  assert.equal(plan.keys["pregunta-antigua"].correcta, "A");
  assert.equal(plan.keys["otra-pregunta"].correcta, "B");
  assert.equal("correcta" in plan.publicFields[0], false);
});

test("conserva las claves privadas cuando existe el mismo ID", () => {
  const plan = buildMigrationPlan({
    campos: [{ id: "q1", tipo: "seleccion_unica", correcta: "A", peso: 2 }]
  }, {
    claves: { q1: { correcta: "C", peso: 3 } }
  });
  assert.deepEqual(plan.missingIds, []);
  assert.equal(plan.keys.q1.correcta, "C");
  assert.equal(plan.keys.q1.peso, 3);
});

test("rechaza preguntas legacy sin ID", () => {
  assert.throws(() => buildMigrationPlan({
    campos: [{ tipo: "seleccion_unica", correcta: "A" }]
  }, null), /ID inválido/);
});

test("exige confirmar el proyecto correcto", () => {
  assert.throws(() => parseArgs(["--project=otro"]), /indunilo/);
  assert.equal(parseArgs(["--project=indunilo"]).apply, false);
});
