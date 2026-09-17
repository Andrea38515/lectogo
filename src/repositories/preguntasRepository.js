import api from "../api/api";

/**
 * Repositorio para gestionar las preguntas.
 * Centraliza las operaciones relacionadas
 * con el recurso /questions.
 */

const preguntasRepository = {
  /**
   * Obtener todas las preguntas.
   */
  async getAll(params = {}) {
    const response = await api.get("/api/v1/questions", {
      params,
    });

    return response.data;
  },

  /**
   * Obtener una pregunta por su ID.
   */
  async getById(id) {
    const response = await api.get(`/api/v1/questions/${id}`);

    return response.data;
  },

  /**
   * Obtener las preguntas de una actividad.
   */
  async getByActividadId(actividadId) {
    const response = await api.get(
      `/api/v1/activities/${actividadId}/questions`
    );

    return response.data;
  },

  /**
   * Crear una nueva pregunta.
   */
  async create(data) {
    const response = await api.post(
      "/api/v1/questions",
      data
    );

    return response.data;
  },

  /**
   * Actualizar una pregunta.
   */
  async update(id, data) {
    const response = await api.put(
      `/api/v1/questions/${id}`,
      data
    );

    return response.data;
  },

  /**
   * Eliminar una pregunta.
   */
  async delete(id) {
    const response = await api.delete(
      `/api/v1/questions/${id}`
    );

    return response.data;
  },
};

export default preguntasRepository;