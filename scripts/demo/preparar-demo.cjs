/* eslint-env node */
// Prepara los datos de la sustentación: actividades de demostración asignadas a
// las cuentas demo-estudiante*, y el reinicio de esas cuentas entre ensayos.
//
//   node scripts/demo/preparar-demo.cjs --project ID                 simulacro de las actividades
//   node scripts/demo/preparar-demo.cjs --project ID --apply         crea las actividades que falten
//   node scripts/demo/preparar-demo.cjs --project ID --reiniciar     simulacro del reinicio
//   node scripts/demo/preparar-demo.cjs --project ID --reiniciar --apply
//
// Actividades: tienen id fijo (demo-*), se crean sólo si no existen y nunca se
// sobrescriben, así que correrlo dos veces no pisa nada. Quedan a nombre del
// docente demo (demo-docente@example.com) y marcadas esDemo.
//
// Reinicio: deja las cuentas demo-estudiante* como recién registradas (sin
// intentos, logros ni fila de ranking, con xp, nivel y racha en cero) y vuelve a
// dejar sus actividades demo como "asignada". Está limitado A PROPÓSITO a las
// cuentas de DEMO_ESTUDIANTES: no toca QA ni a ningún otro estudiante.
//
// Usa Firebase Admin, así que las reglas no aplican: necesita credenciales de
// administrador (GOOGLE_APPLICATION_CREDENTIALS).

const path = require("node:path");

const admin = require(path.join(__dirname, "../../functions/node_modules/firebase-admin"));

const DEMO_DOCENTE = "demo-docente@example.com";
const DEMO_ESTUDIANTES = [1, 2, 3, 4].map((n) => `demo-estudiante${n}@example.com`);

const FECHA_LIMITE = new Date("2026-11-30T23:59:59Z");
const FECHA_VENCIDA = new Date("2026-10-10T23:59:59Z");

// Una por lectura, para que cada actividad dé XP al resolverse. La última está
// vencida a propósito, para mostrar el estado "vencida".
const ACTIVIDADES = [
  { id: "demo-la-hormiga-viajera", lecturaId: "lectura-la-hormiga-viajera", limite: FECHA_LIMITE },
  { id: "demo-el-zorro-y-el-tambor", lecturaId: "lectura-el-zorro-y-el-tambor", limite: FECHA_LIMITE },
  { id: "demo-el-ciclo-del-agua", lecturaId: "lectura-el-ciclo-del-agua", limite: FECHA_LIMITE },
  { id: "demo-el-faro-de-la-isla", lecturaId: "lectura-el-faro-de-la-isla", limite: FECHA_LIMITE },
  { id: "demo-el-origen-de-los-juegos-olimpicos", lecturaId: "lectura-el-origen-de-los-juegos-olimpicos", limite: FECHA_LIMITE },
  { id: "demo-el-sistema-solar-vencida", lecturaId: "lectura-el-sistema-solar", limite: FECHA_VENCIDA },
];

const args = process.argv.slice(2);
const aplicar = args.includes("--apply");
const reiniciar = args.includes("--reiniciar");
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

async function estudiantesDemo() {
  const encontrados = [];
  for (const email of DEMO_ESTUDIANTES) {
    const uid = await uidDe(email);
    if (!uid) {
      console.log(`  (aviso) ${email} no existe: se omite.`);
      continue;
    }
    encontrados.push({ email, uid });
  }
  return encontrados;
}

