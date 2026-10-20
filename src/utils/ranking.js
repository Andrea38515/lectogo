// Cuántos estudiantes trae el ranking general. Mantener acotado: cada fila es
// una lectura de Firestore por cada visita a la pantalla.
export const LIMITE_RANKING = 20;

// Cuántos puestos se destacan en el podio; el resto va en la lista.
export const TAMANO_PODIO = 3;

/**
 * Posición de un estudiante a partir de dos conteos del servidor:
 * quiénes tienen más XP y quiénes, con el mismo XP, llegaron antes.
 * Coincide con el orden de la consulta del top (xp desc, actualizadoEn asc).
 *
 * @param {number} conMasXp
 * @param {number} empatadosAntes
 * @returns {number}
 */
export const calcularPosicionDesdeConteos = (conMasXp, empatadosAntes) =>
	1 + conMasXp + empatadosAntes;

/**
 * Añade la posición (1, 2, 3...) según el orden en que llegan las filas.
 * La posición no se guarda en Firestore: sale del orden de la consulta.
 *
 * @param {Array} filas
 * @returns {Array}
 */
export const conPosicion = (filas) =>
	filas.map((fila, indice) => ({ ...fila, posicion: indice + 1 }));

/**
 * Separa las filas del top en el podio (primeros puestos) y el resto de la
 * lista. Con menos de TAMANO_PODIO filas el podio trae solo las que existen.
 *
 * @param {Array} filas Ya ordenadas de mayor a menor posición.
 * @returns {{ podio: Array, lista: Array }}
 */
export const dividirPodioYLista = (filas) => {
	const conPosiciones = conPosicion(filas);

	return {
		podio: conPosiciones.slice(0, TAMANO_PODIO),
		lista: conPosiciones.slice(TAMANO_PODIO),
	};
};

/**
 * Compara por estudianteId, nunca por alias: el alias no es único.
 *
 * @param {{ estudianteId: string } | null | undefined} fila
 * @param {string | null | undefined} uid
 * @returns {boolean}
 */
export const esFilaPropia = (fila, uid) =>
	Boolean(uid) && fila?.estudianteId === uid;

/**
 * Índice (base 0) de la fila propia dentro del top, o -1 si no está.
 *
 * @param {Array} filas
 * @param {string | null | undefined} uid
 * @returns {number}
 */
export const indiceEnTop = (filas, uid) =>
	filas.findIndex((fila) => esFilaPropia(fila, uid));

export const estaEnTop = (filas, uid) => indiceEnTop(filas, uid) !== -1;

/**
 * Posición que se le muestra al estudiante. Si ya aparece en el top se usa
 * su puesto en esa lista, para que el número de la tarjeta y el de la fila
 * nunca se contradigan (dos filas con exactamente la misma marca de tiempo
 * podrían empatar en el conteo del servidor pero no en el orden de la lista).
 * Fuera del top se usa la posición calculada con los conteos, o null si no
 * se pudo calcular.
 *
 * @param {Array} filasTop
 * @param {string | null | undefined} uid
 * @param {number | null | undefined} posicionCalculada
 * @returns {number | null}
 */
export const resolverPosicionPropia = (filasTop, uid, posicionCalculada) => {
	const indice = indiceEnTop(filasTop, uid);

	if (indice !== -1) {
		return indice + 1;
	}

	return Number.isInteger(posicionCalculada) ? posicionCalculada : null;
};
