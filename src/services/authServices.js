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

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const getUserProfileWithRetry = async (uid, intentos = 5, espera = 300) => {
  for (let intento = 0; intento < intentos; intento += 1) {
    const perfil = await usuariosRepository.getUserById(uid);

    if (perfil) {
      return perfil;
    }

    if (intento < intentos - 1) {
      await sleep(espera);
    }
  }

  return null;
};

export const register = async ({ nombre, correo, password }) => {
  const credential = await authRepository
    .signUp(correo, password)
    .catch((error) => {
      throw new Error(mapAuthError(error.code), { cause: error });
    });

  const uid = credential.user.uid;

  try {
    // El documento usuarios/{uid} lo crea exclusivamente
    // el trigger onUserCreate en el servidor.
    const perfil = await getUserProfileWithRetry(uid);

    if (!perfil) {
      throw new Error(
        "Tu cuenta fue creada, pero el perfil todavía no está disponible.",
      );
    }

    return perfil;
  } catch (error) {
    // Si el usuario de Auth ya fue creado pero el perfil
    // todavía no está disponible, no se crea ningún documento
    // desde el cliente.
    await authRepository.deleteCurrentUser().catch(() => {});

    throw new Error(error.message || "No se pudo completar el registro.", {
      cause: error,
    });
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
