// functions/test/registrarIntento.test.js
//
// Pruebas de registrarIntento con dobles de Firestore hechos a mano: no
// tocan red, credenciales ni el proyecto real. El doble reproduce las dos
// reglas de las transacciones que más importan aquí:
//
//   1. Las escrituras se aplican sólo al confirmar; las lecturas ven el
//      estado previo.
//   2. Toda lectura posterior a una escritura dentro de la transacción es
//      un error (Firestore la rechaza), y el helper `call` hace fallar el
//      test si ocurre.
//
// Además puede reejecutar el callback para simular un reintento de la
// transacción, que debe producir exactamente las mismas escrituras.

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
let created; // path -> data, de los create confirmados
let seteados; // path -> data, de los set confirmados (upsert idempotente)
let updated; // path -> [data, ...], de los update confirmados
let bitacora; // ["get:ruta", "query:col", "create:ruta", ...] de la transacción
let lecturasTrasEscritura; // lecturas ilegales detectadas
let transaccionActiva; // { escrituras, escribio } mientras corre el callback
let reintentos; // veces que se descarta y reejecuta el callback
let coleccionesQueFallan; // colecciones cuya lectura lanza error
let ocultosEnTransaccion; // rutas que transaction.get ve como inexistentes

const claveDe = (p) => p.split("/").pop();

const registrarLectura = (descripcion) => {
  if (transaccionActiva?.escribio) {
    lecturasTrasEscritura.push(descripcion);
  }
};

const snap = (p) => ({
  exists: p in store,
  id: claveDe(p),
  data: () => store[p],
});

const runQuery = (consulta) => {
  if (coleccionesQueFallan.has(consulta.col)) {
    throw new Error(`fallo simulado leyendo ${consulta.col}`);
  }

  // Firestore devuelve los documentos ordenados por id.
  const docs = Object.keys(store)
    .filter(
      (p) =>
        p.startsWith(`${consulta.col}/`) &&
        p.split("/").length === 2 &&
        consulta.filtros.every(({ field, value }) => store[p][field] === value)
    )
    .sort()
    .map((p) => snap(p));

  return { docs, size: docs.length, empty: docs.length === 0 };
};

const crearConsulta = (col, filtros) => ({
  __query: true,
  col,
  filtros,
  where: (field, op, value) => {
    assert.equal(op, "==", "el doble sólo soporta igualdad");
    return crearConsulta(col, [...filtros, { field, value }]);
  },
  get: async () => {
    registrarLectura(`query:${col}`);
    return runQuery({ col, filtros });
  },
});

const makeRef = (p) => ({
  path: p,
  id: claveDe(p),
  collection: (name) => ({ doc: (id) => makeRef(`${p}/${name}/${id}`) }),
  get: async () => {
    registrarLectura(`get:${p}`);
    if (coleccionesQueFallan.has(p.split("/")[0])) {
      throw new Error(`fallo simulado leyendo ${p}`);
    }
    return snap(p);
  },
});

const confirmar = (escrituras) => {
  for (const { tipo, ref, data } of escrituras) {
    if (tipo === "create") {
      if (ref.path in store) {
        const error = new Error(`ALREADY_EXISTS: ${ref.path}`);
        error.code = 6;
        throw error;
      }
      store[ref.path] = data;
      created[ref.path] = data;
    } else if (tipo === "set") {
      // set no falla si el documento ya existe: lo reemplaza.
      store[ref.path] = data;
      seteados[ref.path] = data;
    } else {
      if (!(ref.path in store)) {
        const error = new Error(`NOT_FOUND: ${ref.path}`);
        error.code = 5;
        throw error;
      }
      store[ref.path] = { ...store[ref.path], ...data };
      (updated[ref.path] ||= []).push(data);
    }
  }
};

