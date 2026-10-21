import { useCallback, useEffect, useState } from "react";

import { getProgresoDeActividad } from "../repositories/progresoDocenteRepository";
import { useAuth } from "./useAuth";

// Progreso de una actividad del docente. estado: 'cargando' | 'ok' |
// 'no-encontrada' (no existe o es de otro docente: no se distingue) | 'error'.
// Mientras se recarga la misma actividad se conservan los datos anteriores.
export const useProgresoActividad = (actividadId) => {
	const { user } = useAuth();
	const uid = user?.uid;

	const [intento, setIntento] = useState(0);
	const [resultado, setResultado] = useState(null);

	// Cada resultado lleva la clave de la petición que lo originó: "cargando"
	// se deriva de que la clave no coincida, sin setState síncrono en el effect.
	const clave = `${uid}:${actividadId}:${intento}`;
	const claveActividad = `${uid}:${actividadId}`;

	useEffect(() => {
		let cancelado = false;

		const cargar = async () => {
			try {
				const datos = await getProgresoDeActividad(actividadId, uid);

				if (cancelado) return;

				setResultado({
					clave,
					claveActividad,
					estado: datos ? "ok" : "no-encontrada",
					datos,
				});
			} catch (error) {
				if (cancelado) return;

				console.error("Error cargando el progreso de la actividad:", error);
				setResultado({ clave, claveActividad, estado: "error", datos: null });
			}
		};

		cargar();

		return () => {
			cancelado = true;
		};
	}, [uid, actividadId, clave, claveActividad]);

	const recargar = useCallback(() => {
		setIntento((actual) => actual + 1);
	}, []);

	const vigente = resultado?.clave === clave;

	// Datos de la misma actividad y usuario, aunque haya una recarga en curso.
	const mismaActividad = resultado?.claveActividad === claveActividad;

	return {
		estado: vigente ? resultado.estado : "cargando",
		datos: mismaActividad ? resultado.datos : null,
		recargar,
	};
};

export default useProgresoActividad;
