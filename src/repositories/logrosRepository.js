import { collection, getDocs, query, where } from "firebase/firestore";

import { db } from "../config/firebase";

const LOGROS_USUARIO_COLLECTION = "logros_usuario";

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
