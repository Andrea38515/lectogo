import { useCallback, useEffect, useMemo, useState } from "react";

import { getLecturas } from "../repositories/lecturasRepository";
import { getAllCategorias } from "../repositories/categoriasRepository";

const normalizeText = (text = "") => {
	return String(text)
		.normalize("NFD")
		.replace(/[̀-ͯ]/g, "")
		.toLowerCase()
		.trim();
};

export const useLibrary = () => {
	const [lecturas, setLecturas] = useState([]);
	const [categoriasMap, setCategoriasMap] = useState({});
	const [isLoading, setIsLoading] = useState(true);
	const [isError, setIsError] = useState(false);
	const [search, setSearch] = useState("");
	const [category, setCategory] = useState("Todos");

	const fetchLibrary = useCallback(async () => {
		setIsLoading(true);
		setIsError(false);

		try {
			const [lecturasData, categoriasData] = await Promise.all([
				getLecturas({}),
				getAllCategorias(),
			]);

			setCategoriasMap(
				Object.fromEntries(categoriasData.map((c) => [c.id, c.nombre])),
			);
			setLecturas(lecturasData);
		} catch {
			setIsError(true);
		} finally {
			setIsLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchLibrary();
	}, [fetchLibrary]);

	// Solo lecturas publicadas: borradores no son biblioteca pública/estudiante.
	const resources = useMemo(() => {
		return lecturas
			.filter((lectura) => lectura.estado === "publicada")
			.map((lectura) => ({
				id: lectura.id,
				title: lectura.titulo,
				description: (lectura.contenido || "").slice(0, 140),
				category: categoriasMap[lectura.categoriaId] || "General",
				author: "LectoGo",
				icon: "📖",
				type: lectura.nivelDificultad || "Lectura",
				featured: false,
			}));
	}, [lecturas, categoriasMap]);

	const categories = useMemo(() => {
		const unique = [
			...new Set(resources.map((resource) => resource.category).filter(Boolean)),
		];

		return ["Todos", ...unique];
	}, [resources]);

	const filteredResources = useMemo(() => {
		const searchText = normalizeText(search);

		return resources.filter((resource) => {
			const matchesCategory =
				category === "Todos" || resource.category === category;

			const matchesSearch =
				!searchText ||
				normalizeText(resource.title).includes(searchText) ||
				normalizeText(resource.description).includes(searchText) ||
				normalizeText(resource.author).includes(searchText) ||
				normalizeText(resource.category).includes(searchText);

			return matchesCategory && matchesSearch;
		});
	}, [resources, search, category]);

	const featuredResources = useMemo(
		() => resources.filter((resource) => resource.featured),
		[resources],
	);

	const clearFilters = () => {
		setSearch("");
		setCategory("Todos");
	};

	return {
		resources,
		filteredResources,
		featuredResources,
		categories,

		isLoading,
		isFetching: isLoading,
		isError,
		error: isError ? new Error("No se pudo cargar la biblioteca") : null,
		refetch: fetchLibrary,

		search,
		setSearch,
		category,
		setCategory,
		clearFilters,
	};
};

export default useLibrary;
