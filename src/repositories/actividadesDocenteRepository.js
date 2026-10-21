import {
  collection,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";

import { db, functions } from "../config/firebase";
import { convertirFecha } from "../utils/formatearFecha";
import { getLecturas } from "./lecturasRepository";

const ACTIVIDADES_COLLECTION = "actividades";
const LECTURAS_COLLECTION = "lecturas";
const PREGUNTAS_COLLECTION = "preguntas";

const aActividad = (actividadDoc) => {
  const data = actividadDoc.data();

  return {
    id: actividadDoc.id,
    lecturaId: data.lecturaId || null,
    estudiantesAsignados: Array.isArray(data.estudiantesAsignados)
      ? data.estudiantesAsignados
      : [],
    estado: data.estado || null,
    fechaLimite: convertirFecha(data.fechaLimite),
    creadoEn: data.creadoEn?.toMillis?.() ?? 0,
  };
};

/**
 * Actividades creadas por el docente, de la más nueva a la más vieja.
 *
 * Las reglas no filtran: sin where("docenteId") la consulta entera se rechaza
 * porque podría devolver actividades ajenas. El orden se resuelve acá para no
 * pedir un índice compuesto.
 *
 * @param {string} uid
 * @returns {Promise<Array>}
 */
export const getMisActividades = async (uid) => {
  if (!uid) {
    return [];
  }

  const consulta = query(
    collection(db, ACTIVIDADES_COLLECTION),
    where("docenteId", "==", uid),
  );

  const snapshot = await getDocs(consulta);

  return snapshot.docs.map(aActividad).sort((a, b) => b.creadoEn - a.creadoEn);
};

// Una lectura despublicada después de crear la actividad puede responder
// permission-denied (la regla lee resource.data, también si el documento ya no
// existe) o invalid-argument si el id está mal formado.
const esLecturaNoDisponible = (error) =>
  error?.code === "permission-denied" ||
  error?.code === "not-found" ||
  error?.code === "invalid-argument";

/**
 * Títulos de las lecturas de una lista de actividades: un getDoc por lecturaId
 * distinto. Si una lectura ya no se puede leer (despublicada, borrada) su
 * título es null; cualquier otro error (red, etc.) se propaga.
 *
 * @param {Array<string|null>} lecturaIds
 * @returns {Promise<Record<string, string|null>>} lecturaId -> título | null
 */
export const getTitulosLecturas = async (lecturaIds) => {
  const ids = [...new Set((lecturaIds ?? []).filter(Boolean))];

  const pares = await Promise.all(
    ids.map(async (lecturaId) => {
      try {
        const snapshot = await getDoc(doc(db, LECTURAS_COLLECTION, lecturaId));

        return [lecturaId, snapshot.exists() ? snapshot.data().titulo || null : null];
      } catch (error) {
        if (esLecturaNoDisponible(error)) {
          return [lecturaId, null];
        }

        throw error;
      }
    }),
  );

  return Object.fromEntries(pares);
};

/**
 * Lecturas que se pueden asignar: publicadas y con al menos una pregunta.
 *
 * Reutiliza la lectura pública de publicadas (cualquier usuario con sesión) y
 * cuenta las preguntas de cada una con una agregación (getCountFromServer):
 * 1 consulta de lecturas + N conteos en paralelo, sin descargar las preguntas.
 *
 * @returns {Promise<Array<{id: string, titulo: string, categoriaId: string|null,
 *   nivelDificultad: string|null, totalPreguntas: number}>>}
 */
export const getLecturasAsignables = async () => {
  const publicadas = await getLecturas();

  const conteos = await Promise.all(
    publicadas.map(async (lectura) => {
      const consulta = query(
        collection(db, PREGUNTAS_COLLECTION),
        where("lecturaId", "==", lectura.id),
      );
      const snapshot = await getCountFromServer(consulta);

      return snapshot.data().count;
    }),
  );

  return publicadas
    .map((lectura, indice) => ({
      id: lectura.id,
      titulo: lectura.titulo,
      categoriaId: lectura.categoriaId,
      nivelDificultad: lectura.nivelDificultad,
      totalPreguntas: conteos[indice],
    }))
    .filter((lectura) => lectura.totalPreguntas > 0)
    .sort((a, b) => a.titulo.localeCompare(b.titulo, "es"));
};

/**
 * Crea la actividad llamando a la Cloud Function asignarActividad (el cliente
 * ya no puede escribir en actividades). No es idempotente: cada llamada exitosa
 * crea una actividad nueva.
 *
 * @param {{ lecturaId: string, correos: string[], fechaLimite: string }} datos
 *   fechaLimite en ISO-8601 con zona horaria
 * @returns {Promise<{ ok: boolean, actividadId: string,
 *   asignados: Array<{estudianteId: string, nombre: string, correo: string}>,
 *   noAsignados: string[] }>}
 */
export const asignarActividad = async ({ lecturaId, correos, fechaLimite }) => {
  const callable = httpsCallable(functions, "asignarActividad");
  const resultado = await callable({ lecturaId, correos, fechaLimite });

  return resultado.data;
};
