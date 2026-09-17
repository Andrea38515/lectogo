import { useMemo, useState } from "react";
import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";

import {
  getLibrary,
  createLibraryResource,
  updateLibraryResource,
  deleteLibraryResource,
} from "../api/library.api";

/**
 * Normaliza el texto para que la búsqueda
 * ignore mayúsculas, minúsculas y tildes.
 */
const normalizeText = (text = "") => {
  return String(text)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
};

/**
 * Hook principal para gestionar la biblioteca.
 */
export const useLibrary = () => {
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Todos");

  // Obtener recursos de la biblioteca
  const libraryQuery = useQuery({
    queryKey: ["library"],
    queryFn: getLibrary,
  });

  const resources = libraryQuery.data ?? [];

  /**
   * Obtener categorías disponibles
   */
  const categories = useMemo(() => {
    const uniqueCategories = [
      ...new Set(
        resources
          .map((resource) => resource.category)
          .filter(Boolean)
      ),
    ];

    return ["Todos", ...uniqueCategories];
  }, [resources]);

  /**
   * Buscar recursos por palabra clave
   */
  const filteredResources = useMemo(() => {
    const searchText = normalizeText(search);

    return resources.filter((resource) => {
      const matchesCategory =
        category === "Todos" ||
        resource.category === category;

      const matchesSearch =
        !searchText ||
        normalizeText(resource.title).includes(searchText) ||
        normalizeText(resource.description).includes(searchText) ||
        normalizeText(resource.content).includes(searchText) ||
        normalizeText(resource.author).includes(searchText) ||
        normalizeText(resource.category).includes(searchText);

      return matchesCategory && matchesSearch;
    });
  }, [resources, search, category]);

  /**
   * Recursos destacados
   */
  const featuredResources = useMemo(() => {
    return resources.filter((resource) => resource.featured);
  }, [resources]);

  // Crear recurso
  const createResourceMutation = useMutation({
    mutationFn: createLibraryResource,

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["library"],
      });
    },
  });

  // Actualizar recurso
  const updateResourceMutation = useMutation({
    mutationFn: ({ id, data }) =>
      updateLibraryResource(id, data),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["library"],
      });
    },
  });

  // Eliminar recurso
  const deleteResourceMutation = useMutation({
    mutationFn: deleteLibraryResource,

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["library"],
      });
    },
  });

  /**
   * Limpiar búsqueda y categoría
   */
  const clearFilters = () => {
    setSearch("");
    setCategory("Todos");
  };

  return {
    // Consulta
    resources,
    filteredResources,
    featuredResources,
    categories,

    isLoading: libraryQuery.isLoading,
    isFetching: libraryQuery.isFetching,
    isError: libraryQuery.isError,
    error: libraryQuery.error,
    refetch: libraryQuery.refetch,

    // Búsqueda
    search,
    setSearch,

    // Categoría
    category,
    setCategory,

    // Limpiar filtros
    clearFilters,

    // Crear
    createResource: createResourceMutation.mutate,
    createResourceAsync: createResourceMutation.mutateAsync,
    isCreating: createResourceMutation.isPending,
    createError: createResourceMutation.error,

    // Actualizar
    updateResource: updateResourceMutation.mutate,
    updateResourceAsync: updateResourceMutation.mutateAsync,
    isUpdating: updateResourceMutation.isPending,
    updateError: updateResourceMutation.error,

    // Eliminar
    deleteResource: deleteResourceMutation.mutate,
    deleteResourceAsync: deleteResourceMutation.mutateAsync,
    isDeleting: deleteResourceMutation.isPending,
    deleteError: deleteResourceMutation.error,
  };
};

export default useLibrary;