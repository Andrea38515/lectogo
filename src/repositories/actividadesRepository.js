// src/repositories/actividadesRepository.js

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";

import { db } from "../firebase/config";

const actividadesCollection = collection(db, "actividades");

export const getActividadesAsignadas = async (uid) => {
  if (!uid) {
    throw new Error("El uid del estudiante es obligatorio.");
  }

  const actividadesQuery = query(
    actividadesCollection,
    where("estudiantesAsignados", "array-contains", uid)
  );

  const snapshot = await getDocs(actividadesQuery);

  return snapshot.docs.map((documento) => ({
    id: documento.id,
    ...documento.data(),
  }));
};

export const getActividadById = async (id) => {
  if (!id) {
    throw new Error("El id de la actividad es obligatorio.");
  }

  const actividadRef = doc(db, "actividades", id);
  const snapshot = await getDoc(actividadRef);

  if (!snapshot.exists()) {
    return null;
  }

  return {
    id: snapshot.id,
    ...snapshot.data(),
  };
};
