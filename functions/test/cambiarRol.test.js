// functions/test/cambiarRol.test.js
//
// Pruebas de cambiarRol con un doble de Firestore hecho a mano: no toca red,
// credenciales ni el proyecto real. El doble de transacción reproduce lo
// esencial: las escrituras sólo llegan al almacén al terminar el callback, un
// `create` sobre un documento existente falla, y se registran las lecturas
// que ocurren después de una escritura (Firestore las prohíbe).

const Module = require("node:module");
const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");

class HttpsError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

/* ------------------------------------------------------------------ */
/* Doble de Firestore                                                  */
/* ------------------------------------------------------------------ */

let store; // { "coleccion/id": data }
let commits; // [[{ tipo, path, data }, ...], ...] de cada commit confirmado
let transacciones; // veces que se llamó a runTransaction
let bitacora; // ["get:ruta", "update:ruta", ...] de la última transacción
let lecturasFueraDeTx; // rutas leídas con ref.get() fuera de una transacción
let lecturasTrasEscritura; // lecturas ilegales dentro de la transacción
let contadorIds; // ids automáticos por colección
let reintentos; // veces que se descarta y reejecuta el callback
let antesDeTransaccion; // función opcional que corre justo antes de la transacción
let fallarCommit; // si es true, el commit lanza y no se escribe nada

const claveDe = (p) => p.split("/").pop();

const snap = (p) => ({
  exists: p in store,
  id: claveDe(p),
  data: () => store[p],
});

const makeRef = (p) => ({
  path: p,
  id: claveDe(p),
  get: async () => {
    lecturasFueraDeTx.push(p);
    return snap(p);
  },
});

const confirmar = (escrituras) => {
  // Atómico: primero se validan todas, luego se aplican.
  for (const { tipo, ref } of escrituras) {
    if (tipo === "create" && ref.path in store) {
      const error = new Error(`ALREADY_EXISTS: ${ref.path}`);
      error.code = 6;
      throw error;
    }
    if (tipo === "update" && !(ref.path in store)) {
      const error = new Error(`NOT_FOUND: ${ref.path}`);
      error.code = 5;
      throw error;
    }
  }

  for (const { tipo, ref, data } of escrituras) {
    if (tipo === "update") {
      store[ref.path] = { ...store[ref.path], ...data };
    } else {
      store[ref.path] = data;
    }
  }
};

const db = {
  collection: (name) => ({
    doc: (id) => {
      if (id === undefined) {
        contadorIds[name] = (contadorIds[name] || 0) + 1;
        return makeRef(`${name}/${name}-auto-${contadorIds[name]}`);
      }
      return makeRef(`${name}/${id}`);
    },
  }),
  runTransaction: async (fn) => {
    transacciones += 1;
    if (antesDeTransaccion) {
      antesDeTransaccion();
    }

    const intentos = reintentos + 1;

    for (let i = 0; i < intentos; i += 1) {
      const escrituras = [];
      let escribio = false;
      bitacora = [];
      lecturasTrasEscritura = [];

      const transaction = {
        get: async (ref) => {
          bitacora.push(`get:${ref.path}`);
          if (escribio) {
            lecturasTrasEscritura.push(ref.path);
          }
          return snap(ref.path);
        },
        create: (ref, data) => {
          escribio = true;
          bitacora.push(`create:${ref.path}`);
          escrituras.push({ tipo: "create", ref, data });
        },
        set: (ref, data) => {
          escribio = true;
          bitacora.push(`set:${ref.path}`);
          escrituras.push({ tipo: "set", ref, data });
        },
        update: (ref, data) => {
          escribio = true;
          bitacora.push(`update:${ref.path}`);
          escrituras.push({ tipo: "update", ref, data });
        },
      };

      const resultado = await fn(transaction);

      // Un intento descartado se tira entero, como haría Firestore ante una
      // contención.
      if (i === intentos - 1) {
        if (fallarCommit) {
          throw new Error("fallo simulado en el commit");
        }
        confirmar(escrituras);
        if (escrituras.length > 0) {
          commits.push(
            escrituras.map(({ tipo, ref, data }) => ({
              tipo,
              path: ref.path,
              data,
            }))
          );
        }
        return resultado;
      }
    }

    return undefined;
  },
};

