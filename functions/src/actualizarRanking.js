// functions/src/actualizarRanking.js

const {
  getFirestore,
  FieldValue,
} = require("firebase-admin/firestore");
const { onSchedule } = require("firebase-functions/v2/scheduler");

/**
 * Recalcula la vista materializada de ranking.
 *
 * Criterios:
 * - XP acumulado
 * - Cantidad de logros
 * - Cantidad de actividades completadas
 *
 * El ranking utiliza únicamente el alias del estudiante.
 * Nunca se almacena ni expone el nombre completo.
 *
 * @param {Object} [params]
 * @param {Object} [params.db]
 * @returns {Promise<Array>}
 */
async function actualizarRanking({
  db = getFirestore(),
} = {}) {
  const usuariosSnap = await db
    .collection("usuarios")
    .where("rol", "==", "estudiante")
    .get();

  if (usuariosSnap.empty) {
    return [];
  }

  const logrosSnap = await db
    .collection("logros_usuario")
    .get();

  const intentosSnap = await db
    .collection("intentos")
    .get();

  const logrosPorEstudiante = new Map();
  const actividadesPorEstudiante = new Map();

  for (const logroDoc of logrosSnap.docs) {
    const logro = logroDoc.data();
    const estudianteId = logro.estudianteId;

    if (!estudianteId) {
      continue;
    }

    logrosPorEstudiante.set(
      estudianteId,
      (logrosPorEstudiante.get(estudianteId) || 0) + 1
    );
  }

  for (const intentoDoc of intentosSnap.docs) {
    const intento = intentoDoc.data();
    const estudianteId = intento.estudianteId;
    const actividadId = intento.actividadId;

    if (!estudianteId || !actividadId) {
      continue;
    }

    if (!actividadesPorEstudiante.has(estudianteId)) {
      actividadesPorEstudiante.set(
        estudianteId,
        new Set()
      );
    }

    actividadesPorEstudiante
      .get(estudianteId)
      .add(actividadId);
  }

  const ranking = [];

  for (const usuarioDoc of usuariosSnap.docs) {
    const usuario = usuarioDoc.data();

    const estudianteId = usuarioDoc.id;

    const alias =
      typeof usuario.alias === "string" &&
      usuario.alias.trim()
        ? usuario.alias.trim()
        : `Estudiante${estudianteId.slice(-4)}`;

    const xp = Number(usuario.xp || 0);

    const cantidadLogros =
      logrosPorEstudiante.get(estudianteId) || 0;

    const cantidadActividades =
      actividadesPorEstudiante.get(estudianteId)?.size || 0;

    ranking.push({
      estudianteId,
      alias,
      xp: Number.isFinite(xp) ? xp : 0,
      logros: cantidadLogros,
      actividades: cantidadActividades,
    });
  }

  ranking.sort((a, b) => {
    if (b.xp !== a.xp) {
      return b.xp - a.xp;
    }

    if (b.logros !== a.logros) {
      return b.logros - a.logros;
    }

    if (b.actividades !== a.actividades) {
      return b.actividades - a.actividades;
    }

    return a.alias.localeCompare(b.alias);
  });

  const batch = db.batch();

  const rankingActualSnap = await db
    .collection("ranking")
    .get();

  for (const doc of rankingActualSnap.docs) {
    batch.delete(doc.ref);
  }

  ranking.forEach((item, index) => {
    const rankingRef = db
      .collection("ranking")
      .doc(item.estudianteId);

    batch.set(rankingRef, {
      estudianteId: item.estudianteId,
      alias: item.alias,
      posicion: index + 1,
      xp: item.xp,
      logros: item.logros,
      actividades: item.actividades,
      actualizadoEn: FieldValue.serverTimestamp(),
    });
  });

  await batch.commit();

  return ranking;
}

/**
 * Trigger programado para recalcular periódicamente
 * la vista materializada del ranking.
 *
 * Se utiliza job programado según el diseño del DDS.
 */
const actualizarRankingProgramado = onSchedule(
  {
    schedule: "every 1 hours",
    timeZone: "America/Bogota",
  },
  async () => {
    try {
      await actualizarRanking();

      console.log(
        "Ranking actualizado correctamente."
      );
    } catch (error) {
      console.error(
        "Error actualizando ranking:",
        error
      );

      throw error;
    }
  }
);

module.exports = {
  actualizarRanking,
  actualizarRankingProgramado,
};