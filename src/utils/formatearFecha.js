const formateador = new Intl.DateTimeFormat("es-CO", {
	dateStyle: "medium",
	timeStyle: "short",
});

/**
 * Convierte Date, Timestamp de Firestore o string ISO a Date.
 * Devuelve null si el valor no representa una fecha válida.
 */
export const convertirFecha = (valor) => {
	if (!valor) {
		return null;
	}

	if (typeof valor.toDate === "function") {
		return valor.toDate();
	}

	const fecha = valor instanceof Date ? valor : new Date(valor);

	return Number.isNaN(fecha.getTime()) ? null : fecha;
};

export const formatearFecha = (valor) => {
	const fecha = convertirFecha(valor);

	return fecha ? formateador.format(fecha) : "Fecha no disponible";
};
