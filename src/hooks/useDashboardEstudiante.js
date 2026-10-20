import { useEffect, useState } from "react";

import { useAuth } from "./useAuth";
import { cargarActividadesEstudiante } from "./cargarActividadesEstudiante";
import { getLogrosByEstudiante } from "../repositories/logrosRepository";
import { getNivelesConfig } from "../repositories/nivelesRepository";
import { convertirFecha } from "../utils/formatearFecha";

const MAX_ITEMS = 3;

// Las actividades sin fecha límite van al final de la lista de pendientes.
const marcaDeTiempo = (fecha) =>
	fecha ? fecha.getTime() : Number.POSITIVE_INFINITY;

const porFechaLimite = (a, b) => {
	const tiempoA = marcaDeTiempo(a.fechaLimite);
	const tiempoB = marcaDeTiempo(b.fechaLimite);

	if (tiempoA === tiempoB) {
		return 0;
	}

	return tiempoA < tiempoB ? -1 : 1;
};

// Los intentos sin fecha (dato incompleto) quedan al final.
const porMasReciente = (a, b) =>
	(b.resueltoEn?.getTime() ?? 0) - (a.resueltoEn?.getTime() ?? 0);

const resumirActividades = ({ actividades, intentos, intentosDisponibles }, ahora) => {
	const total = actividades.length;

	// Sin los intentos no se sabe qué está resuelto: mostrar ceros o "todo
	// pendiente" sería un dato falso. Solo el total es fiable.
	if (!intentosDisponibles) {
		return {
			total,
			completadas: null,
			porcentajeCompletado: null,
			totalPendientes: null,
			pendientes: null,
			recientes: null,
			promedioAciertos: null,
		};
	}
	const completadas = actividades.filter((actividad) => actividad.completada);

	// Una actividad cerrada sin resolver ya no se puede abrir para responder,
	// así que no se ofrece como pendiente (sí cuenta en el total).
	const todasPendientes = actividades
		.filter((actividad) => !actividad.completada && actividad.estado === "asignada")
		.map((actividad) => {
			const fechaLimite = convertirFecha(actividad.fechaLimite);

			return {
				...actividad,
				fechaLimite,
				// "Ahora" llega de fuera para que el render siga siendo puro.
				vencida: Boolean(fechaLimite && fechaLimite.getTime() < ahora),
			};
		})
		// Las vencidas ya no aceptan envíos (el servidor las rechaza): van al
		// final para que no desplacen a las que sí se pueden resolver.
		.sort((a, b) => Number(a.vencida) - Number(b.vencida) || porFechaLimite(a, b));

	const tituloPorActividad = new Map(
		actividades.map((actividad) => [actividad.id, actividad.titulo]),
	);

	const recientes = [...intentos]
		.sort(porMasReciente)
		.slice(0, MAX_ITEMS)
		.map((intento) => ({
			...intento,
			// Si el docente quitó al estudiante de la actividad ya no se puede
			// leer su título, pero el resultado propio sigue siendo visible.
			titulo: tituloPorActividad.get(intento.actividadId) || "Actividad",
		}));

	const promedioAciertos =
		intentos.length > 0
			? Math.round(
					intentos.reduce(
						(suma, intento) => suma + intento.porcentajeAciertos,
						0,
					) / intentos.length,
				)
			: null;

	return {
		total,
		completadas: completadas.length,
		porcentajeCompletado:
			total > 0 ? Math.round((completadas.length / total) * 100) : 0,
		totalPendientes: todasPendientes.length,
		pendientes: todasPendientes.slice(0, MAX_ITEMS),
		recientes,
		promedioAciertos,
	};
};

/*
 * Cada fuente falla por separado: un valor null (o [] en niveles) significa
 * "no disponible" y la pantalla muestra un fallback solo en esa tarjeta.
 * Nunca rechaza.
 *
 * Las tres consultas son independientes, así que viajan en paralelo.
 */
const cargarDashboard = async (uid) => {
	const [resultadoActividades, totalLogros, niveles] = await Promise.all([
		cargarActividadesEstudiante(uid).catch((err) => {
			console.error("Error cargando las actividades del dashboard:", err);
			return null;
		}),
		getLogrosByEstudiante(uid)
			.then((logros) => logros.length)
			.catch(() => null),
		// La colección puede estar vacía o no ser legible: sin umbrales solo se
		// omite la barra de XP.
		getNivelesConfig().catch(() => []),
	]);

	const ahora = Date.now();

	return {
		actividades: resultadoActividades
			? resumirActividades(resultadoActividades, ahora)
			: null,
		logros: totalLogros,
		niveles,
	};
};

const useDashboardEstudiante = () => {
	const { user } = useAuth();
	const uid = user?.uid;

	const [intentoCarga, setIntentoCarga] = useState(0);
	const [cargado, setCargado] = useState({ clave: null, datos: null });

	// Identifica la carga en curso; mientras no coincida con la última
	// completada, el dashboard está cargando (sin setState síncrono en el efecto).
	const clave = `${uid}|${intentoCarga}`;

	useEffect(() => {
		if (!uid) {
			return undefined;
		}

		let cancelado = false;

		cargarDashboard(uid)
			.then((datos) => {
				if (!cancelado) {
					setCargado({ clave, datos });
				}
			})
			.catch((err) => {
				// Un fallo imprevisto al resumir no puede dejar el spinner para
				// siempre: se cae al estado de error por tarjeta.
				console.error("Error preparando el dashboard:", err);

				if (!cancelado) {
					setCargado({
						clave,
						datos: { actividades: null, logros: null, niveles: [] },
					});
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

export default useDashboardEstudiante;
export { useDashboardEstudiante };
