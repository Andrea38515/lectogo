import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  where,
  writeBatch,
} from "firebase/firestore";

import { db } from "../config/firebase";

const PREGUNTAS_COLLECTION = "preguntas";

// Cada pregunta son DOS documentos y siempre se escriben juntos, en un solo
// batch: preguntas/{id} es legible por cualquier usuario con sesión (nunca lleva
// la respuesta) y preguntas/{id}/solucion/datos solo lo lee su autor y lo usa
// registrarIntento para calificar. Una pregunta sin solución haría fallar a
// registrarIntento para todos los estudiantes de la lectura.
const solucionRef = (preguntaRef) => doc(preguntaRef, "solucion", "datos");

const aSolucion = ({ respuestaCorrecta, explicacion }) => ({
  respuestaCorrecta,
  explicacion: explicacion ?? "",
});

const aPregunta = (id, data, solucion, propia) => ({
  id,
  lecturaId: data.lecturaId || null,
  tipo: data.tipo || "seleccion_multiple",
  enunciado: data.enunciado || "",
  opciones: Array.isArray(data.opciones) ? data.opciones : [],
  autorId: data.autorId || null,
  creadoEn: data.creadoEn?.toMillis?.() ?? 0,
  // Pregunta del docente: solo esas se pueden editar o eliminar (las reglas
  // exigen autorId == uid) y solo de esas se puede leer la solución.
  propia,
  // null = la solución falta (o no es legible): la pantalla lo avisa.
  respuestaCorrecta:
    typeof solucion?.respuestaCorrecta === "string" &&
    solucion.respuestaCorrecta.trim() !== ""
      ? solucion.respuestaCorrecta
      : null,
  explicacion: solucion?.explicacion || "",
});

const leerSolucion = async (preguntaId) => {
  const snapshot = await getDoc(
    solucionRef(doc(db, PREGUNTAS_COLLECTION, preguntaId)),
  );

  return snapshot.exists() ? snapshot.data() : null;
};

/**
 * Preguntas de una lectura con su solución, de la más vieja a la más nueva.
 *
 * Las reglas no filtran: la consulta lleva where("lecturaId") y el orden se
 * resuelve acá para no pedir un índice compuesto. La solución se lee en
 * paralelo solo de las preguntas propias; si falta queda
 * respuestaCorrecta: null en vez de romper la lista.
 *
 * @param {string} lecturaId
 * @param {string} uid
 * @returns {Promise<Array>}
 */
export const getPreguntasDeLectura = async (lecturaId, uid) => {
  if (!lecturaId) {
    return [];
  }

  const consulta = query(
    collection(db, PREGUNTAS_COLLECTION),
    where("lecturaId", "==", lecturaId),
  );

  const snapshot = await getDocs(consulta);

  const preguntas = await Promise.all(
    snapshot.docs.map(async (preguntaDoc) => {
      const data = preguntaDoc.data();
      const propia = Boolean(uid) && data.autorId === uid;
      const solucion = propia ? await leerSolucion(preguntaDoc.id) : null;

      return aPregunta(preguntaDoc.id, data, solucion, propia);
    }),
  );

  return preguntas.sort(
    (a, b) =>
      a.creadoEn - b.creadoEn || a.enunciado.localeCompare(b.enunciado, "es"),
  );
};

/**
 * Crea la pregunta y su solución en un solo batch.
 *
 * @param {string} uid
 * @param {string} lecturaId
 * @param {{tipo: string, enunciado: string, opciones: string[],
 *   respuestaCorrecta: string, explicacion: string}} datos
 * @returns {Promise<string>} id de la pregunta creada
 */
export const crearPregunta = async (uid, lecturaId, datos) => {
  // El id se genera antes para poder escribir la solución en el mismo batch.
  const preguntaRef = doc(collection(db, PREGUNTAS_COLLECTION));
  const batch = writeBatch(db);

  // Mismos campos que el seed; la respuesta no entra acá.
  batch.set(preguntaRef, {
    lecturaId,
    autorId: uid,
    tipo: datos.tipo,
    enunciado: datos.enunciado,
    opciones: datos.opciones,
    creadoEn: serverTimestamp(),
  });
  batch.set(solucionRef(preguntaRef), aSolucion(datos));

  await batch.commit();

  return preguntaRef.id;
};

/**
 * Actualiza enunciado/opciones y la solución en un solo batch. No envía
 * autorId, lecturaId, tipo ni creadoEn: las reglas exigen que autorId y
 * lecturaId no cambien, y el tipo no se edita.
 *
 * @param {string} preguntaId
 * @param {{enunciado: string, opciones: string[], respuestaCorrecta: string,
 *   explicacion: string}} datos
 * @returns {Promise<void>}
 */
export const actualizarPregunta = (preguntaId, datos) => {
  const preguntaRef = doc(db, PREGUNTAS_COLLECTION, preguntaId);
  const batch = writeBatch(db);

  batch.update(preguntaRef, {
    enunciado: datos.enunciado,
    opciones: datos.opciones,
  });
  // set y no update: si la solución faltaba, editar la pregunta la repara.
  batch.set(solucionRef(preguntaRef), aSolucion(datos));

  return batch.commit();
};

/**
 * Elimina la pregunta y su solución en un solo batch. Borrar un documento no
 * borra sus subcolecciones, por eso solucion/datos se elimina explícitamente.
 *
 * @param {string} preguntaId
 * @returns {Promise<void>}
 */
export const eliminarPregunta = (preguntaId) => {
  const preguntaRef = doc(db, PREGUNTAS_COLLECTION, preguntaId);
  const batch = writeBatch(db);

  batch.delete(solucionRef(preguntaRef));
  batch.delete(preguntaRef);

  return batch.commit();
};
