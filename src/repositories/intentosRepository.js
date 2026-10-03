import {
  collection,
  getDocs,
  orderBy,
  query,
  where,
} from "firebase/firestore";

import { db } from "../firebase/config";

const intentosCollection = collection(db, "intentos");

export const getIntentosByEstudiante = async (uid) => {
  if (!uid) {
    throw new Error("El uid del estudiante es obligatorio.");
  }

  const intentosQuery = query(
    intentosCollection,
    where("estudianteId", "==", uid),
    orderBy("resueltoEn", "desc")
  );

  const snapshot = await getDocs(intentosQuery);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
};

export const agregarPorcentajeAciertos = (intentos) => {
  if (!Array.isArray(intentos) || intentos.length === 0) {
    return {
      porcentajeAciertos: 0,
      actividadesCompletadas: 0,
      totalIntentos: 0,
    };
  }

  const porcentajes = intentos
    .map((intento) => Number(intento.porcentajeAciertos))
    .filter(
      (porcentaje) =>
        Number.isFinite(porcentaje) &&
        porcentaje >= 0 &&
        porcentaje <= 100
    );

  const porcentajeAciertos =
    porcentajes.length > 0
      ? porcentajes.reduce(
          (total, porcentaje) => total + porcentaje,
          0
        ) / porcentajes.length
      : 0;

  return {
    porcentajeAciertos: Number(
      porcentajeAciertos.toFixed(2)
    ),
    actividadesCompletadas: intentos.length,
    totalIntentos: intentos.length,
  };
};