const original = Module._load;
Module._load = function (request, ...rest) {
  if (request === "firebase-functions/v2/https") {
    return { onCall: (handler) => handler, HttpsError };
  }
  if (request === "firebase-admin/firestore") {
    return {
      getFirestore: () => db,
      FieldValue: { serverTimestamp: () => "TS" },
    };
  }
  return original.call(this, request, ...rest);
};

const { cambiarRol } = require(path.join(__dirname, "../src/cambiarRol.js"));

test.after(() => {
  Module._load = original;
});

/* ------------------------------------------------------------------ */
/* Datos y helpers                                                     */
/* ------------------------------------------------------------------ */

const baseStore = () => ({
  "usuarios/adm1": { rol: "administrador", nombre: "Admin Uno" },
  "usuarios/adm2": { rol: "administrador", nombre: "Admin Dos" },
  "usuarios/doc1": { rol: "docente", nombre: "Docente Uno" },
  "usuarios/est1": {
    rol: "estudiante",
    nombre: "Ana Pérez",
    correo: "ana@x.com",
    xp: 120,
    nivel: 2,
  },
  "usuarios/sinrol": { nombre: "Sin Rol" },
});

const reset = () => {
  store = baseStore();
  commits = [];
  transacciones = 0;
  bitacora = [];
  lecturasFueraDeTx = [];
  lecturasTrasEscritura = [];
  contadorIds = {};
  reintentos = 0;
  antesDeTransaccion = null;
  fallarCommit = false;
};

test.beforeEach((t) => {
  t.mock.method(console, "warn", () => {});
  t.mock.method(console, "error", () => {});
  reset();
});

const call = (uid, data) =>
  cambiarRol({
    auth: uid ? { uid, token: {} } : null,
    data,
  });

const rejects = async (promesa, code) => {
  await assert.rejects(promesa, (e) => {
    assert.equal(e.code, code, e.message);
    return true;
  });
};

const copia = (x) => JSON.parse(JSON.stringify(x));

// Un rechazo debe ocurrir sin escribir nada y sin abrir una transacción.
const rechazaSinEscribir = async (promesa, code) => {
  const antes = copia(store);
  await rejects(promesa, code);
  assert.equal(commits.length, 0, "no debía haber commits");
  assert.equal(transacciones, 0, "no debía abrirse una transacción");
  assert.deepEqual(store, antes, "el almacén no debía cambiar");
};

const soloLeyoAlLlamante = (uid) =>
  assert.deepEqual(
    lecturasFueraDeTx,
    [`usuarios/${uid}`],
    "sólo debía leerse el perfil del llamante"
  );

/* ------------------------------------------------------------------ */
/* Autenticación y rol del llamante                                    */
/* ------------------------------------------------------------------ */

test("sin sesión: unauthenticated y no se lee nada", async () => {
  await rechazaSinEscribir(
    call(null, { uid: "est1", rol: "docente" }),
    "unauthenticated"
  );
  assert.deepEqual(lecturasFueraDeTx, []);
});

for (const [nombre, uid] of [
  ["estudiante", "est1"],
  ["docente", "doc1"],
]) {
  test(`${nombre}: permission-denied, sin escrituras ni lecturas del objetivo`, async () => {
    await rechazaSinEscribir(
      call(uid, { uid: "est1", rol: "administrador" }),
      "permission-denied"
    );
    soloLeyoAlLlamante(uid);
  });
}

test("usuario sin perfil: permission-denied", async () => {
  await rechazaSinEscribir(
    call("fantasma", { uid: "est1", rol: "docente" }),
    "permission-denied"
  );
  soloLeyoAlLlamante("fantasma");
});

test("perfil sin rol: permission-denied", async () => {
  await rechazaSinEscribir(
    call("sinrol", { uid: "est1", rol: "docente" }),
    "permission-denied"
  );
});

for (const rol of ["Administrador", "ADMINISTRADOR", "admin", "administrador "]) {
  test(`perfil con rol '${rol}' (no exacto): permission-denied`, async () => {
    store["usuarios/raro"] = { rol };
    await rechazaSinEscribir(
      call("raro", { uid: "est1", rol: "docente" }),
      "permission-denied"
    );
  });
}

test("los custom claims se ignoran: un token que dice administrador no basta", async () => {
  await rechazaSinEscribir(
    cambiarRol({
      auth: {
        uid: "est1",
        token: { role: "administrador", rol: "administrador", admin: true },
      },
      data: { uid: "doc1", rol: "estudiante" },
    }),
    "permission-denied"
  );
  soloLeyoAlLlamante("est1");
});

