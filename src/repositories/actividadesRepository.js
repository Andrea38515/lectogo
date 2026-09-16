import api from "../api/api";

/**
 * Repositorio para gestionar las actividades.
 * Centraliza todas las operaciones relacionadas
 * con el recurso /activities.
 */

const actividadesRepository = {
  /**
   * Obtener todas las actividades.
   */
  async getAll(params = {}) {
    const response = await api.get("/api/v1/activities", {
      params,
    });

    return response.data;
  },

  /**
   * Obtener una actividad por su ID.
   */
  async getById(id) {
    const response = await api.get(`/api/v1/activities/${id}`);

    return response.data;
  },

  /**
   * Crear una nueva actividad.
   */
  async create(data) {
    const response = await api.post("/api/v1/activities", data);

    return response.data;
  },

  /**
   * Actualizar una actividad.
   */
  async update(id, data) {
    const response = await api.put(
      `/api/v1/activities/${id}`,
      data
    );

    return response.data;
  },

  /**
   * Eliminar una actividad.
   */
  async delete(id) {
    const response = await api.delete(
      `/api/v1/activities/${id}`
    );

    return response.data;
  },
};

export default actividadesRepository;