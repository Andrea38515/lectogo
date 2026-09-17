import resultRepository from "../repositories/resultRepository";

/**
 * Servicio para gestionar la lógica de negocio
 * relacionada con los resultados.
 */

const resultService = {
  /**
   * Obtener todos los resultados.
   */
  async getResults(params = {}) {
    try {
      return await resultRepository.getAll(params);
    } catch (error) {
      console.error(
        "Error al obtener los resultados:",
        error
      );
      throw error;
    }
  },

  /**
   * Obtener un resultado por su ID.
   */
  async getResultById(id) {
    if (!id) {
      throw new Error(
        "El ID del resultado es obligatorio."
      );
    }

    try {
      return await resultRepository.getById(id);
    } catch (error) {
      console.error(
        `Error al obtener el resultado ${id}:`,
        error
      );
      throw error;
    }
  },

  /**
   * Obtener los resultados de un estudiante.
   */
  async getResultsByStudent(estudianteId) {
    if (!estudianteId) {
      throw new Error(
        "El ID del estudiante es obligatorio."
      );
    }

    try {
      return await resultRepository.getByStudentId(
        estudianteId
      );
    } catch (error) {
      console.error(
        `Error al obtener los resultados del estudiante ${estudianteId}:`,
        error
      );
      throw error;
    }
  },

  /**
   * Obtener los resultados de una actividad.
   */
  async getResultsByActivity(actividadId) {
    if (!actividadId) {
      throw new Error(
        "El ID de la actividad es obligatorio."
      );
    }

    try {
      return await resultRepository.getByActivityId(
        actividadId
      );
    } catch (error) {
      console.error(
        `Error al obtener los resultados de la actividad ${actividadId}:`,
        error
      );
      throw error;
    }
  },

  /**
   * Crear un resultado.
   */
  async createResult(data) {
    if (!data) {
      throw new Error(
        "Los datos del resultado son obligatorios."
      );
    }

    try {
      return await resultRepository.create(data);
    } catch (error) {
      console.error(
        "Error al crear el resultado:",
        error
      );
      throw error;
    }
  },

  /**
   * Actualizar un resultado.
   */
  async updateResult(id, data) {
    if (!id) {
      throw new Error(
        "El ID del resultado es obligatorio."
      );
    }

    if (!data) {
      throw new Error(
        "Los datos de actualización son obligatorios."
      );
    }

    try {
      return await resultRepository.update(id, data);
    } catch (error) {
      console.error(
        `Error al actualizar el resultado ${id}:`,
        error
      );
      throw error;
    }
  },

  /**
   * Eliminar un resultado.
   */
  async deleteResult(id) {
    if (!id) {
      throw new Error(
        "El ID del resultado es obligatorio."
      );
    }

    try {
      return await resultRepository.delete(id);
    } catch (error) {
      console.error(
        `Error al eliminar el resultado ${id}:`,
        error
      );
      throw error;
    }
  },

  /**
   * Obtener el promedio de un estudiante.
   */
  async getStudentAverage(estudianteId) {
    if (!estudianteId) {
      throw new Error(
        "El ID del estudiante es obligatorio."
      );
    }

    try {
      return await resultRepository.getStudentAverage(
        estudianteId
      );
    } catch (error) {
      console.error(
        `Error al obtener el promedio del estudiante ${estudianteId}:`,
        error
      );
      throw error;
    }
  },
};

export default resultService;