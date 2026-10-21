// Validación pura del formulario de lecturas del docente. Sin imports a
// propósito: se puede probar con un script de node sin Firebase ni React.

export const NIVELES_DIFICULTAD = ["Fácil", "Medio", "Difícil"];
export const ESTADOS_LECTURA = ["borrador", "publicada", "archivada"];

export const LIMITES_LECTURA = {
  tituloMin: 3,
  tituloMax: 120,
  contenidoMin: 50,
  contenidoMax: 20000,
};

const comoTexto = (valor) => (typeof valor === "string" ? valor.trim() : "");

/**
 * @param {{titulo?: string, categoriaId?: string, nivelDificultad?: string,
 *   contenido?: string, estado?: string}} valores
 * @param {Iterable<string>} categoriasIds ids de categorías que existen
 * @returns {{ ok: boolean, errores: Record<string, string>, datos: {
 *   titulo: string, categoriaId: string, nivelDificultad: string,
 *   contenido: string, estado: string }}}
 */
export const validarLectura = (valores, categoriasIds) => {
  const entrada = valores ?? {};
  const idsValidos = Array.from(categoriasIds ?? []);

  const datos = {
    titulo: comoTexto(entrada.titulo),
    categoriaId: comoTexto(entrada.categoriaId),
    nivelDificultad: comoTexto(entrada.nivelDificultad),
    contenido: comoTexto(entrada.contenido),
    estado: comoTexto(entrada.estado),
  };

  const errores = {};
  const { tituloMin, tituloMax, contenidoMin, contenidoMax } = LIMITES_LECTURA;

  if (datos.titulo.length < tituloMin || datos.titulo.length > tituloMax) {
    errores.titulo = `El título tiene que tener entre ${tituloMin} y ${tituloMax} caracteres.`;
  }

  if (!datos.categoriaId || !idsValidos.includes(datos.categoriaId)) {
    errores.categoriaId = "Elegí una categoría de la lista.";
  }

  if (!NIVELES_DIFICULTAD.includes(datos.nivelDificultad)) {
    errores.nivelDificultad = "Elegí un nivel de dificultad.";
  }

  if (datos.contenido.length < contenidoMin) {
    errores.contenido = `El texto tiene que tener al menos ${contenidoMin} caracteres.`;
  } else if (datos.contenido.length > contenidoMax) {
    errores.contenido = `El texto no puede superar los ${contenidoMax} caracteres.`;
  }

  if (!ESTADOS_LECTURA.includes(datos.estado)) {
    errores.estado = "Elegí un estado para la lectura.";
  }

  return { ok: Object.keys(errores).length === 0, errores, datos };
};