async function crearActividades(db) {
  const docenteId = await uidDe(DEMO_DOCENTE);
  if (!docenteId) throw new Error(`${DEMO_DOCENTE} no existe: no hay a quién atribuir las actividades.`);

  const estudiantes = await estudiantesDemo();
  if (estudiantes.length === 0) throw new Error("No hay ninguna cuenta demo-estudiante*.");
  const asignados = estudiantes.map((e) => e.uid);

  // Nombre y correo que asignarActividad copia a actividades/{id}/asignados:
  // la pantalla de progreso del docente los lee de ahí.
  const perfiles = new Map();
  for (const { email, uid } of estudiantes) {
    const perfil = await db.collection("usuarios").doc(uid).get();
    perfiles.set(uid, { nombre: perfil.data()?.nombre || email, correo: perfil.data()?.correo || email });
  }

  for (const actividad of ACTIVIDADES) {
    const lectura = await db.collection("lecturas").doc(actividad.lecturaId).get();
    if (!lectura.exists || lectura.data().estado !== "publicada") {
      throw new Error(`La lectura ${actividad.lecturaId} no existe o no está publicada.`);
    }
    const ref = db.collection("actividades").doc(actividad.id);
    const existente = await ref.get();
    const yaExiste = existente.exists;
    const etiqueta = actividad.limite < new Date() ? "vencida" : "vigente";
    if (yaExiste) {
      // Una cuenta demo registrada después: se suma a la actividad existente.
      const actuales = existente.data().estudiantesAsignados || [];
      const faltan = asignados.filter((uid) => !actuales.includes(uid));
      console.log(`  existe  ${actividad.id}  (${etiqueta})${faltan.length ? `  ${aplicar ? "AGREGA" : "agregaría"} ${faltan.length} estudiante(s)` : ""}`);
      if (faltan.length && aplicar) {
        await ref.update({ estudiantesAsignados: admin.firestore.FieldValue.arrayUnion(...faltan) });
      }
      await asegurarAsignados(ref, asignados, perfiles);
      continue;
    }
    console.log(`  ${aplicar ? "CREA   " : "crearía"} ${actividad.id}  (${etiqueta}, ${asignados.length} estudiantes)`);
    if (!aplicar) continue;
    await ref.create({
      lecturaId: actividad.lecturaId,
      docenteId,
      estudiantesAsignados: asignados,
      estado: "asignada",
      fechaLimite: admin.firestore.Timestamp.fromDate(actividad.limite),
      esDemo: true,
      creadoEn: admin.firestore.FieldValue.serverTimestamp(),
    });
    await asegurarAsignados(ref, asignados, perfiles);
  }
}

// Crea los subdocumentos asignados/{uid} que falten, sin tocar los que ya
// existen (create falla con ALREADY_EXISTS, código 6, y se ignora).
async function asegurarAsignados(ref, uids, perfiles) {
  for (const uid of uids) {
    const destino = ref.collection("asignados").doc(uid);
    if ((await destino.get()).exists) continue;
    console.log(`            ${aplicar ? "agrega" : "agregaría"} asignados/${uid} (${perfiles.get(uid).nombre})`);
    if (!aplicar) continue;
    try {
      await destino.create({
        estudianteId: uid,
        ...perfiles.get(uid),
        asignadoEn: admin.firestore.FieldValue.serverTimestamp(),
      });
    } catch (error) {
      if (error.code !== 6) throw error;
    }
  }
}

async function reiniciarCuentas(db) {
  const estudiantes = await estudiantesDemo();
  const uids = new Set(estudiantes.map((e) => e.uid));

  for (const { email, uid } of estudiantes) {
    const intentos = await db.collection("intentos").where("estudianteId", "==", uid).get();
    const logros = await db.collection("logros_usuario").where("estudianteId", "==", uid).get();
    const ranking = await db.collection("ranking").doc(uid).get();
    console.log(`  ${email}: ${intentos.size} intentos, ${logros.size} logros, ranking ${ranking.exists ? "sí" : "no"}`);

    if (!aplicar) continue;
    // Salvaguarda: sólo se borra lo que pertenece a una cuenta demo.
    for (const doc of [...intentos.docs, ...logros.docs]) {
      if (!uids.has(doc.data().estudianteId)) throw new Error(`${doc.ref.path} no es de una cuenta demo.`);
      await doc.ref.delete();
    }
    if (ranking.exists) await ranking.ref.delete();
    await db.collection("usuarios").doc(uid).update({
      xp: 0,
      nivel: 1,
      rachaActual: 0,
      ultimaActividadEn: null,
    });
  }

  // Las actividades demo vuelven a quedar disponibles.
  for (const actividad of ACTIVIDADES) {
    const ref = db.collection("actividades").doc(actividad.id);
    const snap = await ref.get();
    if (!snap.exists || snap.data().estado === "asignada") continue;
    console.log(`  ${aplicar ? "restablece" : "restablecería"} ${actividad.id} (estado ${snap.data().estado} -> asignada)`);
    if (aplicar) await ref.update({ estado: "asignada" });
  }
}

async function main() {
  admin.initializeApp({ projectId });
  const db = admin.firestore();

  console.log(`${aplicar ? "APLICANDO" : "SIMULACRO"} en ${projectId} (${reiniciar ? "reinicio" : "actividades"})`);
  if (reiniciar) await reiniciarCuentas(db);
  else await crearActividades(db);
  console.log(aplicar ? "Listo." : "Simulacro terminado: no se escribió nada. Agregá --apply para aplicar.");
}

main().catch((error) => {
  console.error("Falló:", error.message);
  process.exit(1);
});
