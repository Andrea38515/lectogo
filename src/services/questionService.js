import preguntasRepository from "../repositories/preguntasRepository";

/**
 * Servicio para gestionar la lógica de negocio
 * relacionada con las preguntas.
 */

const questionService = {
  /**
   * Obtener todas las preguntas.
   */
  async getQuestions(params = {}) {
    try {
      return await preguntasRepository.getAll(params);
    } catch (error) {
      console.error("Error al obtener las preguntas:", error);
      throw error;
    }
  },

  /**
   * Obtener una pregunta por su ID.
   */
  async getQuestionById(id) {
    if (!id) {
      throw new Error("El ID de la pregunta es obligatorio.");
    }

    try {
      return await preguntasRepository.getById(id);
    } catch (error) {
      console.error(
        `Error al obtener la pregunta ${id}:`,
        error
      );
      throw error;
    }
  },

  /**
   * Obtener las preguntas asociadas a una actividad.
   */
  async getQuestionsByActivity(actividadId) {
    if (!actividadId) {
      throw new Error(
        "El ID de la actividad es obligatorio."
      );
    }

    try {
      return await preguntasRepository.getByActividadId(
        actividadId
      );
    } catch (error) {
      console.error(
        `Error al obtener las preguntas de la actividad ${actividadId}:`,
        error
      );
      throw error;
    }
  },

  /**
   * Crear una nueva pregunta.
   */
  async createQuestion(data) {
    if (!data) {
      throw new Error(
        "Los datos de la pregunta son obligatorios."
      );
    }

    try {
      return await preguntasRepository.create(data);
    } catch (error) {
      console.error("Error al crear la pregunta:", error);
      throw error;
    }
  },

  /**
   * Actualizar una pregunta.
   */
  async updateQuestion(id, data) {
    if (!id) {
      throw new Error("El ID de la pregunta es obligatorio.");
    }

    if (!data) {
      throw new Error(
        "Los datos de actualización son obligatorios."
      );
    }

    try {
      return await preguntasRepository.update(id, data);
    } catch (error) {
      console.error(
        `Error al actualizar la pregunta ${id}:`,
        error
      );
      throw error;
    }
  },

  /**
   * Eliminar una pregunta.
   */
  async deleteQuestion(id) {
    if (!id) {
      throw new Error("El ID de la pregunta es obligatorio.");
    }

    try {
      return await preguntasRepository.delete(id);
    } catch (error) {
      console.error(
        `Error al eliminar la pregunta ${id}:`,
        error
      );
      throw error;
    }
  },
};

export default questionService;