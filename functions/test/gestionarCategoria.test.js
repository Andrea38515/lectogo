// functions/test/gestionarCategoria.test.js
//
// Pruebas de gestionarCategoria con un doble de Firestore hecho a mano: no
// toca red, credenciales ni el proyecto real. El doble de transacción
// reproduce lo esencial: las escrituras sólo llegan al almacén al terminar el
// callback, `create` sobre un documento existente falla, las consultas sólo
// se pueden ejecutar con transaction.get (una consulta fuera de la
// transacción hace fallar el test) y se registran las lecturas posteriores a
// una escritura (Firestore las prohíbe).

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
let bitacora; // ["get:ruta", "query:...", "delete:ruta", ...] de la última transacción
let lecturasFueraDeTx; // rutas leídas con ref.get() fuera de una transacción
let lecturasTrasEscritura; // lecturas ilegales dentro de la transacción
let contadorIds; // ids automáticos por colección
let reintentos; // veces que se descarta y reejecuta el callback
let fallarCommit; // si es true, el commit lanza y no se escribe nada
let ocultosEnTransaccion; // rutas que transaction.get ve como inexistentes
let colisionSinCodigo; // si es true, el ALREADY_EXISTS crudo no trae error.code
let colisionSoloCodigo; // si es true, el error crudo trae code 6 pero su mensaje no dice ALREADY_EXISTS

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

const crearConsulta = (col, filtros, limite) => ({
  __query: true,
  col,
  filtros,
  limite,
  where: (field, op, value) => {
    assert.equal(op, "==", "el doble sólo soporta igualdad");
    return crearConsulta(col, [...filtros, { field, value }], limite);
  },
  limit: (n) => crearConsulta(col, filtros, n),
  get: async () => {
    throw new Error("las consultas deben ejecutarse con transaction.get");
  },
});

const ejecutarConsulta = (consulta) => {
  let docs = Object.keys(store)
    .filter(
      (p) =>
        p.startsWith(`${consulta.col}/`) &&
        p.split("/").length === 2 &&
        consulta.filtros.every(({ field, value }) => store[p][field] === value)
    )
    .sort()
    .map((p) => snap(p));

  if (consulta.limite !== undefined) {
    docs = docs.slice(0, consulta.limite);
  }

  return { docs, size: docs.length, empty: docs.length === 0 };
};

const descripcionConsulta = ({ col, filtros, limite }) =>
  `query:${col}:${filtros.map((f) => `${f.field}==${f.value}`).join(",")}:limit=${limite}`;

const confirmar = (escrituras) => {
  // Atómico: primero se validan todas, luego se aplican.
  for (const { tipo, ref } of escrituras) {
    if (tipo === "create" && ref.path in store) {
      const error = new Error(
        colisionSoloCodigo ? `documento duplicado: ${ref.path}` : `ALREADY_EXISTS: ${ref.path}`
      );
      if (!colisionSinCodigo) {
        error.code = 6;
      }
      throw error;
    }
    if ((tipo === "update" || tipo === "delete") && !(ref.path in store)) {
      const error = new Error(`NOT_FOUND: ${ref.path}`);
      error.code = 5;
      throw error;
    }
  }

  for (const { tipo, ref, data } of escrituras) {
    if (tipo === "update") {
      store[ref.path] = { ...store[ref.path], ...data };
    } else if (tipo === "delete") {
      delete store[ref.path];
    } else {
      store[ref.path] = data;
    }
  }
};

