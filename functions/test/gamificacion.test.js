// functions/test/gamificacion.test.js
//
// Pruebas unitarias de las funciones puras de gamificación: no tocan
// Firestore ni red, así que corren con el runner nativo de Node.

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  CONFIG_POR_DEFECTO,
  ZONA_HORARIA,
  esConfigXpValida,
  normalizarConfigXp,
  calcularXp,
  normalizarNiveles,
  calcularNivel,
  claveDeDia,
  clavesDeDia,
  calcularRacha,
  evaluarLogros,
} = require("../src/gamificacion");

// Un Timestamp de Firestore sólo se usa a través de toDate().
const timestamp = (iso) => ({ toDate: () => new Date(iso) });

/* ------------------------------------------------------------------ */
/* XP                                                                  */
/* ------------------------------------------------------------------ */

test("CONFIG_POR_DEFECTO coincide con el DDS (10 y 20)", () => {
  assert.deepEqual(CONFIG_POR_DEFECTO, {
    xpPorRespuestaCorrecta: 10,
    xpBonoActividadCompleta: 20,
  });
});

test("esConfigXpValida exige los dos campos numéricos >= 0", () => {
  assert.equal(
    esConfigXpValida({ xpPorRespuestaCorrecta: 5, xpBonoActividadCompleta: 0 }),
    true
  );
  assert.equal(esConfigXpValida(undefined), false);
  assert.equal(esConfigXpValida(null), false);
  assert.equal(esConfigXpValida({}), false);
  assert.equal(
    esConfigXpValida({ xpPorRespuestaCorrecta: 5 }),
    false
  );
  assert.equal(
    esConfigXpValida({ xpPorRespuestaCorrecta: -1, xpBonoActividadCompleta: 3 }),
    false
  );
  assert.equal(
    esConfigXpValida({ xpPorRespuestaCorrecta: "10", xpBonoActividadCompleta: 3 }),
    false
  );
});

test("normalizarConfigXp respeta la configuración válida", () => {
  assert.deepEqual(
    normalizarConfigXp({ xpPorRespuestaCorrecta: 5, xpBonoActividadCompleta: 50 }),
    { xpPorRespuestaCorrecta: 5, xpBonoActividadCompleta: 50 }
  );
});

test("normalizarConfigXp cae a los valores del DDS si falta o es inválida", () => {
  assert.deepEqual(normalizarConfigXp(undefined), CONFIG_POR_DEFECTO);
  assert.deepEqual(normalizarConfigXp(null), CONFIG_POR_DEFECTO);
  assert.deepEqual(normalizarConfigXp("basura"), CONFIG_POR_DEFECTO);
  assert.deepEqual(
    normalizarConfigXp({ xpPorRespuestaCorrecta: NaN, xpBonoActividadCompleta: -3 }),
    CONFIG_POR_DEFECTO
  );
});

test("normalizarConfigXp reemplaza sólo el campo malo", () => {
  assert.deepEqual(
    normalizarConfigXp({ xpPorRespuestaCorrecta: 7, xpBonoActividadCompleta: "x" }),
    { xpPorRespuestaCorrecta: 7, xpBonoActividadCompleta: 20 }
  );
});

test("calcularXp: correctas * xp + bono sólo con 100 %", () => {
  const config = { xpPorRespuestaCorrecta: 10, xpBonoActividadCompleta: 20 };
  assert.equal(calcularXp(config, 2, 100), 40);
  assert.equal(calcularXp(config, 1, 50), 10);
  assert.equal(calcularXp(config, 0, 0), 0);
});

test("calcularXp usa la configuración recibida", () => {
  const config = { xpPorRespuestaCorrecta: 3, xpBonoActividadCompleta: 100 };
  assert.equal(calcularXp(config, 4, 100), 112);
  assert.equal(calcularXp(config, 3, 75), 9);
});

test("calcularXp con configuración ausente usa los valores por defecto", () => {
  assert.equal(calcularXp(undefined, 2, 100), 40);
  assert.equal(calcularXp(null, 1, 50), 10);
});

test("calcularXp no lanza con datos basura y devuelve 0", () => {
  assert.equal(calcularXp(CONFIG_POR_DEFECTO, NaN, 50), 0);
  assert.equal(calcularXp(CONFIG_POR_DEFECTO, -4, 50), 0);
  assert.equal(calcularXp(CONFIG_POR_DEFECTO, undefined, undefined), 0);
});

/* ------------------------------------------------------------------ */
/* Niveles                                                             */
/* ------------------------------------------------------------------ */

