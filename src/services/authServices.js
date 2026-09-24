import { serverTimestamp } from "firebase/firestore";

import * as authRepository from "../repositories/authRepository";
import * as usuariosRepository from "../repositories/usuariosRepository";

export const mapAuthError = (code) => {
  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
      return "Correo o contraseña incorrectos.";
    case "auth/user-not-found":
      return "No existe una cuenta con ese correo.";
    case "auth/email-already-in-use":
      return "Ya existe una cuenta con ese correo.";
    case "auth/too-many-requests":
      return "Demasiados intentos. Esperá unos minutos e intentá de nuevo.";
    case "auth/weak-password":
      return "La contraseña es demasiado débil.";
    case "auth/no-current-user":
      return "Tu sesión expiró. Volvé a iniciar sesión.";
    default:
      return "Ocurrió un error. Intentá de nuevo.";
  }
};

export const register = async ({ nombre, correo, password }) => {
  const credential = await authRepository
    .signUp(correo, password)
    .catch((error) => {
      throw new Error(mapAuthError(error.code), { cause: error });
    });

  const perfil = {
    uid: credential.user.uid,
    nombre,
    correo,
    rol: "estudiante",
    institucion: "",
    fotoUrl: "",
    xp: 0,
    nivel: 1,
    rachaActual: 0,
    ultimaActividadEn: null,
    creadoEn: new Date(),
  };

  try {
    // El cliente crea este doc porque todavía no existe la Cloud Function
    // onUserCreate (Sprint 1-01 [01]); firestore.rules exige que rol/xp/
    // nivel/rachaActual salgan siempre con estos valores iniciales fijos.
    await usuariosRepository.createUser(credential.user.uid, {
      ...perfil,
      creadoEn: serverTimestamp(),
    });

    return perfil;
  } catch (error) {
    await authRepository.deleteCurrentUser().catch(() => {});

    throw new Error(mapAuthError(error.code), { cause: error });
  }
};

export const login = async (correo, password) => {
  const credential = await authRepository
    .signIn(correo, password)
    .catch((error) => {
      throw new Error(mapAuthError(error.code), { cause: error });
    });

  const perfil = await usuariosRepository.getUserById(credential.user.uid);

  if (!perfil) {
    await authRepository.signOutUser();

    throw new Error(
      "No existe información de tu cuenta. Contactá al administrador.",
    );
  }

  return perfil;
};

export const logout = () => {
  return authRepository.signOutUser();
};

export const resetPassword = async (correo) => {
  try {
    return await authRepository.sendResetEmail(correo);
  } catch (error) {
    throw new Error(mapAuthError(error.code), { cause: error });
  }
};
