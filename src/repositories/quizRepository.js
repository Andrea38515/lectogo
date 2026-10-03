/**
 * quizRepository.js
 *
 * Este repositorio no se utiliza en LectoGo.
 *
 * El modelo de datos del DDS no define una colección "quizzes".
 * Las actividades se gestionan mediante:
 *
 * - actividadesRepository.js
 * - preguntasRepository.js
 * - intentosRepository.js
 *
 * Las preguntas están relacionadas con una lectura mediante
 * el campo "lecturaId" y se consultan mediante:
 *
 * getPreguntasByLectura(lecturaId)
 *
 * Por esta razón, no se implementan operaciones CRUD para
 * una colección "quizzes".
 */

// No se exportan funciones.
// No existe una colección "quizzes" en el modelo actual.
export {};