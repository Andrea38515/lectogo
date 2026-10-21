// Enmascara un correo para no proyectar datos personales por accidente.
// Sin imports a propósito: se puede probar con un script de node.

const MAX_ASTERISCOS = 6;

const asteriscos = (cantidad) => "*".repeat(Math.min(cantidad, MAX_ASTERISCOS));

/**
 * "ana.perez@example.com" -> "a******@example.com"
 *
 * Conserva el primer carácter de la parte local, reemplaza el resto por la
 * misma cantidad de "*" (con tope de 6, para no revelar el largo real) y deja
 * el dominio. Sin "@" se enmascara el texto completo con el mismo criterio.
 *
 * @param {unknown} correo
 * @returns {string} cadena vacía si no hay correo
 */
export const enmascararCorreo = (correo) => {
  if (typeof correo !== "string") return "";

  const texto = correo.trim();

  if (!texto) return "";

  const posicionArroba = texto.lastIndexOf("@");
  const local = posicionArroba === -1 ? texto : texto.slice(0, posicionArroba);
  const dominio = posicionArroba === -1 ? "" : texto.slice(posicionArroba);

  // Array.from respeta los caracteres fuera del plano básico (emojis, etc.).
  const caracteres = Array.from(local);

  if (caracteres.length === 0) return `*${dominio}`;

  const [primero, ...resto] = caracteres;

  return `${primero}${asteriscos(resto.length)}${dominio}`;
};
