// functions/src/cambiarRol.js

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

const {
  esIdValido,
  esAdministrador,
  exigirAdministrador,
} = require("./adminComun");

const db = getFirestore();

const ROLES = ["estudiante", "docente", "administrador"];

/*
 * Sin límite de frecuencia ni App Check, a propósito: solo un administrador
 * puede llamar a esta función, así que quien llega aquí es un usuario de
 * confianza.
 */
const cambiarRol = onCall(async (request) => {
  /*
   * ============================================================
   * 1. VALIDAR SESIÓN Y ROL
   * ============================================================
   */

  const adminId = await exigirAdministrador(
    db,
    request,
    "cambiar el rol de un usuario"
  );

  /*
   * ============================================================
   * 2. VALIDAR DATOS RECIBIDOS
   * ============================================================
   */

  const { uid, rol } = request.data || {};

  if (!esIdValido(uid)) {
    throw new HttpsError(
      "invalid-argument",
      "uid es obligatorio y no puede contener '/'."
    );
  }

  if (!ROLES.includes(rol)) {
    throw new HttpsError(
      "invalid-argument",
      "rol debe ser 'estudiante', 'docente' o 'administrador'."
    );
  }

  /*
   * Un administrador no puede cambiar su propio rol: podría quedarse sin
   * acceso al panel. Esto además garantiza que siempre quede al menos un
   * administrador: quien llama.
   */
  if (uid === adminId) {
    throw new HttpsError(
      "failed-precondition",
      "No puedes cambiar tu propio rol: podrías quedarte sin acceso de administrador."
    );
  }

  /*
   * ============================================================
   * 3. TRANSACCIÓN
   * ============================================================
   *
   * Todas las lecturas van antes de la primera escritura. El llamante se
   * vuelve a leer aquí dentro: si dos administradores se degradan a la vez,
   * cada transacción lee el perfil que la otra escribe, Firestore reintenta
   * una de ellas y, en el reintento, esa ya no es administrador. Así nunca
   * se quedan los dos sin rol.
   */

  return db.runTransaction(async (transaction) => {
    const adminRef = db.collection("usuarios").doc(adminId);
    const objetivoRef = db.collection("usuarios").doc(uid);

    const adminSnap = await transaction.get(adminRef);

    if (!esAdministrador(adminSnap)) {
      throw new HttpsError(
        "permission-denied",
        "Solo los administradores pueden realizar esta acción."
      );
    }

    const objetivoSnap = await transaction.get(objetivoRef);

    if (!objetivoSnap.exists) {
      throw new HttpsError("not-found", "El usuario no existe.");
    }

    const rolAnterior = objetivoSnap.data().rol ?? null;

    // Sin cambios: ni escritura ni auditoría.
    if (rolAnterior === rol) {
      return { ok: true, uid, rolAnterior, rolNuevo: rol, cambiado: false };
    }

    // Solo el campo rol: nada más del perfil se toca.
    transaction.update(objetivoRef, { rol });

    transaction.create(db.collection("auditoria").doc(), {
      accion: "usuario.cambiar_rol",
      actorId: adminId,
      objetivoId: uid,
      detalle: { rolAnterior, rolNuevo: rol },
      creadoEn: FieldValue.serverTimestamp(),
    });

    return { ok: true, uid, rolAnterior, rolNuevo: rol, cambiado: true };
  });
});

module.exports = {
  cambiarRol,
};