const db = {
  collection: (name) => ({
    ...crearConsulta(name, []),
    doc: (id) => makeRef(`${name}/${id}`),
  }),
  runTransaction: async (fn) => {
    const intentos = reintentos + 1;

    for (let i = 0; i < intentos; i += 1) {
      const actual = { escrituras: [], escribio: false };
      transaccionActiva = actual;
      bitacora = [];

      const transaction = {
        get: async (objetivo) => {
          if (objetivo.__query) {
            registrarLectura(`query:${objetivo.col}`);
            bitacora.push(`query:${objetivo.col}`);
            return runQuery(objetivo);
          }
          registrarLectura(`get:${objetivo.path}`);
          bitacora.push(`get:${objetivo.path}`);
          if (ocultosEnTransaccion.has(objetivo.path)) {
            return { exists: false, id: objetivo.id, data: () => undefined };
          }
          return snap(objetivo.path);
        },
        create: (ref, data) => {
          actual.escribio = true;
          bitacora.push(`create:${ref.path}`);
          actual.escrituras.push({ tipo: "create", ref, data });
        },
        set: (ref, data) => {
          actual.escribio = true;
          bitacora.push(`set:${ref.path}`);
          actual.escrituras.push({ tipo: "set", ref, data });
        },
        update: (ref, data) => {
          actual.escribio = true;
          bitacora.push(`update:${ref.path}`);
          actual.escrituras.push({ tipo: "update", ref, data });
        },
      };

      let resultado;
      try {
        resultado = await fn(transaction);
      } finally {
        transaccionActiva = null;
      }

      // Un intento descartado se tira entero, como haría Firestore ante
      // una contención: sus escrituras nunca llegan a confirmarse.
      if (i === intentos - 1) {
        confirmar(actual.escrituras);
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
      Timestamp: {
        fromDate: (fecha) => ({ __timestamp: true, toDate: () => fecha }),
      },
    };
  }
  return original.call(this, request, ...rest);
};

const { registrarIntento } = require(path.join(
  __dirname,
  "../src/registrarIntento.js"
));

test.after(() => {
  Module._load = original;
});

/* ------------------------------------------------------------------ */
/* Datos y helpers                                                     */
/* ------------------------------------------------------------------ */

// 10:00 en Bogotá. Se fija para que la racha sea determinista.
const AHORA_ISO = "2026-10-19T15:00:00.000Z";

const ts = (iso) => ({ toDate: () => new Date(iso) });

const baseStore = () => ({
  "usuarios/est1": { rol: "estudiante" },
  "usuarios/est2": { rol: "estudiante", xp: 9999 },
  "usuarios/doc1": { rol: "docente" },
  "actividades/act1": {
    lecturaId: "lec1",
    estado: "asignada",
    estudiantesAsignados: ["est1"],
  },
  "preguntas/p1": {
    lecturaId: "lec1",
    tipo: "seleccion_multiple",
    enunciado: "?",
    opciones: ["a", "b"],
  },
  "preguntas/p1/solucion/datos": {
    respuestaCorrecta: "a",
    explicacion: "porque a",
  },
  "preguntas/p2": {
    lecturaId: "lec1",
    tipo: "verdadero_falso",
    enunciado: "?",
    opciones: ["Verdadero", "Falso"],
  },
  "preguntas/p2/solucion/datos": {
    respuestaCorrecta: "Falso",
    explicacion: "porque falso",
  },
  "config_negocio/gamificacion": {
    xpPorRespuestaCorrecta: 10,
    xpBonoActividadCompleta: 20,
  },
  "niveles_config/nivel-1": { nivel: 1, xpMinimo: 0 },
  "niveles_config/nivel-2": { nivel: 2, xpMinimo: 100 },
  "niveles_config/nivel-3": { nivel: 3, xpMinimo: 250 },
  "niveles_config/nivel-4": { nivel: 4, xpMinimo: 500 },
  "logros/logro-primer-paso": {
    nombre: "Primer paso",
    descripcion: "Completaste tu primera actividad.",
    criterioTipo: "actividades",
    criterioValor: 1,
  },
  "logros/logro-lector-constante": {
    nombre: "Lector constante",
    descripcion: "Completaste cinco actividades.",
    criterioTipo: "actividades",
    criterioValor: 5,
  },
  "logros/logro-perfeccionista": {
    nombre: "Perfeccionista",
    descripcion: "Acertaste todo.",
    criterioTipo: "desempeño",
    criterioValor: 100,
  },
  "logros/logro-racha-3": {
    nombre: "Tres días seguidos",
    descripcion: "Leíste tres días seguidos.",
    criterioTipo: "racha",
    criterioValor: 3,
  },
  "logros/logro-racha-7": {
    nombre: "Una semana de lectura",
    descripcion: "Leíste siete días seguidos.",
    criterioTipo: "racha",
    criterioValor: 7,
  },
});

const reset = (s = baseStore()) => {
  store = s;
  created = {};
  seteados = {};
  updated = {};
  bitacora = [];
  lecturasTrasEscritura = [];
  transaccionActiva = null;
  reintentos = 0;
  coleccionesQueFallan = new Set();
  ocultosEnTransaccion = new Set();
};

test.beforeEach((t) => {
  t.mock.timers.enable({ apis: ["Date"], now: new Date(AHORA_ISO) });
  // Silencia console.warn salvo en los tests que lo observan.
  t.mock.method(console, "warn", () => {});
  t.mock.method(console, "error", () => {});
  reset();
});

const todasCorrectas = [
  { preguntaId: "p1", respuestaDada: "a" },
  { preguntaId: "p2", respuestaDada: "Falso" },
];

// Si alguna lectura ocurre tras una escritura, el test falla aunque la
// llamada haya salido bien.
const call = async (uid, data) => {
  try {
    return await registrarIntento({
      auth: uid ? { uid, token: {} } : null,
      data,
    });
  } finally {
    assert.deepEqual(
      lecturasTrasEscritura,
      [],
      "hubo lecturas después de una escritura dentro de la transacción"
    );
  }
};

const resolver = (uid = "est1", actividadId = "act1") =>
  call(uid, { actividadId, respuestas: todasCorrectas });

const rejects = async (promesa, code) => {
  await assert.rejects(promesa, (e) => {
    assert.equal(e.code, code, e.message);
    return true;
  });
};

const idsDe = (logros) => logros.map((l) => l.id).sort();

/* ------------------------------------------------------------------ */
/* Comportamiento previo (no debe cambiar)                             */
/* ------------------------------------------------------------------ */

test("estudiante con rol en Firestore (sin custom claims) puede registrar", async () => {
  const r = await resolver();
  assert.equal(r.ok, true);
  assert.equal(r.porcentajeAciertos, 100);
  assert.equal(r.xpGanado, 40);
  assert.equal(r.respuestas[0].explicacion, "porque a");
  assert.ok(created["intentos/act1_est1"]);
});

test("califica contra solucion/datos, no contra el doc de la pregunta", async () => {
  store["preguntas/p1"].respuestaCorrecta = "b"; // dato "viejo" en el doc público
  const r = await call("est1", {
    actividadId: "act1",
    respuestas: [
      { preguntaId: "p1", respuestaDada: "b" },
      { preguntaId: "p2", respuestaDada: "Falso" },
    ],
  });
  assert.equal(r.respuestas[0].correcta, false);
});

test("respuesta incorrecta suma 0", async () => {
  const r = await call("est1", {
    actividadId: "act1",
    respuestas: [
      { preguntaId: "p1", respuestaDada: "b" },
      { preguntaId: "p2", respuestaDada: "Verdadero" },
    ],
  });
  assert.equal(r.porcentajeAciertos, 0);
  assert.equal(r.xpGanado, 0);
});

test("docente es rechazado", async () => {
  await rejects(
    call("doc1", {
      actividadId: "act1",
      respuestas: [{ preguntaId: "p1", respuestaDada: "a" }],
    }),
    "permission-denied"
  );
});

test("usuario sin documento en usuarios es rechazado", async () => {
  await rejects(
    call("fantasma", {
      actividadId: "act1",
      respuestas: [{ preguntaId: "p1", respuestaDada: "a" }],
    }),
    "permission-denied"
  );
});

test("sin sesión es rechazado", async () => {
  await rejects(
    call(null, {
      actividadId: "act1",
      respuestas: [{ preguntaId: "p1", respuestaDada: "a" }],
    }),
    "unauthenticated"
  );
});

test("pregunta sin solución falla explícitamente y no escribe", async () => {
  delete store["preguntas/p1/solucion/datos"];
  await rejects(resolver(), "failed-precondition");
  assert.deepEqual(created, {});
  assert.deepEqual(updated, {});
});

test("es idempotente: segundo envío devuelve duplicado", async () => {
  store["intentos/act1_est1"] = {
    porcentajeAciertos: 50,
    respuestas: [],
    xpGanado: 10,
    resueltoEn: "x",
  };
  const r = await call("est1", {
    actividadId: "act1",
    respuestas: [{ preguntaId: "p1", respuestaDada: "a" }],
  });
  assert.equal(r.duplicado, true);
  assert.deepEqual(created, {});
});

test("no permite responder solo una parte de las preguntas (XP farming)", async () => {
  await rejects(
    call("est1", {
      actividadId: "act1",
      respuestas: [{ preguntaId: "p1", respuestaDada: "a" }],
    }),
    "invalid-argument"
  );
  assert.deepEqual(created, {});
  assert.deepEqual(updated, {});
});

test("una pregunta de otra lectura no cuenta para la cobertura", async () => {
  store["preguntas/p3"] = {
    lecturaId: "otra",
    tipo: "verdadero_falso",
    opciones: ["Verdadero", "Falso"],
  };
  store["preguntas/p3/solucion/datos"] = {
    respuestaCorrecta: "Verdadero",
    explicacion: "",
  };
  const r = await resolver();
  assert.equal(r.porcentajeAciertos, 100);
});

test("solución con respuestaCorrecta vacía falla explícitamente", async () => {
  store["preguntas/p1/solucion/datos"] = { explicacion: "sin respuesta" };
  await rejects(
    call("est1", {
      actividadId: "act1",
      respuestas: [
        { preguntaId: "p1", respuestaDada: "" },
        { preguntaId: "p2", respuestaDada: "Falso" },
      ],
    }),
    "failed-precondition"
  );
  assert.deepEqual(created, {});
  assert.deepEqual(updated, {});
});

test("respuesta en blanco nunca es correcta", async () => {
  const r = await call("est1", {
    actividadId: "act1",
    respuestas: [
      { preguntaId: "p1", respuestaDada: "" },
      { preguntaId: "p2", respuestaDada: null },
    ],
  });
  assert.equal(r.respuestas[0].correcta, false);
  assert.equal(r.respuestas[1].correcta, false);
});

test("ids con barra son invalid-argument (no internal)", async () => {
  await rejects(
    call("est1", {
      actividadId: "a/b",
      respuestas: [{ preguntaId: "p1", respuestaDada: "a" }],
    }),
    "invalid-argument"
  );
  await rejects(
    call("est1", {
      actividadId: "act1",
      respuestas: [{ preguntaId: "p1/solucion/datos", respuestaDada: "a" }],
    }),
    "invalid-argument"
  );
});

test("tope de respuestas por intento", async () => {
  const respuestas = Array.from({ length: 101 }, (_, i) => ({
    preguntaId: `p${i}`,
    respuestaDada: "a",
  }));
  await rejects(call("est1", { actividadId: "act1", respuestas }), "invalid-argument");
});

test("fecha límite ilegible falla cerrado", async () => {
  store["actividades/act1"].fechaLimite = "no-es-una-fecha";
  await rejects(resolver(), "failed-precondition");
  assert.deepEqual(updated, {});
});

test("resueltoEn tiene la misma forma (ISO) en el primer envío y en la repetición", async () => {
  const primero = await resolver();
  assert.equal(typeof primero.resueltoEn, "string");
  assert.ok(!Number.isNaN(Date.parse(primero.resueltoEn)));

  store["intentos/act1_est1"] = {
    porcentajeAciertos: 100,
    respuestas: [],
    xpGanado: 40,
    resueltoEn: ts("2026-10-19T10:00:00Z"),
  };
  const repetido = await call("est1", {
    actividadId: "act1",
    respuestas: [{ preguntaId: "p1", respuestaDada: "a" }],
  });
  assert.equal(repetido.resueltoEn, "2026-10-19T10:00:00.000Z");
});

test("todas las lecturas de la transacción ocurren antes de escribir", async () => {
  await resolver();
  assert.deepEqual(lecturasTrasEscritura, []);

  // Y en la bitácora: ningún get/query después del primer create/update.
  const primeraEscritura = bitacora.findIndex((op) => /^(create|set|update):/.test(op));
  assert.notEqual(primeraEscritura, -1);
  const lecturasTardias = bitacora
    .slice(primeraEscritura)
    .filter((op) => /^(get|query):/.test(op));
  assert.deepEqual(lecturasTardias, []);
});

/* ------------------------------------------------------------------ */
/* Gamificación: usuarios                                              */
/* ------------------------------------------------------------------ */

test("usuarios recibe xp, nivel, rachaActual y ultimaActividadEn, una sola vez", async () => {
  await resolver();

  assert.deepEqual(Object.keys(updated), ["usuarios/est1"]);
  assert.equal(updated["usuarios/est1"].length, 1);

  const cambios = updated["usuarios/est1"][0];
  assert.deepEqual(Object.keys(cambios).sort(), [
    "nivel",
    "rachaActual",
    "ultimaActividadEn",
    "xp",
  ]);
  assert.equal(cambios.xp, 40);
  assert.equal(cambios.nivel, 1);
  assert.equal(cambios.rachaActual, 1);
  assert.equal(cambios.ultimaActividadEn.toDate().toISOString(), AHORA_ISO);

  // El rol y demás campos del perfil se conservan.
  assert.equal(store["usuarios/est1"].rol, "estudiante");
});

test("xp se acumula sobre el valor previo (valor absoluto, no incremento)", async () => {
  store["usuarios/est1"] = { rol: "estudiante", xp: 300, nivel: 3 };
  const r = await resolver();
  assert.equal(store["usuarios/est1"].xp, 340);
  assert.equal(r.xpTotal, 340);
  assert.equal(r.xpGanado, 40);
  assert.equal(r.nivel, 3);
});

test("cruzar un umbral sube el nivel y marca subioDeNivel", async () => {
  store["usuarios/est1"] = { rol: "estudiante", xp: 80, nivel: 1 };
  const r = await resolver(); // 80 + 40 = 120 >= 100

  assert.equal(store["usuarios/est1"].nivel, 2);
  assert.equal(r.nivel, 2);
  assert.equal(r.nivelAnterior, 1);
  assert.equal(r.subioDeNivel, true);
});

test("el límite exacto del umbral cuenta como subida", async () => {
  store["usuarios/est1"] = { rol: "estudiante", xp: 60, nivel: 1 };
  const r = await resolver(); // 60 + 40 = 100
  assert.equal(r.nivel, 2);
  assert.equal(r.subioDeNivel, true);
});

test("sin cruzar un umbral subioDeNivel es false", async () => {
  store["usuarios/est1"] = { rol: "estudiante", xp: 10, nivel: 1 };
  const r = await resolver(); // 50
  assert.equal(r.nivel, 1);
  assert.equal(r.nivelAnterior, 1);
  assert.equal(r.subioDeNivel, false);
});

test("niveles_config vacío deja el nivel como estaba y aun así actualiza xp y racha", async () => {
  for (const clave of Object.keys(store)) {
    if (clave.startsWith("niveles_config/")) delete store[clave];
  }
  store["usuarios/est1"] = { rol: "estudiante", xp: 1000, nivel: 3 };

  const r = await resolver();

  assert.equal(store["usuarios/est1"].nivel, 3);
  assert.equal(store["usuarios/est1"].xp, 1040);
  assert.equal(store["usuarios/est1"].rachaActual, 1);
  assert.equal(r.nivel, 3);
  assert.equal(r.subioDeNivel, false);
});

test("niveles_config vacío y perfil sin nivel deja nivel 1", async () => {
  for (const clave of Object.keys(store)) {
    if (clave.startsWith("niveles_config/")) delete store[clave];
  }
  const r = await resolver();
  assert.equal(store["usuarios/est1"].nivel, 1);
  assert.equal(r.nivel, 1);
  assert.equal(r.nivelAnterior, 1);
});

test("niveles_config con documentos mal formados los ignora", async () => {
  store["niveles_config/roto-1"] = { nivel: "x", xpMinimo: 5 };
  store["niveles_config/roto-2"] = { nivel: 9, xpMinimo: -1 };
  store["usuarios/est1"] = { rol: "estudiante", xp: 80, nivel: 1 };
  const r = await resolver();
  assert.equal(r.nivel, 2);
});

test("campos de gamificación corruptos en el perfil se toman como valores por defecto", async () => {
  store["usuarios/est1"] = {
    rol: "estudiante",
    xp: "mucho",
    nivel: "alto",
    rachaActual: -4,
    ultimaActividadEn: "ayer",
  };
  const r = await resolver();
  assert.equal(r.xpTotal, 40);
  assert.equal(r.nivelAnterior, 1);
  assert.equal(r.racha, 1);
});

/* ------------------------------------------------------------------ */
/* Gamificación: configuración de XP                                   */
/* ------------------------------------------------------------------ */

test("sin config_negocio/gamificacion usa 10 y 20 y avisa con console.warn", async (t) => {
  delete store["config_negocio/gamificacion"];
  const r = await resolver();

  assert.equal(r.xpGanado, 40);
  assert.equal(store["intentos/act1_est1"].xpGanado, 40);
  assert.equal(console.warn.mock.callCount(), 1);
});

test("config inválida usa los valores por defecto", async () => {
  store["config_negocio/gamificacion"] = {
    xpPorRespuestaCorrecta: -5,
    xpBonoActividadCompleta: "x",
  };
  const r = await resolver();
  assert.equal(r.xpGanado, 40);
  assert.equal(console.warn.mock.callCount(), 1);
});

test("con config válida no se avisa", async () => {
  await resolver();
  assert.equal(console.warn.mock.callCount(), 0);
});

test("usa los valores de config_negocio/gamificacion cuando existen", async () => {
  store["config_negocio/gamificacion"] = {
    xpPorRespuestaCorrecta: 5,
    xpBonoActividadCompleta: 50,
  };
  const r = await resolver(); // 2 * 5 + 50
  assert.equal(r.xpGanado, 60);
  assert.equal(store["intentos/act1_est1"].xpGanado, 60);
  assert.equal(r.xpTotal, 60);
});

// Un error de lectura no es "falta el seed": con el id determinista no hay
// reintento posterior, así que degradar a los valores por defecto otorgaría
// XP definitivo con datos equivocados. Se aborta antes de escribir.
const MENSAJE_CONFIG =
  "No pudimos cargar la configuración, inténtalo de nuevo en unos segundos.";

for (const coleccion of ["config_negocio", "niveles_config"]) {
  test(`un error leyendo ${coleccion} aborta con unavailable y no escribe`, async () => {
    coleccionesQueFallan = new Set([coleccion]);

    await assert.rejects(resolver(), (e) => {
      assert.equal(e.code, "unavailable");
      assert.equal(e.message, MENSAJE_CONFIG);
      return true;
    });

    assert.deepEqual(created, {});
    assert.deepEqual(seteados, {});
    assert.deepEqual(updated, {});
    assert.equal(store["usuarios/est1"].xp, undefined);
  });

  test(`tras un error en ${coleccion} el cliente puede reintentar y el intento se registra`, async () => {
    coleccionesQueFallan = new Set([coleccion]);
    await rejects(resolver(), "unavailable");

    coleccionesQueFallan = new Set();
    const r = await resolver();

    assert.equal(r.ok, true);
    assert.equal(r.duplicado, false);
    assert.equal(r.xpTotal, 40);
  });
}

test("si fallan las dos lecturas de configuración también se aborta con unavailable", async () => {
  coleccionesQueFallan = new Set(["config_negocio", "niveles_config"]);
  await rejects(resolver(), "unavailable");
  assert.deepEqual(created, {});
  assert.deepEqual(updated, {});
});

test("un documento de configuración inexistente NO es un error de lectura: sigue el fallback", async () => {
  delete store["config_negocio/gamificacion"];
  for (const clave of Object.keys(store)) {
    if (clave.startsWith("niveles_config/")) delete store[clave];
  }
  const r = await resolver();
  assert.equal(r.ok, true);
  assert.equal(r.xpGanado, 40);
});

test("un logros_usuario existente que la consulta por estudianteId no devuelve no rompe el intento", async () => {
  // Documento creado a mano, sin estudianteId/logroId: la consulta de
  // "ya obtenidos" no lo ve y el logro se vuelve a calcular como nuevo.
  store["logros_usuario/est1_logro-primer-paso"] = { obtenidoEn: "antes" };

  const r = await resolver();

  assert.equal(r.ok, true);
  assert.ok(idsDe(r.logrosNuevos).includes("logro-primer-paso"));
  // Con set el documento queda normalizado en vez de lanzar ALREADY_EXISTS.
  assert.deepEqual(seteados["logros_usuario/est1_logro-primer-paso"], {
    id: "est1_logro-primer-paso",
    estudianteId: "est1",
    logroId: "logro-primer-paso",
    obtenidoEn: "TS",
  });
  assert.ok(created["intentos/act1_est1"]);
});

/* ------------------------------------------------------------------ */
/* Gamificación: racha                                                 */
/* ------------------------------------------------------------------ */

test("primera actividad: racha 1", async () => {
  const r = await resolver();
  assert.equal(r.racha, 1);
});

test("actividad el mismo día: la racha no cambia", async () => {
  store["usuarios/est1"] = {
    rol: "estudiante",
    rachaActual: 4,
    ultimaActividadEn: ts("2026-10-19T08:00:00Z"),
  };
  const r = await resolver();
  assert.equal(r.racha, 4);
  assert.equal(store["usuarios/est1"].rachaActual, 4);
});

test("actividad el día siguiente: la racha suma 1", async () => {
  store["usuarios/est1"] = {
    rol: "estudiante",
    rachaActual: 4,
    ultimaActividadEn: ts("2026-10-18T20:00:00Z"),
  };
  const r = await resolver();
  assert.equal(r.racha, 5);
  assert.equal(store["usuarios/est1"].rachaActual, 5);
});

test("tras un hueco la racha vuelve a 1", async () => {
  store["usuarios/est1"] = {
    rol: "estudiante",
    rachaActual: 9,
    ultimaActividadEn: ts("2026-10-16T20:00:00Z"),
  };
  const r = await resolver();
  assert.equal(r.racha, 1);
});

test("medianoche en Bogotá: 23:59 local y 00:01 local son días consecutivos", async (t) => {
  // Ahora = 00:01 del 20 en Bogotá (05:01 UTC); la última fue 23:59 del 19.
  t.mock.timers.reset();
  t.mock.timers.enable({ apis: ["Date"], now: new Date("2026-10-20T05:01:00Z") });
  store["usuarios/est1"] = {
    rol: "estudiante",
    rachaActual: 2,
    ultimaActividadEn: ts("2026-10-20T04:59:00Z"),
  };
  const r = await resolver();
  assert.equal(r.racha, 3);
});

test("ultimaActividadEn queda con la hora del servidor", async () => {
  await resolver();
  const { ultimaActividadEn } = updated["usuarios/est1"][0];
  assert.equal(ultimaActividadEn.toDate().toISOString(), AHORA_ISO);
});

/* ------------------------------------------------------------------ */
/* Gamificación: logros                                                */
/* ------------------------------------------------------------------ */

test("el primer intento otorga 'actividades 1' y lo guarda con id determinista", async () => {
  store["intentos/acto-previo-otro"] = { estudianteId: "est2" }; // de otro alumno: no cuenta
  const r = await call("est1", {
    actividadId: "act1",
    respuestas: [
      { preguntaId: "p1", respuestaDada: "b" }, // 0 %: sólo 'actividades'
      { preguntaId: "p2", respuestaDada: "Verdadero" },
    ],
  });

  assert.deepEqual(idsDe(r.logrosNuevos), ["logro-primer-paso"]);
  assert.deepEqual(r.logrosNuevos[0], {
    id: "logro-primer-paso",
    nombre: "Primer paso",
    descripcion: "Completaste tu primera actividad.",
    iconoUrl: null,
  });
  assert.deepEqual(seteados["logros_usuario/est1_logro-primer-paso"], {
    id: "est1_logro-primer-paso",
    estudianteId: "est1",
    logroId: "logro-primer-paso",
    obtenidoEn: "TS",
  });
});

test("un segundo intento no vuelve a otorgar el mismo logro", async () => {
  store["actividades/act2"] = {
    lecturaId: "lec1",
    estado: "asignada",
    estudiantesAsignados: ["est1"],
  };

  const primero = await resolver("est1", "act1");
  assert.ok(idsDe(primero.logrosNuevos).includes("logro-primer-paso"));

  created = {};
  seteados = {};
  updated = {};
  const segundo = await resolver("est1", "act2");

  assert.ok(!idsDe(segundo.logrosNuevos).includes("logro-primer-paso"));
  assert.ok(!idsDe(segundo.logrosNuevos).includes("logro-perfeccionista"));
  assert.ok(!("logros_usuario/est1_logro-primer-paso" in seteados));
  // El perfil sí se actualiza otra vez, con el xp acumulado.
  assert.equal(store["usuarios/est1"].xp, 80);
});

test("logros ya obtenidos en logros_usuario no se vuelven a crear", async () => {
  store["logros_usuario/est1_logro-primer-paso"] = {
    id: "est1_logro-primer-paso",
    estudianteId: "est1",
    logroId: "logro-primer-paso",
    obtenidoEn: "antes",
  };
  const r = await resolver();
  assert.ok(!idsDe(r.logrosNuevos).includes("logro-primer-paso"));
  assert.equal(store["logros_usuario/est1_logro-primer-paso"].obtenidoEn, "antes");
});

test("'actividades N' cuenta los intentos previos del alumno más el actual", async () => {
  for (let i = 1; i <= 3; i += 1) {
    store[`intentos/x${i}_est1`] = { estudianteId: "est1" };
  }
  // 3 previos + el actual = 4: todavía no llega a 5.
  let r = await resolver();
  assert.ok(!idsDe(r.logrosNuevos).includes("logro-lector-constante"));

  reset();
  for (let i = 1; i <= 4; i += 1) {
    store[`intentos/x${i}_est1`] = { estudianteId: "est1" };
  }
  // 4 previos + el actual = 5.
  r = await resolver();
  assert.ok(idsDe(r.logrosNuevos).includes("logro-lector-constante"));
});

test("'desempeño' se otorga con 100 % y no con menos", async () => {
  const perfecto = await resolver();
  assert.ok(idsDe(perfecto.logrosNuevos).includes("logro-perfeccionista"));

  reset();
  const parcial = await call("est1", {
    actividadId: "act1",
    respuestas: [
      { preguntaId: "p1", respuestaDada: "a" },
      { preguntaId: "p2", respuestaDada: "Verdadero" },
    ],
  });
  assert.ok(!idsDe(parcial.logrosNuevos).includes("logro-perfeccionista"));
});

test("'desempeno' (sin ñ) en el catálogo también se reconoce", async () => {
  store["logros/logro-perfeccionista"].criterioTipo = "desempeno";
  const r = await resolver();
  assert.ok(idsDe(r.logrosNuevos).includes("logro-perfeccionista"));
});

test("'racha' se evalúa con la racha nueva, no con la anterior", async () => {
  store["usuarios/est1"] = {
    rol: "estudiante",
    rachaActual: 2,
    ultimaActividadEn: ts("2026-10-18T20:00:00Z"),
  };
  const r = await resolver(); // 2 -> 3
  assert.equal(r.racha, 3);
  assert.ok(idsDe(r.logrosNuevos).includes("logro-racha-3"));
  assert.ok(!idsDe(r.logrosNuevos).includes("logro-racha-7"));
});

test("catálogo de logros vacío no otorga nada ni falla", async () => {
  for (const clave of Object.keys(store)) {
    if (clave.startsWith("logros/")) delete store[clave];
  }
  const r = await resolver();
  assert.deepEqual(r.logrosNuevos, []);
  assert.deepEqual(seteados, {});
});

test("un logro de tipo desconocido en el catálogo se salta sin romper el intento", async () => {
  store["logros/logro-raro"] = {
    nombre: "Raro",
    descripcion: "?",
    criterioTipo: "inventado",
    criterioValor: 1,
  };
  const r = await resolver();
  assert.equal(r.ok, true);
  assert.ok(!idsDe(r.logrosNuevos).includes("logro-raro"));
});

/* ------------------------------------------------------------------ */
/* Duplicados                                                          */
/* ------------------------------------------------------------------ */

test("un duplicado no toca usuarios ni logros_usuario y no cuenta el XP dos veces", async () => {
  store["usuarios/est1"] = { rol: "estudiante", xp: 40, nivel: 1, rachaActual: 1 };
  store["intentos/act1_est1"] = {
    porcentajeAciertos: 100,
    respuestas: [],
    xpGanado: 40,
    resueltoEn: ts("2026-10-19T10:00:00Z"),
  };

  const r = await resolver();

  assert.equal(r.duplicado, true);
  assert.equal(r.xpGanado, 40);
  assert.deepEqual(created, {});
  assert.deepEqual(updated, {});
  assert.equal(store["usuarios/est1"].xp, 40);
  // Ni siquiera se leyó el estado de gamificación.
  assert.deepEqual(
    bitacora.filter((op) => /logros|usuarios|query:intentos/.test(op)),
    []
  );
});

test("un duplicado omite los campos de gamificación en la respuesta", async () => {
  store["intentos/act1_est1"] = {
    porcentajeAciertos: 100,
    respuestas: [],
    xpGanado: 40,
    resueltoEn: ts("2026-10-19T10:00:00Z"),
  };
  const r = await resolver();
  for (const campo of [
    "nivel",
    "nivelAnterior",
    "subioDeNivel",
    "xpTotal",
    "racha",
    "logrosNuevos",
  ]) {
    assert.equal(campo in r, false, `no debe incluir ${campo}`);
  }
});

/* ------------------------------------------------------------------ */
/* Forma del intento y de la respuesta                                 */
/* ------------------------------------------------------------------ */

test("el intento guardado conserva exactamente los mismos campos", async () => {
  await resolver();
  const intento = created["intentos/act1_est1"];
  assert.deepEqual(Object.keys(intento).sort(), [
    "actividadId",
    "estudianteId",
    "id",
    "porcentajeAciertos",
    "respuestas",
    "resueltoEn",
    "xpGanado",
  ]);
  assert.equal(intento.id, "act1_est1");
  assert.equal(intento.actividadId, "act1");
  assert.equal(intento.estudianteId, "est1");
  assert.equal(intento.porcentajeAciertos, 100);
  assert.equal(intento.xpGanado, 40);
  assert.equal(intento.resueltoEn, "TS");
});

test("la respuesta conserva los campos previos y añade los nuevos", async () => {
  const r = await resolver();

  assert.deepEqual(Object.keys(r).sort(), [
    "duplicado",
    "intentoId",
    "logrosNuevos",
    "nivel",
    "nivelAnterior",
    "ok",
    "porcentajeAciertos",
    "racha",
    "respuestas",
    "resueltoEn",
    "subioDeNivel",
    "xpGanado",
    "xpTotal",
  ]);

  assert.equal(r.ok, true);
  assert.equal(r.duplicado, false);
  assert.equal(r.intentoId, "act1_est1");
  assert.equal(r.porcentajeAciertos, 100);
  assert.equal(r.xpGanado, 40);
  assert.equal(r.xpTotal, 40);
  assert.equal(r.nivel, 1);
  assert.equal(r.nivelAnterior, 1);
  assert.equal(r.subioDeNivel, false);
  assert.equal(r.racha, 1);
  assert.ok(Array.isArray(r.logrosNuevos));
  for (const logro of r.logrosNuevos) {
    assert.deepEqual(Object.keys(logro).sort(), [
      "descripcion",
      "iconoUrl",
      "id",
      "nombre",
    ]);
  }
});

/* ------------------------------------------------------------------ */
/* Transacción                                                         */
/* ------------------------------------------------------------------ */

test("las escrituras son intento, usuario y logros, todas después de las lecturas", async () => {
  await resolver();

  const escrituras = bitacora.filter((op) => /^(create|set|update):/.test(op));
  assert.equal(escrituras[0], "create:intentos/act1_est1");
  assert.equal(escrituras[1], "update:usuarios/est1");
  assert.ok(
    escrituras.slice(2).every((op) => op.startsWith("set:logros_usuario/est1_"))
  );
  assert.equal(
    escrituras.filter((op) => op === "update:usuarios/est1").length,
    1
  );
});

test("si Firestore reintenta el callback, el resultado y las escrituras son los mismos", async () => {
  store["usuarios/est1"] = { rol: "estudiante", xp: 80, nivel: 1 };
  reintentos = 2; // el callback corre 3 veces; sólo la última se confirma

  const r = await resolver();

  assert.equal(r.xpTotal, 120);
  assert.equal(store["usuarios/est1"].xp, 120);
  assert.equal(updated["usuarios/est1"].length, 1);
  assert.equal(Object.keys(created).filter((p) => p.startsWith("intentos/")).length, 1);
});

test("si el perfil desaparece dentro de la transacción falla con un error claro y no escribe", async () => {
  // Simula la carrera: el rol se leyó fuera, pero al transaccionar ya no está.
  ocultosEnTransaccion = new Set(["usuarios/est1"]);

  await rejects(resolver(), "failed-precondition");
  assert.deepEqual(created, {});
  assert.deepEqual(updated, {});
});
