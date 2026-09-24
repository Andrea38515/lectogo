import { collection, getDocs, query, where } from "firebase/firestore";

import { db } from "../config/firebase";

const PREGUNTAS_COLLECTION = "preguntas";

export const getPreguntasByLectura = async (lecturaId) => {
	if (!lecturaId) {
		return [];
	}

	const preguntasRef = collection(db, PREGUNTAS_COLLECTION);
	const consulta = query(preguntasRef, where("lecturaId", "==", lecturaId));

	const snapshot = await getDocs(consulta);

	return snapshot.docs.map((preguntaDoc) => {
		const data = preguntaDoc.data();

		// Nunca exponer respuestaCorrecta ni explicacion antes de responder —
		// eso solo lo devuelve registrarIntento tras calificar en el servidor.
		return {
			id: preguntaDoc.id,
			lecturaId: data.lecturaId,
			tipo: data.tipo || "seleccion_multiple",
			enunciado: data.enunciado || "",
			opciones: data.opciones || [],
		};
	});
};
