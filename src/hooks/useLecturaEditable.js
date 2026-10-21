import { useCallback, useEffect, useState } from "react";

import { getMiLectura } from "../repositories/lecturasDocenteRepository";
import { getAllCategorias } from "../repositories/categoriasRepository";
import { useAuth } from "./useAuth";

// Datos que necesita el formulario de lecturas del docente: las categorías y,
// al editar, la lectura propia. estado: "cargando" | "ok" | "no-encontrada" |
// "error". Sin lecturaId es una lectura nueva y solo se cargan las categorías.
export const useLecturaEditable = (lecturaId) => {
	const { user } = useAuth();
	const uid = user?.uid;

	const [intento, setIntento] = useState(0);
	const [resultado, setResultado] = useState(null);

	const clave = `${uid}:${lecturaId ?? "nueva"}:${intento}`;

	useEffect(() => {
		let cancelado = false;

		const cargar = async () => {
			try {
				const [lectura, categorias] = await Promise.all([
					lecturaId ? getMiLectura(lecturaId, uid) : Promise.resolve(null),
					getAllCategorias(),
				]);

				if (cancelado) return;

				// Inexistente, ajena o denegada: el repositorio ya las unifica en null.
				if (lecturaId && !lectura) {
					setResultado({ clave, estado: "no-encontrada" });
					return;
				}

				setResultado({ clave, estado: "ok", lectura, categorias });
			} catch (error) {
				if (cancelado) return;

				console.error("Error cargando el formulario de lectura:", error);
				setResultado({ clave, estado: "error" });
			}
		};

		cargar();

		return () => {
			cancelado = true;
		};
	}, [lecturaId, uid, clave]);

	const reintentar = useCallback(() => {
		setIntento((actual) => actual + 1);
	}, []);

	const cargando = resultado?.clave !== clave;

	return {
		estado: cargando ? "cargando" : resultado.estado,
		lectura: cargando ? null : (resultado.lectura ?? null),
		categorias: cargando ? [] : (resultado.categorias ?? []),
		reintentar,
	};
};

export default useLecturaEditable;
