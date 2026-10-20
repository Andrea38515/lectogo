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
let historialIntentos; // escrituras de CADA ejecución del callback (también las descartadas)
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

      historialIntentos.push(
        actual.escrituras.map(({ tipo, ref, data }) => ({ tipo, path: ref.path, data }))
      );

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
  historialIntentos = [];
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
    assert.ok(!("ranking/est1" in store));
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
  // Misma lectura: el perfil se actualiza otra vez (racha) pero el XP no
  // vuelve a sumar.
  assert.equal(store["usuarios/est1"].xp, 40);
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
  assert.deepEqual(Object.keys(seteados), ["ranking/est1"]);
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
    "xpRepetida",
    "racha",
    "logrosNuevos",
  ]) {
    assert.equal(campo in r, false, `no debe incluir ${campo}`);
  }
});

/* ------------------------------------------------------------------ */
/* Forma del intento y de la respuesta                                 */
/* ------------------------------------------------------------------ */

test("el intento guardado tiene los 8 campos (los de siempre más lecturaId)", async () => {
  await resolver();
  const intento = created["intentos/act1_est1"];
  assert.deepEqual(Object.keys(intento).sort(), [
    "actividadId",
    "estudianteId",
    "id",
    "lecturaId",
    "porcentajeAciertos",
    "respuestas",
    "resueltoEn",
    "xpGanado",
  ]);
  assert.equal(intento.id, "act1_est1");
  assert.equal(intento.actividadId, "act1");
  assert.equal(intento.estudianteId, "est1");
  assert.equal(intento.lecturaId, "lec1");
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
    "xpRepetida",
    "xpTotal",
  ]);

  assert.equal(r.xpRepetida, false);
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
  // Después del intento y del perfil: los logros y, al final, el ranking.
  assert.ok(
    escrituras
      .slice(2, -1)
      .every((op) => op.startsWith("set:logros_usuario/est1_"))
  );
  assert.equal(escrituras[escrituras.length - 1], "set:ranking/est1");
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

/* ------------------------------------------------------------------ */
/* Ranking                                                             */
/* ------------------------------------------------------------------ */

const CAMPOS_RANKING = [
  "actividades",
  "actualizadoEn",
  "alias",
  "estudianteId",
  "logros",
  "nivel",
  "xp",
];

test("escribe ranking/{uid} una sola vez con exactamente los 7 campos", async () => {
  await resolver();

  const escritosEnRanking = Object.keys(seteados).filter((p) =>
    p.startsWith("ranking/")
  );
  assert.deepEqual(escritosEnRanking, ["ranking/est1"]);
  assert.equal(
    bitacora.filter((op) => op === "set:ranking/est1").length,
    1
  );

  const fila = seteados["ranking/est1"];
  assert.deepEqual(Object.keys(fila).sort(), CAMPOS_RANKING);
  assert.deepEqual(fila, {
    estudianteId: "est1",
    alias: "Lector EST1",
    xp: 40,
    nivel: 1,
    logros: 2, // primer paso + perfeccionista
    actividades: 1,
    actualizadoEn: "TS",
  });
});

test("el xp del ranking acumula sobre el valor previo", async () => {
  store["usuarios/est1"] = { rol: "estudiante", xp: 300, nivel: 3 };
  await resolver();
  assert.equal(seteados["ranking/est1"].xp, 340);
  assert.equal(seteados["ranking/est1"].xp, store["usuarios/est1"].xp);
});

test("el nivel del ranking es el nuevo tras subir de nivel", async () => {
  store["usuarios/est1"] = { rol: "estudiante", xp: 80, nivel: 1 };
  await resolver(); // 120
  assert.equal(seteados["ranking/est1"].nivel, 2);
  assert.equal(seteados["ranking/est1"].xp, 120);
});

test("logros del ranking = distintos ya obtenidos + nuevos", async () => {
  store["logros_usuario/est1_logro-primer-paso"] = {
    id: "est1_logro-primer-paso",
    estudianteId: "est1",
    logroId: "logro-primer-paso",
    obtenidoEn: "antes",
  };
  const r = await resolver(); // sólo gana perfeccionista
  assert.deepEqual(idsDe(r.logrosNuevos), ["logro-perfeccionista"]);
  assert.equal(seteados["ranking/est1"].logros, 2);
});

