const { onCall, HttpsError } = require("firebase-functions/v2/https");
const {
  getFirestore,
  FieldValue,
  Timestamp,
} = require("firebase-admin/firestore");

/**
 * Evalúa los logros disponibles para un estudiante
 * después de registrar un intento.
 *
 * Los logros se almacenan en:
 * logros_usuario/{estudianteId}_{logroId}
 *
 * El ID compuesto garantiza idempotencia y evita
 * otorgar el mismo logro dos veces.
 *
 * @param {Object} params
 * @param {string} params.estudianteId
 * @param {Object} params.intento
 * @param {Object} [params.db]
 * @param {Object} [params.transaction]
 * @returns {Promise<Array>}
 */
async function evaluarLogros({
  estudianteId,
  intento,
  db = getFirestore(),
  transaction = null,
}) {
  if (
    typeof estudianteId !== "string" ||
    !estudianteId.trim()
  ) {
    throw new Error("estudianteId es obligatorio.");
  }

  if (!intento || typeof intento !== "object") {
    throw new Error("Los datos del intento son obligatorios.");
  }

  const logrosSnap = await db
    .collection("logros")
    .get();

  if (logrosSnap.empty) {
    return [];
  }

  const usuarioRef = db
    .collection("usuarios")
    .doc(estudianteId);

  const usuarioSnap = transaction
    ? await transaction.get(usuarioRef)
    : await usuarioRef.get();

  if (!usuarioSnap.exists) {
    throw new Error(
      "No existe el usuario del estudiante."
    );
  }

  const usuario = usuarioSnap.data();

  /*
   * Actividades realizadas:
   * se cuentan los intentos registrados del estudiante.
   */
  const intentosSnap = await db
    .collection("intentos")
    .where("estudianteId", "==", estudianteId)
    .get();

  const cantidadActividades = intentosSnap.size;

  /*
   * Racha:
   * se utiliza el valor mantenido en usuarios.rachaActual.
   * Si todavía no existe, se considera 0.
   */
  const rachaActual = Number(
    usuario.rachaActual || 0
  );

  const porcentajeAciertos = Number(
    intento.porcentajeAciertos || 0
  );

  const logrosCumplidos = [];

  for (const logroDoc of logrosSnap.docs) {
    const logro = {
      id: logroDoc.id,
      ...logroDoc.data(),
    };

    const criterioValor = Number(
      logro.criterioValor
    );

    if (
      !Number.isFinite(criterioValor) ||
      criterioValor < 0
    ) {
      continue;
    }

    let criterioCumplido = false;

    switch (logro.criterioTipo) {
      case "actividades":
        criterioCumplido =
          cantidadActividades >= criterioValor;
        break;

      case "desempeño":
        criterioCumplido =
          porcentajeAciertos >= criterioValor;
        break;

      case "racha":
        criterioCumplido =
          rachaActual >= criterioValor;
        break;

      default:
        continue;
    }

    if (!criterioCumplido) {
      continue;
    }

    const logroUsuarioId =
      `${estudianteId}_${logro.id}`;

    const logroUsuarioRef = db
      .collection("logros_usuario")
      .doc(logroUsuarioId);

    /*
     * Idempotencia:
     * antes de crear el logro se comprueba si ya fue otorgado.
     */
    const logroUsuarioSnap = transaction
      ? await transaction.get(logroUsuarioRef)
      : await logroUsuarioRef.get();

    if (logroUsuarioSnap.exists) {
      continue;
    }

    const logroUsuarioData = {
      id: logroUsuarioId,
      estudianteId,
      logroId: logro.id,
      obtenidoEn: FieldValue.serverTimestamp(),
    };

    if (transaction) {
      transaction.create(
        logroUsuarioRef,
        logroUsuarioData
      );
    } else {
      await logroUsuarioRef.create(
        logroUsuarioData
      );
    }

    logrosCumplidos.push({
      id: logro.id,
      nombre: logro.nombre,
      descripcion: logro.descripcion,
      criterioTipo: logro.criterioTipo,
      criterioValor: criterioValor,
      iconoUrl: logro.iconoUrl || null,
    });
  }

  return logrosCumplidos;
}

/**
 * Cloud Function callable para evaluar logros.
 *
 * La aplicación puede invocarla, pero la evaluación
 * real se realiza en el backend.
 */
const evaluarLogrosCallable = onCall(
  async (request) => {
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "Debes iniciar sesión."
      );
    }

    if (request.auth.token.role !== "estudiante") {
      throw new HttpsError(
        "permission-denied",
        "Solo los estudiantes pueden evaluar sus logros."
      );
    }

    const { intento } = request.data || {};

    if (!intento) {
      throw new HttpsError(
        "invalid-argument",
        "Los datos del intento son obligatorios."
      );
    }

    try {
      const logros = await evaluarLogros({
        estudianteId: request.auth.uid,
        intento,
      });

      return {
        success: true,
        logros,
      };
    } catch (error) {
      console.error(
        "Error evaluando logros:",
        error
      );

      throw new HttpsError(
        "internal",
        "No fue posible evaluar los logros."
      );
    }
  }
);

module.exports = {
  evaluarLogros,
  evaluarLogrosCallable,
};