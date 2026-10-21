// Traduce el error de una Cloud Function callable a un mensaje para mostrar.
// Sin imports a propósito: se puede probar con un script de node.

export const MENSAJE_ERROR_GENERICO =
  "No pudimos completar la acción. Revisá tu conexión y probá de nuevo.";

// Códigos con los que el servidor responde con un mensaje pensado para la
// persona usuaria (en español). Cualquier otro código es un fallo técnico.
const CODIGOS_CON_MENSAJE = new Set([
  "functions/unauthenticated",
  "functions/permission-denied",
  "functions/invalid-argument",
  "functions/failed-precondition",
  "functions/not-found",
  "functions/already-exists",
  "functions/unavailable",
]);

// El SDK de Firebase agrega " [<status HTTP>]" al final del mensaje.
const limpiarMensajeServidor = (mensaje) =>
  (typeof mensaje === "string" ? mensaje : "")
    .replace(/\s*\[\d{3}\]\s*$/, "")
    .trim();

/**
 * Los mensajes del servidor son frases en español (tienen espacios). Cuando la
 * función no está desplegada el SDK devuelve el código pelado, p. ej. "NOT_FOUND",
 * que no sirve para mostrar: en ese caso se usa el mensaje genérico.
 *
 * @param {unknown} error
 * @returns {string}
 */
export const mensajeErrorFuncion = (error) => {
  if (!CODIGOS_CON_MENSAJE.has(error?.code)) {
    return MENSAJE_ERROR_GENERICO;
  }

  const mensaje = limpiarMensajeServidor(error.message);

  return /\s/.test(mensaje) ? mensaje : MENSAJE_ERROR_GENERICO;
};
