// src/repositories/resultRepository.js

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

const intentosCollection = collection(db, "intentos");

export const getIntentosByEstudiante = async (estudianteId) => {
  if (!estudianteId) {
    throw new Error("El estudianteId es obligatorio.");
  }

  const intentosQuery = query(
    intentosCollection,
    where("estudianteId", "==", estudianteId),
    orderBy("fechaCreacion", "desc")
  );

  const snapshot = await getDocs(intentosQuery);

  return snapshot.docs.map((documento) => ({
    id: documento.id,
    ...documento.data(),
  }));
};

export const getIntentoById = async (id) => {
  if (!id) {
    throw new Error("El id del intento es obligatorio.");
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