test("el administrador del perfil pasa aunque el token no traiga claims", async () => {
  const r = await cambiarRol({
    auth: { uid: "adm1", token: {} },
    data: { uid: "est1", rol: "docente" },
  });

  assert.equal(r.ok, true);
});

/* ------------------------------------------------------------------ */
/* Validación de la entrada                                            */
/* ------------------------------------------------------------------ */

for (const [nombre, uid] of [
  ["ausente", undefined],
  ["vacío", ""],
  ["sólo espacios", "   "],
  ["con '/'", "a/b"],
  ["'.'", "."],
  ["'..'", ".."],
  ["numérico", 42],
  ["nulo", null],
  ["arreglo", ["est1"]],
  ["objeto", { id: "est1" }],
  ["reservado '__x__'", "__x__"],
  ["reservado '____'", "____"],
  ["de 129 caracteres", "a".repeat(129)],
]) {
  test(`uid ${nombre}: invalid-argument sin leer al objetivo`, async () => {
    await rechazaSinEscribir(
      call("adm1", { uid, rol: "docente" }),
      "invalid-argument"
    );
    soloLeyoAlLlamante("adm1");
  });
}

for (const [nombre, rol] of [
  ["ausente", undefined],
  ["nulo", null],
  ["vacío", ""],
  ["numérico", 1],
  ["arreglo", ["docente"]],
  ["objeto", { rol: "docente" }],
  ["con otra capitalización", "Docente"],
  ["en mayúsculas", "ADMINISTRADOR"],
  ["abreviado", "admin"],
  ["inexistente", "profesor"],
  ["con espacios", " docente "],
  ["propiedad heredada", "constructor"],
]) {
  test(`rol ${nombre}: invalid-argument`, async () => {
    await rechazaSinEscribir(
      call("adm1", { uid: "est1", rol }),
      "invalid-argument"
    );
  });
}

for (const [nombre, data] of [
  ["undefined", undefined],
  ["null", null],
  ["una cadena", "est1"],
  ["un número", 7],
  ["un arreglo", []],
  ["un objeto vacío", {}],
]) {
  test(`data ${nombre}: invalid-argument, sin fallo interno`, async () => {
    await rechazaSinEscribir(call("adm1", data), "invalid-argument");
  });
}

test("uid de exactamente 128 caracteres y '__' sólo al inicio: se aceptan", async () => {
  const id128 = "a".repeat(128);
  store[`usuarios/${id128}`] = { rol: "estudiante" };
  store["usuarios/__est"] = { rol: "estudiante" };

  assert.equal((await call("adm1", { uid: id128, rol: "docente" })).ok, true);
  assert.equal((await call("adm1", { uid: "__est", rol: "docente" })).ok, true);
});

test("la validación va antes del chequeo del propio rol", async () => {
  await rechazaSinEscribir(
    call("adm1", { uid: "adm1", rol: "superusuario" }),
    "invalid-argument"
  );
});

/* ------------------------------------------------------------------ */
/* Un administrador no puede cambiar su propio rol                     */
/* ------------------------------------------------------------------ */

for (const rol of ["estudiante", "docente", "administrador"]) {
  test(`cambiarse el propio rol a '${rol}': failed-precondition`, async () => {
    await rechazaSinEscribir(
      call("adm1", { uid: "adm1", rol }),
      "failed-precondition"
    );
    soloLeyoAlLlamante("adm1");
  });
}

test("el rechazo del propio rol deja el perfil exactamente igual", async () => {
  await rechazaSinEscribir(
    call("adm1", { uid: "adm1", rol: "estudiante" }),
    "failed-precondition"
  );
  assert.deepEqual(store["usuarios/adm1"], {
    rol: "administrador",
    nombre: "Admin Uno",
  });
});

test("un administrador sí puede cambiar el rol de OTRO administrador", async () => {
  const r = await call("adm1", { uid: "adm2", rol: "estudiante" });

  assert.equal(r.cambiado, true);
  assert.equal(store["usuarios/adm2"].rol, "estudiante");
});

/* ------------------------------------------------------------------ */
/* Objetivo inexistente y sin cambios                                  */
/* ------------------------------------------------------------------ */

