/* eslint-env node */
// Carga categorías, lecturas y preguntas de ejemplo en Firestore.
//
//   node scripts/seed/seed.cjs                       simulacro: no escribe nada
//   node scripts/seed/seed.cjs --apply --project ID  escribe en el proyecto ID
//
// Opciones:
//   --autor <uid>   uid que queda como autorId (por defecto "seed-lectogo")
//
// Usa Firebase Admin, así que las reglas no aplican: necesita credenciales de
// administrador (GOOGLE_APPLICATION_CREDENTIALS o `gcloud auth
// application-default login`). Es idempotente: los IDs son fijos, así que
// correrlo otra vez sobrescribe los mismos documentos.
//
// Las respuestas correctas van en preguntas/{id}/solucion/datos, nunca en el
// documento de la pregunta, que cualquier usuario con sesión puede leer.

const path = require("node:path");

// firebase-admin vive en functions/; el root del frontend no lo instala.
const adminPath = path.join(__dirname, "../../functions/node_modules/firebase-admin");
const admin = require(adminPath);

const { categorias, lecturas } = require("./contenido.cjs");

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const option = (name) => {
  const index = args.indexOf(name);
  return index === -1 ? undefined : args[index + 1];
};

const apply = flag("--apply");
const projectId = option("--project");
const autorId = option("--autor") || "seed-lectogo";

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

  return errores;
}

function construirEscrituras(db) {
  const escrituras = [];
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

  return escrituras;
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

  if (!apply) {
    console.log("Simulacro: no se escribió nada. Usá --apply --project <id> para cargarlo.");
    return;
  }

  admin.initializeApp({ projectId });
  const db = admin.firestore();
  const escrituras = construirEscrituras(db);

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
