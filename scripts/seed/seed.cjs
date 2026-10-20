/* eslint-env node */
// Carga categorías, lecturas, preguntas y la configuración de gamificación
// (config_negocio, niveles_config, logros) en Firestore.
//
//   node scripts/seed/seed.cjs                       simulacro: no escribe nada
//   node scripts/seed/seed.cjs --apply --project ID  escribe en el proyecto ID
//
// Opciones:
//   --autor <uid>    uid que queda como autorId (por defecto "seed-lectogo")
//   --reset-config   sobrescribe config_negocio, niveles_config y logros aunque
//                    ya existan (por defecto se conservan los existentes)
//
// Usa Firebase Admin, así que las reglas no aplican: necesita credenciales de
// administrador (GOOGLE_APPLICATION_CREDENTIALS o `gcloud auth
// application-default login`). Es idempotente: los IDs son fijos, así que
// correrlo otra vez sobrescribe los mismos documentos de categorias, lecturas
// y preguntas.
//
// La configuración de gamificación (config_negocio, niveles_config, logros) es
// distinta: un administrador puede haberla ajustado en Firestore, así que sólo
// se crea lo que falta y lo existente se conserva. Para reiniciarla a propósito
// existe --reset-config.
//
// Las respuestas correctas van en preguntas/{id}/solucion/datos, nunca en el
// documento de la pregunta, que cualquier usuario con sesión puede leer.

const path = require("node:path");

// firebase-admin vive en functions/; el root del frontend no lo instala.
const adminPath = path.join(__dirname, "../../functions/node_modules/firebase-admin");
const admin = require(adminPath);

const {
  categorias,
  lecturas,
  configGamificacion,
  nivelesConfig,
  logros,
} = require("./contenido.cjs");

// Tipos que entiende functions/src/gamificacion.js (evaluarLogros). En los
// datos sembrados se exige la grafía canónica, con ñ.
const CRITERIOS_DE_LOGRO = ["actividades", "desempeño", "racha"];

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const option = (name) => {
  const index = args.indexOf(name);
  return index === -1 ? undefined : args[index + 1];
};

const apply = flag("--apply");
const projectId = option("--project");
const autorId = option("--autor") || "seed-lectogo";
const resetConfig = flag("--reset-config");

if (apply && !projectId) {
  console.error("Con --apply tenés que indicar el proyecto: --project <id>.");
  process.exit(1);
}

// Fallar acá es mucho más barato que descubrirlo con datos ya escritos.
function validar() {
  const errores = [];
  const categoriaIds = new Set(categorias.map((c) => c.id));
  const ids = new Set();

  for (const lectura of lecturas) {
    if (!categoriaIds.has(lectura.categoriaId)) {
      errores.push(`${lectura.id}: categoría inexistente (${lectura.categoriaId})`);
    }

    for (const pregunta of lectura.preguntas) {
      if (ids.has(pregunta.id)) errores.push(`${pregunta.id}: id duplicado`);
      ids.add(pregunta.id);

      if (!pregunta.opciones.includes(pregunta.respuestaCorrecta)) {
        errores.push(`${pregunta.id}: respuestaCorrecta no está entre las opciones`);
      }
      if (!["seleccion_multiple", "verdadero_falso"].includes(pregunta.tipo)) {
        errores.push(`${pregunta.id}: tipo no admitido (${pregunta.tipo})`);
      }
    }
  }

  errores.push(...validarGamificacion());

  return errores;
}

const esNumeroNoNegativo = (valor) =>
  typeof valor === "number" && Number.isFinite(valor) && valor >= 0;

function validarGamificacion() {
  const errores = [];

  for (const campo of ["xpPorRespuestaCorrecta", "xpBonoActividadCompleta"]) {
    if (!esNumeroNoNegativo(configGamificacion[campo])) {
      errores.push(`config_negocio/gamificacion: ${campo} debe ser un número >= 0`);
    }
  }

  const nivelIds = new Set();
  nivelesConfig.forEach((item, indice) => {
    if (nivelIds.has(item.id)) errores.push(`${item.id}: id de nivel duplicado`);
    nivelIds.add(item.id);

    // Niveles consecutivos desde 1: sin huecos que dejen un nivel inalcanzable.
    if (item.nivel !== indice + 1) {
      errores.push(`${item.id}: nivel ${item.nivel}, se esperaba ${indice + 1} (consecutivos desde 1)`);
    }
    if (!esNumeroNoNegativo(item.xpMinimo)) {
      errores.push(`${item.id}: xpMinimo debe ser un número >= 0`);
      return;
    }
    // Umbrales estrictamente crecientes; si no, dos niveles serían ambiguos.
    if (indice > 0 && item.xpMinimo <= nivelesConfig[indice - 1].xpMinimo) {
      errores.push(`${item.id}: xpMinimo (${item.xpMinimo}) debe ser mayor que el del nivel anterior`);
    }
  });
  // Sin un nivel en 0 XP, un estudiante recién creado quedaría sin nivel.
  if (nivelesConfig.length > 0 && nivelesConfig[0].xpMinimo !== 0) {
    errores.push(`${nivelesConfig[0].id}: el primer nivel debe empezar en 0 XP`);
  }
  if (nivelesConfig.length === 0) errores.push("niveles_config: no hay niveles");

  const logroIds = new Set();
  for (const logro of logros) {
    if (logroIds.has(logro.id)) errores.push(`${logro.id}: id de logro duplicado`);
    logroIds.add(logro.id);

    if (!CRITERIOS_DE_LOGRO.includes(logro.criterioTipo)) {
      errores.push(`${logro.id}: criterioTipo no admitido (${logro.criterioTipo})`);
    }
    if (!esNumeroNoNegativo(logro.criterioValor)) {
      errores.push(`${logro.id}: criterioValor debe ser un número >= 0`);
    }
    for (const campo of ["nombre", "descripcion"]) {
      if (typeof logro[campo] !== "string" || logro[campo].trim() === "") {
        errores.push(`${logro.id}: ${campo} es obligatorio`);
      }
    }
  }

  return errores;
}

