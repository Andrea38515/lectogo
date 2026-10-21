import { useCallback, useEffect, useState } from "react";

import { getAllCategorias } from "../repositories/categoriasRepository";

const comparadorNombres = new Intl.Collator("es", { sensitivity: "base" });

export const useCategoriasAdmin = () => {
  const [intento, setIntento] = useState(0);
  const [resultado, setResultado] = useState(null);

  // Cada resultado lleva la clave de la petición que lo originó: "cargando"
  // se deriva de que la clave no coincida, sin setState síncrono en el effect.
  const clave = String(intento);

  useEffect(() => {
    let cancelado = false;

    const cargar = async () => {
      try {
        const categorias = await getAllCategorias();

        if (cancelado) return;

        setResultado({
          clave,
          categorias: [...categorias].sort((a, b) =>
            comparadorNombres.compare(a.nombre, b.nombre),
          ),
          error: false,
        });
      } catch (error) {
        if (cancelado) return;

        console.error("Error cargando las categorías:", error);
        // Si ya había una lista se conserva: un fallo al recargar no la borra.
        setResultado((anterior) => ({
          clave,
          categorias: anterior?.categorias ?? [],
          error: true,
        }));
      }
    };

    cargar();

    return () => {
      cancelado = true;
    };
  }, [clave]);

  const recargar = useCallback(() => {
    setIntento((actual) => actual + 1);
  }, []);

  const cargando = resultado?.clave !== clave;

  return {
    categorias: resultado?.categorias ?? [],
    cargando,
    error: !cargando && Boolean(resultado?.error),
    recargar,
  };
};

export default useCategoriasAdmin;