test("logros del ranking no cuenta dos veces un logro repetido en logros_usuario", async () => {
  store["logros_usuario/est1_logro-primer-paso"] = {
    estudianteId: "est1",
    logroId: "logro-primer-paso",
  };
  // Mismo logro bajo otro id de documento.
  store["logros_usuario/copia-manual"] = {
    estudianteId: "est1",
    logroId: "logro-primer-paso",
  };
  // Documento sin logroId: no es un id de logro.
  store["logros_usuario/roto"] = { estudianteId: "est1" };

  await resolver(); // + perfeccionista
  assert.equal(seteados["ranking/est1"].logros, 2);
});

test("logros del ranking no cuenta los logros de otro estudiante", async () => {
  store["logros_usuario/est2_logro-racha-7"] = {
    estudianteId: "est2",
    logroId: "logro-racha-7",
  };
  await resolver();
  assert.equal(seteados["ranking/est1"].logros, 2);
});

test("actividades del ranking = intentos previos + 1", async () => {
  for (let i = 1; i <= 3; i += 1) {
    store[`intentos/x${i}_est1`] = { estudianteId: "est1" };
  }
  store["intentos/y1_est2"] = { estudianteId: "est2" }; // de otro alumno
  await resolver();
  assert.equal(seteados["ranking/est1"].actividades, 4);
});

test("el ranking nunca guarda nombre, correo, fotoUrl ni otros datos personales", async () => {
  store["usuarios/est1"] = {
    rol: "estudiante",
    nombre: "Ana Pérez",
    correo: "ana@example.com",
    fotoUrl: "https://example.com/ana.png",
    institucion: "Colegio X",
    uid: "est1",
  };
  await resolver();

  const fila = seteados["ranking/est1"];
  assert.deepEqual(Object.keys(fila).sort(), CAMPOS_RANKING);
  const texto = JSON.stringify(fila);
  for (const privado of ["Ana", "Pérez", "example.com", "Colegio"]) {
    assert.ok(!texto.includes(privado), `contiene ${privado}`);
  }
  assert.equal("posicion" in fila, false);
});

// El ranking lo lee cualquier usuario con sesión: el alias del perfil no es
// de confianza (hoy ni siquiera existe), así que SIEMPRE se genera uno
// neutro a partir del uid.
for (const [nombre, alias] of [
  ["válido", "  Lectora Ana "],
  ["con nombre y apellido", "Ana Pérez"],
  ["un correo", "a@b.com"],
  ["vacío", ""],
  ["de 50 caracteres", "x".repeat(50)],
  ["con barra", "x/y"],
  ["no string", 42],
]) {
  test(`un alias de perfil (${nombre}) se ignora y se usa el generado`, async () => {
    store["usuarios/est1"] = { rol: "estudiante", alias };
    await resolver();
    assert.equal(seteados["ranking/est1"].alias, "Lector EST1");
  });
}

test("dos uids que terminan igual obtienen el mismo alias (colisión documentada)", async () => {
  // El frontend debe usar estudianteId como clave, nunca el alias.
  for (const uid of ["aaaa-WXYZ", "bbbb-WXYZ"]) {
    store[`usuarios/${uid}`] = { rol: "estudiante" };
  }
  store["actividades/act1"].estudiantesAsignados = ["aaaa-WXYZ", "bbbb-WXYZ"];

  await resolver("aaaa-WXYZ");
  await resolver("bbbb-WXYZ");

  assert.equal(seteados["ranking/aaaa-WXYZ"].alias, "Lector WXYZ");
  assert.equal(seteados["ranking/bbbb-WXYZ"].alias, "Lector WXYZ");
  assert.equal(seteados["ranking/aaaa-WXYZ"].estudianteId, "aaaa-WXYZ");
  assert.equal(seteados["ranking/bbbb-WXYZ"].estudianteId, "bbbb-WXYZ");
});

test("sin alias en el perfil el alias generado es siempre el mismo", async () => {
  await resolver();
  const primero = seteados["ranking/est1"].alias;

  reset();
  await resolver();
  assert.equal(seteados["ranking/est1"].alias, primero);
});

test("un duplicado no escribe nada en ranking", async () => {
  store["intentos/act1_est1"] = {
    porcentajeAciertos: 100,
    respuestas: [],
    xpGanado: 40,
    resueltoEn: ts("2026-10-19T10:00:00Z"),
  };
  await resolver();
  assert.deepEqual(seteados, {});
  assert.ok(!("ranking/est1" in store));
  assert.deepEqual(
    bitacora.filter((op) => /ranking/.test(op)),
    []
  );
});