const db = {
  collection: (name) => ({
    ...crearConsulta(name, [], undefined),
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

    const intentos = reintentos + 1;

    for (let i = 0; i < intentos; i += 1) {
      const escrituras = [];
      let escribio = false;
      bitacora = [];
      lecturasTrasEscritura = [];

      const transaction = {
        get: async (objetivo) => {
          if (objetivo.__query) {
            const linea = descripcionConsulta(objetivo);
            bitacora.push(linea);
            if (escribio) {
              lecturasTrasEscritura.push(linea);
            }
            return ejecutarConsulta(objetivo);
          }
          bitacora.push(`get:${objetivo.path}`);
          if (escribio) {
            lecturasTrasEscritura.push(objetivo.path);
          }
          if (ocultosEnTransaccion.has(objetivo.path)) {
            return { exists: false, id: objetivo.id, data: () => undefined };
          }
          return snap(objetivo.path);
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
        delete: (ref) => {
          escribio = true;
          bitacora.push(`delete:${ref.path}`);
          escrituras.push({ tipo: "delete", ref });
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

const { gestionarCategoria } = require(path.join(
  __dirname,
  "../src/gestionarCategoria.js"
));

test.after(() => {
  Module._load = original;
});

/* ------------------------------------------------------------------ */
/* Datos y helpers                                                     */
/* ------------------------------------------------------------------ */

const baseStore = () => ({
  "usuarios/adm1": { rol: "administrador" },
  "usuarios/doc1": { rol: "docente" },
  "usuarios/est1": { rol: "estudiante" },
  "usuarios/sinrol": {},
  "categorias/fabulas": { nombre: "Fábulas", descripcion: "Historias breves." },
  "categorias/cuentos": { nombre: "Cuentos", descripcion: "Relatos de aventuras." },
  "categorias/ciencia": { nombre: "Ciencia", descripcion: "Cómo funciona el mundo." },
  "categorias/historia": { nombre: "Historia", descripcion: "Hechos del pasado." },
  // fabulas tiene una lectura publicada; ciencia sólo un borrador.
  "lecturas/l1": { categoriaId: "fabulas", estado: "publicada" },
  "lecturas/l2": { categoriaId: "ciencia", estado: "borrador" },
  "lecturas/l3": { categoriaId: "cuentos-x", estado: "publicada" },
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
  fallarCommit = false;
  ocultosEnTransaccion = new Set();
  colisionSinCodigo = false;
  colisionSoloCodigo = false;
};

test.beforeEach((t) => {
  t.mock.method(console, "warn", () => {});
  t.mock.method(console, "error", () => {});
  reset();
});

const call = (uid, data) =>
  gestionarCategoria({
    auth: uid ? { uid, token: {} } : null,
    data,
  });

const admin = (data) => call("adm1", data);

const rejects = async (promesa, code) => {
  await assert.rejects(promesa, (e) => {
    assert.equal(e.code, code, e.message);
    return true;
  });
};

const copia = (x) => JSON.parse(JSON.stringify(x));

const MENSAJE_COLISION = (slug) =>
  `Ya existe una categoría con el identificador «${slug}». Probá con otro nombre.`;

const MENSAJE_SLUG_VACIO =
  "El nombre debe incluir al menos una letra latina o un número.";

const esIdValidoParaFirestore = (id) =>
  typeof id === "string" &&
  id.length > 0 &&
  id.length <= 128 &&
  !/^__.*__$/.test(id) &&
  !id.includes("/") &&
  id !== "." &&
  id !== "..";

const escribirDeAuditoria = (commit) =>
  commit.find((w) => w.path.startsWith("auditoria/"));

// Un rechazo debe ocurrir sin escribir nada.
const rechazaSinEscribir = async (promesa, code) => {
  const antes = copia(store);
  await rejects(promesa, code);
  assert.equal(commits.length, 0, "no debía haber commits");
  assert.deepEqual(store, antes, "el almacén no debía cambiar");
};

// Rechazos previos a la transacción: ni siquiera se abre.
const rechazaAntesDeTransaccion = async (promesa, code) => {
  await rechazaSinEscribir(promesa, code);
  assert.equal(transacciones, 0, "no debía abrirse una transacción");
};

const soloLeyoAlLlamante = (uid) =>
  assert.deepEqual(
    lecturasFueraDeTx,
    [`usuarios/${uid}`],
    "sólo debía leerse el perfil del llamante"
  );

const ACCIONES_VALIDAS = {
  crear: { accion: "crear", nombre: "Poesía", descripcion: "Versos." },
  editar: { accion: "editar", id: "ciencia", nombre: "Ciencias", descripcion: "x" },
  eliminar: { accion: "eliminar", id: "cuentos" },
};

/* ------------------------------------------------------------------ */
/* Autenticación y rol                                                 */
/* ------------------------------------------------------------------ */

for (const [accion, datos] of Object.entries(ACCIONES_VALIDAS)) {
  test(`${accion}: sin sesión, unauthenticated y no se lee nada`, async () => {
    await rechazaAntesDeTransaccion(call(null, datos), "unauthenticated");
    assert.deepEqual(lecturasFueraDeTx, []);
  });

  for (const [rolNombre, uid] of [
    ["estudiante", "est1"],
    ["docente", "doc1"],
    ["sin perfil", "fantasma"],
    ["perfil sin rol", "sinrol"],
  ]) {
    test(`${accion}: ${rolNombre} recibe permission-denied sin escrituras ni lecturas de categorías`, async () => {
      await rechazaAntesDeTransaccion(call(uid, datos), "permission-denied");
      soloLeyoAlLlamante(uid);
    });
  }

  test(`${accion}: los custom claims se ignoran`, async () => {
    await rechazaAntesDeTransaccion(
      gestionarCategoria({
        auth: {
          uid: "est1",
          token: { role: "administrador", rol: "administrador", admin: true },
        },
        data: datos,
      }),
      "permission-denied"
    );
    soloLeyoAlLlamante("est1");
  });
}

for (const rol of ["Administrador", "ADMINISTRADOR", "admin", "administrador "]) {
  test(`perfil con rol '${rol}' (no exacto): permission-denied`, async () => {
    store["usuarios/raro"] = { rol };
    await rechazaAntesDeTransaccion(
      call("raro", ACCIONES_VALIDAS.crear),
      "permission-denied"
    );
  });
}

test("el rol se evalúa antes de validar la entrada (un docente con datos basura recibe permission-denied)", async () => {
  await rechazaAntesDeTransaccion(
    call("doc1", { accion: "inventada" }),
    "permission-denied"
  );
});

/* ------------------------------------------------------------------ */
/* Acción desconocida y data inválida                                  */
/* ------------------------------------------------------------------ */

for (const [nombre, accion] of [
  ["ausente", undefined],
  ["nula", null],
  ["vacía", ""],
  ["numérica", 1],
  ["en mayúsculas", "CREAR"],
  ["con espacios", "crear "],
  ["inexistente", "borrar"],
  ["propiedad heredada", "constructor"],
  ["__proto__", "__proto__"],
  ["arreglo", ["crear"]],
]) {
  test(`accion ${nombre}: invalid-argument`, async () => {
    await rechazaAntesDeTransaccion(
      admin({ accion, nombre: "Poesía", id: "ciencia" }),
      "invalid-argument"
    );
  });
}

for (const [nombre, data] of [
  ["undefined", undefined],
  ["null", null],
  ["una cadena", "crear"],
  ["un número", 7],
  ["un arreglo", []],
  ["un objeto vacío", {}],
]) {
  test(`data ${nombre}: invalid-argument, sin fallo interno`, async () => {
    await rechazaAntesDeTransaccion(admin(data), "invalid-argument");
  });
}

/* ------------------------------------------------------------------ */
/* Validación de nombre y descripción (crear y editar)                 */
/* ------------------------------------------------------------------ */

const CASOS_NOMBRE_INVALIDO = [
  ["ausente", undefined],
  ["nulo", null],
  ["numérico", 42],
  ["arreglo", ["Poesía"]],
  ["objeto", { x: 1 }],
  ["vacío", ""],
  ["sólo espacios", "     "],
  ["de 1 carácter", "a"],
  ["de 1 carácter con espacios", "   a   "],
  ["de 61 caracteres", "a".repeat(61)],
];

const CASOS_DESCRIPCION_INVALIDA = [
  ["nula", null],
  ["numérica", 42],
  ["booleana", true],
  ["arreglo", ["x"]],
  ["objeto", { x: 1 }],
  ["de 201 caracteres", "x".repeat(201)],
];

for (const accion of ["crear", "editar"]) {
  const base = (extra) => ({ accion, id: "ciencia", ...extra });

  for (const [nombre, valor] of CASOS_NOMBRE_INVALIDO) {
    test(`${accion}: nombre ${nombre} es invalid-argument antes de abrir la transacción`, async () => {
      await rechazaAntesDeTransaccion(
        admin(base({ nombre: valor, descripcion: "ok" })),
        "invalid-argument"
      );
      soloLeyoAlLlamante("adm1");
    });
  }

  for (const [nombre, valor] of CASOS_DESCRIPCION_INVALIDA) {
    test(`${accion}: descripción ${nombre} es invalid-argument`, async () => {
      await rechazaAntesDeTransaccion(
        admin(base({ nombre: "Poesía", descripcion: valor })),
        "invalid-argument"
      );
    });
  }
}

test("crear: límites de longitud del nombre (2 y 60 se aceptan)", async () => {
  const r2 = await admin({ accion: "crear", nombre: "ab" });
  assert.equal(r2.id, "ab");

  const nombre60 = "c".repeat(60);
  const r60 = await admin({ accion: "crear", nombre: nombre60 });
  assert.equal(r60.id, nombre60);
  assert.equal(store[`categorias/${nombre60}`].nombre, nombre60);
});

test("crear: 60 caracteres útiles rodeados de espacios se aceptan (se mide tras el trim)", async () => {
  const r = await admin({ accion: "crear", nombre: `  ${"d".repeat(60)}  ` });

  assert.equal(r.ok, true);
  assert.equal(r.nombre, "d".repeat(60));
});

test("crear: límites de longitud de la descripción (0 y 200 se aceptan; 201 con espacios que sobran también)", async () => {
  await admin({ accion: "crear", nombre: "Uno", descripcion: "" });
  assert.equal(store["categorias/uno"].descripcion, "");

  await admin({ accion: "crear", nombre: "Dos", descripcion: "x".repeat(200) });
  assert.equal(store["categorias/dos"].descripcion.length, 200);

  await admin({ accion: "crear", nombre: "Tres", descripcion: ` ${"x".repeat(200)} ` });
  assert.equal(store["categorias/tres"].descripcion, "x".repeat(200));
});

/* ------------------------------------------------------------------ */
/* crear                                                               */
/* ------------------------------------------------------------------ */

test("crear: escribe nombre y descripción, genera el id y responde", async () => {
  const r = await admin({ accion: "crear", nombre: "Poesía", descripcion: "Versos y rimas." });

  assert.deepEqual(r, { ok: true, id: "poesia", accion: "crear", nombre: "Poesía" });
  assert.deepEqual(store["categorias/poesia"], {
    nombre: "Poesía",
    descripcion: "Versos y rimas.",
  });
});

test("crear: el documento tiene exactamente los campos del seed y nada más", async () => {
  await admin({ accion: "crear", nombre: "Poesía", descripcion: "Versos." });

  assert.deepEqual(Object.keys(store["categorias/poesia"]).sort(), [
    "descripcion",
    "nombre",
  ]);
});

test("crear: nombre y descripción se guardan sin espacios sobrantes", async () => {
  const r = await admin({ accion: "crear", nombre: "  Poesía  ", descripcion: "  Versos.  " });

  assert.equal(r.nombre, "Poesía");
  assert.deepEqual(store["categorias/poesia"], { nombre: "Poesía", descripcion: "Versos." });
});

test("crear: sin descripción se guarda cadena vacía (como el seed, que siempre la trae)", async () => {
  await admin({ accion: "crear", nombre: "Poesía" });
  assert.equal(store["categorias/poesia"].descripcion, "");

  await admin({ accion: "crear", nombre: "Teatro", descripcion: undefined });
  assert.equal(store["categorias/teatro"].descripcion, "");
});

test("crear: no se acepta un id elegido por el cliente", async () => {
  const r = await admin({
    accion: "crear",
    id: "hacker",
    nombre: "Poesía",
    descripcion: "",
  });

  assert.equal(r.id, "poesia");
  assert.equal("categorias/hacker" in store, false);
  assert.equal("categorias/poesia" in store, true);
});

test("crear: la auditoría tiene exactamente estas claves y valores", async () => {
  await admin({ accion: "crear", nombre: "Poesía", descripcion: "Versos." });

  const audit = escribirDeAuditoria(commits[0]);

  assert.ok(audit, "falta la auditoría");
  assert.equal(audit.path, "auditoria/auditoria-auto-1");
  assert.deepEqual(Object.keys(audit.data).sort(), [
    "accion",
    "actorId",
    "creadoEn",
    "detalle",
    "objetivoId",
  ]);
  assert.deepEqual(audit.data, {
    accion: "categoria.crear",
    actorId: "adm1",
    objetivoId: "poesia",
    detalle: { nombre: "Poesía" },
    creadoEn: "TS",
  });
  assert.deepEqual(Object.keys(audit.data.detalle), ["nombre"]);
});

test("crear: un solo commit con la categoría y la auditoría; lecturas antes de escribir", async () => {
  await admin({ accion: "crear", nombre: "Poesía" });

  assert.equal(transacciones, 1);
  assert.equal(commits.length, 1);
  assert.deepEqual(commits[0].map((w) => w.path).sort(), [
    "auditoria/auditoria-auto-1",
    "categorias/poesia",
  ]);
  assert.deepEqual(lecturasTrasEscritura, []);
  assert.ok(bitacora.includes("get:categorias/poesia"));
  assert.ok(
    bitacora.indexOf("get:categorias/poesia") <
      bitacora.findIndex((l) => /^(create|set|update|delete):/.test(l))
  );
  // Las lecturas de categorías ocurren dentro de la transacción.
  assert.deepEqual(lecturasFueraDeTx, ["usuarios/adm1"]);
});

test("crear: la categoría se crea con create (no puede pisar a otra)", async () => {
  await admin({ accion: "crear", nombre: "Poesía" });

  const escritura = commits[0].find((w) => w.path === "categorias/poesia");

  assert.equal(escritura.tipo, "create");
});

test("crear: si otra escritura aparece entre la lectura y el commit, el create falla y no se escribe nada", async () => {
  // La transacción cree que no existe (lo vio vacío) pero en el commit ya está.
  ocultosEnTransaccion.add("categorias/ciencia");
  const antes = copia(store);

  await assert.rejects(
    admin({ accion: "crear", nombre: "Ciencia", descripcion: "otra" }),
    (e) => {
      assert.ok(e instanceof HttpsError, "debe ser un HttpsError, no el error crudo");
      assert.equal(e.code, "already-exists");
      assert.equal(e.message, MENSAJE_COLISION("ciencia"));
      return true;
    }
  );
  assert.deepEqual(store, antes);
  assert.equal(commits.length, 0);
});

test("crear: el ALREADY_EXISTS crudo sin error.code también se traduce (por el mensaje)", async () => {
  ocultosEnTransaccion.add("categorias/ciencia");
  colisionSinCodigo = true;
  const antes = copia(store);

  await assert.rejects(
    admin({ accion: "crear", nombre: "Ciencia", descripcion: "otra" }),
    (e) => {
      assert.ok(e instanceof HttpsError);
      assert.equal(e.code, "already-exists");
      return true;
    }
  );
  assert.deepEqual(store, antes);
});

test("crear: el error crudo con code 6 aunque su mensaje no diga ALREADY_EXISTS también se traduce (por el código)", async () => {
  ocultosEnTransaccion.add("categorias/ciencia");
  colisionSoloCodigo = true;
  const antes = copia(store);

  await assert.rejects(
    admin({ accion: "crear", nombre: "Ciencia", descripcion: "otra" }),
    (e) => {
      assert.ok(e instanceof HttpsError);
      assert.equal(e.code, "already-exists");
      return true;
    }
  );
  assert.deepEqual(store, antes);
});

test("crear: un error crudo que no es ALREADY_EXISTS se propaga tal cual", async () => {
  fallarCommit = true;

  await assert.rejects(
    admin({ accion: "crear", nombre: "Poesía" }),
    (e) => {
      assert.ok(!(e instanceof HttpsError));
      assert.match(e.message, /fallo simulado/);
      return true;
    }
  );
});

for (const [nombre, esperado] of [
  ["Ciencias Naturales", "ciencias-naturales"],
  ["Ñandú y Cañón", "nandu-y-canon"],
  ["¡Cuentos & Más!", "cuentos-mas"],
  ["  --Hola--  ", "hola"],
  ["A    B", "a-b"],
  ["Año 2024", "ano-2024"],
  ["Árbol/Raíz", "arbol-raiz"],
  ["C++", "c"],
  ["ÁÉÍÓÚ Üü", "aeiou-uu"],
  ["MAYÚSCULAS", "mayusculas"],
  ["a_b", "a-b"],
  ["x.y", "x-y"],
  ["Fábulas Nuevas", "fabulas-nuevas"],
]) {
  test(`slug: '${nombre}' -> '${esperado}'`, async () => {
    const r = await admin({ accion: "crear", nombre });

    assert.equal(r.id, esperado);
    assert.ok(`categorias/${esperado}` in store);
  });
}

for (const [nombre, descripcion] of [
  ["Sólo símbolos", "¡¡"],
  ["Sólo guiones", "--"],
  ["Sólo puntos", "..."],
  ["Emojis", "😀😀"],
  ["Barras", "//"],
  ["Guion bajo doble", "__"],
]) {
  test(`slug vacío (${nombre}: '${descripcion}'): invalid-argument con el mensaje claro`, async () => {
    await rechazaAntesDeTransaccion(
      admin({ accion: "crear", nombre: descripcion }),
      "invalid-argument"
    );
    await assert.rejects(
      admin({ accion: "crear", nombre: descripcion }),
      (e) => {
        assert.equal(e.message, MENSAJE_SLUG_VACIO);
        return true;
      }
    );
  });
}

for (const nombre of ["日本語", "Привет", "مرحبا", "ελληνικά"]) {
  test(`slug vacío: un nombre en otro alfabeto ('${nombre}') no afirma que no tenga letras`, async () => {
    await assert.rejects(admin({ accion: "crear", nombre }), (e) => {
      assert.equal(e.code, "invalid-argument");
      assert.equal(e.message, MENSAJE_SLUG_VACIO);
      assert.ok(/latina/.test(e.message));
      return true;
    });
    assert.equal(commits.length, 0);
  });
}

test("slug: el id generado nunca es un id reservado ni contiene '/' ni '.'", async () => {
  const esperados = [
    ["__x__", "x"],
    ["a/b", "a-b"],
    ["..", null],
    ["a.c", "a-c"],
    ["___", null],
  ];

  for (const [nombre, id] of esperados) {
    if (id === null) {
      await rejects(admin({ accion: "crear", nombre }), "invalid-argument");
    } else {
      const r = await admin({ accion: "crear", nombre });
      assert.equal(r.id, id);
      assert.ok(esIdValidoParaFirestore(r.id), r.id);
    }
  }
});

test("slug: el id tiene como máximo 60 caracteres", async () => {
  const r = await admin({ accion: "crear", nombre: `${"é".repeat(30)} ${"ñ".repeat(29)}` });

  assert.ok(r.id.length <= 60);
  assert.ok(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(r.id), r.id);
});

for (const nombre of ["Ciencia", "ciencia", "CIENCIA", "Ciência", "  ciencia  ", "¡Ciencia!", "Ciencia!!"]) {
  test(`crear con nombre '${nombre}' que colisiona con 'ciencia': already-exists`, async () => {
    const antes = copia(store);

    await assert.rejects(
      admin({ accion: "crear", nombre, descripcion: "otra" }),
      (e) => {
        assert.equal(e.code, "already-exists");
        assert.equal(e.message, MENSAJE_COLISION("ciencia"));
        return true;
      }
    );
    assert.equal(commits.length, 0);
    assert.deepEqual(store, antes);
  });
}

test("crear: si la categoría colisiona la existente no se modifica", async () => {
  await rejects(
    admin({ accion: "crear", nombre: "FÁBULAS", descripcion: "pisada" }),
    "already-exists"
  );
  await assert.rejects(
    admin({ accion: "crear", nombre: "FÁBULAS", descripcion: "pisada" }),
    (e) => e.message === MENSAJE_COLISION("fabulas")
  );
  assert.deepEqual(store["categorias/fabulas"], {
    nombre: "Fábulas",
    descripcion: "Historias breves.",
  });
});

test("crear: no toca lecturas ni usuarios", async () => {
  const antes = copia(store);

  await admin({ accion: "crear", nombre: "Poesía" });

  for (const p of Object.keys(antes)) {
    assert.deepEqual(store[p], antes[p], `${p} no debía cambiar`);
  }
});

test("crear: si el commit falla no queda ni la categoría ni la auditoría", async () => {
  fallarCommit = true;
  const antes = copia(store);

  await assert.rejects(admin({ accion: "crear", nombre: "Poesía" }), /fallo simulado/);
  assert.deepEqual(store, antes);
});

test("crear: si la transacción se reejecuta sólo cuenta el último intento", async () => {
  reintentos = 2;

  await admin({ accion: "crear", nombre: "Poesía" });

  assert.equal(commits.length, 1);
  assert.equal(commits[0].length, 2);
  assert.equal(
    Object.keys(store).filter((p) => p.startsWith("auditoria/")).length,
    1
  );
});

/* ------------------------------------------------------------------ */
/* editar                                                              */
/* ------------------------------------------------------------------ */

for (const [nombre, id] of [
  ["ausente", undefined],
  ["vacío", ""],
  ["sólo espacios", "   "],
  ["con '/'", "a/b"],
  ["'.'", "."],
  ["'..'", ".."],
  ["numérico", 42],
  ["nulo", null],
  ["reservado", "__x__"],
  ["de 129 caracteres", "a".repeat(129)],
]) {
  for (const accion of ["editar", "eliminar"]) {
    test(`${accion}: id ${nombre} es invalid-argument`, async () => {
      await rechazaAntesDeTransaccion(
        admin({ accion, id, nombre: "Ciencias", descripcion: "x" }),
        "invalid-argument"
      );
      soloLeyoAlLlamante("adm1");
    });
  }
}

test("editar: cambia nombre y descripción y NUNCA el id", async () => {
  const r = await admin({
    accion: "editar",
    id: "ciencia",
    nombre: "Ciencias Naturales",
    descripcion: "Nueva descripción.",
  });

  assert.deepEqual(r, {
    ok: true,
    id: "ciencia",
    accion: "editar",
    nombre: "Ciencias Naturales",
  });
  assert.deepEqual(store["categorias/ciencia"], {
    nombre: "Ciencias Naturales",
    descripcion: "Nueva descripción.",
  });
  assert.equal("categorias/ciencias-naturales" in store, false);
  assert.equal(
    Object.keys(store).filter((p) => p.startsWith("categorias/")).length,
    4
  );
});

test("editar: el update lleva exactamente nombre y descripción", async () => {
  await admin({ accion: "editar", id: "ciencia", nombre: "Ciencias", descripcion: "x" });

  const escritura = commits[0].find((w) => w.path === "categorias/ciencia");

  assert.equal(escritura.tipo, "update");
  assert.deepEqual(Object.keys(escritura.data).sort(), ["descripcion", "nombre"]);
});

test("editar: nombre y descripción se guardan sin espacios sobrantes", async () => {
  await admin({ accion: "editar", id: "ciencia", nombre: "  Ciencias  ", descripcion: "  x  " });

  assert.deepEqual(store["categorias/ciencia"], { nombre: "Ciencias", descripcion: "x" });
});

test("editar: sin descripción se conserva la que ya tenía (no se borra por omisión)", async () => {
  await admin({ accion: "editar", id: "ciencia", nombre: "Ciencias" });

  assert.deepEqual(store["categorias/ciencia"], {
    nombre: "Ciencias",
    descripcion: "Cómo funciona el mundo.",
  });
});

test("editar: una descripción vacía explícita sí la borra", async () => {
  await admin({ accion: "editar", id: "ciencia", nombre: "Ciencias", descripcion: "" });

  assert.equal(store["categorias/ciencia"].descripcion, "");
});

test("editar: la auditoría lleva el nombre nuevo y el anterior", async () => {
  await admin({ accion: "editar", id: "ciencia", nombre: "Ciencias", descripcion: "x" });

  const audit = escribirDeAuditoria(commits[0]);

  assert.deepEqual(Object.keys(audit.data).sort(), [
    "accion",
    "actorId",
    "creadoEn",
    "detalle",
    "objetivoId",
  ]);
  assert.deepEqual(audit.data, {
    accion: "categoria.editar",
    actorId: "adm1",
    objetivoId: "ciencia",
    detalle: {
      nombre: "Ciencias",
      nombreAnterior: "Ciencia",
      descripcion: "x",
      descripcionAnterior: "Cómo funciona el mundo.",
    },
    creadoEn: "TS",
  });
  assert.deepEqual(Object.keys(audit.data.detalle).sort(), [
    "descripcion",
    "descripcionAnterior",
    "nombre",
    "nombreAnterior",
  ]);
});

test("editar: un cambio sólo de descripción se distingue en la auditoría", async () => {
  await admin({ accion: "editar", id: "ciencia", nombre: "Ciencia", descripcion: "Otra." });

  const { detalle } = escribirDeAuditoria(commits[0]).data;

  assert.equal(detalle.nombre, detalle.nombreAnterior);
  assert.equal(detalle.descripcion, "Otra.");
  assert.equal(detalle.descripcionAnterior, "Cómo funciona el mundo.");
});

test("editar: sin descripción en la petición, la auditoría registra la conservada en ambos campos", async () => {
  await admin({ accion: "editar", id: "ciencia", nombre: "Ciencias" });

  const { detalle } = escribirDeAuditoria(commits[0]).data;

  assert.equal(detalle.descripcion, "Cómo funciona el mundo.");
  assert.equal(detalle.descripcionAnterior, "Cómo funciona el mundo.");
});

test("editar: una categoría sin descripción previa audita cadenas vacías (nunca undefined)", async () => {
  store["categorias/rara"] = { nombre: "Rara" };

  await admin({ accion: "editar", id: "rara", nombre: "Rara 2" });

  const { detalle } = escribirDeAuditoria(commits[0]).data;

  assert.equal(detalle.descripcionAnterior, "");
  assert.equal(detalle.descripcion, "");
  assert.ok(Object.values(detalle).every((v) => typeof v === "string"));
});

test("editar: una categoría sin nombre previo audita nombreAnterior como cadena vacía (nunca undefined)", async () => {
  store["categorias/rara"] = { descripcion: "sin nombre" };

  await admin({ accion: "editar", id: "rara", nombre: "Rara" });

  const audit = escribirDeAuditoria(commits[0]);

  assert.equal(audit.data.detalle.nombreAnterior, "");
  assert.ok(Object.values(audit.data.detalle).every((v) => v !== undefined));
});

test("editar: una categoría que no existe es not-found y no escribe nada", async () => {
  await rechazaSinEscribir(
    admin({ accion: "editar", id: "inexistente", nombre: "Algo" }),
    "not-found"
  );
  assert.equal("categorias/inexistente" in store, false);
});

test("editar: un solo commit con el update y la auditoría; lecturas antes de escribir", async () => {
  await admin({ accion: "editar", id: "ciencia", nombre: "Ciencias" });

  assert.equal(transacciones, 1);
  assert.equal(commits.length, 1);
  assert.equal(commits[0].length, 2);
  assert.deepEqual(lecturasTrasEscritura, []);
  assert.ok(bitacora.includes("get:categorias/ciencia"));
  assert.deepEqual(lecturasFueraDeTx, ["usuarios/adm1"]);
});

test("editar: no toca las lecturas que usan la categoría", async () => {
  const antes = copia(store);

  await admin({ accion: "editar", id: "fabulas", nombre: "Fábulas y Mitos" });

  for (const p of Object.keys(antes).filter((k) => k.startsWith("lecturas/"))) {
    assert.deepEqual(store[p], antes[p]);
  }
});

test("editar: si el commit falla no cambia nada", async () => {
  fallarCommit = true;
  const antes = copia(store);

  await assert.rejects(
    admin({ accion: "editar", id: "ciencia", nombre: "Ciencias" }),
    /fallo simulado/
  );
  assert.deepEqual(store, antes);
});

/* ------------------------------------------------------------------ */
/* eliminar                                                            */
/* ------------------------------------------------------------------ */

for (const id of ["fabulas", "ciencia"]) {
  test(`eliminar '${id}' con lecturas que la usan: failed-precondition y nada cambia`, async () => {
    const antes = copia(store);

    await assert.rejects(admin({ accion: "eliminar", id }), (e) => {
      assert.equal(e.code, "failed-precondition");
      assert.equal(
        e.message,
        "Hay lecturas en esta categoría: movelas o eliminalas primero."
      );
      return true;
    });
    assert.equal(commits.length, 0);
    assert.deepEqual(store, antes);
    assert.ok(`categorias/${id}` in store);
  });
}

test("eliminar: cuenta también las lecturas en borrador (ciencia sólo tiene un borrador)", async () => {
  await rejects(admin({ accion: "eliminar", id: "ciencia" }), "failed-precondition");
});

test("eliminar: una categoría sin lecturas se borra", async () => {
  const r = await admin({ accion: "eliminar", id: "cuentos" });

  assert.deepEqual(r, { ok: true, id: "cuentos", accion: "eliminar" });
  assert.equal("categorias/cuentos" in store, false);
  assert.equal(commits.length, 1);
  assert.ok(commits[0].some((w) => w.tipo === "delete" && w.path === "categorias/cuentos"));
});

test("eliminar: sólo cuenta la coincidencia exacta del id ('cuentos-x' no bloquea 'cuentos')", async () => {
  // l3 usa "cuentos-x"; borrar "cuentos" debe poder.
  const r = await admin({ accion: "eliminar", id: "cuentos" });

  assert.equal(r.ok, true);
});

test("eliminar: las otras categorías y las lecturas quedan intactas", async () => {
  const antes = copia(store);

  await admin({ accion: "eliminar", id: "historia" });

  for (const p of Object.keys(antes)) {
    if (p !== "categorias/historia") {
      assert.deepEqual(store[p], antes[p], `${p} no debía cambiar`);
    }
  }
});

test("eliminar: la consulta de lecturas va DENTRO de la transacción, filtra por categoriaId, limit 1, y antes de escribir", async () => {
  await admin({ accion: "eliminar", id: "cuentos" });

  const consulta = "query:lecturas:categoriaId==cuentos:limit=1";
  const primeraEscritura = bitacora.findIndex((l) => /^(create|set|update|delete):/.test(l));

  assert.ok(bitacora.includes(consulta), bitacora.join(" | "));
  assert.ok(bitacora.indexOf(consulta) < primeraEscritura);
  assert.ok(bitacora.indexOf("get:categorias/cuentos") < primeraEscritura);
  assert.deepEqual(lecturasTrasEscritura, []);
  assert.deepEqual(lecturasFueraDeTx, ["usuarios/adm1"]);
});

test("eliminar: la existencia se comprueba antes de la consulta de lecturas", async () => {
  await admin({ accion: "eliminar", id: "cuentos" });

  assert.ok(
    bitacora.indexOf("get:categorias/cuentos") <
      bitacora.indexOf("query:lecturas:categoriaId==cuentos:limit=1")
  );
});

test("eliminar: una categoría que no existe es not-found y no consulta lecturas", async () => {
  await rechazaSinEscribir(
    admin({ accion: "eliminar", id: "inexistente" }),
    "not-found"
  );
  assert.ok(!bitacora.some((l) => l.startsWith("query:")));
});

test("eliminar: la auditoría lleva el nombre almacenado de la categoría", async () => {
  await admin({ accion: "eliminar", id: "cuentos" });

  const audit = escribirDeAuditoria(commits[0]);

  assert.deepEqual(Object.keys(audit.data).sort(), [
    "accion",
    "actorId",
    "creadoEn",
    "detalle",
    "objetivoId",
  ]);
  assert.deepEqual(audit.data, {
    accion: "categoria.eliminar",
    actorId: "adm1",
    objetivoId: "cuentos",
    detalle: { nombre: "Cuentos" },
    creadoEn: "TS",
  });
  assert.deepEqual(Object.keys(audit.data.detalle), ["nombre"]);
});

test("eliminar: el nombre de la auditoría sale del almacén, no de lo que mande el cliente", async () => {
  await admin({ accion: "eliminar", id: "cuentos", nombre: "Otro nombre" });

  assert.equal(escribirDeAuditoria(commits[0]).data.detalle.nombre, "Cuentos");
});

test("eliminar: una categoría sin nombre almacenado audita cadena vacía (nunca undefined)", async () => {
  store["categorias/rara"] = {};

  await admin({ accion: "eliminar", id: "rara" });

  assert.equal(escribirDeAuditoria(commits[0]).data.detalle.nombre, "");
});

test("eliminar: un solo commit con el delete y la auditoría", async () => {
  await admin({ accion: "eliminar", id: "cuentos" });

  assert.equal(transacciones, 1);
  assert.equal(commits.length, 1);
  assert.deepEqual(commits[0].map((w) => w.tipo).sort(), ["create", "delete"]);
});

test("eliminar: si el commit falla la categoría sigue y no hay auditoría", async () => {
  fallarCommit = true;
  const antes = copia(store);

  await assert.rejects(admin({ accion: "eliminar", id: "cuentos" }), /fallo simulado/);
  assert.deepEqual(store, antes);
});

test("eliminar: la respuesta no incluye el nombre", async () => {
  const r = await admin({ accion: "eliminar", id: "cuentos" });

  assert.deepEqual(Object.keys(r).sort(), ["accion", "id", "ok"]);
});

test("eliminar: tras borrar se puede volver a crear la categoría con el mismo nombre", async () => {
  await admin({ accion: "eliminar", id: "cuentos" });
  const r = await admin({ accion: "crear", nombre: "Cuentos", descripcion: "Nueva." });

  assert.equal(r.id, "cuentos");
});

/* ------------------------------------------------------------------ */
/* Ninguna acción fallida deja huellas                                 */
/* ------------------------------------------------------------------ */

test("ninguna validación fallida escribe auditoría", async () => {
  const intentos = [
    { accion: "crear" },
    { accion: "crear", nombre: "!!" },
    { accion: "editar", id: "ciencia" },
    { accion: "editar", id: "nada", nombre: "Algo" },
    { accion: "eliminar", id: "fabulas" },
    { accion: "eliminar", id: "nada" },
    { accion: "otra" },
  ];

  for (const datos of intentos) {
    await assert.rejects(admin(datos));
  }
  assert.equal(commits.length, 0);
  assert.equal(
    Object.keys(store).filter((p) => p.startsWith("auditoria/")).length,
    0
  );
});
