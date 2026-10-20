// functions/test/asignarActividad.test.js
//
// Pruebas de asignarActividad con dobles de Firestore y de Auth hechos a
// mano: no tocan red, credenciales ni el proyecto real. El doble de batch
// reproduce lo esencial de WriteBatch: nada llega al almacén hasta commit()
// y sólo existe `set`, así que cualquier escritura fuera del batch (o con
// otro método) hace fallar el test.

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
/* Dobles de Firestore y Auth                                          */
/* ------------------------------------------------------------------ */

let store; // { "coleccion/id": data }
let authUsers; // { "correo": { uid, email } }
let batchesCreados; // veces que se llamó a db.batch()
let commits; // [[{ path, data }, ...], ...] de cada commit confirmado
let llamadasGetUsers; // identificadores recibidos por cada getUsers
let llamadasGetAll; // rutas recibidas por cada getAll
let contadorIds; // ids automáticos por colección
let fallosGetUsers; // si es true, getUsers lanza
let fallosGetAll; // si es true, getAll lanza

const claveDe = (p) => p.split("/").pop();

const snap = (p) => ({
  exists: p in store,
  id: claveDe(p),
  data: () => store[p],
});

const makeRef = (p) => ({
  path: p,
  id: claveDe(p),
  collection: (name) => ({ doc: (id) => makeRef(`${p}/${name}/${id}`) }),
  get: async () => snap(p),
});

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
  getAll: async (...refs) => {
    if (fallosGetAll) {
      throw new Error("fallo simulado en getAll");
    }
    assert.ok(refs.length > 0, "Firestore rechaza getAll sin referencias");
    llamadasGetAll.push(refs.map((ref) => ref.path));
    return refs.map((ref) => snap(ref.path));
  },
  batch: () => {
    batchesCreados += 1;
    const pendientes = [];
    let confirmado = false;

    return {
      set: (ref, data) => {
        pendientes.push({ path: ref.path, data });
      },
      commit: async () => {
        assert.equal(confirmado, false, "commit se llamó dos veces");
        assert.ok(
          pendientes.length <= 500,
          "un batch admite como máximo 500 escrituras"
        );
        confirmado = true;
        for (const { path: p, data } of pendientes) {
          store[p] = data;
        }
        commits.push(pendientes);
      },
    };
  },
};

const authDouble = {
  getUsers: async (identificadores) => {
    if (fallosGetUsers) {
      throw new Error("fallo simulado en getUsers");
    }
    assert.ok(
      identificadores.length <= 100,
      "getUsers admite como máximo 100 identificadores"
    );
    llamadasGetUsers.push(identificadores);

    const users = [];
    const notFound = [];

    for (const identificador of identificadores) {
      const usuario = authUsers[identificador.email];
      if (usuario) {
        users.push(usuario);
      } else {
        notFound.push(identificador);
      }
    }

    return { users, notFound };
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
      Timestamp: {
        fromDate: (fecha) => ({ __timestamp: true, toDate: () => fecha }),
      },
    };
  }
  if (request === "firebase-admin/auth") {
    return { getAuth: () => authDouble };
  }
  return original.call(this, request, ...rest);
};

const { asignarActividad } = require(path.join(
  __dirname,
  "../src/asignarActividad.js"
));

test.after(() => {
  Module._load = original;
});

/* ------------------------------------------------------------------ */
/* Datos y helpers                                                     */
/* ------------------------------------------------------------------ */

const AHORA_ISO = "2026-10-19T15:00:00.000Z";
const FUTURO_ISO = "2026-10-26T15:00:00.000Z";

const baseAuth = () => ({
  "ana@x.com": { uid: "est1", email: "ana@x.com" },
  "beto@x.com": { uid: "est2", email: "Beto@X.com" }, // Auth puede devolverlo con otras mayúsculas
  "carla@x.com": { uid: "est3", email: "carla@x.com" },
  "prof@x.com": { uid: "prof1", email: "prof@x.com" },
  "admin@x.com": { uid: "adm1", email: "admin@x.com" },
  "huerfano@x.com": { uid: "uid-sinperfil", email: "huerfano@x.com" },
});

