import { useCallback, useEffect, useState } from "react";

import { getLecturaById } from "../repositories/lecturasRepository";
import { getAllCategorias } from "../repositories/categoriasRepository";

// getDoc sobre un documento que no existe o no está publicada responde
// permission-denied (la regla lee resource.data), no "no encontrado": para el
// usuario ambos casos son lo mismo. Un id mal formado (con "/", por ejemplo)
// hace que doc() lance invalid-argument antes de consultar: reintentar nunca
// serviría, así que también es "no disponible".
const esLecturaNoDisponible = (error) =>
	error?.code === "permission-denied" || error?.code === "invalid-argument";

export const useLectura = (lecturaId) => {
	const [intento, setIntento] = useState(0);
	const [resultado, setResultado] = useState(null);

	// Cada resultado lleva la clave de la petición que lo originó: "cargando"
	// se deriva de que la clave no coincida, sin setState síncrono en el effect.
	const clave = `${lecturaId}:${intento}`;

	useEffect(() => {
		let cancelado = false;

		const cargar = async () => {
			try {
				const [lectura, categorias] = await Promise.all([
					getLecturaById(lecturaId),
					// Un invitado no puede listar categorías: sin ellas se muestra
					// "General" en vez de tumbar la lectura.
					getAllCategorias().catch(() => []),
				]);

				if (cancelado) return;

				if (!lectura) {
					setResultado({ clave, estado: "no-disponible" });
					return;
				}

				const categoria = categorias.find(
					(item) => item.id === lectura.categoriaId,
				);

				setResultado({
					clave,
					estado: "ok",
					lectura,
					categoria: categoria?.nombre || "General",
				});
			} catch (error) {
				if (cancelado) return;

				if (esLecturaNoDisponible(error)) {
					setResultado({ clave, estado: "no-disponible" });
					return;
				}

				console.error("Error cargando lectura:", error);
				setResultado({ clave, estado: "error" });
			}
		};

		cargar();

		return () => {
			cancelado = true;
		};
	}, [lecturaId, clave]);

	const reintentar = useCallback(() => {
		setIntento((actual) => actual + 1);
	}, []);

	const cargando = resultado?.clave !== clave;

	return {
		estado: cargando ? "cargando" : resultado.estado,
		lectura: cargando ? null : (resultado.lectura ?? null),
		categoria: cargando ? "" : (resultado.categoria ?? ""),
		reintentar,
	};
};

export default useLectura;
