import quizRepository from "../repositories/quizRepository";

/**
 * Servicio para gestionar la lógica de negocio
 * relacionada con los quizzes.
 */

const quizService = {
  /**
   * Obtener todos los quizzes.
   */
  async getQuizzes(params = {}) {
    try {
      return await quizRepository.getAll(params);
    } catch (error) {
      console.error("Error al obtener los quizzes:", error);
      throw error;
    }
  },

  /**
   * Obtener un quiz por su ID.
   */
  async getQuizById(id) {
    if (!id) {
      throw new Error("El ID del quiz es obligatorio.");
    }

    try {
      return await quizRepository.getById(id);
    } catch (error) {
      console.error(
        `Error al obtener el quiz ${id}:`,
        error
      );
      throw error;
    }
  },

  /**
   * Obtener los quizzes asociados a una actividad.
   */
  async getQuizzesByActivity(actividadId) {
    if (!actividadId) {
      throw new Error(
        "El ID de la actividad es obligatorio."
      );
    }

    try {
      return await quizRepository.getByActividadId(
        actividadId
      );
    } catch (error) {
      console.error(
        `Error al obtener los quizzes de la actividad ${actividadId}:`,
        error
      );
      throw error;
    }
  },

  /**
   * Crear un nuevo quiz.
   */
  async createQuiz(data) {
    if (!data) {
      throw new Error(
        "Los datos del quiz son obligatorios."
      );
    }

    try {
      return await quizRepository.create(data);
    } catch (error) {
      console.error("Error al crear el quiz:", error);
      throw error;
    }
  },

  /**
   * Actualizar un quiz.
   */
  async updateQuiz(id, data) {
    if (!id) {
      throw new Error("El ID del quiz es obligatorio.");
    }

    if (!data) {
      throw new Error(
        "Los datos de actualización son obligatorios."
      );
    }

    try {
      return await quizRepository.update(id, data);
    } catch (error) {
      console.error(
        `Error al actualizar el quiz ${id}:`,
        error
      );
      throw error;
    }
  },

  /**
   * Eliminar un quiz.
   */
  async deleteQuiz(id) {
    if (!id) {
      throw new Error("El ID del quiz es obligatorio.");
    }

    try {
      return await quizRepository.delete(id);
    } catch (error) {
      console.error(
        `Error al eliminar el quiz ${id}:`,
        error
      );
      throw error;
    }
  },

  /**
   * Iniciar un quiz.
   */
  async startQuiz(id) {
    if (!id) {
      throw new Error("El ID del quiz es obligatorio.");
    }

    try {
      return await quizRepository.start(id);
    } catch (error) {
      console.error(
        `Error al iniciar el quiz ${id}:`,
        error
      );
      throw error;
    }
  },

  /**
   * Enviar las respuestas de un quiz.
   */
  async submitQuiz(id, answers) {
    if (!id) {
      throw new Error("El ID del quiz es obligatorio.");
    }

    if (!answers || !Array.isArray(answers)) {
      throw new Error(
        "Las respuestas del quiz deben ser un arreglo."
      );
    }

    try {
      return await quizRepository.submit(id, answers);
    } catch (error) {
      console.error(
        `Error al enviar las respuestas del quiz ${id}:`,
        error
      );
      throw error;
    }
  },

  /**
   * Obtener el resultado de un quiz.
   */
  async getQuizResult(id) {
    if (!id) {
      throw new Error("El ID del quiz es obligatorio.");
    }

    try {
      return await quizRepository.getResult(id);
    } catch (error) {
      console.error(
        `Error al obtener el resultado del quiz ${id}:`,
        error
      );
      throw error;
    }
  },
};

export default quizService;