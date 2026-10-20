import { useEffect, useState } from "react";

import { useAuth } from "./useAuth";
import {
	calcularPosicion,
	contarParticipantes,
	getFilaRanking,
	getTopRanking,
} from "../repositories/rankingRepository";
import { LIMITE_RANKING } from "../utils/ranking";

const cargarTop = () =>
	getTopRanking(LIMITE_RANKING)
		.then((filas) => ({ estado: "ok", filas }))
		.catch((err) => {
			// Mientras el índice compuesto no esté desplegado Firestore rechaza
			// la consulta con este código: no es un fallo del usuario ni de red.
			if (err?.code === "failed-precondition") {
				console.warn("El ranking necesita el índice compuesto de Firestore:", err);
				return { estado: "no-disponible", filas: [] };
			}

			console.error("Error cargando el ranking:", err);
			return { estado: "error", filas: [] };
		});

// La posición depende de la fila propia (su XP y su fecha), así que va en
// cadena. Si solo falla el cálculo se conserva la fila: los datos propios son
// ciertos aunque la posición no se pueda confirmar.
const cargarPropia = (uid) =>
	getFilaRanking(uid)
		.then(async (fila) => {
			if (!fila) {
				return { estado: "sin-fila", fila: null, posicion: null };
			}

			const posicion = await calcularPosicion(fila).catch((err) => {
				console.error("Error calculando tu posición en el ranking:", err);
				return null;
			});

			return { estado: "ok", fila, posicion };
		})
		.catch((err) => {
			console.error("Error cargando tu fila del ranking:", err);
			return { estado: "error", fila: null, posicion: null };
		});

// Sin el total solo se oculta el "de M": la posición sigue siendo válida.
const cargarTotal = () =>
	contarParticipantes().catch((err) => {
		console.error("Error contando los participantes del ranking:", err);
		return null;
	});

/*
 * Cada fuente falla por separado y nunca rechaza: la pantalla muestra el
 * fallback solo del bloque afectado. Las tres son independientes, así que
 * viajan en paralelo (la única cadena es fila propia -> posición).
 */
const cargarRanking = async (uid) => {
	const [top, propia, total] = await Promise.all([
		cargarTop(),
		cargarPropia(uid),
		cargarTotal(),
	]);

	return { top, propia, total };
};

const useRanking = () => {
	const { user } = useAuth();
	const uid = user?.uid;

	const [intentoCarga, setIntentoCarga] = useState(0);
	const [cargado, setCargado] = useState({ clave: null, datos: null });

	// Identifica la carga en curso; mientras no coincida con la última
	// completada, el ranking está cargando (sin setState síncrono en el efecto).
	const clave = `${uid}|${intentoCarga}`;

	useEffect(() => {
		if (!uid) {
			return undefined;
		}

		let cancelado = false;

		cargarRanking(uid).then((datos) => {
			if (!cancelado) {
				setCargado({ clave, datos });
			}
		});

		return () => {
			cancelado = true;
		};
	}, [uid, clave]);

	if (!uid) {
		return { isLoading: false, datos: null, reintentar: () => {} };
	}

	return {
		isLoading: cargado.clave !== clave,
		datos: cargado.clave === clave ? cargado.datos : null,
		reintentar: () => setIntentoCarga((valor) => valor + 1),
	};
};

export default useRanking;
export { useRanking };