function construirEscrituras(db) {
  const escrituras = [];
  // Configuración de gamificación: se crea sólo si falta (ver main).
  const configuracion = [];
  const ahora = admin.firestore.FieldValue.serverTimestamp();

  for (const { id, nombre, descripcion } of categorias) {
    escrituras.push({
      ref: db.collection("categorias").doc(id),
      data: { nombre, descripcion },
    });
  }

  for (const lectura of lecturas) {
    const { id, titulo, contenido, categoriaId, nivelDificultad, preguntas } = lectura;

    escrituras.push({
      ref: db.collection("lecturas").doc(id),
      data: {
        titulo,
        contenido,
        categoriaId,
        nivelDificultad,
        autorId,
        estado: "publicada",
        creadoEn: ahora,
      },
    });

    for (const pregunta of preguntas) {
      const preguntaRef = db.collection("preguntas").doc(pregunta.id);

      escrituras.push({
        ref: preguntaRef,
        data: {
          lecturaId: id,
          autorId,
          tipo: pregunta.tipo,
          enunciado: pregunta.enunciado,
          opciones: pregunta.opciones,
          creadoEn: ahora,
        },
      });

      escrituras.push({
        ref: preguntaRef.collection("solucion").doc("datos"),
        data: {
          respuestaCorrecta: pregunta.respuestaCorrecta,
          explicacion: pregunta.explicacion,
        },
      });
    }
  }

  // La lee registrarIntento (Admin SDK).
  configuracion.push({
    ref: db.collection("config_negocio").doc("gamificacion"),
    data: {
      xpPorRespuestaCorrecta: configGamificacion.xpPorRespuestaCorrecta,
      xpBonoActividadCompleta: configGamificacion.xpBonoActividadCompleta,
    },
  });

  for (const { id, nivel, xpMinimo } of nivelesConfig) {
    configuracion.push({
      ref: db.collection("niveles_config").doc(id),
      data: { nivel, xpMinimo },
    });
  }

  for (const { id, nombre, descripcion, criterioTipo, criterioValor } of logros) {
    configuracion.push({
      ref: db.collection("logros").doc(id),
      data: { nombre, descripcion, criterioTipo, criterioValor },
    });
  }

  return { escrituras, configuracion };
}

async function main() {
  const errores = validar();
  if (errores.length > 0) {
    console.error("El contenido tiene errores, no se escribió nada:");
    errores.forEach((e) => console.error(`  - ${e}`));
    process.exit(1);
  }

  const totalPreguntas = lecturas.reduce((n, l) => n + l.preguntas.length, 0);
  console.log(
    `Contenido válido: ${categorias.length} categorías, ${lecturas.length} lecturas, ${totalPreguntas} preguntas.`,
  );
  console.log(
    `Gamificación válida: 1 config, ${nivelesConfig.length} niveles, ${logros.length} logros.`,
  );

  const totalConfig = 1 + nivelesConfig.length + logros.length;
  const emulador = process.env.FIRESTORE_EMULATOR_HOST;

  console.log(`Proyecto destino: ${projectId || "(ninguno: simulacro)"}.`);
  if (emulador) {
    console.log(`FIRESTORE_EMULATOR_HOST está definido: se usará el emulador en ${emulador}.`);
  }

  if (!apply) {
    // El simulacro no puede leer Firestore, así que sólo describe qué haría.
    console.log(
      resetConfig
        ? `Con --reset-config se sobrescribirían los ${totalConfig} documentos de configuración (config_negocio, niveles_config, logros).`
        : `Los ${totalConfig} documentos de configuración (config_negocio, niveles_config, logros) sólo se crearían si faltan: los existentes se conservan. Usá --reset-config para sobrescribirlos.`,
    );
    console.log("Simulacro: no se escribió nada. Usá --apply --project <id> para cargarlo.");
    return;
  }

  admin.initializeApp({ projectId });
  const db = admin.firestore();
  const { escrituras: contenido, configuracion } = construirEscrituras(db);

  // Create-if-absent: se leen los documentos de configuración y se omiten los
  // que ya existen, para no pisar valores ajustados por un administrador.
  let aEscribirConfig = configuracion;
  if (!resetConfig) {
    const existentes = await db.getAll(...configuracion.map(({ ref }) => ref));
    aEscribirConfig = configuracion.filter((_, i) => !existentes[i].exists);
  }
  const omitidos = configuracion.length - aEscribirConfig.length;
  console.log(
    resetConfig
      ? `--reset-config: se sobrescriben los ${configuracion.length} documentos de configuración.`
      : `Configuración: ${aEscribirConfig.length} por crear, ${omitidos} ya existían y se omiten (usá --reset-config para sobrescribirlos).`,
  );

  const escrituras = [...contenido, ...aEscribirConfig];

  // Un batch admite hasta 500 operaciones; dejamos margen.
  const TAMANIO_LOTE = 400;
  for (let i = 0; i < escrituras.length; i += TAMANIO_LOTE) {
    const lote = db.batch();
    for (const { ref, data } of escrituras.slice(i, i + TAMANIO_LOTE)) {
      lote.set(ref, data);
    }
    await lote.commit();
  }

  console.log(`Listo: ${escrituras.length} documentos escritos en ${projectId} (autorId: ${autorId}).`);
}

main().catch((error) => {
  console.error("Falló el seed:", error.message);
  process.exit(1);
});
