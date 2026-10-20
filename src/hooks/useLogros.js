import { useEffect, useMemo, useState } from "react";

import { useAuth } from "./useAuth";
import { rachaVigente } from "../utils/racha";
import { getIntentosByEstudiante } from "../repositories/intentosRepository";
import {
	getCatalogoLogros,
	getLogrosByEstudiante,
} from "../repositories/logrosRepository";

const MARCAS_DIACRITICAS = /[̀-ͯ]/g;

// El servidor compara el tipo sin distinguir mayúsculas ni tildes
// ("desempeño" y "desempeno" son lo mismo); acá se hace igual para que el
// progreso mostrado coincida con el criterio que de verdad otorga el logro.
const normalizarTipo = (tipo) =>
	typeof tipo === "string"
		? tipo.normalize("NFD").replace(MARCAS_DIACRITICAS, "").toLowerCase().trim()
		: "";

const marcaDeTiempo = (fecha) => fecha?.getTime() ?? 0;

/*
 * Cada fuente falla por separado: null significa "no disponible". Así un
 * fallo en los intentos no hace pasar por bloqueados logros que sí se
 * obtuvieron, ni al revés. Nunca rechaza.
 *
 * Las tres lecturas son independientes, así que viajan en paralelo.
 */
const cargarLogros = async (uid) => {
	const registrarFallo = (fuente) => (err) => {
		console.error(`Error cargando ${fuente}:`, err);
		return null;
	};

	const [catalogo, obtenidos, intentos] = await Promise.all([
		getCatalogoLogros().catch(registrarFallo("el catálogo de logros")),
		getLogrosByEstudiante(uid).catch(registrarFallo("los logros obtenidos")),
		getIntentosByEstudiante(uid).catch(registrarFallo("los intentos")),
	]);

	return { catalogo, obtenidos, intentos };
};

// Valor actual del estudiante para el criterio del logro, o null si no se
// puede calcular (tipo desconocido o fuente no disponible).
const obtenerValorActual = (tipo, { totalActividades, mejorDesempeno, racha }) => {
	switch (normalizarTipo(tipo)) {
		case "actividades":
			return totalActividades;
		case "desempeno":
			return mejorDesempeno;
		case "racha":
			return racha;
		default:
			return null;
	}
};

const calcularAvance = (logro, contexto) => {
	const requerido = logro.criterioValor;

	if (!(requerido > 0)) {
		return null;
	}

	const valor = obtenerValorActual(logro.criterioTipo, contexto);

	if (valor == null) {
		return null;
	}

	const actual = Math.min(Math.round(valor), requerido);

	return { actual, requerido, proporcion: actual / requerido };
};

// Más reciente primero; los que no traen fecha (dato incompleto) quedan al final.
const porMasReciente = (a, b) =>
	marcaDeTiempo(b.obtenidoEn) - marcaDeTiempo(a.obtenidoEn);

// Más cerca de completarse primero; sin avance calculable van al final.
const porMasAvanzado = (a, b) =>
	(b.avance?.proporcion ?? -1) - (a.avance?.proporcion ?? -1) ||
	a.nombre.localeCompare(b.nombre, "es");

/**
 * Cruza catálogo, logros obtenidos y progreso. Es una función pura de los
 * datos cargados y la racha, así que el avance se actualiza cuando
 * refreshUser trae la racha vigente sin volver a consultar Firestore.
 */
const combinarLogros = (datos, racha) => {
	if (!datos?.catalogo) {
		return { catalogoDisponible: false };
	}

	const { catalogo, obtenidos, intentos } = datos;

	if (!obtenidos) {
		return { catalogoDisponible: true, estadoDisponible: false, total: catalogo.length };
	}

	// Sin intentos no se sabe cuántas actividades hizo ni su mejor resultado;
	// la racha viene del perfil y sigue siendo fiable.
	const contexto = {
		totalActividades: intentos ? intentos.length : null,
		mejorDesempeno: intentos
			? intentos.reduce((mejor, intento) => Math.max(mejor, intento.porcentajeAciertos), 0)
			: null,
		racha,
	};

	const fechaPorLogro = new Map(
		obtenidos.map((obtenido) => [obtenido.logroId, obtenido.obtenidoEn]),
	);

	const logros = catalogo.map((logro) => {
		const desbloqueado = fechaPorLogro.has(logro.id);

		return {
			...logro,
			desbloqueado,
			obtenidoEn: desbloqueado ? fechaPorLogro.get(logro.id) : null,
			// Un logro ya obtenido no necesita barra.
			avance: desbloqueado ? null : calcularAvance(logro, contexto),
		};
	});

	const desbloqueados = logros.filter((logro) => logro.desbloqueado).sort(porMasReciente);
	const bloqueados = logros.filter((logro) => !logro.desbloqueado).sort(porMasAvanzado);

	return {
		catalogoDisponible: true,
		estadoDisponible: true,
		// Con intentos caídos, los logros de actividades/desempeño pierden la
		// barra; se avisa para que no parezca que no tienen progreso.
		avanceCompleto: intentos !== null,
		total: logros.length,
		desbloqueados,
		bloqueados,
	};
};

const useLogros = () => {
	const { user } = useAuth();
	const uid = user?.uid;

	// "Ahora" se fija al montar: así el render sigue puro y la racha caducada se
	// muestra como 0 en vez del último valor guardado.
	const [ahora] = useState(() => new Date());
	const racha = rachaVigente(user, ahora);

	const [intentoCarga, setIntentoCarga] = useState(0);
	const [cargado, setCargado] = useState({ clave: null, datos: null });

	// Identifica la carga en curso; mientras no coincida con la última
	// completada, la pantalla está cargando (sin setState síncrono en el efecto).
	const clave = `${uid}|${intentoCarga}`;

	useEffect(() => {
		if (!uid) {
			return undefined;
		}

		let cancelado = false;

		cargarLogros(uid).then((datos) => {
			if (!cancelado) {
				setCargado({ clave, datos });
			}
		});

		return () => {
			cancelado = true;
		};
	}, [uid, clave]);

	const datosCrudos = cargado.clave === clave ? cargado.datos : null;
	const datos = useMemo(
		() => (datosCrudos ? combinarLogros(datosCrudos, racha) : null),
		[datosCrudos, racha],
	);

	if (!uid) {
		return { isLoading: false, datos: null, reintentar: () => {} };
	}

	return {
		isLoading: cargado.clave !== clave,
		datos,
		reintentar: () => setIntentoCarga((valor) => valor + 1),
	};
};

export default useLogros;
export { useLogros };
