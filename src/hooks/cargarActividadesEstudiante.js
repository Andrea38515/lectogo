import { getActividadesAsignadas } from "../repositories/actividadesRepository";
import { getLecturaById } from "../repositories/lecturasRepository";
import { getAllCategorias } from "../repositories/categoriasRepository";
import { getIntentosByEstudiante } from "../repositories/intentosRepository";

/*
 * Actividades asignadas al estudiante, enriquecidas con el título de la
 * lectura, la categoría y si ya fueron resueltas. La comparten la lista de
 * actividades y el dashboard para no duplicar consultas ni reglas.
 *
 * Devuelve también los intentos: el dashboard necesita sus porcentajes y
 * fechas, no solo saber qué actividades están completadas.
 */
export const cargarActividadesEstudiante = async (uid) => {
	// Categorías e intentos solo enriquecen la lista: si fallan no deben
	// tumbarla, así que se degradan a "General" / sin completadas. Pero quien
	// necesite cifras (el dashboard) debe saber que los intentos NO se leyeron,
	// para no presentar "0 completadas" como si fuera un dato real.
	let intentosDisponibles = true;

	const [asignadas, categorias, intentos] = await Promise.all([
		getActividadesAsignadas(uid),
		getAllCategorias().catch(() => []),
		getIntentosByEstudiante(uid).catch(() => {
			intentosDisponibles = false;
			return [];
		}),
	]);

	const nombresCategoria = Object.fromEntries(
		categorias.map((categoria) => [categoria.id, categoria.nombre]),
	);
	const completadas = new Set(intentos.map((intento) => intento.actividadId));

	// Varias actividades pueden compartir lectura: se pide una sola vez por id.
	// Si la lectura no es publicada las reglas la deniegan; eso no debe tumbar
	// la lista entera.
	const lecturaIds = [
		...new Set(asignadas.map((actividad) => actividad.lecturaId).filter(Boolean)),
	];
	const lecturas = new Map(
		await Promise.all(
			lecturaIds.map(async (id) => [
				id,
				await getLecturaById(id).catch(() => null),
			]),
		),
	);

	const actividades = asignadas.map((actividad) => {
		const lectura = lecturas.get(actividad.lecturaId);

		return {
			...actividad,
			titulo: lectura?.titulo || "Actividad",
			categoria: nombresCategoria[lectura?.categoriaId] || "General",
			completada: completadas.has(actividad.id),
		};
	});

	return { actividades, intentos, intentosDisponibles };
};
