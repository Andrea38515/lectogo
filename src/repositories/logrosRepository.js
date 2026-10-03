// src/repositories/logrosRepository.js

import {
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { db } from "../firebase/config";

const logrosRef = collection(db, "logros");
const logrosUsuarioRef = collection(db, "logros_usuario");

export const getAllLogros = async () => {
  const snapshot = await getDocs(logrosRef);

  return snapshot.docs.map((documento) => ({
    id: documento.id,
    ...documento.data(),
  }));
};

export const getLogrosByEstudiante = async (uid) => {
  if (!uid) {
    throw new Error("El ID del estudiante es obligatorio");
  }

  const q = query(
    logrosUsuarioRef,
    where("estudianteId", "==", uid)
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map((documento) => ({
    id: documento.id,
    ...documento.data(),
  }));
};