import { useEffect, useState } from "react";

import { useAuth } from "./useAuth";
import { getActividadById } from "../repositories/actividadesRepository";
import { getLecturaById } from "../repositories/lecturasRepository";
import { getPreguntasByLectura } from "../repositories/preguntasRepository";
import { getIntentoByActividad } from "../repositories/intentosRepository";
import { convertirFecha } from "../utils/formatearFecha";

/*
 * Carga todo lo que necesita la pantalla de resolver una actividad y lo
 * resume en un único estado:
 *
 * listo | no-encontrada | sin-acceso | cerrada | sin-lectura |
 * sin-preguntas | error
 *
 * Nunca rechaza: los errores se traducen a estado "error" (o "sin-acceso"
 * cuando las reglas de Firestore deniegan la lectura).
 *
 * La fecha límite no bloquea aquí: el reloj del dispositivo puede estar
 * adelantado y quien decide es el servidor al recibir el envío.
 */
const cargarActividad = async (uid, actividadId) => {
	try {
		// El intento propio se resuelve primero: siempre es legible y es la
		// fuente de verdad de los resultados.
		const intento = await getIntentoByActividad(uid, actividadId);

		let actividad = null;

		try {
			actividad = await getActividadById(actividadId);
		} catch (err) {
			if (!intento) {
				throw err;
			}
		}

		// Si el docente quitó al estudiante de la actividad (o la borró) después
		// de resolverla, las reglas deniegan la lectura de la actividad, pero el
		// estudiante debe seguir viendo sus resultados.
		if (intento && !actividad) {
			return {
				estado: "listo",
				actividad: null,
				fechaLimite: null,
				lectura: null,
				preguntas: [],
				intento,
			};
		}

		if (!actividad) {
			return { estado: "no-encontrada" };
		}

		if (!intento && !actividad.estudiantesAsignados.includes(uid)) {
			return { estado: "sin-acceso" };
		}

		const fechaLimite = convertirFecha(actividad.fechaLimite);

		// Con un intento previo siempre se muestran los resultados, aunque la
		// actividad se haya cerrado después.
		if (!intento && actividad.estado !== "asignada") {
			return { estado: "cerrada" };
		}

		// Para los resultados la lectura y las preguntas solo enriquecen la
		// vista (títulos, enunciados): si fallan no deben ocultar el intento.
		const tolerar = (promesa, valorPorDefecto) =>
			intento ? promesa.catch(() => valorPorDefecto) : promesa;

		const [lectura, preguntas] = await Promise.all([
			tolerar(getLecturaById(actividad.lecturaId), null),
			tolerar(getPreguntasByLectura(actividad.lecturaId), []),
		]);

		if (!intento && !lectura) {
			return { estado: "sin-lectura" };
		}

		if (!intento && preguntas.length === 0) {
			return { estado: "sin-preguntas" };
		}

		// Solo informativo: la pantalla avisa, pero el servidor decide si acepta.
		const fechaPasada = Boolean(fechaLimite && fechaLimite.getTime() < Date.now());

		return {
			estado: "listo",
			actividad,
			fechaLimite,
			fechaPasada,
			lectura,
			preguntas,
			intento,
		};
	} catch (err) {
		if (err?.code === "permission-denied") {
			return { estado: "sin-acceso" };
		}

		console.error("Error cargando la actividad:", err);

		return { estado: "error" };
	}
};

const useResolverActividad = (actividadId) => {
	const { user } = useAuth();
	const uid = user?.uid;

	const [intentoCarga, setIntentoCarga] = useState(0);
	const [cargado, setCargado] = useState({ clave: null, datos: null });

	// Identifica la carga en curso; mientras no coincida con la última
	// completada, la pantalla está cargando (sin setState síncrono en el efecto).
	const clave = `${uid}|${actividadId}|${intentoCarga}`;

	useEffect(() => {
		if (!uid || !actividadId) {
			return undefined;
		}

		let cancelado = false;

		cargarActividad(uid, actividadId).then((datos) => {
			if (!cancelado) {
				setCargado({ clave, datos });
			}
		});

		return () => {
			cancelado = true;
		};
	}, [uid, actividadId, clave]);

	if (!uid) {
		return {
			isLoading: false,
			datos: { estado: "sin-sesion" },
			reintentar: () => {},
		};
	}

	return {
		isLoading: cargado.clave !== clave,
		datos: cargado.clave === clave ? cargado.datos : null,
		reintentar: () => setIntentoCarga((valor) => valor + 1),
	};
};

export default useResolverActividad;
export { useResolverActividad };
