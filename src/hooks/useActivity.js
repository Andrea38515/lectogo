import { useCallback, useEffect, useState } from "react";

import { useAuth } from "./useAuth";
import { cargarActividadesEstudiante } from "./cargarActividadesEstudiante";

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
			const { actividades } = await cargarActividadesEstudiante(user.uid);

			setActivities(actividades);
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