test("el perfil objetivo no existe: not-found y nada escrito", async () => {
  const antes = copia(store);

  await rejects(call("adm1", { uid: "nadie", rol: "docente" }), "not-found");
  assert.equal(commits.length, 0);
  assert.deepEqual(store, antes);
});

for (const rol of ["estudiante", "docente", "administrador"]) {
  test(`el objetivo ya es '${rol}': cambiado false, sin escritura ni auditoría`, async () => {
    const uid = { estudiante: "est1", docente: "doc1", administrador: "adm2" }[
      rol
    ];
    const antes = copia(store);

    const r = await call("adm1", { uid, rol });

    assert.deepEqual(r, {
      ok: true,
      uid,
      rolAnterior: rol,
      rolNuevo: rol,
      cambiado: false,
    });
    assert.equal(commits.length, 0, "no debía haber commit");
    assert.deepEqual(store, antes);
    assert.equal(
      Object.keys(store).filter((p) => p.startsWith("auditoria/")).length,
      0,
      "no debía haber auditoría"
    );
    assert.equal(
      bitacora.filter((linea) => /^(create|set|update):/.test(linea)).length,
      0
    );
  });
}

/* ------------------------------------------------------------------ */
/* Cambio de rol                                                       */
/* ------------------------------------------------------------------ */

const TRANSICIONES = [
  ["est1", "estudiante", "docente"],
  ["est1", "estudiante", "administrador"],
  ["doc1", "docente", "estudiante"],
  ["doc1", "docente", "administrador"],
  ["adm2", "administrador", "estudiante"],
  ["adm2", "administrador", "docente"],
];

for (const [uid, rolAnterior, rolNuevo] of TRANSICIONES) {
  test(`${rolAnterior} -> ${rolNuevo}: devuelve el resumen, escribe y audita`, async () => {
    const r = await call("adm1", { uid, rol: rolNuevo });

    assert.deepEqual(r, { ok: true, uid, rolAnterior, rolNuevo, cambiado: true });
    assert.equal(store[`usuarios/${uid}`].rol, rolNuevo);
    assert.equal(commits.length, 1);
  });
}

test("la respuesta tiene exactamente estas claves y no filtra nombre ni correo", async () => {
  const r = await call("adm1", { uid: "est1", rol: "docente" });

  assert.deepEqual(Object.keys(r).sort(), [
    "cambiado",
    "ok",
    "rolAnterior",
    "rolNuevo",
    "uid",
  ]);
  assert.equal(JSON.stringify(r).includes("Ana"), false);
  assert.equal(JSON.stringify(r).includes("ana@x.com"), false);
});

test("sólo se toca el campo rol: el resto del perfil queda igual", async () => {
  const antes = copia(store["usuarios/est1"]);

  await call("adm1", { uid: "est1", rol: "docente" });

  assert.deepEqual(store["usuarios/est1"], { ...antes, rol: "docente" });
  const escrituraPerfil = commits[0].find((w) => w.path === "usuarios/est1");
  assert.equal(escrituraPerfil.tipo, "update");
  assert.deepEqual(Object.keys(escrituraPerfil.data), ["rol"]);
});

test("no se modifica el perfil del administrador que llama ni el de terceros", async () => {
  const antes = copia(store);

  await call("adm1", { uid: "est1", rol: "docente" });

  for (const p of Object.keys(antes)) {
    if (p !== "usuarios/est1") {
      assert.deepEqual(store[p], antes[p], `${p} no debía cambiar`);
    }
  }
});

test("la auditoría tiene exactamente estas claves y valores", async () => {
  await call("adm1", { uid: "est1", rol: "docente" });

  const audit = commits[0].find((w) => w.path.startsWith("auditoria/"));

  assert.ok(audit, "falta el documento de auditoría");
  assert.equal(audit.path, "auditoria/auditoria-auto-1");
  assert.equal(audit.tipo, "create");
  assert.deepEqual(Object.keys(audit.data).sort(), [
    "accion",
    "actorId",
    "creadoEn",
    "detalle",
    "objetivoId",
  ]);
  assert.deepEqual(audit.data, {
    accion: "usuario.cambiar_rol",
    actorId: "adm1",
    objetivoId: "est1",
    detalle: { rolAnterior: "estudiante", rolNuevo: "docente" },
    creadoEn: "TS",
  });
  assert.deepEqual(Object.keys(audit.data.detalle).sort(), [
    "rolAnterior",
    "rolNuevo",
  ]);
});

