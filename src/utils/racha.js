import { convertirFecha } from "./formatearFecha";

// Mismo huso horario que usa el servidor para cortar los días de la racha.
const ZONA_HORARIA = "America/Bogota";
const UN_DIA_MS = 24 * 60 * 60 * 1000;

const formateadorDia = new Intl.DateTimeFormat("en-CA", {
	timeZone: ZONA_HORARIA,
	year: "numeric",
	month: "2-digit",
	day: "2-digit",
});

/**
 * Racha que se le puede mostrar hoy al estudiante.
 *
 * `usuarios.rachaActual` solo se recalcula cuando se registra un intento, así
 * que tras varios días sin actividad sigue guardando el último valor aunque la
 * racha ya se haya roto (el próximo intento la reiniciaría en 1). Si la última
 * actividad no fue hoy ni ayer, se muestra 0.
 *
 * `ahora` llega de fuera para que el render siga siendo puro.
 *
 * @param {Object} usuario perfil de usuarios/{uid}
 * @param {Date} ahora
 * @returns {number}
 */
export const rachaVigente = (usuario, ahora) => {
	const racha = Math.max(Number(usuario?.rachaActual) || 0, 0);

	if (racha === 0) {
		return 0;
	}

	const ultimaActividad = convertirFecha(usuario?.ultimaActividadEn);

	// Sin fecha no se puede afirmar que la racha caducó: se conserva el valor.
	if (!ultimaActividad) {
		return racha;
	}

	const ultimoDia = formateadorDia.format(ultimaActividad);
	const hoy = formateadorDia.format(ahora);
	const ayer = formateadorDia.format(new Date(ahora.getTime() - UN_DIA_MS));

	return ultimoDia === hoy || ultimoDia === ayer ? racha : 0;
};