const baseStore = () => ({
  "usuarios/doc1": { rol: "docente" },
  "usuarios/doc2": { rol: "docente" },
  "usuarios/adm1": { rol: "administrador" },
  "usuarios/est1": {
    rol: "estudiante",
    nombre: "Ana Pérez",
    correo: "ana@x.com",
  },
  "usuarios/est2": {
    rol: "estudiante",
    nombre: "Beto Gómez",
    correo: "beto@x.com",
  },
  // Sin nombre ni correo: se usan los valores de reserva.
  "usuarios/est3": { rol: "estudiante" },
  "usuarios/prof1": { rol: "docente", nombre: "Profe Secreto" },
  "lecturas/lec1": { estado: "publicada", autorId: "doc2" },
  "lecturas/borrador-doc1": { estado: "borrador", autorId: "doc1" },
  "lecturas/borrador-doc2": { estado: "borrador", autorId: "doc2" },
});

const reset = () => {
  store = baseStore();
  authUsers = baseAuth();
  batchesCreados = 0;
  commits = [];
  llamadasGetUsers = [];
  llamadasGetAll = [];
  contadorIds = {};
  fallosGetUsers = false;
  fallosGetAll = false;
};

test.beforeEach((t) => {
  t.mock.timers.enable({ apis: ["Date"], now: new Date(AHORA_ISO) });
  t.mock.method(console, "warn", () => {});
  t.mock.method(console, "error", () => {});
  reset();
});

const datosValidos = (extra = {}) => ({
  lecturaId: "lec1",
  correos: ["ana@x.com"],
  fechaLimite: FUTURO_ISO,
  ...extra,
});

const call = (uid, data) =>
  asignarActividad({
    auth: uid ? { uid, token: {} } : null,
    data,
  });

const rejects = async (promesa, code) => {
  await assert.rejects(promesa, (e) => {
    assert.equal(e.code, code, e.message);
    return true;
  });
};

// Un rechazo debe ocurrir sin haber escrito nada ni abierto un batch.
const rechazaSinEscribir = async (promesa, code) => {
  await rejects(promesa, code);
  assert.equal(commits.length, 0, "no debía haber commits");
  assert.equal(
    Object.keys(store).filter((p) =>
      /^(actividades|auditoria)\//.test(p)
    ).length,
    0,
    "no debía escribirse ningún documento"
  );
};

/* ------------------------------------------------------------------ */
/* Autenticación y rol                                                 */
/* ------------------------------------------------------------------ */

test("sin sesión: unauthenticated", async () => {
  await rechazaSinEscribir(call(null, datosValidos()), "unauthenticated");
  assert.equal(llamadasGetUsers.length, 0);
});

test("estudiante: permission-denied", async () => {
  await rechazaSinEscribir(call("est1", datosValidos()), "permission-denied");
});

test("administrador: permission-denied (no pasa en esta función)", async () => {
  await rechazaSinEscribir(call("adm1", datosValidos()), "permission-denied");
});

test("usuario sin perfil: permission-denied", async () => {
  await rechazaSinEscribir(
    call("uid-sinperfil", datosValidos()),
    "permission-denied"
  );
});

test("perfil sin rol: permission-denied", async () => {
  store["usuarios/doc3"] = {};
  await rechazaSinEscribir(call("doc3", datosValidos()), "permission-denied");
});

test("el rol se lee del perfil, no de los custom claims", async () => {
  await assert.rejects(
    asignarActividad({
      auth: { uid: "est1", token: { role: "docente", rol: "docente" } },
      data: datosValidos(),
    }),
    (e) => e.code === "permission-denied"
  );
});

/* ------------------------------------------------------------------ */
/* Validación de lecturaId                                             */
/* ------------------------------------------------------------------ */

