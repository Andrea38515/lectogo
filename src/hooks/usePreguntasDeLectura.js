import { useCallback, useEffect, useState } from "react";

import { getMiLectura } from "../repositories/lecturasDocenteRepository";
import { getPreguntasDeLectura } from "../repositories/preguntasDocenteRepository";
import { useAuth } from "./useAuth";

// Lectura propia + sus preguntas con la solución, para el banco de preguntas
// del docente. estado: "cargando" | "ok" | "no-encontrada" | "error".
// Una lectura inexistente, ajena o denegada es "no-encontrada" (sin distinguir).
export const usePreguntasDeLectura = (lecturaId) => {
	const { user } = useAuth();
	const uid = user?.uid;

	const [intento, setIntento] = useState(0);
	const [resultado, setResultado] = useState(null);

	// Cada resultado lleva la clave de la petición que lo originó: "cargando"
	// se deriva de que la clave no coincida, sin setState síncrono en el effect.
	const base = `${uid}:${lecturaId}`;
	const clave = `${base}:${intento}`;

	useEffect(() => {
		let cancelado = false;

		const cargar = async () => {
			try {
				const lectura = await getMiLectura(lecturaId, uid);

				if (cancelado) return;

				if (!lectura) {
					setResultado({ clave, base, estado: "no-encontrada" });
					return;
				}

				const preguntas = await getPreguntasDeLectura(lecturaId, uid);

				if (cancelado) return;

				setResultado({ clave, base, estado: "ok", lectura, preguntas });
			} catch (error) {
				if (cancelado) return;

				console.error("Error cargando las preguntas de la lectura:", error);
				setResultado({ clave, base, estado: "error" });
			}
		};

		cargar();

		return () => {
			cancelado = true;
		};
	}, [lecturaId, uid, base, clave]);

	const recargar = useCallback(() => {
		setIntento((actual) => actual + 1);
	}, []);

	const cargando = resultado?.clave !== clave;

	// Al recargar (p. ej. tras eliminar una pregunta) se conserva el resultado
	// anterior de la misma lectura para que la lista no parpadee. Un error previo
	// no se conserva: al reintentar vuelve a "cargando".
	const vigente =
		resultado?.base === base && !(cargando && resultado.estado === "error")
			? resultado
			: null;

	return {
		estado: vigente ? vigente.estado : "cargando",
		lectura: vigente?.lectura ?? null,
		preguntas: vigente?.preguntas ?? [],
		recargando: cargando && Boolean(vigente),
		recargar,
	};
};

export default usePreguntasDeLectura;
