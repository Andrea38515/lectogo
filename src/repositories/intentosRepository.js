import {
  collection,
  getDocs,
  orderBy,
  query,
  where,
} from "firebase/firestore";

import { db } from "../config/firebase";

const intentosCollection = collection(db, "intentos");

export const getIntentosByEstudiante = async (estudianteId) => {
  if (!estudianteId) {
    return [];
  }

  const q = query(
    intentosCollection,
    where("estudianteId", "==", estudianteId),
    orderBy("resueltoEn", "desc"),
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
};

export default {
  getIntentosByEstudiante,
};