for (const [nombre, lecturaId] of [
  ["ausente", undefined],
  ["vacío", ""],
  ["sólo espacios", "   "],
  ["con '/'", "a/b"],
  ["'.'", "."],
  ["'..'", ".."],
  ["numérico", 42],
  ["nulo", null],
  ["reservado '__x__'", "__lec__"],
  ["reservado '____'", "____"],
  ["de 129 caracteres", "a".repeat(129)],
]) {
  test(`lecturaId ${nombre}: invalid-argument`, async () => {
    await rechazaSinEscribir(
      call("doc1", datosValidos({ lecturaId })),
      "invalid-argument"
    );
  });
}

test("sin data: invalid-argument", async () => {
  await rechazaSinEscribir(call("doc1", undefined), "invalid-argument");
});

test("lecturaId de exactamente 128 caracteres y '__' sólo al inicio: se acepta", async () => {
  const id128 = "a".repeat(128);
  const idInicio = "__lec";
  store[`lecturas/${id128}`] = { estado: "publicada", autorId: "doc2" };
  store[`lecturas/${idInicio}`] = { estado: "publicada", autorId: "doc2" };

  assert.equal((await call("doc1", datosValidos({ lecturaId: id128 }))).ok, true);
  assert.equal(
    (await call("doc1", datosValidos({ lecturaId: idInicio }))).ok,
    true
  );
});

/* ------------------------------------------------------------------ */
/* Validación de correos                                               */
/* ------------------------------------------------------------------ */

for (const [nombre, correos] of [
  ["ausente", undefined],
  ["no es arreglo", "ana@x.com"],
  ["objeto", { 0: "ana@x.com" }],
  ["vacío", []],
]) {
  test(`correos ${nombre}: invalid-argument`, async () => {
    await rechazaSinEscribir(
      call("doc1", datosValidos({ correos })),
      "invalid-argument"
    );
  });
}

test("correos con un elemento que no es string: invalid-argument", async () => {
  for (const intruso of [42, null, undefined, {}, ["ana@x.com"], true]) {
    await rechazaSinEscribir(
      call("doc1", datosValidos({ correos: ["ana@x.com", intruso] })),
      "invalid-argument"
    );
  }
});

test("101 correos: invalid-argument; no se consulta Auth", async () => {
  const correos = Array.from({ length: 101 }, (_, i) => `u${i}@x.com`);

  await rechazaSinEscribir(
    call("doc1", datosValidos({ correos })),
    "invalid-argument"
  );
  assert.equal(llamadasGetUsers.length, 0);
});

test("101 entradas que son duplicados entre sí también se rechazan (el tope es sobre lo recibido)", async () => {
  const correos = Array.from({ length: 101 }, () => "ana@x.com");

  await rechazaSinEscribir(
    call("doc1", datosValidos({ correos })),
    "invalid-argument"
  );
});

test("100 correos distintos: funciona y usa un solo batch de 102 escrituras", async () => {
  const correos = [];

  for (let i = 0; i < 100; i += 1) {
    const correo = `u${i}@x.com`;
    correos.push(correo);
    authUsers[correo] = { uid: `u${i}`, email: correo };
    store[`usuarios/u${i}`] = { rol: "estudiante", nombre: `U${i}`, correo };
  }

  const r = await call("doc1", datosValidos({ correos }));

  assert.equal(r.ok, true);
  assert.equal(r.asignados.length, 100);
  assert.deepEqual(r.noAsignados, []);
  assert.equal(commits.length, 1);
  // 1 actividad + 100 asignados + 1 auditoría.
  assert.equal(commits[0].length, 102);
  assert.equal(llamadasGetUsers.length, 1);
  assert.equal(llamadasGetUsers[0].length, 100);
});

/* ------------------------------------------------------------------ */
/* Validación de fechaLimite                                           */
/* ------------------------------------------------------------------ */

