import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { db } from "../firebase/config";

const intentosRef = collection(db, "intentos");

/**
 * Obtiene todos los intentos de un estudiante,
 * ordenados cronológicamente del más reciente al más antiguo.
 *
 * El cliente solo consulta intentos.
 * Los intentos son creados por la Cloud Function registrarIntento.
 */
export const getIntentosByEstudiante = async (estudianteId) => {
  if (!estudianteId) {
    throw new Error("El ID del estudiante es obligatorio");
  }

  const q = query(
    intentosRef,
    where("estudianteId", "==", estudianteId),
    orderBy("resueltoEn", "desc")
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map((documento) => ({
    id: documento.id,
    ...documento.data(),
  }));
};

/**
 * Obtiene un intento específico por su ID.
 */
export const getIntentoById = async (id) => {
  if (!id) {
    throw new Error("El ID del intento es obligatorio");
  }

  const intentoRef = doc(db, "intentos", id);
  const snapshot = await getDoc(intentoRef);

  if (!snapshot.exists()) {
    return null;
  }

  return {
    id: snapshot.id,
    ...snapshot.data(),
  };
};