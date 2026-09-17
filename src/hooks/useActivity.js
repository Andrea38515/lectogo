import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";

import actividadesRepository from "../repositories/actividadesRepository";

/**
 * Hook para gestionar las actividades.
 */
const useActivity = (params = {}) => {
  const queryClient = useQueryClient();

  // Obtener actividades
  const activitiesQuery = useQuery({
    queryKey: ["activities", params],
    queryFn: () => actividadesRepository.getAll(params),
  });

  // Crear actividad
  const createActivityMutation = useMutation({
    mutationFn: (data) =>
      actividadesRepository.create(data),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["activities"],
      });
    },
  });

  // Actualizar actividad
  const updateActivityMutation = useMutation({
    mutationFn: ({ id, data }) =>
      actividadesRepository.update(id, data),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["activities"],
      });
    },
  });

  // Eliminar actividad
  const deleteActivityMutation = useMutation({
    mutationFn: (id) =>
      actividadesRepository.delete(id),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["activities"],
      });
    },
  });

  return {
    // Consulta
    activities: activitiesQuery.data ?? [],
    isLoading: activitiesQuery.isLoading,
    isFetching: activitiesQuery.isFetching,
    isError: activitiesQuery.isError,
    error: activitiesQuery.error,
    refetch: activitiesQuery.refetch,

    // Crear
    createActivity: createActivityMutation.mutate,
    createActivityAsync:
      createActivityMutation.mutateAsync,
    isCreating: createActivityMutation.isPending,
    createError: createActivityMutation.error,

    // Actualizar
    updateActivity: updateActivityMutation.mutate,
    updateActivityAsync:
      updateActivityMutation.mutateAsync,
    isUpdating: updateActivityMutation.isPending,
    updateError: updateActivityMutation.error,

    // Eliminar
    deleteActivity: deleteActivityMutation.mutate,
    deleteActivityAsync:
      deleteActivityMutation.mutateAsync,
    isDeleting: deleteActivityMutation.isPending,
    deleteError: deleteActivityMutation.error,
  };
};

export default useActivity;