for (const [nombre, fechaLimite] of [
  ["ausente", undefined],
  ["nula", null],
  ["vacía", ""],
  ["texto cualquiera", "mañana"],
  ["número", Date.parse(FUTURO_ISO)],
  ["objeto Date", new Date(FUTURO_ISO)],
  ["sin hora ni zona", "2026-10-26"],
  ["sin zona horaria", "2026-10-26T15:00:00"],
  ["mes inexistente", "2026-13-01T15:00:00Z"],
  ["día inexistente", "2026-02-31T15:00:00Z"],
  ["hora inexistente", "2026-10-26T25:00:00Z"],
]) {
  test(`fechaLimite ${nombre}: invalid-argument`, async () => {
    await rechazaSinEscribir(
      call("doc1", datosValidos({ fechaLimite })),
      "invalid-argument"
    );
  });
}

test("fechaLimite en el pasado: invalid-argument", async () => {
  await rechazaSinEscribir(
    call("doc1", datosValidos({ fechaLimite: "2026-10-18T15:00:00.000Z" })),
    "invalid-argument"
  );
});

test("fechaLimite igual a ahora: invalid-argument (debe ser estrictamente futura)", async () => {
  await rechazaSinEscribir(
    call("doc1", datosValidos({ fechaLimite: AHORA_ISO })),
    "invalid-argument"
  );
});

test("fechaLimite un milisegundo en el futuro: se acepta", async () => {
  const r = await call(
    "doc1",
    datosValidos({ fechaLimite: "2026-10-19T15:00:00.001Z" })
  );
  assert.equal(r.ok, true);
});

// Tope: 2 años = 730 días desde ahora.
const DOS_ANIOS_MS = 2 * 365 * 24 * 60 * 60 * 1000;

test("fechaLimite exactamente en el tope de 2 años: se acepta", async () => {
  const limite = new Date(Date.parse(AHORA_ISO) + DOS_ANIOS_MS).toISOString();
  const r = await call("doc1", datosValidos({ fechaLimite: limite }));
  assert.equal(r.ok, true);
});

test("fechaLimite un milisegundo por encima del tope: invalid-argument", async () => {
  const pasado = new Date(
    Date.parse(AHORA_ISO) + DOS_ANIOS_MS + 1
  ).toISOString();
  await rechazaSinEscribir(
    call("doc1", datosValidos({ fechaLimite: pasado })),
    "invalid-argument"
  );
});

test("fechaLimite en el año 10000 (9999-12-31T23:59:59-23:59): invalid-argument, no error interno", async () => {
  await rechazaSinEscribir(
    call("doc1", datosValidos({ fechaLimite: "9999-12-31T23:59:59-23:59" })),
    "invalid-argument"
  );
});

test("fechaLimite con desplazamiento horario se compara en UTC", async () => {
  // 11:00-05:00 son las 16:00Z: futuro. 09:00-05:00 son las 14:00Z: pasado.
  const ok = await call(
    "doc1",
    datosValidos({ fechaLimite: "2026-10-19T11:00:00-05:00" })
  );
  assert.equal(ok.ok, true);

  await rechazaSinEscribir2(
    call("doc1", datosValidos({ fechaLimite: "2026-10-19T09:00:00-05:00" })),
    "invalid-argument"
  );
});

// Variante para tests que ya hicieron una escritura previa legítima.
const rechazaSinEscribir2 = async (promesa, code) => {
  const antes = commits.length;
  await rejects(promesa, code);
  assert.equal(commits.length, antes, "no debía haber commits nuevos");
};

/* ------------------------------------------------------------------ */
/* Lectura                                                             */
/* ------------------------------------------------------------------ */

test("lectura inexistente: not-found", async () => {
  await rechazaSinEscribir(
    call("doc1", datosValidos({ lecturaId: "fantasma" })),
    "not-found"
  );
  assert.equal(llamadasGetUsers.length, 0);
});

test("lectura publicada de otro docente: se acepta", async () => {
  const r = await call("doc1", datosValidos({ lecturaId: "lec1" }));
  assert.equal(r.ok, true);
});

