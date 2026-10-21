// functions/src/adminComun.js
//
// Piezas comunes de las funciones que sólo puede llamar un administrador
// (cambiarRol, gestionarCategoria).

const { HttpsError } = require("firebase-functions/v2/https");

// Firestore admite ids de hasta 1500 bytes; aquí se acota a 128 caracteres.
const MAX_LONGITUD_ID = 128;

// Firestore reserva los ids con la forma __algo__.
const ID_RESERVADO = /^__.*__$/;

// Un id con "/" se interpretaría como una ruta de documento anidada. Misma
// versión estricta que usa asignarActividad.
const esIdValido = (valor) =>
  typeof valor === "string" &&
  valor.trim() !== "" &&
  valor.length <= MAX_LONGITUD_ID &&
  !ID_RESERVADO.test(valor) &&
  !valor.includes("/") &&
  valor !== "." &&
  valor !== "..";

const esAdministrador = (perfilSnap) =>
  Boolean(perfilSnap.exists) && perfilSnap.data().rol === "administrador";

/*
 * Comprueba sesión y rol y devuelve el uid del administrador que llama. El
 * rol se lee de usuarios/{uid}.rol (no hay custom claims: request.auth.token
 * se ignora a propósito) y un perfil ausente cuenta como "sin permiso".
 * No lee nada más: un rechazo no debe tocar datos del objetivo.
 */
const exigirAdministrador = async (db, request, haciendo) => {
  if (!request.auth) {
    throw new HttpsError(
      "unauthenticated",
      `Debes iniciar sesión para ${haciendo}.`
    );
  }

  const adminId = request.auth.uid;
  const perfilSnap = await db.collection("usuarios").doc(adminId).get();

  if (!esAdministrador(perfilSnap)) {
    throw new HttpsError(
      "permission-denied",
      "Solo los administradores pueden realizar esta acción."
    );
  }

  return adminId;
};

module.exports = {
  esIdValido,
  esAdministrador,
  exigirAdministrador,
};
