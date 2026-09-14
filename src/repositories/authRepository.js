// src/repositories/authRepository.js

import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";

import { doc, getDoc } from "firebase/firestore";

import { auth, db } from "../config/firebase";

/**
 * ============================================
 * INICIAR SESIÓN
 * ============================================
 *
 * Autentica al usuario mediante Firebase
 * Authentication y posteriormente obtiene
 * su información y rol desde Firestore.
 *
 * @param {string} correo
 * @param {string} contrasena
 * @returns {Promise<Object>}
 */
export const login = async (correo, contrasena) => {
  try {
    // 1. Autenticar usuario con Firebase
    const resultado = await signInWithEmailAndPassword(
      auth,
      correo,
      contrasena,
    );

    const usuarioAuth = resultado.user;

    // 2. Obtener documento del usuario
    const usuarioRef = doc(db, "usuarios", usuarioAuth.uid);

    const usuarioSnapshot = await getDoc(usuarioRef);

    // 3. Verificar que exista el documento
    if (!usuarioSnapshot.exists()) {
      // Cerramos la sesión porque no existe
      // información de perfil/rol.
      await signOut(auth);

      throw new Error("No existe información de este usuario en el sistema.");
    }

    const datosUsuario = usuarioSnapshot.data();

    // 4. Verificar el rol
    if (!datosUsuario.rol) {
      await signOut(auth);

      throw new Error("El usuario no tiene un rol asignado.");
    }

    // 5. Retornar información al Login
    return {
      uid: usuarioAuth.uid,
      correo: usuarioAuth.email,
      nombre: datosUsuario.nombre || "",
      rol: datosUsuario.rol,
      institucion: datosUsuario.institucion || "",
      fotoUrl: datosUsuario.fotoUrl || "",
      xp: datosUsuario.xp || 0,
      nivel: datosUsuario.nivel || 1,
      rachaActual: datosUsuario.rachaActual || 0,
    };
  } catch (error) {
    console.error("Error en authRepository.login:", error);

    throw error;
  }
};

/**
 * ============================================
 * RECUPERAR CONTRASEÑA
 * ============================================
 *
 * Envía un correo de recuperación utilizando
 * Firebase Authentication.
 *
 * @param {string} correo
 * @returns {Promise<void>}
 */
export const recuperarContrasena = async (correo) => {
  try {
    await sendPasswordResetEmail(auth, correo);
  } catch (error) {
    console.error("Error al recuperar contraseña:", error);

    throw error;
  }
};

/**
 * ============================================
 * CERRAR SESIÓN
 * ============================================
 *
 * Cierra la sesión actual.
 *
 * @returns {Promise<void>}
 */
export const logout = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Error al cerrar sesión:", error);

    throw error;
  }
};

/**
 * ============================================
 * OBTENER USUARIO ACTUAL
 * ============================================
 *
 * Devuelve el usuario autenticado actualmente.
 *
 * @returns {Object|null}
 */
export const getCurrentUser = () => {
  return auth.currentUser;
};

/**
 * ============================================
 * ESCUCHAR CAMBIOS DE AUTENTICACIÓN
 * ============================================
 *
 * Permite saber cuándo el usuario inicia o
 * cierra sesión.
 *
 * @param {Function} callback
 * @returns {Function}
 */
export const observarSesion = (callback) => {
  return onAuthStateChanged(auth, callback);
};
