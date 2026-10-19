import { collection, getDocs } from "firebase/firestore";

import { db } from "../config/firebase";

const NIVELES_COLLECTION = "niveles_config";

/**
 * Umbrales de XP por nivel, ordenados de menor a mayor. Es la misma
 * colección que usa la Cloud Function que calcula el nivel, así que el
 * cliente no hardcodea cantidades de XP. Descarta documentos mal formados.
 *
 * @returns {Promise<Array<{nivel: number, xpMinimo: number}>>}
 */
export const getNivelesConfig = async () => {
	const nivelesRef = collection(db, NIVELES_COLLECTION);

	const snapshot = await getDocs(nivelesRef);

	return snapshot.docs
		.map((nivelDoc) => {
			const data = nivelDoc.data();

			return {
				nivel: Number(data.nivel),
				xpMinimo: Number(data.xpMinimo),
			};
		})
		.filter(
			(item) =>
				Number.isInteger(item.nivel) &&
				item.nivel > 0 &&
				Number.isFinite(item.xpMinimo) &&
				item.xpMinimo >= 0,
		)
		.sort((a, b) => a.xpMinimo - b.xpMinimo);
};
