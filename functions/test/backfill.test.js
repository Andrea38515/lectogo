// functions/test/backfill.test.js
//
// Pruebas del script scripts/ranking/backfill.cjs que no necesitan Firestore:
// validación de argumentos y simulacro. Nunca se ejecuta con --apply.

const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");

const RAIZ = path.join(__dirname, "../..");
const SCRIPT = path.join(RAIZ, "scripts/ranking/backfill.cjs");
const BLOQUEO = path.join(__dirname, "fixtures/bloquear-carga-ansiosa.cjs");

const ejecutar = (args, { bloquear = false, env = {} } = {}) =>
  spawnSync(
    process.execPath,
    [...(bloquear ? ["--require", BLOQUEO] : []), SCRIPT, ...args],
    {
      encoding: "utf8",
      // Sin emulador ni credenciales heredadas: nada puede tocar Firestore.
      env: {
        PATH: process.env.PATH,
        SystemRoot: process.env.SystemRoot,
        ...env,
      },
    }
  );

test("el simulacro termina bien y sólo describe lo que haría", () => {
  const r = ejecutar([]);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /Simulacro/);
  assert.match(r.stdout, /ranking\/\{uid\}/);
  assert.match(r.stdout, /no crea filas|no se (toca|sobrescribe)/i);
});

test("el simulacro no carga firebase-admin ni gamificacion.js", () => {
  const r = ejecutar([], { bloquear: true });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /Simulacro/);
});

test("el simulacro menciona el emulador cuando FIRESTORE_EMULATOR_HOST está definido", () => {
  const r = ejecutar(["--project", "demo-lectogo"], {
    env: { FIRESTORE_EMULATOR_HOST: "localhost:8080" },
  });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /demo-lectogo/);
  assert.match(r.stdout, /FIRESTORE_EMULATOR_HOST/);
});

test("--project seguido de otra opción es un error (exit 1)", () => {
  const r = ejecutar(["--project", "--apply"]);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /--project/);
});

test("--apply --project sin valor al final es un error (exit 1)", () => {
  const r = ejecutar(["--apply", "--project"]);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /--project/);
});

test("--project sin valor, sin --apply, también es un error", () => {
  const r = ejecutar(["--project"]);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /--project/);
});

test("--apply sin --project es un error", () => {
  const r = ejecutar(["--apply"]);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /--project/);
});

test("el script nunca sobrescribe filas: sin set() ni batch", () => {
  const fuente = fs.readFileSync(SCRIPT, "utf8");
  // Sólo se admite create() por documento (falla con ALREADY_EXISTS).
  const sinComentarios = fuente.replace(/\/\/.*$/gm, "");
  assert.ok(!/\.set\(/.test(sinComentarios), "no debe usar set()");
  assert.ok(!/\.batch\(/.test(sinComentarios), "no debe usar batch()");
  assert.ok(/\.create\(/.test(sinComentarios), "debe usar create()");
});
