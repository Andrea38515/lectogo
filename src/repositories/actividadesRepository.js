import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";

import { db } from "../config/firebase";

const ACTIVIDADES_COLLECTION = "actividades";

export const getActividadesAsignadas = async (uid) => {
	if (!uid) {
		return [];
	}

	const actividadesRef = collection(db, ACTIVIDADES_COLLECTION);
	const consulta = query(
		actividadesRef,
		where("estudiantesAsignados", "array-contains", uid),
	);

	const snapshot = await getDocs(consulta);

	return snapshot.docs.map((actividadDoc) => {
		const data = actividadDoc.data();

		return {
			id: actividadDoc.id,
			lecturaId: data.lecturaId || null,
			docenteId: data.docenteId || null,
			estudiantesAsignados: data.estudiantesAsignados || [],
			estado: data.estado || null,
			fechaLimite: data.fechaLimite || null,
		};
	});
};

export const getActividadById = async (id) => {
	if (!id) {
		return null;
	}

	const actividadRef = doc(db, ACTIVIDADES_COLLECTION, id);
	const snapshot = await getDoc(actividadRef);

	if (!snapshot.exists()) {
		return null;
	}

	const data = snapshot.data();

	return {
		id: snapshot.id,
		lecturaId: data.lecturaId || null,
		docenteId: data.docenteId || null,
		estudiantesAsignados: data.estudiantesAsignados || [],
		estado: data.estado || null,
		fechaLimite: data.fechaLimite || null,
	};
};
