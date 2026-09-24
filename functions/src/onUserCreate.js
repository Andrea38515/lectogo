const { auth } = require("firebase-functions/v1");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

// El trigger solo conoce lo que Firebase Auth ya validó (uid, email) —
// nunca lee nada que el cliente haya mandado, así nadie puede
// autoasignarse un rol distinto a "estudiante" en el registro público.
exports.onUserCreate = auth.user().onCreate(async (user) => {
  const perfil = {
    uid: user.uid,
    nombre: user.displayName || "",
    correo: user.email || "",
    rol: "estudiante",
    institucion: "",
    fotoUrl: user.photoURL || "",
    xp: 0,
    nivel: 1,
    rachaActual: 0,
    ultimaActividadEn: null,
    creadoEn: FieldValue.serverTimestamp(),
  };

  await getFirestore().collection("usuarios").doc(user.uid).set(perfil);
});