test("un intento rechazado no escribe en ranking", async () => {
  delete store["preguntas/p1/solucion/datos"];
  await rejects(resolver(), "failed-precondition");
  assert.ok(!("ranking/est1" in store));
});

test("si Firestore reintenta el callback, el ranking escrito es el mismo", async () => {
  store["usuarios/est1"] = { rol: "estudiante", xp: 80, nivel: 1 };
  reintentos = 2; // el callback corre 3 veces; sólo la última se confirma

  await resolver();

  const esperada = {
    estudianteId: "est1",
    alias: "Lector EST1",
    xp: 120,
    nivel: 2,
    logros: 2,
    actividades: 1,
    actualizadoEn: "TS",
  };

  // Se comprueba CADA ejecución del callback, no sólo la confirmada.
  assert.equal(historialIntentos.length, 3);
  for (const [i, escrituras] of historialIntentos.entries()) {
    const filas = escrituras.filter((w) => w.path === "ranking/est1");
    assert.equal(filas.length, 1, `intento ${i + 1}: filas de ranking`);
    assert.equal(filas[0].tipo, "set");
    assert.deepEqual(filas[0].data, esperada, `intento ${i + 1}`);
  }
  assert.deepEqual(seteados["ranking/est1"], esperada);
});

test("con una config de XP fraccionaria usuarios.xp y ranking.xp coinciden y son enteros", async () => {
  store["config_negocio/gamificacion"] = {
    xpPorRespuestaCorrecta: 2.5,
    xpBonoActividadCompleta: 0.5,
  };
  store["usuarios/est1"] = { rol: "estudiante", xp: 10, nivel: 1 };

  const r = await call("est1", {
    actividadId: "act1",
    respuestas: [
      { preguntaId: "p1", respuestaDada: "a" }, // correcta
      { preguntaId: "p2", respuestaDada: "Verdadero" }, // incorrecta
    ],
  }); // 2.5 -> 3

  assert.equal(r.xpGanado, 3);
  assert.equal(store["intentos/act1_est1"].xpGanado, 3);
  assert.equal(store["usuarios/est1"].xp, 13);
  assert.equal(seteados["ranking/est1"].xp, 13);
  assert.equal(store["usuarios/est1"].xp, seteados["ranking/est1"].xp);
  assert.ok(Number.isInteger(store["usuarios/est1"].xp));
  assert.equal(r.xpTotal, 13);
});

test("con bono fraccionario al 100 % xp sigue siendo entero y coincide", async () => {
  store["config_negocio/gamificacion"] = {
    xpPorRespuestaCorrecta: 2.5,
    xpBonoActividadCompleta: 10.4,
  };
  await resolver(); // 5 + 10.4 = 15.4 -> 15
  assert.equal(store["usuarios/est1"].xp, 15);
  assert.equal(seteados["ranking/est1"].xp, 15);
});

test("el nivel del ranking nunca baja de 1", async () => {
  for (const clave of Object.keys(store)) {
    if (clave.startsWith("niveles_config/")) delete store[clave];
  }
  store["usuarios/est1"] = { rol: "estudiante", nivel: 0 };
  await resolver();
  assert.equal(seteados["ranking/est1"].nivel, 1);
  assert.equal(store["usuarios/est1"].nivel, 1);
});

// Rechazos que ocurren dentro de la transacción, algunos tras leer el perfil:
// no debe quedar ninguna escritura, tampoco la del ranking.
const rechazos = [
  [
    "estudiante no asignado (permission-denied)",
    () => {
      store["actividades/act1"].estudiantesAsignados = ["otro"];
    },
    "permission-denied",
  ],
  [
    "actividad cerrada (failed-precondition)",
    () => {
      store["actividades/act1"].estado = "cerrada";
    },
    "failed-precondition",
  ],
  [
    "respuestas incompletas (invalid-argument)",
    () => {
      delete store["preguntas/p2/solucion/datos"];
      store["preguntas/p3"] = {
        lecturaId: "lec1",
        tipo: "verdadero_falso",
        opciones: ["Verdadero", "Falso"],
      };
    },
    "invalid-argument",
  ],
  [
    "perfil desaparecido tras leerlo (failed-precondition)",
    () => {
      ocultosEnTransaccion = new Set(["usuarios/est1"]);
    },
    "failed-precondition",
  ],
];

