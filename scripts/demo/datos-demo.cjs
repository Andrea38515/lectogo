/* eslint-env node */
// Datos de demostración para presentar la plataforma: deja a las cuentas
// demo-estudiante* con actividad resuelta (ranking, logros, niveles y progreso
// del docente con datos) y al docente demo con una lectura propia publicada.
//
//   node scripts/demo/datos-demo.cjs --project ID            simulacro: no escribe nada
//   node scripts/demo/datos-demo.cjs --project ID --apply    escribe en el proyecto ID
//
// Los intentos NO se escriben a mano: se ejecuta la misma función
// registrarIntento (functions/src/registrarIntento.js) con la identidad de cada
// estudiante demo, así que la nota, el XP, el nivel, la racha, los logros y la
// fila del ranking los calcula el servidor igual que en producción. Si un
// intento ya existe se omite (el id es determinista), así que correrlo dos
// veces no duplica nada.
//
// El resultado de cada estudiante está pensado para que la demostración tenga
// variedad: alguien con todo bien, alguien intermedio, alguien que recién
// empieza, y actividades pendientes para resolver en vivo.
//
// También crea (si no existe) una lectura publicada del docente demo con sus
// preguntas, para mostrar "Lecturas" y "Preguntas" con contenido propio, y la
// lectura de prueba "[PRUEBA] ..." que dejaron las verificaciones (solo si es
// del docente demo) se elimina.
//
// Usa Firebase Admin: necesita credenciales de administrador
// (GOOGLE_APPLICATION_CREDENTIALS). Para reiniciar a las cuentas demo entre
// ensayos existe `preparar-demo.cjs --reiniciar`.

const path = require("node:path");

const admin = require(path.join(__dirname, "../../functions/node_modules/firebase-admin"));

const DEMO_DOCENTE = "demo-docente@example.com";

// aciertos: cuántas de las respuestas de la actividad se contestan bien
// (el resto, mal a propósito). Cada actividad es de una lectura distinta, así
// que cada una da XP.
const PLAN = [
  { email: "demo-estudiante1@example.com", actividades: [
    ["demo-la-hormiga-viajera", 4],
    ["demo-el-zorro-y-el-tambor", 4],
    ["demo-el-ciclo-del-agua", 3],
    ["demo-el-faro-de-la-isla", 4],
  ] },
  { email: "demo-estudiante3@example.com", actividades: [
    ["demo-la-hormiga-viajera", 3],
    ["demo-el-zorro-y-el-tambor", 4],
    ["demo-el-ciclo-del-agua", 2],
  ] },
  { email: "demo-estudiante4@example.com", actividades: [
    ["demo-la-hormiga-viajera", 2],
    ["demo-el-zorro-y-el-tambor", 3],
  ] },
  { email: "demo-estudiante2@example.com", actividades: [
    ["demo-la-hormiga-viajera", 4],
  ] },
];

const LECTURA_DEMO_ID = "demo-lectura-los-volcanes";
const LECTURA_DEMO = {
  titulo: "Los volcanes",
  categoriaId: "ciencia",
  nivelDificultad: "Medio",
  contenido:
    "Un volcán es una abertura en la corteza de la Tierra por donde salen gases, cenizas y roca derretida. " +
    "Debajo de la superficie, la roca se funde y forma el magma. Como el magma es más ligero que la roca sólida, " +
    "sube poco a poco y se acumula en una cámara. Cuando la presión es demasiado grande, el magma busca una salida " +
    "y se produce una erupción. Al salir al exterior, el magma recibe el nombre de lava.\n\n" +
    "No todas las erupciones son iguales. Algunas son tranquilas y la lava corre lentamente por las laderas. Otras son " +
    "violentas y lanzan columnas de ceniza a kilómetros de altura. Con el paso de los siglos, las capas de lava y ceniza " +
    "se van apilando y el volcán crece hasta formar una montaña.\n\n" +
    "Aunque las erupciones pueden ser peligrosas, los volcanes también ayudan. La ceniza volcánica vuelve muy fértil el " +
    "suelo, y por eso muchas personas cultivan cerca de ellos. Hoy, los científicos vigilan los volcanes con instrumentos " +
    "para avisar a la población cuando se acerca una erupción.",
  preguntas: [
    {
      tipo: "seleccion_multiple",
      enunciado: "¿Cómo se llama el magma cuando sale al exterior?",
      opciones: ["Ceniza", "Lava", "Gas", "Roca sólida"],
      respuestaCorrecta: "Lava",
      explicacion: "El texto dice que, al salir al exterior, el magma recibe el nombre de lava.",
    },
    {
      tipo: "seleccion_multiple",
      enunciado: "Según el texto, ¿por qué muchas personas cultivan cerca de los volcanes?",
      opciones: [
        "Porque allí hace más frío",
        "Porque la ceniza vuelve muy fértil el suelo",
        "Porque no hay erupciones",
        "Porque el agua es más abundante",
      ],
      respuestaCorrecta: "Porque la ceniza vuelve muy fértil el suelo",
      explicacion: "El último párrafo explica que la ceniza volcánica hace muy fértil el suelo.",
    },
    {
      tipo: "verdadero_falso",
      enunciado: "Todas las erupciones volcánicas son violentas.",
      opciones: ["Verdadero", "Falso"],
      respuestaCorrecta: "Falso",
      explicacion: "El texto indica que algunas erupciones son tranquilas y otras violentas.",
    },
  ],
};

const args = process.argv.slice(2);
const aplicar = args.includes("--apply");
const idx = args.indexOf("--project");
const projectId = idx >= 0 ? args[idx + 1] : null;

if (!projectId) {
  console.error("Falta --project <id del proyecto>.");
  process.exit(1);
}

