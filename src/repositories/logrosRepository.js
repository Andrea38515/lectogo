import { collection, getDocs, query, where } from "firebase/firestore";

import { db } from "../config/firebase";

const LOGROS_COLLECTION = "logros";
const LOGROS_USUARIO_COLLECTION = "logros_usuario";

/**
 * Catálogo completo de logros. Cualquier usuario autenticado puede leerlo
 * (no contiene datos personales), así que no hace falta filtrar.
 *
 * @returns {Promise<Array>}
 */
export const getCatalogoLogros = async () => {
	const snapshot = await getDocs(collection(db, LOGROS_COLLECTION));

	return snapshot.docs
		.map((logroDoc) => ({ id: logroDoc.id, data: logroDoc.data() }))
		// Un documento sin nombre no se puede mostrar: se omite en vez de
		// pintar una tarjeta vacía.
		.filter(({ data }) => typeof data.nombre === "string")
		.map(({ id, data }) => ({
			id,
			nombre: data.nombre,
			descripcion: typeof data.descripcion === "string" ? data.descripcion : "",
			criterioTipo: typeof data.criterioTipo === "string" ? data.criterioTipo : "",
			// null cuando el valor no es numérico: sin umbral no hay progreso.
			criterioValor: Number.isFinite(data.criterioValor)
				? data.criterioValor
				: null,
			iconoUrl: typeof data.iconoUrl === "string" ? data.iconoUrl : null,
		}));
};

/**
 * Logros obtenidos por el estudiante. Los escribe solo una Cloud Function;
 * el cliente únicamente los lee, y las reglas solo dejan ver los propios,
 * por eso la consulta siempre filtra por estudianteId.
 *
 * @param {string} uid
 * @returns {Promise<Array>}
 */
export const getLogrosByEstudiante = async (uid) => {
	if (!uid) {
		return [];
	}

	const logrosRef = collection(db, LOGROS_USUARIO_COLLECTION);
	const consulta = query(logrosRef, where("estudianteId", "==", uid));

	const snapshot = await getDocs(consulta);

	return snapshot.docs.map((logroDoc) => {
		const data = logroDoc.data();

		return {
			id: logroDoc.id,
			logroId: data.logroId || null,
			obtenidoEn:
				typeof data.obtenidoEn?.toDate === "function"
					? data.obtenidoEn.toDate()
					: null,
		};
	});
};