for (const [nombre, preparar, codigo] of rechazos) {
  test(`un intento rechazado por ${nombre} no deja ninguna escritura`, async () => {
    preparar();
    await rejects(resolver(), codigo);
    assert.deepEqual(created, {});
    assert.deepEqual(seteados, {});
    assert.deepEqual(updated, {});
    assert.ok(!("ranking/est1" in store));
    assert.ok(!("intentos/act1_est1" in store));
    assert.equal(store["usuarios/est1"].xp, undefined);
    assert.ok(
      historialIntentos.every((escrituras) => escrituras.length === 0)
    );
  });
}

test("el ranking se escribe al final, después de todas las lecturas", async () => {
  await resolver();

  const ultimaLectura = bitacora.reduce(
    (indice, op, i) => (/^(get|query):/.test(op) ? i : indice),
    -1
  );
  const indiceRanking = bitacora.indexOf("set:ranking/est1");
  assert.ok(indiceRanking > ultimaLectura);
  assert.equal(indiceRanking, bitacora.length - 1);
});

test("un error leyendo la configuración sigue abortando antes de escribir el ranking", async () => {
  coleccionesQueFallan = new Set(["config_negocio"]);
  await rejects(resolver(), "unavailable");
  assert.deepEqual(seteados, {});
  assert.ok(!("ranking/est1" in store));
});

test("la respuesta del callable no incluye la fila del ranking", async () => {
  const r = await resolver();
  for (const campo of ["alias", "actividades", "logros", "actualizadoEn", "ranking"]) {
    assert.equal(campo in r, false, `no debe incluir ${campo}`);
  }
});

/* ------------------------------------------------------------------ */
/* XP una sola vez por (estudiante, lectura)                           */
/* ------------------------------------------------------------------ */

const agregarActividad = (id, lecturaId, asignados = ["est1"]) => {
  store[`actividades/${id}`] = {
    lecturaId,
    estado: "asignada",
    estudiantesAsignados: asignados,
  };
};

// Segunda lectura con sus dos preguntas.
const agregarLecturaDos = () => {
  store["preguntas/p3"] = {
    lecturaId: "lec2",
    tipo: "seleccion_multiple",
    enunciado: "?",
    opciones: ["x", "y"],
  };
  store["preguntas/p3/solucion/datos"] = { respuestaCorrecta: "x", explicacion: "" };
  store["preguntas/p4"] = {
    lecturaId: "lec2",
    tipo: "verdadero_falso",
    enunciado: "?",
    opciones: ["Verdadero", "Falso"],
  };
  store["preguntas/p4/solucion/datos"] = { respuestaCorrecta: "Verdadero", explicacion: "" };
};

const respuestasLecturaDos = [
  { preguntaId: "p3", respuestaDada: "x" },
  { preguntaId: "p4", respuestaDada: "Verdadero" },
];

// Intento previo "moderno" (ya con lecturaId) de otra actividad.
const intentoPrevio = (id, extra = {}) => {
  store[`intentos/${id}_est1`] = {
    id: `${id}_est1`,
    actividadId: id,
    estudianteId: "est1",
    lecturaId: "lec1",
    porcentajeAciertos: 100,
    xpGanado: 40,
    ...extra,
  };
};

// Intento previo "legacy": creado antes de existir el campo lecturaId.
const intentoLegacy = (id, extra = {}) => {
  store[`intentos/${id}_est1`] = {
    id: `${id}_est1`,
    actividadId: id,
    estudianteId: "est1",
    porcentajeAciertos: 100,
    xpGanado: 40,
    ...extra,
  };
};

test("el primer intento sobre una lectura da XP y xpRepetida es false", async () => {
  const r = await resolver();
  assert.equal(r.xpGanado, 40);
  assert.equal(r.xpRepetida, false);
  assert.equal(r.xpTotal, 40);
  assert.equal(created["intentos/act1_est1"].lecturaId, "lec1");
  assert.equal(created["intentos/act1_est1"].xpGanado, 40);
});

