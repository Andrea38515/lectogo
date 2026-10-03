import { getPreguntasByLectura } from "../repositories/preguntasRepository";

/**
 * Obtiene las preguntas asociadas a una lectura.
 *
 * La relación del modelo de datos es:
 * lectura -> preguntas
 *
 * No se utiliza un quizRepository porque el DDS
 * no define una colección "quizzes".
 */
export const getQuestionsByReading = async (lecturaId) => {
  if (!lecturaId) {
    throw new Error("El ID de la lectura es obligatorio");
  }

  return await getPreguntasByLectura(lecturaId);
};

/**
 * Alias en español para mantener compatibilidad
 * con componentes que trabajen con la terminología
 * del proyecto.
 */
export const obtenerPreguntasPorLectura = async (lecturaId) => {
  return await getPreguntasByLectura(lecturaId);
};