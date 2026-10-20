import {
	Timestamp,
	collection,
	doc,
	getCountFromServer,
	getDoc,
	getDocs,
	limit,
	orderBy,
	query,
	where,
} from "firebase/firestore";

import { db } from "../config/firebase";
import { calcularPosicionDesdeConteos } from "../utils/ranking";
import { convertirFecha } from "../utils/formatearFecha";

const RANKING_COLLECTION = "ranking";

// El alias lo genera el servidor; si faltara, la fila igual se puede mostrar.
const ALIAS_POR_DEFECTO = "Lector";

const aNumeroNoNegativo = (valor) => {
	const numero = Number(valor);

	return Number.isFinite(numero) && numero > 0 ? numero : 0;
};

/**
 * Convierte un documento de ranking en la fila que usa la pantalla. Nunca
 * descarta filas: la posición se numera por índice, así que quitar un
 * documento correría a todos los de abajo. El id del documento ES el
 * estudianteId por diseño, y sirve de respaldo si el campo faltara (el alias
 * no es único, no sirve para identificar la fila).
 */
const mapearFila = (data, docId) => {
	const estudianteId =
		typeof data?.estudianteId === "string" && data.estudianteId !== ""
			? data.estudianteId
			: docId;

	return {
		estudianteId,
		alias:
			typeof data.alias === "string" && data.alias.trim() !== ""
				? data.alias.trim()
				: ALIAS_POR_DEFECTO,
		xp: aNumeroNoNegativo(data.xp),
		// Quien tiene fila ya resolvió un intento, así que nunca está por
		// debajo del nivel 1.
		nivel: aNumeroNoNegativo(data.nivel) || 1,
		logros: aNumeroNoNegativo(data.logros),
		actividades: aNumeroNoNegativo(data.actividades),
		actualizadoEn: convertirFecha(data.actualizadoEn),
		// Timestamp original de Firestore, sin mostrar: conserva la precisión
		// de micro/nanosegundos que se pierde al pasar a Date y que el conteo
		// de desempate necesita para comparar contra el mismo valor guardado.
		actualizadoEnMarca:
			typeof data.actualizadoEn?.toDate === "function"
				? data.actualizadoEn
				: null,
	};
};

/**
 * Mejores posiciones del ranking: más XP primero y, con el mismo XP, quien lo
 * alcanzó antes (actualizadoEn solo cambia al registrar un intento, así que es
 * el momento en que el estudiante llegó a ese XP).
 *
 * Requiere el índice compuesto xp desc + actualizadoEn asc de
 * firestore.indexes.json; sin desplegarlo Firestore responde failed-precondition.
 *
 * @param {number} limite
 * @returns {Promise<Array>}
 */
export const getTopRanking = async (limite) => {
	const rankingRef = collection(db, RANKING_COLLECTION);
	const consulta = query(
		rankingRef,
		orderBy("xp", "desc"),
		orderBy("actualizadoEn", "asc"),
		limit(limite),
	);

	const snapshot = await getDocs(consulta);

	return snapshot.docs.map((filaDoc) => mapearFila(filaDoc.data(), filaDoc.id));
};

/**
 * Fila propia del estudiante. Devuelve null si todavía no tiene (el servidor
 * la crea con su primer intento).
 *
 * @param {string} uid
 * @returns {Promise<object | null>}
 */
export const getFilaRanking = async (uid) => {
	if (!uid) {
		return null;
	}

	const snapshot = await getDoc(doc(db, RANKING_COLLECTION, uid));

	return snapshot.exists() ? mapearFila(snapshot.data(), snapshot.id) : null;
};

/**
 * Total de estudiantes en el ranking, sin descargar los documentos.
 *
 * @returns {Promise<number>}
 */
export const contarParticipantes = async () => {
	const rankingRef = collection(db, RANKING_COLLECTION);
	const snapshot = await getCountFromServer(rankingRef);

	return snapshot.data().count;
};

/**
 * Posición real de una fila aunque quede fuera del top, con el mismo criterio
 * de orden que getTopRanking: 1 + quienes tienen más XP + quienes tienen el
 * mismo XP y llegaron antes. La segunda consulta usa el índice compuesto.
 *
 * Devuelve null si la fila no tiene marca de tiempo: sin ella no se puede
 * desempatar y la cifra sería inventada.
 *
 * @param {{ xp: number, actualizadoEn: Date | null, actualizadoEnMarca?: Timestamp | null }} fila
 * @returns {Promise<number | null>}
 */
export const calcularPosicion = async (fila) => {
	// Se usa el Timestamp original sin tocar; Date solo como respaldo, porque
	// truncaría a milisegundos y podría contar de menos.
	const marca =
		fila?.actualizadoEnMarca ??
		(fila?.actualizadoEn ? Timestamp.fromDate(fila.actualizadoEn) : null);

	if (!marca) {
		return null;
	}

	const rankingRef = collection(db, RANKING_COLLECTION);

	const [conMasXp, empatadosAntes] = await Promise.all([
		getCountFromServer(query(rankingRef, where("xp", ">", fila.xp))),
		getCountFromServer(
			query(
				rankingRef,
				where("xp", "==", fila.xp),
				where("actualizadoEn", "<", marca),
			),
		),
	]);

	return calcularPosicionDesdeConteos(
		conMasXp.data().count,
		empatadosAntes.data().count,
	);
};
