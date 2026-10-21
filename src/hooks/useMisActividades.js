import { useCallback, useEffect, useState } from "react";

import {
	getMisActividades,
	getTitulosLecturas,
} from "../repositories/actividadesDocenteRepository";
import { useAuth } from "./useAuth";

// Actividades del docente con el título de su lectura (lecturaTitulo es null si
// la lectura ya no se puede leer) y si están vencidas respecto de la carga.
export const useMisActividades = () => {
	const { user } = useAuth();
	const uid = user?.uid;

	const [intento, setIntento] = useState(0);
	const [resultado, setResultado] = useState(null);

	// Cada resultado lleva la clave de la petición que lo originó: "cargando"
	// se deriva de que la clave no coincida, sin setState síncrono en el effect.
	const clave = `${uid}:${intento}`;

	useEffect(() => {
		let cancelado = false;

		const cargar = async () => {
			try {
				const lista = await getMisActividades(uid);
				const titulos = await getTitulosLecturas(
					lista.map((actividad) => actividad.lecturaId),
				);

				if (cancelado) return;

				const ahora = Date.now();
				const actividades = lista.map((actividad) => ({
					...actividad,
					lecturaTitulo: titulos[actividad.lecturaId] ?? null,
					vencida: Boolean(
						actividad.fechaLimite && actividad.fechaLimite.getTime() < ahora,
					),
				}));

				setResultado({ clave, uid, actividades, error: false });
			} catch (error) {
				if (cancelado) return;

				console.error("Error cargando mis actividades:", error);
				setResultado({ clave, uid, actividades: [], error: true });
			}
		};

		cargar();

		return () => {
			cancelado = true;
		};
	}, [uid, clave]);

	const recargar = useCallback(() => {
		setIntento((actual) => actual + 1);
	}, []);

	const cargando = resultado?.clave !== clave;

	// Mientras se recarga se conserva la lista anterior (del mismo usuario).
	const vigente = resultado?.uid === uid ? resultado : null;

	return {
		actividades: vigente?.actividades ?? [],
		cargando,
		error: !cargando && Boolean(resultado?.error),
		recargar,
	};
};

export default useMisActividades;
