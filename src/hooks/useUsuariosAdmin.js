import { useCallback, useEffect, useState } from "react";

import { getUsuarios } from "../repositories/adminRepository";

export const useUsuariosAdmin = () => {
  const [intento, setIntento] = useState(0);
  const [resultado, setResultado] = useState(null);

  // Cada resultado lleva la clave de la petición que lo originó: "cargando"
  // se deriva de que la clave no coincida, sin setState síncrono en el effect.
  const clave = String(intento);

  useEffect(() => {
    let cancelado = false;

    const cargar = async () => {
      try {
        const usuarios = await getUsuarios();

        if (cancelado) return;

        setResultado({ clave, usuarios, error: false });
      } catch (error) {
        if (cancelado) return;

        console.error("Error cargando los usuarios:", error);
        // Si ya había una lista se conserva: un fallo al recargar no la borra.
        setResultado((anterior) => ({
          clave,
          usuarios: anterior?.usuarios ?? [],
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
    usuarios: resultado?.usuarios ?? [],
    cargando,
    error: !cargando && Boolean(resultado?.error),
    recargar,
  };
};

export default useUsuariosAdmin;
