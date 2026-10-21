import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";

import { db } from "../config/firebase";

const LECTURAS_COLLECTION = "lecturas";

// Campos que el docente puede escribir desde el formulario. autorId y creadoEn
// quedan fuera a propósito: las reglas exigen que autorId no cambie.
const camposEditables = ({
  titulo,
  contenido,
  categoriaId,
  nivelDificultad,
  estado,
}) => ({ titulo, contenido, categoriaId, nivelDificultad, estado });

const aLectura = (id, data) => ({
  id,
  titulo: data.titulo || "",
  contenido: data.contenido || "",
  categoriaId: data.categoriaId || null,
  nivelDificultad: data.nivelDificultad || null,
  autorId: data.autorId || null,
  estado: data.estado || null,
  creadoEn: data.creadoEn?.toMillis?.() ?? 0,
});

// getDoc sobre un documento que no existe responde permission-denied (la regla
// lee resource.data), y un id mal formado lanza invalid-argument: para el
// docente ambos son "no hay lectura".
const esLecturaNoDisponible = (error) =>
  error?.code === "permission-denied" || error?.code === "invalid-argument";

/**
 * Lecturas del docente (cualquier estado), de la más nueva a la más vieja.
 *
 * Las reglas no filtran: sin where("autorId") la consulta entera se rechaza
 * porque podría devolver borradores ajenos. El orden se resuelve acá para no
 * pedir un índice compuesto.
 *
 * @param {string} uid
 * @returns {Promise<Array>}
 */
export const getMisLecturas = async (uid) => {
  if (!uid) {
    return [];
  }

  const consulta = query(
    collection(db, LECTURAS_COLLECTION),
    where("autorId", "==", uid),
  );

  const snapshot = await getDocs(consulta);

  return snapshot.docs
    .map((lecturaDoc) => aLectura(lecturaDoc.id, lecturaDoc.data()))
    .sort(
      (a, b) =>
        b.creadoEn - a.creadoEn || a.titulo.localeCompare(b.titulo, "es"),
    );
};

/**
 * Una lectura del docente. Devuelve null si no existe, si la lectura es de
 * otra persona o si Firestore deniega la lectura: no se distingue el motivo.
 *
 * @param {string} lecturaId
 * @param {string} uid
 * @returns {Promise<Object|null>}
 */
export const getMiLectura = async (lecturaId, uid) => {
  if (!lecturaId || !uid) {
    return null;
  }

  let snapshot;

  try {
    snapshot = await getDoc(doc(db, LECTURAS_COLLECTION, lecturaId));
  } catch (error) {
    if (esLecturaNoDisponible(error)) {
      return null;
    }

    throw error;
  }

  if (!snapshot.exists()) {
    return null;
  }

  const data = snapshot.data();

  // Una lectura publicada de otro docente es legible para cualquier docente,
  // pero acá no es "mía": se trata igual que si no existiera.
  if (data.autorId !== uid) {
    return null;
  }

  return aLectura(snapshot.id, data);
};

/**
 * Crea una lectura del docente.
 *
 * @param {string} uid
 * @param {Object} datos titulo, contenido, categoriaId, nivelDificultad, estado
 * @returns {Promise<string>} id de la lectura creada
 */
export const crearLectura = async (uid, datos) => {
  const referencia = await addDoc(collection(db, LECTURAS_COLLECTION), {
    ...camposEditables(datos),
    autorId: uid,
    creadoEn: serverTimestamp(),
  });

  return referencia.id;
};

/**
 * Actualiza solo los campos editables de una lectura propia.
 *
 * @param {string} lecturaId
 * @param {Object} datos titulo, contenido, categoriaId, nivelDificultad, estado
 * @returns {Promise<void>}
 */
export const actualizarLectura = (lecturaId, datos) =>
  updateDoc(doc(db, LECTURAS_COLLECTION, lecturaId), {
    ...camposEditables(datos),
    actualizadoEn: serverTimestamp(),
  });

/**
 * @param {string} lecturaId
 * @param {"borrador"|"publicada"|"archivada"} estado
 * @returns {Promise<void>}
 */
export const cambiarEstadoLectura = (lecturaId, estado) =>
  updateDoc(doc(db, LECTURAS_COLLECTION, lecturaId), {
    estado,
    actualizadoEn: serverTimestamp(),
  });