const NIVELES = [
  { nivel: 1, xpMinimo: 0 },
  { nivel: 2, xpMinimo: 100 },
  { nivel: 3, xpMinimo: 250 },
];

test("normalizarNiveles ordena por xpMinimo", () => {
  const resultado = normalizarNiveles([
    { nivel: 3, xpMinimo: 250 },
    { nivel: 1, xpMinimo: 0 },
    { nivel: 2, xpMinimo: 100 },
  ]);
  assert.deepEqual(resultado, NIVELES);
});

test("normalizarNiveles descarta documentos mal formados", () => {
  const resultado = normalizarNiveles([
    { nivel: 1, xpMinimo: 0 },
    { nivel: 0, xpMinimo: 10 }, // nivel < 1
    { nivel: 1.5, xpMinimo: 10 }, // nivel no entero
    { nivel: "abc", xpMinimo: 10 },
    { nivel: 2, xpMinimo: -5 }, // xpMinimo negativo
    { nivel: 2, xpMinimo: "x" },
    { nivel: 2 }, // sin xpMinimo
    { xpMinimo: 10 }, // sin nivel
    null,
    undefined,
    "texto",
    { nivel: 2, xpMinimo: 100 },
  ]);
  assert.deepEqual(resultado, [
    { nivel: 1, xpMinimo: 0 },
    { nivel: 2, xpMinimo: 100 },
  ]);
});

// Number(null), Number(""), Number(false) y Number([]) valen 0 y Number(true)
// vale 1: sin validar el tipo antes, un doc roto pasaría por nivel válido.
const VALORES_NO_NUMERICOS = [
  ["null", null],
  ["cadena vacía", ""],
  ["false", false],
  ["arreglo vacío", []],
  ["true", true],
  ["espacio", " "],
  ["NaN", NaN],
  ["Infinity", Infinity],
  ["-Infinity", -Infinity],
  ["objeto", {}],
  ["texto", "abc"],
  ["exponencial", "1e3"],
  ["con espacios", " 100 "],
  ["negativo en texto", "-5"],
];

for (const [nombre, valor] of VALORES_NO_NUMERICOS) {
  test(`normalizarNiveles descarta xpMinimo ${nombre}`, () => {
    assert.deepEqual(normalizarNiveles([{ nivel: 9, xpMinimo: valor }]), []);
  });

  test(`normalizarNiveles descarta nivel ${nombre}`, () => {
    assert.deepEqual(normalizarNiveles([{ nivel: valor, xpMinimo: 10 }]), []);
  });

  test(`normalizarConfigXp reemplaza por el valor por defecto un campo ${nombre}`, () => {
    assert.deepEqual(
      normalizarConfigXp({
        xpPorRespuestaCorrecta: valor,
        xpBonoActividadCompleta: valor,
      }),
      CONFIG_POR_DEFECTO
    );
    assert.equal(
      esConfigXpValida({
        xpPorRespuestaCorrecta: valor,
        xpBonoActividadCompleta: 20,
      }),
      false
    );
  });
}

test("normalizarNiveles acepta cadenas numéricas legítimas y las convierte", () => {
  assert.deepEqual(
    normalizarNiveles([
      { nivel: "2", xpMinimo: "100" },
      { nivel: 1, xpMinimo: "0" },
      { nivel: 3, xpMinimo: "250.5" },
    ]),
    [
      { nivel: 1, xpMinimo: 0 },
      { nivel: 2, xpMinimo: 100 },
      { nivel: 3, xpMinimo: 250.5 },
    ]
  );
});

test("un doc con xpMinimo null o vacío no hace subir a nadie al nivel 9", () => {
  const niveles = normalizarNiveles([
    { nivel: 1, xpMinimo: 0 },
    { nivel: 9, xpMinimo: null },
    { nivel: 9, xpMinimo: "" },
    { nivel: 9, xpMinimo: false },
  ]);
  assert.equal(calcularNivel(niveles, 50, 1), 1);
});

test("normalizarNiveles devuelve [] si no recibe una lista", () => {
  assert.deepEqual(normalizarNiveles(undefined), []);
  assert.deepEqual(normalizarNiveles(null), []);
  assert.deepEqual(normalizarNiveles({}), []);
  assert.deepEqual(normalizarNiveles([]), []);
});

test("calcularNivel: el nivel más alto cuyo xpMinimo <= xp", () => {
  assert.equal(calcularNivel(NIVELES, 0, 1), 1);
  assert.equal(calcularNivel(NIVELES, 50, 1), 1);
  assert.equal(calcularNivel(NIVELES, 175, 1), 2);
  assert.equal(calcularNivel(NIVELES, 10000, 1), 3);
});

