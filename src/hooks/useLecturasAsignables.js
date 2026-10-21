import { useCallback, useEffect, useState } from "react";

import { getLecturasAsignables } from "../repositories/actividadesDocenteRepository";
import { getAllCategorias } from "../repositories/categoriasRepository";
import { useAuth } from "./useAuth";

// Lecturas publicadas con al menos una pregunta (las únicas que se pueden
// asignar) y las categorías para mostrar su nombre.
export const useLecturasAsignables = () => {
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
					getLecturasAsignables(),
					getAllCategorias(),
				]);

				if (cancelado) return;

				setResultado({ clave, lecturas, categorias, error: false });
			} catch (error) {
				if (cancelado) return;

				console.error("Error cargando las lecturas asignables:", error);
				setResultado({ clave, lecturas: [], categorias: [], error: true });
			}
		};

		cargar();

		return () => {
			cancelado = true;
		};
	}, [uid, clave]);

	const reintentar = useCallback(() => {
		setIntento((actual) => actual + 1);
	}, []);

	const cargando = resultado?.clave !== clave;

	return {
		lecturas: cargando ? [] : resultado.lecturas,
		categorias: cargando ? [] : resultado.categorias,
		cargando,
		error: !cargando && resultado.error,
		reintentar,
	};
};

export default useLecturasAsignables;