// Los estudiantes sólo pueden leer lecturas publicadas: asignar otra cosa
// crearía una actividad imposible de abrir. Y inexistente y no publicada
// deben ser indistinguibles (mismo código y mismo mensaje).
test("borrador propio: not-found (sólo se asignan lecturas publicadas)", async () => {
  await rechazaSinEscribir(
    call("doc1", datosValidos({ lecturaId: "borrador-doc1" })),
    "not-found"
  );
  assert.equal(llamadasGetUsers.length, 0);
});

test("borrador de otro docente: not-found", async () => {
  await rechazaSinEscribir(
    call("doc1", datosValidos({ lecturaId: "borrador-doc2" })),
    "not-found"
  );
  assert.equal(llamadasGetUsers.length, 0);
});

test("lectura propia archivada: not-found", async () => {
  store["lecturas/archivada"] = { estado: "archivada", autorId: "doc1" };
  await rechazaSinEscribir(
    call("doc1", datosValidos({ lecturaId: "archivada" })),
    "not-found"
  );
});

test("lectura sin estado ni autor: not-found", async () => {
  store["lecturas/rara"] = {};
  await rechazaSinEscribir(
    call("doc1", datosValidos({ lecturaId: "rara" })),
    "not-found"
  );
});

test("lectura inexistente y lectura no publicada dan el mismo error y mensaje", async () => {
  const capturar = async (lecturaId) => {
    try {
      await call("doc1", datosValidos({ lecturaId }));
    } catch (e) {
      return { code: e.code, message: e.message };
    }
    throw new Error("debía rechazar");
  };

  const inexistente = await capturar("fantasma");
  const ajena = await capturar("borrador-doc2");
  const propia = await capturar("borrador-doc1");

  assert.deepEqual(ajena, inexistente);
  assert.deepEqual(propia, inexistente);
});

/* ------------------------------------------------------------------ */
/* Resolución de correos                                               */
/* ------------------------------------------------------------------ */

test("mezcla: sólo los estudiantes se asignan; el resto va a noAsignados", async () => {
  const r = await call(
    "doc1",
    datosValidos({
      correos: [
        "ana@x.com", // estudiante
        "prof@x.com", // existe, pero es docente
        "admin@x.com", // existe, pero es administrador
        "huerfano@x.com", // existe en Auth, sin perfil
        "nadie@x.com", // no existe en Auth
        "esto-no-es-un-correo", // mal formado
        "beto@x.com", // estudiante
      ],
    })
  );

  assert.deepEqual(
    r.asignados.map((a) => a.estudianteId),
    ["est1", "est2"]
  );
  assert.deepEqual(r.noAsignados, [
    "prof@x.com",
    "admin@x.com",
    "huerfano@x.com",
    "nadie@x.com",
    "esto-no-es-un-correo",
  ]);
  assert.equal(commits.length, 1);
});

test("no se distingue por qué un correo no se asignó: sólo strings, sin motivo", async () => {
  const r = await call(
    "doc1",
    datosValidos({
      correos: ["ana@x.com", "prof@x.com", "nadie@x.com", "basura"],
    })
  );

  assert.deepEqual(r.noAsignados, ["prof@x.com", "nadie@x.com", "basura"]);
  assert.ok(r.noAsignados.every((entrada) => typeof entrada === "string"));
});

test("la respuesta no filtra uids ni nombres de quien no es estudiante", async () => {
  const r = await call(
    "doc1",
    datosValidos({
      correos: ["ana@x.com", "prof@x.com", "admin@x.com", "huerfano@x.com"],
    })
  );
  const serializada = JSON.stringify(r);

  for (const secreto of [
    "prof1",
    "adm1",
    "uid-sinperfil",
    "Profe Secreto",
  ]) {
    assert.equal(
      serializada.includes(secreto),
      false,
      `la respuesta contiene ${secreto}`
    );
  }
});

