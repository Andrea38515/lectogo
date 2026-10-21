// Textos legibles para el visor de auditoría. Sin imports a propósito: se puede
// probar con un script de node. Nunca se muestra JSON crudo ni correos.

const ETIQUETAS_ACCION = {
  "usuario.cambiar_rol": "Cambio de rol",
  "categoria.crear": "Categoría creada",
  "categoria.editar": "Categoría editada",
  "categoria.eliminar": "Categoría eliminada",
  "actividad.asignar": "Actividad asignada",
};

const esTexto = (valor) => typeof valor === "string" && valor.trim() !== "";

/** Etiqueta en español de una acción; las desconocidas se muestran tal cual. */
export const etiquetaAccion = (accion) => {
  if (!esTexto(accion)) return "Acción desconocida";

  return Object.hasOwn(ETIQUETAS_ACCION, accion)
    ? ETIQUETAS_ACCION[accion]
    : accion;
};

/** Versión corta de un uid, para cuando no se pudo resolver el nombre. */
export const abreviarUid = (uid) => {
  if (!esTexto(uid)) return "";

  const limpio = uid.trim();

  return limpio.length <= 8 ? limpio : `${limpio.slice(0, 6)}…`;
};

const comillas = (texto) => `«${texto}»`;

const detalleCambioRol = (detalle, objetivoNombre) => {
  const { rolAnterior, rolNuevo } = detalle;
  const cambio =
    esTexto(rolAnterior) && esTexto(rolNuevo)
      ? `${rolAnterior} → ${rolNuevo}`
      : esTexto(rolNuevo)
        ? `nuevo rol: ${rolNuevo}`
        : "";

  return [esTexto(objetivoNombre) ? objetivoNombre : "", cambio]
    .filter(Boolean)
    .join(": ");
};

const detalleCategoria = (accion, detalle) => {
  if (!esTexto(detalle.nombre)) return "";

  const partes = [comillas(detalle.nombre)];

  if (
    accion === "categoria.editar" &&
    esTexto(detalle.nombreAnterior) &&
    detalle.nombreAnterior !== detalle.nombre
  ) {
    partes.push(`(antes: ${comillas(detalle.nombreAnterior)})`);
  }

  if (
    accion === "categoria.editar" &&
    typeof detalle.descripcion === "string" &&
    typeof detalle.descripcionAnterior === "string" &&
    detalle.descripcion !== detalle.descripcionAnterior
  ) {
    partes.push("· descripción modificada");
  }

  return partes.join(" ");
};

const detalleAsignacion = (detalle) => {
  const cantidad = Number(detalle.cantidad);

  if (!Number.isFinite(cantidad) || cantidad < 0) return "";

  return cantidad === 1 ? "1 estudiante" : `${cantidad} estudiantes`;
};

/**
 * Resume en una línea el detalle de una entrada. Devuelve "" si no hay nada
 * útil que mostrar (la pantalla pone un guion).
 *
 * @param {string} accion
 * @param {object|null|undefined} detalle
 * @param {string} [objetivoNombre] nombre ya resuelto del usuario afectado
 * @returns {string}
 */
export const describirDetalle = (accion, detalle, objetivoNombre = "") => {
  const datos = detalle && typeof detalle === "object" ? detalle : {};

  if (accion === "usuario.cambiar_rol") {
    return detalleCambioRol(datos, objetivoNombre);
  }

  if (
    accion === "categoria.crear" ||
    accion === "categoria.editar" ||
    accion === "categoria.eliminar"
  ) {
    return detalleCategoria(accion, datos);
  }

  if (accion === "actividad.asignar") {
    return detalleAsignacion(datos);
  }

  return "";
};
