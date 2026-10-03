const { getFirestore } = require("firebase-admin/firestore");

/**
 * Calcula el XP obtenido por un intento.
 *
 * La configuración se obtiene desde:
 * config_negocio/gamificacion
 *
 * No se definen valores de XP directamente en el código.
 *
 * @param {Object} params
 * @param {number} params.respuestasCorrectas
 * @param {number} params.porcentajeAciertos
 * @param {Object} [params.db]
 * @returns {Promise<number>}
 */
async function calcularXp({
  respuestasCorrectas,
  porcentajeAciertos,
  db = getFirestore(),
}) {
  if (
    !Number.isInteger(respuestasCorrectas) ||
    respuestasCorrectas < 0
  ) {
    throw new Error("respuestasCorrectas debe ser un entero válido.");
  }

  if (
    typeof porcentajeAciertos !== "number" ||
    porcentajeAciertos < 0 ||
    porcentajeAciertos > 100
  ) {
    throw new Error("porcentajeAciertos debe estar entre 0 y 100.");
  }

  const configRef = db
    .collection("config_negocio")
    .doc("gamificacion");

  const configSnap = await configRef.get();

  if (!configSnap.exists) {
    throw new Error(
      "No existe la configuración de gamificación."
    );
  }

  const config = configSnap.data();

  const xpPorRespuestaCorrecta = Number(
    config.xpPorRespuestaCorrecta
  );

  const xpBonoActividadCompleta = Number(
    config.xpBonoActividadCompleta
  );

  if (
    !Number.isFinite(xpPorRespuestaCorrecta) ||
    xpPorRespuestaCorrecta < 0
  ) {
    throw new Error(
      "xpPorRespuestaCorrecta no está configurado correctamente."
    );
  }

  if (
    !Number.isFinite(xpBonoActividadCompleta) ||
    xpBonoActividadCompleta < 0
  ) {
    throw new Error(
      "xpBonoActividadCompleta no está configurado correctamente."
    );
  }

  const xpRespuestas =
    respuestasCorrectas * xpPorRespuestaCorrecta;

  const xpBono =
    porcentajeAciertos === 100
      ? xpBonoActividadCompleta
      : 0;

  return xpRespuestas + xpBono;
}

module.exports = {
  calcularXp,
};