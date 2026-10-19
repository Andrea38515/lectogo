import { useCallback, useEffect, useState } from "react";

import { useAuth } from "./useAuth";
import {
	getActividadesAsignadas,
} from "../repositories/actividadesRepository";
import { getLecturaById } from "../repositories/lecturasRepository";
import { getAllCategorias } from "../repositories/categoriasRepository";
import { getIntentosByEstudiante } from "../repositories/intentosRepository";

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
			// Categorías e intentos solo enriquecen la lista: si fallan no deben
			// tumbarla, así que se degradan a "General" / sin completadas.
			const [asignadas, categorias, intentos] = await Promise.all([
				getActividadesAsignadas(user.uid),
				getAllCategorias().catch(() => []),
				getIntentosByEstudiante(user.uid).catch(() => []),
			]);

			const nombresCategoria = Object.fromEntries(
				categorias.map((categoria) => [categoria.id, categoria.nombre]),
			);
			const completadas = new Set(
				intentos.map((intento) => intento.actividadId),
			);

			const conLectura = await Promise.all(
				asignadas.map(async (actividad) => {
					// Si la lectura no es publicada las reglas la deniegan: no
					// debe tumbar la lista entera de actividades.
					const lectura = await getLecturaById(actividad.lecturaId).catch(
						() => null,
					);

					return {
						...actividad,
						titulo: lectura?.titulo || "Actividad",
						categoria: nombresCategoria[lectura?.categoriaId] || "General",
						completada: completadas.has(actividad.id),
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
