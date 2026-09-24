import * as authRepository from "../repositories/authRepository";
import * as usuariosRepository from "../repositories/usuariosRepository";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// El trigger onUserCreate (Cloud Functions) crea el doc en Firestore de
// forma asíncrona tras el signUp — puede tardar uno o dos segundos, así
// que reintentamos con backoff corto antes de darlo por fallido.
const getUserProfileWithRetry = async (uid, intentos = 5, esperaMs = 800) => {
  for (let intento = 0; intento < intentos; intento += 1) {
    const perfil = await usuariosRepository.getUserById(uid);

    if (perfil) {
      return perfil;
    }

    await sleep(esperaMs);
  }

  return null;
};

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

  // Si el envío del correo de verificación falla, el registro igual
  // continúa — el usuario ya quedó creado, esto no debe bloquearlo.
  await authRepository
    .sendVerificationEmail(credential.user)
    .catch((error) => console.error("Error enviando correo de verificación:", error));

  // El doc en usuarios/{uid} lo crea la Cloud Function onUserCreate, no el
  // cliente (Sprint 1-01 [02]) — acá solo lo esperamos y lo devolvemos.
  const perfil = await getUserProfileWithRetry(credential.user.uid);

  if (!perfil) {
    await authRepository.deleteCurrentUser().catch(() => {});

    throw new Error(
      "No pudimos terminar tu registro. Intentá iniciar sesión en unos segundos o contactá al administrador.",
    );
  }

  // El trigger no conoce el nombre que se tipeó en el formulario (solo ve
  // uid/email de Auth), así que lo completamos acá con un update normal
  // — firestore.rules ya permite que el dueño del doc actualice "nombre".
  await usuariosRepository.updateUser(credential.user.uid, { nombre });

  return { ...perfil, nombre };
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
