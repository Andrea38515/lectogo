import { useCallback, useEffect, useState } from "react";

import { getMisLecturas } from "../repositories/lecturasDocenteRepository";
import { getAllCategorias } from "../repositories/categoriasRepository";
import { useAuth } from "./useAuth";

export const useMisLecturas = () => {
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
				const [lecturas, categorias] = await Promise.all([
					getMisLecturas(uid),
					getAllCategorias(),
				]);

				if (cancelado) return;

				setResultado({ clave, uid, lecturas, categorias, error: false });
			} catch (error) {
				if (cancelado) return;

				console.error("Error cargando mis lecturas:", error);
				setResultado({ clave, uid, lecturas: [], categorias: [], error: true });
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

	// Mientras se recarga se conserva la lista anterior (del mismo usuario) para
	// que la pantalla no parpadee tras cambiar un estado.
	const vigente = resultado?.uid === uid ? resultado : null;

	return {
		lecturas: vigente?.lecturas ?? [],
		categorias: vigente?.categorias ?? [],
		cargando,
		error: !cargando && Boolean(resultado?.error),
		recargar,
	};
};

export default useMisLecturas;
