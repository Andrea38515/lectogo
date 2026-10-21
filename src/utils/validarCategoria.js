// Validación pura del formulario de categorías del administrador. Sin imports a
// propósito: se puede probar con un script de node sin Firebase ni React.
// Los límites son los mismos que aplica la Cloud Function gestionarCategoria.

export const LIMITES_CATEGORIA = {
  nombreMin: 2,
  nombreMax: 60,
  descripcionMax: 200,
};

const comoTexto = (valor) => (typeof valor === "string" ? valor.trim() : "");

/**
 * @param {{nombre?: string, descripcion?: string}} valores
 * @returns {{ ok: boolean, errores: Record<string, string>,
 *   datos: { nombre: string, descripcion: string } }}
 */
export const validarCategoria = (valores) => {
  const entrada = valores ?? {};

  const datos = {
    nombre: comoTexto(entrada.nombre),
    descripcion: comoTexto(entrada.descripcion),
  };

  const errores = {};
  const { nombreMin, nombreMax, descripcionMax } = LIMITES_CATEGORIA;

  if (datos.nombre.length < nombreMin || datos.nombre.length > nombreMax) {
    errores.nombre = `El nombre tiene que tener entre ${nombreMin} y ${nombreMax} caracteres.`;
  }

  if (datos.descripcion.length > descripcionMax) {
    errores.descripcion = `La descripción no puede superar los ${descripcionMax} caracteres.`;
  }

  return { ok: Object.keys(errores).length === 0, errores, datos };
};
