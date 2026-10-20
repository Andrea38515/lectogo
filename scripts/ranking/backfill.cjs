/* eslint-env node */
// Crea las filas de ranking/{uid} de los estudiantes que ya existían antes de
// que registrarIntento empezara a mantener el ranking.
//
//   node scripts/ranking/backfill.cjs                       simulacro: no lee ni escribe
//   node scripts/ranking/backfill.cjs --apply --project ID  escribe en el proyecto ID
//
// Reglas:
//   - NUNCA modifica una fila existente. Las filas que ya hay son correctas
//     (la ruta en vivo cuenta todos los intentos previos), y el script tarda:
//     sobrescribir con una foto vieja pisaría la fila que un intento reciente
//     acaba de escribir. Por eso las existentes se omiten al leerlas y cada
//     fila nueva se escribe con create() por documento: si otra escritura la
//     creó mientras tanto, create falla con ALREADY_EXISTS y se cuenta como
//     omitida. No se usa set() ni batch.
//   - Sólo crea filas para estudiantes con al menos un intento (como la ruta
//     en vivo); los que tienen 0 se omiten y se informan.
//   - No borra ninguna fila (las huérfanas quedan fuera de alcance).
//
// La fila se arma con las MISMAS funciones puras que usa la Cloud Function
// (functions/src/gamificacion.js, decidirFilaBackfill): xp y nivel salen de
// usuarios/{uid}, actividades = intentos del estudiante, logros = ids de
// logro distintos en logros_usuario, alias = "Lector XXXX" generado. Nunca
// copia nombre, correo ni foto: el ranking lo lee cualquier usuario con
// sesión.
//
// Usa Firebase Admin, así que las reglas no aplican: necesita credenciales de
// administrador (GOOGLE_APPLICATION_CREDENTIALS o `gcloud auth
// application-default login`). firebase-admin y gamificacion.js se cargan sólo
// con --apply, así el simulacro corre sin node_modules instalado.

const path = require("node:path");

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);

// Un valor que empieza con "-" es otra opción (p. ej. `--project --apply`),
// no un id de proyecto: se rechaza en vez de tomarlo como valor.
function opcionConValor(name) {
  const index = args.indexOf(name);
  if (index === -1) return undefined;

  const valor = args[index + 1];
  if (valor === undefined || valor.startsWith("-")) {
    console.error(`${name} necesita un valor que no empiece con "-" (p. ej. ${name} mi-proyecto).`);
    process.exit(1);
  }
  return valor;
}

const apply = flag("--apply");
const projectId = opcionConValor("--project");

if (apply && !projectId) {
  console.error("Con --apply tenés que indicar el proyecto: --project <id>.");
  process.exit(1);
}

const CONCURRENCIA = 20;
const TAMANIO_LOTE_LECTURA = 300;
const CADA_CUANTOS_PROGRESO = 50;
const ALREADY_EXISTS = 6; // código gRPC

// Ejecuta `tarea` sobre cada elemento con a lo sumo `limite` en vuelo.
async function conConcurrencia(elementos, limite, tarea) {
  let siguiente = 0;
  const trabajadores = Array.from({ length: Math.min(limite, elementos.length) }, async () => {
    while (siguiente < elementos.length) {
      const indice = siguiente;
      siguiente += 1;
      await tarea(elementos[indice], indice);
    }
  });
  await Promise.all(trabajadores);
}