test("una segunda actividad sobre la MISMA lectura da 0 XP y no cambia xp ni nivel", async () => {
  agregarActividad("act2", "lec1");

  const primero = await resolver("est1", "act1");
  assert.equal(primero.xpGanado, 40);
  assert.equal(store["usuarios/est1"].xp, 40);

  const segundo = await resolver("est1", "act2");

  assert.equal(segundo.xpGanado, 0);
  assert.equal(segundo.xpRepetida, true);
  assert.equal(segundo.xpTotal, 40);
  assert.equal(segundo.nivel, 1);
  assert.equal(segundo.nivelAnterior, 1);
  assert.equal(segundo.subioDeNivel, false);
  assert.equal(store["usuarios/est1"].xp, 40);
  assert.equal(store["usuarios/est1"].nivel, 1);

  // El intento se registra y se califica igual, pero sin XP.
  const intento = store["intentos/act2_est1"];
  assert.equal(intento.xpGanado, 0);
  assert.equal(intento.lecturaId, "lec1");
  assert.equal(intento.porcentajeAciertos, 100);
  assert.equal(segundo.porcentajeAciertos, 100);
  assert.equal(segundo.respuestas.length, 2);
  assert.equal(segundo.respuestas[0].correcta, true);
  assert.equal(segundo.duplicado, false);
});

test("un nivel no sube por repetir la lectura aunque las respuestas sean perfectas", async () => {
  store["usuarios/est1"] = { rol: "estudiante", xp: 90, nivel: 1 };
  intentoPrevio("act0");
  agregarActividad("act2", "lec1");

  const r = await resolver("est1", "act2");

  assert.equal(r.xpRepetida, true);
  assert.equal(store["usuarios/est1"].xp, 90);
  assert.equal(r.nivel, 1);
  assert.equal(r.subioDeNivel, false);
});

test("repetir la lectura sigue actualizando la racha y ultimaActividadEn", async () => {
  store["usuarios/est1"] = {
    rol: "estudiante",
    xp: 40,
    nivel: 1,
    rachaActual: 2,
    ultimaActividadEn: ts("2026-10-18T20:00:00Z"),
  };
  intentoPrevio("act0");
  agregarActividad("act2", "lec1");

  const r = await resolver("est1", "act2");

  assert.equal(r.xpRepetida, true);
  assert.equal(r.racha, 3);
  assert.equal(store["usuarios/est1"].rachaActual, 3);
  assert.equal(
    store["usuarios/est1"].ultimaActividadEn.toDate().toISOString(),
    AHORA_ISO
  );
  assert.equal(store["usuarios/est1"].xp, 40);
});

test("repetir la lectura sigue evaluando logros y contando actividades", async () => {
  intentoPrevio("act0");
  agregarActividad("act2", "lec1");

  const r = await resolver("est1", "act2");

  assert.equal(r.xpGanado, 0);
  assert.equal(r.xpRepetida, true);
  // actividades (1 previa + la actual) y desempeño 100 % siguen otorgando.
  assert.deepEqual(idsDe(r.logrosNuevos), [
    "logro-perfeccionista",
    "logro-primer-paso",
  ]);
  assert.equal(seteados["ranking/est1"].actividades, 2);
  assert.equal(seteados["ranking/est1"].logros, 2);
});

test("una actividad sobre OTRA lectura sí da XP", async () => {
  intentoPrevio("act0"); // lec1 ya resuelta
  agregarLecturaDos();
  agregarActividad("act3", "lec2");
  store["usuarios/est1"] = { rol: "estudiante", xp: 40, nivel: 1 };

  const r = await call("est1", {
    actividadId: "act3",
    respuestas: respuestasLecturaDos,
  });

  assert.equal(r.xpGanado, 40);
  assert.equal(r.xpRepetida, false);
  assert.equal(r.xpTotal, 80);
  assert.equal(created["intentos/act3_est1"].lecturaId, "lec2");
});

test("legacy: un intento previo sin lecturaId cuya actividad es de la misma lectura bloquea el XP", async () => {
  intentoLegacy("old1");
  agregarActividad("old1", "lec1");
  store["usuarios/est1"] = { rol: "estudiante", xp: 40, nivel: 1 };

  const r = await resolver();

  assert.equal(r.xpGanado, 0);
  assert.equal(r.xpRepetida, true);
  assert.equal(store["usuarios/est1"].xp, 40);
  // La actividad legacy se leyó dentro de la transacción, antes de escribir.
  assert.ok(bitacora.includes("get:actividades/old1"));
});

test("legacy: si su actividad ya no existe NO bloquea y no lanza", async () => {
  intentoLegacy("old1"); // no hay actividades/old1
  const r = await resolver();
  assert.equal(r.xpGanado, 40);
  assert.equal(r.xpRepetida, false);
});