test("calcularNivel: límites exactos suben de nivel", () => {
  assert.equal(calcularNivel(NIVELES, 99, 1), 1);
  assert.equal(calcularNivel(NIVELES, 100, 1), 2);
  assert.equal(calcularNivel(NIVELES, 249, 1), 2);
  assert.equal(calcularNivel(NIVELES, 250, 1), 3);
});

test("calcularNivel: sin niveles conserva el nivel actual", () => {
  assert.equal(calcularNivel([], 500, 4), 4);
  assert.equal(calcularNivel(undefined, 500, 4), 4);
});

test("calcularNivel: sin niveles y sin nivel actual válido devuelve 1", () => {
  assert.equal(calcularNivel([], 500, undefined), 1);
  assert.equal(calcularNivel([], 500, 0), 1);
  assert.equal(calcularNivel([], 500, "x"), 1);
});

test("calcularNivel: si el xp no alcanza ningún umbral conserva el actual", () => {
  const sinCero = [{ nivel: 2, xpMinimo: 100 }];
  assert.equal(calcularNivel(sinCero, 10, 1), 1);
});

test("calcularNivel no lanza con xp basura", () => {
  assert.equal(calcularNivel(NIVELES, NaN, 1), 1);
  assert.equal(calcularNivel(NIVELES, undefined, 2), 2);
});

/* ------------------------------------------------------------------ */
/* Racha                                                               */
/* ------------------------------------------------------------------ */

test("ZONA_HORARIA es America/Bogota", () => {
  assert.equal(ZONA_HORARIA, "America/Bogota");
});

test("claveDeDia usa la zona horaria, no UTC", () => {
  // 04:59 UTC = 23:59 del día anterior en Bogotá (UTC-5).
  assert.equal(
    claveDeDia(new Date("2026-10-20T04:59:00Z"), "America/Bogota"),
    "2026-10-19"
  );
  assert.equal(
    claveDeDia(new Date("2026-10-20T05:00:00Z"), "America/Bogota"),
    "2026-10-20"
  );
  assert.equal(
    claveDeDia(new Date("2026-10-20T04:59:00Z"), "UTC"),
    "2026-10-20"
  );
});

test("clavesDeDia devuelve hoy y ayer (también al cruzar mes y año)", () => {
  assert.deepEqual(
    clavesDeDia(new Date("2026-10-19T15:00:00Z"), "America/Bogota"),
    { hoy: "2026-10-19", ayer: "2026-10-18" }
  );
  assert.deepEqual(
    clavesDeDia(new Date("2026-03-01T15:00:00Z"), "America/Bogota"),
    { hoy: "2026-03-01", ayer: "2026-02-28" }
  );
  assert.deepEqual(
    clavesDeDia(new Date("2027-01-01T15:00:00Z"), "America/Bogota"),
    { hoy: "2027-01-01", ayer: "2026-12-31" }
  );
  // 2028 es bisiesto.
  assert.deepEqual(
    clavesDeDia(new Date("2028-03-01T15:00:00Z"), "America/Bogota"),
    { hoy: "2028-03-01", ayer: "2028-02-29" }
  );
});

const AHORA = new Date("2026-10-19T15:00:00Z"); // 10:00 en Bogotá

test("calcularRacha: primera actividad (sin ultimaActividadEn) => 1", () => {
  assert.equal(calcularRacha(0, undefined, AHORA, ZONA_HORARIA), 1);
  assert.equal(calcularRacha(0, null, AHORA, ZONA_HORARIA), 1);
  // Aunque el perfil traiga una racha vieja, sin fecha no hay continuidad.
  assert.equal(calcularRacha(5, undefined, AHORA, ZONA_HORARIA), 1);
});

test("calcularRacha: mismo día no cambia la racha", () => {
  const ultimo = timestamp("2026-10-19T12:00:00Z");
  assert.equal(calcularRacha(4, ultimo, AHORA, ZONA_HORARIA), 4);
});

test("calcularRacha: mismo día con racha 0 es al menos 1", () => {
  const ultimo = timestamp("2026-10-19T12:00:00Z");
  assert.equal(calcularRacha(0, ultimo, AHORA, ZONA_HORARIA), 1);
  assert.equal(calcularRacha(undefined, ultimo, AHORA, ZONA_HORARIA), 1);
});

test("calcularRacha: día consecutivo suma 1", () => {
  const ultimo = timestamp("2026-10-18T20:00:00Z");
  assert.equal(calcularRacha(4, ultimo, AHORA, ZONA_HORARIA), 5);
});