async function main() {
  const emulador = process.env.FIRESTORE_EMULATOR_HOST;

  console.log(`Proyecto destino: ${projectId || "(ninguno: simulacro)"}.`);
  if (emulador) {
    console.log(`FIRESTORE_EMULATOR_HOST está definido: se usará el emulador en ${emulador}.`);
  }

  if (!apply) {
    // El simulacro no puede leer Firestore, así que sólo describe qué haría.
    console.log("Simulacro: no se leyó ni se escribió nada. Con --apply --project <id> haría:");
    console.log('  1. leer usuarios donde rol == "estudiante" y las filas de ranking que ya existen;');
    console.log("  2. omitir a quienes ya tienen fila (nunca se sobrescribe ni se toca una fila existente);");
    console.log("  3. por cada uno de los demás, contar sus intentos y sus logros distintos;");
    console.log("  4. omitir a quienes tienen 0 intentos (no crea filas en cero);");
    console.log("  5. crear ranking/{uid} con { estudianteId, alias, xp, nivel, logros, actividades, actualizadoEn }");
    console.log("     con create() por documento (20 en paralelo); si ya existe se cuenta como omitida;");
    console.log("  6. mostrar el resumen: creadas / omitidas (ya existían) / omitidas (sin actividad) / fallidas.");
    return;
  }

  // Carga perezosa: sólo el camino con --apply necesita estas dependencias.
  // firebase-admin vive en functions/; el root del frontend no lo instala.
  const admin = require(path.join(__dirname, "../../functions/node_modules/firebase-admin"));
  const { decidirFilaBackfill } = require("../../functions/src/gamificacion");

  admin.initializeApp({ projectId });
  const db = admin.firestore();
  const ahora = admin.firestore.FieldValue.serverTimestamp();

  const estudiantes = await db.collection("usuarios").where("rol", "==", "estudiante").get();
  console.log(`Estudiantes encontrados: ${estudiantes.size}.`);

  // Filas que ya existen: se leen de una vez y se omiten sin más consultas.
  const existentes = new Set();
  for (let i = 0; i < estudiantes.docs.length; i += TAMANIO_LOTE_LECTURA) {
    const refs = estudiantes.docs
      .slice(i, i + TAMANIO_LOTE_LECTURA)
      .map((doc) => db.collection("ranking").doc(doc.id));
    for (const fila of await db.getAll(...refs)) {
      if (fila.exists) existentes.add(fila.id);
    }
  }

  const pendientes = estudiantes.docs.filter((doc) => !existentes.has(doc.id));
  const resumen = {
    creadas: 0,
    yaExistian: existentes.size,
    sinActividad: 0,
    fallidas: 0,
  };
  console.log(`Con fila de ranking previa (se omiten): ${existentes.size}. Por revisar: ${pendientes.length}.`);

  let procesados = 0;
  await conConcurrencia(pendientes, CONCURRENCIA, async (doc) => {
    const uid = doc.id;

    try {
      const [intentos, logrosUsuario] = await Promise.all([
        db.collection("intentos").where("estudianteId", "==", uid).count().get(),
        db.collection("logros_usuario").where("estudianteId", "==", uid).select("logroId").get(),
      ]);

      const decision = decidirFilaBackfill(
        uid,
        doc.data(),
        {
          actividades: intentos.data().count,
          logroIds: logrosUsuario.docs.map((logroDoc) => logroDoc.data().logroId),
        },
        ahora,
      );

      if (decision.accion === "omitir") {
        resumen.sinActividad += 1;
      } else {
        try {
          // create() y no set(): jamás pisa una fila que apareció mientras tanto.
          await db.collection("ranking").doc(uid).create(decision.fila);
          resumen.creadas += 1;
        } catch (error) {
          if (error.code === ALREADY_EXISTS) {
            resumen.yaExistian += 1;
          } else {
            throw error;
          }
        }
      }
    } catch (error) {
      resumen.fallidas += 1;
      console.error(`  ${uid}: falló (${error.message})`);
    }

    procesados += 1;
    if (procesados % CADA_CUANTOS_PROGRESO === 0) {
      console.log(`  Progreso: ${procesados}/${pendientes.length} revisados.`);
    }
  });

  console.log(
    `Resumen en ${projectId}: creadas ${resumen.creadas}, ` +
      `omitidas (ya existían) ${resumen.yaExistian}, ` +
      `omitidas (sin actividad) ${resumen.sinActividad}, ` +
      `fallidas ${resumen.fallidas}.`,
  );

  if (resumen.fallidas > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error("Falló el backfill:", error.message);
  process.exit(1);
});