test("normaliza (trim + minúsculas) y deduplica", async () => {
  const r = await call(
    "doc1",
    datosValidos({
      correos: [
        "  ANA@x.com ",
        "ana@x.com",
        "Ana@X.COM",
        "\tPROF@x.com",
        "prof@X.com ",
      ],
    })
  );

  assert.deepEqual(
    r.asignados.map((a) => a.estudianteId),
    ["est1"]
  );
  assert.deepEqual(r.noAsignados, ["prof@x.com"]);
  // A Auth sólo viaja cada correo una vez y ya normalizado.
  assert.deepEqual(llamadasGetUsers, [
    [{ email: "ana@x.com" }, { email: "prof@x.com" }],
  ]);
});

test("los correos mal formados no se envían a Auth", async () => {
  const r = await call(
    "doc1",
    datosValidos({
      correos: ["ana@x.com", "sin-arroba", "dos@@x.com", "a b@x.com", "x@y", ""],
    })
  );

  assert.deepEqual(llamadasGetUsers, [[{ email: "ana@x.com" }]]);
  assert.deepEqual(r.noAsignados, ["sin-arroba", "dos@@x.com", "a b@x.com", "x@y", ""]);
});

test("correo con mayúsculas distintas en Auth se resuelve igual", async () => {
  // authUsers["beto@x.com"].email vale "Beto@X.com".
  const r = await call("doc1", datosValidos({ correos: ["BETO@x.com"] }));
  assert.deepEqual(
    r.asignados.map((a) => a.estudianteId),
    ["est2"]
  );
});

test("sólo se leen los perfiles de los usuarios que Auth encontró", async () => {
  await call("doc1", datosValidos({ correos: ["ana@x.com", "nadie@x.com"] }));
  assert.deepEqual(llamadasGetAll, [["usuarios/est1"]]);
});

test("ningún correo resoluble a estudiante: failed-precondition y nada escrito", async () => {
  await rechazaSinEscribir(
    call(
      "doc1",
      datosValidos({
        correos: ["prof@x.com", "admin@x.com", "huerfano@x.com", "nadie@x.com", "basura"],
      })
    ),
    "failed-precondition"
  );
  assert.equal(batchesCreados, 0, "no debía ni abrirse un batch");
});

test("todos los correos mal formados: failed-precondition sin consultar Auth", async () => {
  await rechazaSinEscribir(
    call("doc1", datosValidos({ correos: ["basura", "otra basura"] })),
    "failed-precondition"
  );
  assert.equal(llamadasGetUsers.length, 0);
  assert.equal(llamadasGetAll.length, 0);
});

test("falla de Auth: unavailable y nada escrito", async () => {
  fallosGetUsers = true;
  await rechazaSinEscribir(call("doc1", datosValidos()), "unavailable");
});

test("falla al leer perfiles: unavailable y nada escrito", async () => {
  fallosGetAll = true;
  await rechazaSinEscribir(call("doc1", datosValidos()), "unavailable");
});

/* ------------------------------------------------------------------ */
/* Escrituras                                                          */
/* ------------------------------------------------------------------ */

const asignacionTipica = () =>
  call(
    "doc1",
    datosValidos({ correos: ["ana@x.com", "carla@x.com", "prof@x.com"] })
  );

test("todo se escribe en un único commit atómico y nada antes de validar", async () => {
  const r = await asignacionTipica();

  assert.equal(batchesCreados, 1);
  assert.equal(commits.length, 1);
  // 1 actividad + 2 asignados + 1 auditoría.
  assert.equal(commits[0].length, 4);
  assert.deepEqual(
    commits[0].map((w) => w.path).sort(),
    [
      `actividades/${r.actividadId}`,
      `actividades/${r.actividadId}/asignados/est1`,
      `actividades/${r.actividadId}/asignados/est3`,
      "auditoria/auditoria-auto-1",
    ].sort()
  );
});

