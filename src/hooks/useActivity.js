import { useCallback, useEffect, useState } from "react";

import { useAuth } from "./useAuth";
import {
	getActividadesAsignadas,
} from "../repositories/actividadesRepository";
import { getLecturaById } from "../repositories/lecturasRepository";

const useActivity = () => {
	const { user } = useAuth();

	const [activities, setActivities] = useState([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState(null);

	const fetchActivities = useCallback(async () => {
		if (!user?.uid) {
			setActivities([]);
			setIsLoading(false);
			return;
		}

		setIsLoading(true);
		setError(null);

		try {
			const asignadas = await getActividadesAsignadas(user.uid);

			const conLectura = await Promise.all(
				asignadas.map(async (actividad) => {
					const lectura = await getLecturaById(actividad.lecturaId);

					return {
						...actividad,
						titulo: lectura?.titulo || "Actividad",
						categoria: lectura?.categoriaId || "General",
					};
				}),
			);

			setActivities(conLectura);
		} catch (err) {
			setError(err);
		} finally {
			setIsLoading(false);
		}
	}, [user]);

	useEffect(() => {
		fetchActivities();
	}, [fetchActivities]);

	return {
		activities,
		isLoading,
		error,
		refetch: fetchActivities,
	};
};

export default useActivity;
export { useActivity };
