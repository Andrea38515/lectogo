import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getLibrary,
  createLibraryResource,
  updateLibraryResource,
  deleteLibraryResource,
} from "../api/library.api";

/**
 * Hook principal para gestionar la biblioteca.
 */
export const useLibrary = () => {
  const queryClient = useQueryClient();

  // Obtener recursos de la biblioteca
  const libraryQuery = useQuery({
    queryKey: ["library"],
    queryFn: getLibrary,
  });

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

  return {
    // Consulta
    resources: libraryQuery.data ?? [],
    isLoading: libraryQuery.isLoading,
    isFetching: libraryQuery.isFetching,
    isError: libraryQuery.isError,
    error: libraryQuery.error,
    refetch: libraryQuery.refetch,

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