test("calcularRacha: día consecutivo con racha 0 da 1", () => {
  const ultimo = timestamp("2026-10-18T20:00:00Z");
  assert.equal(calcularRacha(0, ultimo, AHORA, ZONA_HORARIA), 1);
});

test("calcularRacha: un hueco de uno o más días reinicia a 1", () => {
  const dosDias = timestamp("2026-10-17T20:00:00Z");
  const unMes = timestamp("2026-09-19T20:00:00Z");
  assert.equal(calcularRacha(9, dosDias, AHORA, ZONA_HORARIA), 1);
  assert.equal(calcularRacha(9, unMes, AHORA, ZONA_HORARIA), 1);
});

test("calcularRacha: acepta un Date además de un Timestamp", () => {
  assert.equal(
    calcularRacha(2, new Date("2026-10-18T20:00:00Z"), AHORA, ZONA_HORARIA),
    3
  );
});

test("calcularRacha: fecha inválida cuenta como sin actividad previa", () => {
  assert.equal(calcularRacha(7, "ayer", AHORA, ZONA_HORARIA), 1);
  assert.equal(calcularRacha(7, new Date("nope"), AHORA, ZONA_HORARIA), 1);
  assert.equal(
    calcularRacha(7, { toDate: () => new Date("nope") }, AHORA, ZONA_HORARIA),
    1
  );
  assert.equal(
    calcularRacha(7, { toDate: () => { throw new Error("x"); } }, AHORA, ZONA_HORARIA),
    1
  );
});

test("calcularRacha: rachaActual basura se toma como 0", () => {
  const ultimo = timestamp("2026-10-18T20:00:00Z");
  assert.equal(calcularRacha("x", ultimo, AHORA, ZONA_HORARIA), 1);
  assert.equal(calcularRacha(-3, ultimo, AHORA, ZONA_HORARIA), 1);
  assert.equal(calcularRacha(NaN, ultimo, AHORA, ZONA_HORARIA), 1);
});

test("medianoche en Bogotá: 23:59 y 00:01 locales son días distintos aunque en UTC sean el mismo", () => {
  // Última: 23:59 del 19 en Bogotá = 04:59 UTC del 20.
  // Ahora: 00:01 del 20 en Bogotá = 05:01 UTC del 20.
  // En UTC ambos son el día 20 (racha no cambiaría); en Bogotá son
  // días consecutivos (racha + 1).
  const ultimo = timestamp("2026-10-20T04:59:00Z");
  const ahora = new Date("2026-10-20T05:01:00Z");
  assert.equal(calcularRacha(3, ultimo, ahora, "America/Bogota"), 4);
  assert.equal(calcularRacha(3, ultimo, ahora, "UTC"), 3);
});

test("medianoche en Bogotá: 00:01 y 23:59 locales son el mismo día aunque en UTC sean distintos", () => {
  // Última: 00:01 del 19 en Bogotá = 05:01 UTC del 19.
  // Ahora: 23:59 del 19 en Bogotá = 04:59 UTC del 20.
  const ultimo = timestamp("2026-10-19T05:01:00Z");
  const ahora = new Date("2026-10-20T04:59:00Z");
  assert.equal(calcularRacha(3, ultimo, ahora, "America/Bogota"), 3);
  assert.equal(calcularRacha(3, ultimo, ahora, "UTC"), 4);
});

/* ------------------------------------------------------------------ */
/* Logros                                                              */
/* ------------------------------------------------------------------ */

const logro = (id, criterioTipo, criterioValor, extra = {}) => ({
  id,
  nombre: `Logro ${id}`,
  descripcion: `Descripción ${id}`,
  criterioTipo,
  criterioValor,
  ...extra,
});

const contexto = (extra = {}) => ({
  actividadesCompletadas: 1,
  porcentajeAciertos: 50,
  racha: 1,
  ...extra,
});

const ids = (logros) => logros.map((l) => l.id);

test("evaluarLogros: 'actividades' compara contra actividadesCompletadas", () => {
  const catalogo = [logro("a1", "actividades", 1), logro("a5", "actividades", 5)];
  assert.deepEqual(ids(evaluarLogros(catalogo, [], contexto())), ["a1"]);
  assert.deepEqual(
    ids(evaluarLogros(catalogo, [], contexto({ actividadesCompletadas: 5 }))),
    ["a1", "a5"]
  );
  assert.deepEqual(
    ids(evaluarLogros(catalogo, [], contexto({ actividadesCompletadas: 0 }))),
    []
  );
});