async function uidDe(email) {
  try {
    return (await admin.auth().getUserByEmail(email)).uid;
  } catch (error) {
    if (error.code === "auth/user-not-found") return null;
    throw error;
  }
}

// Respuestas para una actividad: las primeras `aciertos` bien, el resto mal.
async function armarRespuestas(db, lecturaId, aciertos) {
  const preguntas = await db.collection("preguntas").where("lecturaId", "==", lecturaId).get();
  const respuestas = [];
  let i = 0;
  for (const preguntaDoc of preguntas.docs) {
    const solucion = (await preguntaDoc.ref.collection("solucion").doc("datos").get()).data();
    const correcta = solucion.respuestaCorrecta;
    const bien = i < aciertos;
    const opciones = preguntaDoc.data().opciones;
    respuestas.push({
      preguntaId: preguntaDoc.id,
      respuestaDada: bien ? correcta : opciones.find((o) => o !== correcta),
    });
    i += 1;
  }
  return respuestas;
}

async function resolverActividades(db, registrarIntento) {
  for (const { email, actividades } of PLAN) {
    const uid = await uidDe(email);
    if (!uid) {
      console.log(`(aviso) ${email} no existe: se omite.`);
      continue;
    }
    console.log(`${email}`);
    for (const [actividadId, aciertos] of actividades) {
      const actividad = await db.collection("actividades").doc(actividadId).get();
      if (!actividad.exists) {
        console.log(`   (aviso) ${actividadId} no existe: se omite.`);
        continue;
      }
      if (!(actividad.data().estudiantesAsignados || []).includes(uid)) {
        console.log(`   (aviso) ${actividadId}: la cuenta no está asignada: se omite.`);
        continue;
      }
      const yaExiste = (await db.collection("intentos").doc(`${actividadId}_${uid}`).get()).exists;
      if (yaExiste) {
        console.log(`   existe  ${actividadId}`);
        continue;
      }
      console.log(`   ${aplicar ? "RESUELVE" : "resolvería"} ${actividadId} (${aciertos} bien)`);
      if (!aplicar) continue;
      const respuestas = await armarRespuestas(db, actividad.data().lecturaId, aciertos);
      const resultado = await registrarIntento.run({
        auth: { uid, token: {} },
        data: { actividadId, respuestas },
        rawRequest: {},
      });
      console.log(
        `            -> ${resultado.porcentajeAciertos}%  +${resultado.xpGanado} XP  total ${resultado.xpTotal}  nivel ${resultado.nivel}` +
          (resultado.logrosNuevos?.length ? `  logros: ${resultado.logrosNuevos.map((l) => l.nombre).join(", ")}` : ""),
      );
    }
  }
}

async function lecturaDelDocente(db) {
  const docenteId = await uidDe(DEMO_DOCENTE);
  if (!docenteId) throw new Error(`${DEMO_DOCENTE} no existe.`);

  const ref = db.collection("lecturas").doc(LECTURA_DEMO_ID);
  if ((await ref.get()).exists) {
    console.log(`Lectura «${LECTURA_DEMO.titulo}»: existe`);
  } else {
    console.log(`Lectura «${LECTURA_DEMO.titulo}»: ${aplicar ? "CREA" : "crearía"} (publicada, ${LECTURA_DEMO.preguntas.length} preguntas)`);
    if (aplicar) {
      const ahora = admin.firestore.FieldValue.serverTimestamp();
      const batch = db.batch();
      const { preguntas, ...datos } = LECTURA_DEMO;
      batch.create(ref, { ...datos, estado: "publicada", autorId: docenteId, creadoEn: ahora });
      preguntas.forEach((p, i) => {
        const preguntaRef = db.collection("preguntas").doc(`${LECTURA_DEMO_ID}-p${i + 1}`);
        batch.create(preguntaRef, {
          lecturaId: LECTURA_DEMO_ID,
          autorId: docenteId,
          tipo: p.tipo,
          enunciado: p.enunciado,
          opciones: p.opciones,
          creadoEn: ahora,
        });
        batch.create(preguntaRef.collection("solucion").doc("datos"), {
          respuestaCorrecta: p.respuestaCorrecta,
          explicacion: p.explicacion,
        });
      });
      await batch.commit();
    }
  }

  // La lectura de prueba que dejaron las verificaciones, solo si es del docente demo.
  const pruebas = await db.collection("lecturas").where("autorId", "==", docenteId).get();
  for (const doc of pruebas.docs) {
    if (!String(doc.data().titulo || "").startsWith("[PRUEBA]")) continue;
    const preguntas = await db.collection("preguntas").where("lecturaId", "==", doc.id).limit(1).get();
    const enActividad = await db.collection("actividades").where("lecturaId", "==", doc.id).limit(1).get();
    if (!preguntas.empty || !enActividad.empty) {
      console.log(`Lectura de prueba «${doc.data().titulo}»: tiene preguntas o actividades, se deja`);
      continue;
    }
    console.log(`Lectura de prueba «${doc.data().titulo}»: ${aplicar ? "ELIMINA" : "eliminaría"}`);
    if (aplicar) await doc.ref.delete();
  }
}

async function main() {
  admin.initializeApp({ projectId });
  const db = admin.firestore();

  console.log(`${aplicar ? "APLICANDO" : "SIMULACRO"} en ${projectId}`);
  // registrarIntento se carga después de initializeApp: toma el Firestore por defecto.
  const { registrarIntento } = require(path.join(__dirname, "../../functions/src/registrarIntento.js"));

  await lecturaDelDocente(db);
  console.log("");
  await resolverActividades(db, registrarIntento);
  console.log(aplicar ? "\nListo." : "\nSimulacro terminado: no se escribió nada. Agregá --apply para aplicar.");
}

main().catch((error) => {
  console.error("Falló:", error.message);
  process.exit(1);
});
