import { collection, getDocs } from "firebase/firestore";

import { db } from "../config/firebase";

const CATEGORIAS_COLLECTION = "categorias";

/**
 * Obtiene todas las categorías disponibles.
 *
 * @returns {Promise<Array>}
 */
export const getAllCategorias = async () => {
  const categoriasRef = collection(db, CATEGORIAS_COLLECTION);

  const snapshot = await getDocs(categoriasRef);

  if (snapshot.empty) {
    return [];
  }

  return snapshot.docs.map((categoriaDoc) => {
    const data = categoriaDoc.data();

    return {
      id: categoriaDoc.id,
      nombre: data.nombre || "",
      descripcion: data.descripcion || "",
    };
  });
};
