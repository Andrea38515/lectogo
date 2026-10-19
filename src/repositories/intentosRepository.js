import { collection, getDocs, limit, query, where } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";

import { db, functions } from "../config/firebase";

const INTENTOS_COLLECTION = "intentos";

const mapIntento = (intentoDoc) => {
	const data = intentoDoc.data();

	return {
		id: intentoDoc.id,
		actividadId: data.actividadId || null,
		estudianteId: data.estudianteId || null,
		respuestas: Array.isArray(data.respuestas) ? data.respuestas : [],
		porcentajeAciertos: Number(data.porcentajeAciertos) || 0,
		xpGanado: Number(data.xpGanado) || 0,
		resueltoEn:
			typeof data.resueltoEn?.toDate === "function"
				? data.resueltoEn.toDate()
				: null,
	};
};

/**
 * Intentos del estudiante. Los escribe solo la Cloud Function
 * registrarIntento; el cliente únicamente los lee.
 *
 * @param {string} uid
 * @returns {Promise<Array>}
 */
export const getIntentosByEstudiante = async (uid) => {
	if (!uid) {
		return [];
	}

	const intentosRef = collection(db, INTENTOS_COLLECTION);
	const consulta = query(intentosRef, where("estudianteId", "==", uid));

	const snapshot = await getDocs(consulta);

	return snapshot.docs.map(mapIntento);
};

/**
 * Intento del estudiante para una actividad, o null si aún no la resolvió.
 *
 * Se usa una consulta y no getDoc sobre intentos/{id}: la regla lee
 * resource.data.estudianteId, así que getDoc de un documento inexistente
 * devuelve permission-denied en vez de "no existe".
 *
 * @param {string} uid
 * @param {string} actividadId
 * @returns {Promise<Object|null>}
 */
export const getIntentoByActividad = async (uid, actividadId) => {
	if (!uid || !actividadId) {
		return null;
	}

	const intentosRef = collection(db, INTENTOS_COLLECTION);
	const consulta = query(
		intentosRef,
		where("estudianteId", "==", uid),
		where("actividadId", "==", actividadId),
		limit(1),
	);

	const snapshot = await getDocs(consulta);

	if (snapshot.empty) {
		return null;
	}

	return mapIntento(snapshot.docs[0]);
};

/**
 * Envía las respuestas a la Cloud Function registrarIntento, que califica
 * en el servidor. Si el intento ya existía devuelve duplicado: true con el
 * resultado original.
 *
 * @param {string} actividadId
 * @param {Array<{preguntaId: string, respuestaDada: string}>} respuestas
 * @returns {Promise<Object>}
 */
export const registrarIntento = async (actividadId, respuestas) => {
	const callable = httpsCallable(functions, "registrarIntento");
	const { data } = await callable({ actividadId, respuestas });

	return data;
};
