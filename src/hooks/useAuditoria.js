import { useCallback, useEffect, useState } from "react";

import { getAuditoria, getUsuarios } from "../repositories/adminRepository";

const MAX_ENTRADAS = 50;

const SIN_NOMBRES = new Map();

export const useAuditoria = () => {
  const [intento, setIntento] = useState(0);
  const [resultado, setResultado] = useState(null);

  // Cada resultado lleva la clave de la petición que lo originó: "cargando"
  // se deriva de que la clave no coincida, sin setState síncrono en el effect.
  const clave = String(intento);

  useEffect(() => {
    let cancelado = false;

    const cargar = async () => {
      try {
        const [entradas, usuarios] = await Promise.all([
          getAuditoria(MAX_ENTRADAS),
          // Los nombres solo adornan la tabla: si esta lectura falla se muestran
          // los uids abreviados en vez de romper toda la pantalla.
          getUsuarios().catch((error) => {
            console.error("Error resolviendo nombres de auditoría:", error);
            return [];
          }),
        ]);

        if (cancelado) return;

        // Solo uid -> nombre: los correos no salen de este hook.
        const nombres = new Map(
          usuarios
            .filter((usuario) => usuario.nombre)
            .map((usuario) => [usuario.uid, usuario.nombre]),
        );

        setResultado({ clave, entradas, nombres, error: false });
      } catch (error) {
        if (cancelado) return;

        console.error("Error cargando la auditoría:", error);
        // Si ya había datos se conservan: un fallo al recargar no los borra.
        setResultado((anterior) => ({
          clave,
          entradas: anterior?.entradas ?? [],
          nombres: anterior?.nombres ?? SIN_NOMBRES,
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
    entradas: resultado?.entradas ?? [],
    nombres: resultado?.nombres ?? SIN_NOMBRES,
    cargando,
    error: !cargando && Boolean(resultado?.error),
    recargar,
  };
};

export default useAuditoria;
