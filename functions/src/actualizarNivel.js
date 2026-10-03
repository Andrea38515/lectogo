const { getFirestore } = require("firebase-admin/firestore");

/**
 * Actualiza el nivel de un usuario según su XP acumulado.
 *
 * Los umbrales se obtienen desde:
 * niveles_config
 *
 * No se hardcodean niveles ni cantidades de XP.
 *
 * @param {Object} params
 * @param {string} params.estudianteId
 * @param {number} params.xp
 * @param {Object} [params.db]
 * @param {Object} [params.transaction]
 * @returns {Promise<number>}
 */
async function actualizarNivel({
  estudianteId,
  xp,
  db = getFirestore(),
  transaction = null,
}) {
  if (
    typeof estudianteId !== "string" ||
    !estudianteId.trim()
  ) {
    throw new Error("estudianteId es obligatorio.");
  }

  if (!Number.isFinite(xp) || xp < 0) {
    throw new Error("El XP debe ser un número válido.");
  }

  const nivelesSnap = await db
    .collection("niveles_config")
    .orderBy("xpMinimo", "asc")
    .get();

  if (nivelesSnap.empty) {
    throw new Error(
      "No existen niveles configurados en niveles_config."
    );
  }

  const niveles = nivelesSnap.docs
    .map((doc) => ({
      id: doc.id,
      ...doc.data(),
      nivel: Number(doc.data().nivel),
      xpMinimo: Number(doc.data().xpMinimo),
    }))
    .filter(
      (nivel) =>
        Number.isInteger(nivel.nivel) &&
        nivel.nivel > 0 &&
        Number.isFinite(nivel.xpMinimo) &&
        nivel.xpMinimo >= 0
    )
    .sort((a, b) => a.xpMinimo - b.xpMinimo);

  if (niveles.length === 0) {
    throw new Error(
      "niveles_config no contiene niveles válidos."
    );
  }

  /*
   * El nivel corresponde al mayor xpMinimo que sea
   * menor o igual al XP acumulado.
   */
  let nivelCalculado = niveles[0].nivel;

  for (const nivel of niveles) {
    if (xp >= nivel.xpMinimo) {
      nivelCalculado = nivel.nivel;
    } else {
      break;
    }
  }

  const usuarioRef = db
    .collection("usuarios")
    .doc(estudianteId);

  /*
   * Si registrarIntento utiliza una transacción, se actualiza
   * mediante esa misma transacción.
   */
  if (transaction) {
    transaction.update(usuarioRef, {
      nivel: nivelCalculado,
    });
  } else {
    await usuarioRef.update({
      nivel: nivelCalculado,
    });
  }

  return nivelCalculado;
}

module.exports = {
  actualizarNivel,
};