test("legacy: si su actividad no tiene lecturaId NO bloquea", async () => {
  intentoLegacy("old1");
  store["actividades/old1"] = { estado: "asignada", estudiantesAsignados: ["est1"] };
  const r = await resolver();
  assert.equal(r.xpGanado, 40);
  assert.equal(r.xpRepetida, false);
});

test("legacy: si su actividad es de otra lectura NO bloquea", async () => {
  intentoLegacy("old1");
  agregarActividad("old1", "lec-otra");
  const r = await resolver();
  assert.equal(r.xpGanado, 40);
  assert.equal(r.xpRepetida, false);
});

test("legacy: un intento sin actividadId usable no bloquea ni lanza", async () => {
  store["intentos/x1_est1"] = { estudianteId: "est1", xpGanado: 40 };
  store["intentos/x2_est1"] = { estudianteId: "est1", actividadId: 42, xpGanado: 40 };
  store["intentos/x3_est1"] = { estudianteId: "est1", actividadId: "a/b", xpGanado: 40 };
  const r = await resolver();
  assert.equal(r.xpGanado, 40);
  assert.equal(r.xpRepetida, false);
  assert.deepEqual(
    bitacora.filter((op) => /^get:actividades\//.test(op)),
    ["get:actividades/act1"] // sólo la actividad actual
  );
});

test("legacy: los actividadId repetidos se leen una sola vez", async () => {
  store["intentos/a_est1"] = { estudianteId: "est1", actividadId: "old1", xpGanado: 40 };
  store["intentos/b_est1"] = { estudianteId: "est1", actividadId: "old1", xpGanado: 40 };
  agregarActividad("old1", "lec1");

  const r = await resolver();

  assert.equal(r.xpRepetida, true);
  assert.equal(bitacora.filter((op) => op === "get:actividades/old1").length, 1);
});

test("la actividad actual nunca cuenta como intento previo de sí misma", async () => {
  // Un intento legacy raro cuyo actividadId es el de la actividad actual:
  // no se vuelve a leer ni bloquea.
  store["intentos/raro_est1"] = { estudianteId: "est1", actividadId: "act1", xpGanado: 40 };

  const r = await resolver();

  assert.equal(r.xpGanado, 40);
  assert.equal(r.xpRepetida, false);
  assert.equal(
    bitacora.filter((op) => op === "get:actividades/act1").length,
    1
  );
});

test("un intento previo con 0 XP (todo mal) NO gasta la oportunidad de ganar XP con esa lectura", async () => {
  intentoPrevio("act0", { xpGanado: 0, porcentajeAciertos: 0 });
  agregarActividad("act2", "lec1");

  const r = await resolver("est1", "act2");

  assert.equal(r.xpGanado, 40);
  assert.equal(r.xpRepetida, false);
});

test("legacy: un intento viejo con 0 XP tampoco bloquea ni provoca lecturas de su actividad", async () => {
  intentoLegacy("old1", { xpGanado: 0 });
  agregarActividad("old1", "lec1");

  const r = await resolver();

  assert.equal(r.xpGanado, 40);
  assert.equal(r.xpRepetida, false);
  assert.equal(bitacora.includes("get:actividades/old1"), false);
});

test("una actividad sin lecturaId válido se rechaza con failed-precondition antes de escribir", async () => {
  for (const lecturaId of [undefined, null, "", 7]) {
    store["actividades/act1"] = { ...store["actividades/act1"], lecturaId };
    await rejects(resolver(), "failed-precondition");
    assert.deepEqual(created, {});
    assert.deepEqual(updated, {});
    assert.deepEqual(seteados, {});
  }
});

test("los intentos de otro estudiante no bloquean el XP", async () => {
  store["intentos/act0_est2"] = {
    estudianteId: "est2",
    actividadId: "act0",
    lecturaId: "lec1",
    xpGanado: 40,
  };
  const r = await resolver();
  assert.equal(r.xpGanado, 40);
  assert.equal(r.xpRepetida, false);
});

test("con la lectura repetida el callback reejecutado da siempre 0 XP y las mismas escrituras", async () => {
  intentoLegacy("old1");
  agregarActividad("old1", "lec1");
  store["usuarios/est1"] = { rol: "estudiante", xp: 40, nivel: 1 };
  reintentos = 2;

  const r = await resolver();

  assert.equal(r.xpGanado, 0);
  assert.equal(historialIntentos.length, 3);
  for (const escrituras of historialIntentos) {
    const intento = escrituras.find((w) => w.path === "intentos/act1_est1");
    assert.equal(intento.data.xpGanado, 0);
    assert.equal(intento.data.lecturaId, "lec1");
  }
});

test("un error leyendo la configuración sigue abortando antes de escribir, también con lectura repetida", async () => {
  intentoPrevio("act0");
  coleccionesQueFallan = new Set(["niveles_config"]);
  await rejects(resolver(), "unavailable");
  assert.deepEqual(created, {});
  assert.deepEqual(seteados, {});
  assert.deepEqual(updated, {});
});

test("el duplicado devuelve la respuesta de siempre, sin xpRepetida y sin tocar nada", async () => {
  store["intentos/act1_est1"] = {
    porcentajeAciertos: 100,
    respuestas: [],
    xpGanado: 0,
    resueltoEn: ts("2026-10-19T10:00:00Z"),
  };
  const r = await resolver();
  assert.equal(r.duplicado, true);
  assert.equal("xpRepetida" in r, false);
  assert.deepEqual(created, {});
  assert.deepEqual(seteados, {});
  assert.deepEqual(updated, {});
  assert.deepEqual(
    bitacora.filter((op) => /ranking|actividades/.test(op)),
    []
  );
});

/* ------------------------------------------------------------------ */
/* Ranking: desempate por quién llegó primero a ese XP                 */
/* ------------------------------------------------------------------ */

const filaPrevia = (extra = {}) => ({
  estudianteId: "est1",
  alias: "Lector EST1",
  xp: 40,
  nivel: 1,
  logros: 1,
  actividades: 1,
  actualizadoEn: ts("2026-10-01T10:00:00Z"),
  ...extra,
});

test("el ranking conserva el actualizadoEn anterior si el xp no cambia", async () => {
  const fila = filaPrevia();
  store["ranking/est1"] = fila;
  store["usuarios/est1"] = { rol: "estudiante", xp: 40, nivel: 1 };
  intentoPrevio("act0");
  agregarActividad("act2", "lec1");

  const r = await resolver("est1", "act2");

  assert.equal(r.xpRepetida, true);
  const nueva = seteados["ranking/est1"];
  // El MISMO objeto Timestamp, sin tocarlo.
  assert.strictEqual(nueva.actualizadoEn, fila.actualizadoEn);
  assert.equal(nueva.xp, 40);
  assert.equal(nueva.actividades, 2);
  assert.deepEqual(Object.keys(nueva).sort(), CAMPOS_RANKING);
});

test("el ranking usa un serverTimestamp nuevo cuando el xp cambia", async () => {
  store["ranking/est1"] = filaPrevia({ xp: 0, logros: 0, actividades: 0 });
  const r = await resolver();
  assert.equal(r.xpGanado, 40);
  assert.equal(seteados["ranking/est1"].actualizadoEn, "TS");
  assert.equal(seteados["ranking/est1"].xp, 40);
});

test("el ranking usa un serverTimestamp nuevo cuando no hay fila previa", async () => {
  assert.ok(!("ranking/est1" in store));
  await resolver();
  assert.equal(seteados["ranking/est1"].actualizadoEn, "TS");
});

test("si la fila previa no trae un Timestamp válido se usa serverTimestamp aunque el xp no cambie", async () => {
  store["ranking/est1"] = filaPrevia({ actualizadoEn: "ayer" });
  store["usuarios/est1"] = { rol: "estudiante", xp: 40, nivel: 1 };
  intentoPrevio("act0");
  agregarActividad("act2", "lec1");

  await resolver("est1", "act2");

  assert.equal(seteados["ranking/est1"].actualizadoEn, "TS");
});

test("la fila de ranking previa se lee dentro de la transacción antes de escribir", async () => {
  store["ranking/est1"] = filaPrevia({ xp: 0 });
  await resolver();

  const lectura = bitacora.indexOf("get:ranking/est1");
  assert.notEqual(lectura, -1);
  assert.ok(lectura < bitacora.indexOf("create:intentos/act1_est1"));
  assert.equal(bitacora[bitacora.length - 1], "set:ranking/est1");
});

test("un intento rechazado no escribe el ranking aunque exista una fila previa", async () => {
  store["ranking/est1"] = filaPrevia();
  store["actividades/act1"].estado = "cerrada";
  await rejects(resolver(), "failed-precondition");
  assert.deepEqual(seteados, {});
});