test("evaluarLogros: 'desempeño' compara contra el porcentaje del intento", () => {
  const catalogo = [logro("p", "desempeño", 100)];
  assert.deepEqual(ids(evaluarLogros(catalogo, [], contexto({ porcentajeAciertos: 99 }))), []);
  assert.deepEqual(
    ids(evaluarLogros(catalogo, [], contexto({ porcentajeAciertos: 100 }))),
    ["p"]
  );
});

test("evaluarLogros: 'desempeño' se acepta con ñ, sin tilde y en NFD", () => {
  const completo = contexto({ porcentajeAciertos: 100 });
  const variantes = [
    "desempeño", // NFC
    "desempeno", // sin ñ
    "desempeño", // n + tilde combinada (NFD)
    "Desempeño", // mayúscula inicial
    " desempeno ", // espacios
  ];
  for (const tipo of variantes) {
    assert.deepEqual(
      ids(evaluarLogros([logro("p", tipo, 100)], [], completo)),
      ["p"],
      `tipo ${JSON.stringify(tipo)}`
    );
  }
});

test("evaluarLogros: 'racha' compara contra la racha nueva", () => {
  const catalogo = [logro("r3", "racha", 3), logro("r7", "racha", 7)];
  assert.deepEqual(ids(evaluarLogros(catalogo, [], contexto({ racha: 2 }))), []);
  assert.deepEqual(ids(evaluarLogros(catalogo, [], contexto({ racha: 3 }))), ["r3"]);
  assert.deepEqual(ids(evaluarLogros(catalogo, [], contexto({ racha: 7 }))), ["r3", "r7"]);
});

test("evaluarLogros excluye los ya obtenidos (lista o Set)", () => {
  const catalogo = [logro("a1", "actividades", 1), logro("r3", "racha", 3)];
  const ctx = contexto({ racha: 3 });
  assert.deepEqual(ids(evaluarLogros(catalogo, ["a1"], ctx)), ["r3"]);
  assert.deepEqual(ids(evaluarLogros(catalogo, new Set(["a1", "r3"]), ctx)), []);
});

test("evaluarLogros omite tipos desconocidos sin lanzar", () => {
  const catalogo = [
    logro("x", "inventado", 1),
    logro("y", undefined, 1),
    logro("a1", "actividades", 1),
  ];
  assert.deepEqual(ids(evaluarLogros(catalogo, [], contexto())), ["a1"]);
});

test("evaluarLogros omite elementos mal formados sin lanzar", () => {
  const catalogo = [
    null,
    undefined,
    "texto",
    { criterioTipo: "actividades", criterioValor: 1 }, // sin id
    logro("con/barra", "actividades", 1), // id no usable como parte de un doc id
    logro("nan", "actividades", NaN),
    logro("neg", "actividades", -1),
    logro("txt", "actividades", "1"),
    logro("ok", "actividades", 1),
  ];
  assert.deepEqual(ids(evaluarLogros(catalogo, [], contexto())), ["ok"]);
});

test("evaluarLogros con catálogo vacío o ausente no otorga nada", () => {
  assert.deepEqual(evaluarLogros([], [], contexto()), []);
  assert.deepEqual(evaluarLogros(undefined, [], contexto()), []);
  assert.deepEqual(evaluarLogros(null, undefined, contexto()), []);
});

test("evaluarLogros con contexto incompleto no otorga el criterio faltante", () => {
  const catalogo = [logro("r3", "racha", 3), logro("a1", "actividades", 1)];
  assert.deepEqual(ids(evaluarLogros(catalogo, [], { actividadesCompletadas: 1 })), ["a1"]);
  assert.deepEqual(ids(evaluarLogros(catalogo, [], undefined)), []);
});

test("evaluarLogros devuelve id, nombre, descripcion e iconoUrl (null si falta)", () => {
  const catalogo = [
    logro("a1", "actividades", 1, { iconoUrl: "https://x/i.png" }),
    logro("a2", "actividades", 1),
  ];
  assert.deepEqual(evaluarLogros(catalogo, [], contexto({ actividadesCompletadas: 2 })), [
    {
      id: "a1",
      nombre: "Logro a1",
      descripcion: "Descripción a1",
      iconoUrl: "https://x/i.png",
    },
    {
      id: "a2",
      nombre: "Logro a2",
      descripcion: "Descripción a2",
      iconoUrl: null,
    },
  ]);
});

test("evaluarLogros no repite un logro duplicado en el catálogo", () => {
  const catalogo = [logro("a1", "actividades", 1), logro("a1", "actividades", 1)];
  assert.deepEqual(ids(evaluarLogros(catalogo, [], contexto())), ["a1"]);
});