test("el documento de la actividad tiene exactamente los campos esperados", async () => {
  const r = await asignacionTipica();
  const actividad = store[`actividades/${r.actividadId}`];

  assert.deepEqual(Object.keys(actividad).sort(), [
    "creadoEn",
    "docenteId",
    "estado",
    "estudiantesAsignados",
    "fechaLimite",
    "lecturaId",
  ]);
  assert.equal(actividad.lecturaId, "lec1");
  assert.equal(actividad.docenteId, "doc1");
  assert.deepEqual(actividad.estudiantesAsignados, ["est1", "est3"]);
  assert.equal(actividad.estado, "asignada");
  assert.equal(actividad.creadoEn, "TS");
  assert.equal(actividad.fechaLimite.__timestamp, true);
  assert.equal(actividad.fechaLimite.toDate().toISOString(), FUTURO_ISO);
});

test("la actividad no contiene nombres ni correos de los alumnos", async () => {
  const r = await asignacionTipica();
  const serializada = JSON.stringify(store[`actividades/${r.actividadId}`]);

  for (const dato of ["Ana", "ana@x.com", "carla@x.com", "prof@x.com"]) {
    assert.equal(serializada.includes(dato), false, `contiene ${dato}`);
  }
});

test("asignados/{uid}: campos exactos, copiados del perfil y con reservas", async () => {
  const r = await asignacionTipica();
  const base = `actividades/${r.actividadId}/asignados`;

  const ana = store[`${base}/est1`];
  assert.deepEqual(Object.keys(ana).sort(), [
    "asignadoEn",
    "correo",
    "estudianteId",
    "nombre",
  ]);
  assert.equal(ana.estudianteId, "est1");
  assert.equal(ana.nombre, "Ana Pérez");
  assert.equal(ana.correo, "ana@x.com");
  assert.equal(ana.asignadoEn, "TS");

  // est3 no tiene nombre ni correo en su perfil.
  const carla = store[`${base}/est3`];
  assert.equal(carla.estudianteId, "est3");
  assert.equal(carla.correo, "carla@x.com");
  assert.equal(carla.nombre, "carla@x.com");

  // El docente (prof1) no recibe subdocumento.
  assert.equal(`${base}/prof1` in store, false);
});

test("auditoria: campos exactos", async () => {
  const r = await asignacionTipica();
  const auditoria = store["auditoria/auditoria-auto-1"];

  assert.deepEqual(Object.keys(auditoria).sort(), [
    "accion",
    "actorId",
    "creadoEn",
    "detalle",
    "objetivoId",
  ]);
  assert.equal(auditoria.accion, "actividad.asignar");
  assert.equal(auditoria.actorId, "doc1");
  assert.equal(auditoria.objetivoId, r.actividadId);
  assert.deepEqual(auditoria.detalle, { lecturaId: "lec1", cantidad: 2 });
  assert.equal(auditoria.creadoEn, "TS");
});

test("respuesta: forma exacta y sin Timestamps", async () => {
  const r = await asignacionTipica();

  assert.deepEqual(Object.keys(r).sort(), [
    "actividadId",
    "asignados",
    "noAsignados",
    "ok",
  ]);
  assert.equal(r.ok, true);
  assert.equal(r.actividadId, "actividades-auto-1");
  assert.deepEqual(r.asignados, [
    { estudianteId: "est1", nombre: "Ana Pérez", correo: "ana@x.com" },
    { estudianteId: "est3", nombre: "carla@x.com", correo: "carla@x.com" },
  ]);
  assert.deepEqual(r.noAsignados, ["prof@x.com"]);
  assert.doesNotThrow(() => JSON.parse(JSON.stringify(r)));
});

test("el docente que asigna es siempre quien llama, no un dato del cliente", async () => {
  const r = await call(
    "doc1",
    datosValidos({ docenteId: "otro", estado: "cerrada", creadoEn: "x" })
  );
  const actividad = store[`actividades/${r.actividadId}`];

  assert.equal(actividad.docenteId, "doc1");
  assert.equal(actividad.estado, "asignada");
  assert.equal(actividad.creadoEn, "TS");
});

test("dos llamadas crean dos actividades distintas", async () => {
  const a = await call("doc1", datosValidos());
  const b = await call("doc1", datosValidos());

  assert.notEqual(a.actividadId, b.actividadId);
  assert.equal(commits.length, 2);
});
