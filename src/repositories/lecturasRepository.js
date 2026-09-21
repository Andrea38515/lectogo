import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";

import { db } from "../config/firebase";

const LECTURAS_COLLECTION = "lecturas";

/**
 * Obtiene lecturas públicas aplicando filtros opcionales.
 *
 * @param {Object} filtros
 * @param {string} [filtros.nivel]
 * @param {string} [filtros.categoriaId]
 * @returns {Promise<Array>}
 */
export const getLecturas = async ({ nivel, categoriaId } = {}) => {
  const lecturasRef = collection(db, LECTURAS_COLLECTION);

  const condiciones = [];

  if (nivel) {
    condiciones.push(where("nivelDificultad", "==", nivel));
  }

  if (categoriaId) {
    condiciones.push(where("categoriaId", "==", categoriaId));
  }

  const consulta =
    condiciones.length > 0 ? query(lecturasRef, ...condiciones) : lecturasRef;

  const snapshot = await getDocs(consulta);

  if (snapshot.empty) {
    return [];
  }

  return snapshot.docs.map((lecturaDoc) => {
    const data = lecturaDoc.data();

    return {
      id: lecturaDoc.id,
      titulo: data.titulo || "",
      contenido: data.contenido || "",
      categoriaId: data.categoriaId || null,
      nivelDificultad: data.nivelDificultad || null,
      autorId: data.autorId || null,
      estado: data.estado || null,
    };
  });
};

/**
 * Obtiene una lectura por su ID.
 *
 * @param {string} id
 * @returns {Promise<Object|null>}
 */
export const getLecturaById = async (id) => {
  if (!id) {
    return null;
  }

  const lecturaRef = doc(db, LECTURAS_COLLECTION, id);
  const snapshot = await getDoc(lecturaRef);

  if (!snapshot.exists()) {
    return null;
  }

  const data = snapshot.data();

  return {
    id: snapshot.id,
    titulo: data.titulo || "",
    contenido: data.contenido || "",
    categoriaId: data.categoriaId || null,
    nivelDificultad: data.nivelDificultad || null,
    autorId: data.autorId || null,
    estado: data.estado || null,
  };
};