test("el actor de la auditoría es quien llama, no el objetivo", async () => {
  await call("adm2", { uid: "doc1", rol: "estudiante" });

  const audit = commits[0].find((w) => w.path.startsWith("auditoria/"));

  assert.equal(audit.data.actorId, "adm2");
  assert.equal(audit.data.objetivoId, "doc1");
});

test("un perfil sin rol se puede asignar: rolAnterior queda en null", async () => {
  const r = await call("adm1", { uid: "sinrol", rol: "estudiante" });

  assert.deepEqual(r, {
    ok: true,
    uid: "sinrol",
    rolAnterior: null,
    rolNuevo: "estudiante",
    cambiado: true,
  });
  const audit = commits[0].find((w) => w.path.startsWith("auditoria/"));
  assert.deepEqual(audit.data.detalle, {
    rolAnterior: null,
    rolNuevo: "estudiante",
  });
  assert.equal(store["usuarios/sinrol"].nombre, "Sin Rol");
});

/* ------------------------------------------------------------------ */
/* Atomicidad                                                          */
/* ------------------------------------------------------------------ */

test("un cambio usa una sola transacción y un solo commit con 2 escrituras", async () => {
  await call("adm1", { uid: "est1", rol: "docente" });

  assert.equal(transacciones, 1);
  assert.equal(commits.length, 1);
  assert.equal(commits[0].length, 2);
  assert.deepEqual(commits[0].map((w) => w.tipo).sort(), ["create", "update"]);
});

test("todas las lecturas de la transacción ocurren antes de la primera escritura", async () => {
  await call("adm1", { uid: "est1", rol: "docente" });

  assert.deepEqual(lecturasTrasEscritura, []);
  const primeraEscritura = bitacora.findIndex((l) => /^(create|set|update):/.test(l));
  const ultimaLectura = bitacora.map((l) => l.startsWith("get:")).lastIndexOf(true);

  assert.ok(primeraEscritura > ultimaLectura);
  assert.ok(bitacora.includes("get:usuarios/est1"), "el objetivo se lee en la transacción");
});

test("si el commit falla no queda nada escrito (ni rol ni auditoría)", async () => {
  fallarCommit = true;
  const antes = copia(store);

  await assert.rejects(
    call("adm1", { uid: "est1", rol: "docente" }),
    /fallo simulado/
  );
  assert.deepEqual(store, antes);
  assert.equal(commits.length, 0);
});

test("si la transacción se reejecuta, sólo cuenta el último intento", async () => {
  reintentos = 2;

  await call("adm1", { uid: "est1", rol: "docente" });

  assert.equal(commits.length, 1);
  assert.equal(commits[0].length, 2);
  assert.equal(
    Object.keys(store).filter((p) => p.startsWith("auditoria/")).length,
    1
  );
});

/* ------------------------------------------------------------------ */
/* Carrera: el llamante deja de ser administrador                      */
/* ------------------------------------------------------------------ */

test("el rol del llamante se vuelve a leer DENTRO de la transacción", async () => {
  await call("adm1", { uid: "est1", rol: "docente" });

  assert.ok(
    bitacora.includes("get:usuarios/adm1"),
    "la transacción debe releer al llamante para detectar contención"
  );
});

test("si el llamante es degradado entre la comprobación y la transacción: permission-denied sin escribir", async () => {
  antesDeTransaccion = () => {
    store["usuarios/adm1"] = { rol: "estudiante" };
  };
  await rejects(call("adm1", { uid: "est1", rol: "docente" }), "permission-denied");
  assert.equal(commits.length, 0);
  assert.equal(store["usuarios/est1"].rol, "estudiante");
  assert.deepEqual(
    Object.keys(store).filter((p) => p.startsWith("auditoria/")),
    []
  );
  assert.equal(store["usuarios/adm1"].rol, "estudiante");
});

test("dos administradores que se degradan a la vez: el segundo ya no es administrador y falla", async () => {
  // El primero se degrada a sí mismo vía el otro; el segundo, ya sin rol,
  // intenta lo mismo con la transacción ya abierta.
  const r1 = await call("adm1", { uid: "adm2", rol: "estudiante" });
  assert.equal(r1.cambiado, true);

  await rejects(call("adm2", { uid: "adm1", rol: "estudiante" }), "permission-denied");
  assert.equal(store["usuarios/adm1"].rol, "administrador");
});
