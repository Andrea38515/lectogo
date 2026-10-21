// Validación pura del formulario de preguntas del docente. Sin imports a
// propósito: se puede probar con un script de node sin Firebase ni React.

export const TIPOS_PREGUNTA = ["seleccion_multiple", "verdadero_falso"];

export const ETIQUETA_TIPO_PREGUNTA = {
  seleccion_multiple: "Selección múltiple",
  verdadero_falso: "Verdadero o falso",
};

// Para verdadero_falso las opciones no se eligen: son siempre estas dos.
export const OPCIONES_VERDADERO_FALSO = ["Verdadero", "Falso"];

export const LIMITES_PREGUNTA = {
  enunciadoMin: 5,
  enunciadoMax: 500,
  opcionesMin: 2,
  opcionesMax: 4,
  opcionMax: 200,
  explicacionMax: 500,
};

const comoTexto = (valor) => (typeof valor === "string" ? valor.trim() : "");

// registrarIntento compara sin distinguir mayúsculas y recortando espacios:
// dos opciones que solo difieren en eso serían ambiguas al calificar.
const clave = (texto) => texto.trim().toLowerCase();

/**
 * Claves de error posibles: tipo, enunciado, opciones (mensaje general sobre
 * la cantidad), opcion-0 .. opcion-3 (una por opción), respuestaCorrecta y
 * explicacion.
 *
 * @param {{tipo?: string, enunciado?: string, opciones?: string[],
 *   respuestaCorrecta?: string, explicacion?: string}} valores
 * @returns {{ ok: boolean, errores: Record<string, string>, datos: {
 *   tipo: string, enunciado: string, opciones: string[],
 *   respuestaCorrecta: string, explicacion: string }}}
 */
export const validarPregunta = (valores) => {
  const entrada = valores ?? {};
  const {
    enunciadoMin,
    enunciadoMax,
    opcionesMin,
    opcionesMax,
    opcionMax,
    explicacionMax,
  } = LIMITES_PREGUNTA;

  const tipo = comoTexto(entrada.tipo);
  const esVerdaderoFalso = tipo === "verdadero_falso";

  const opciones = esVerdaderoFalso
    ? [...OPCIONES_VERDADERO_FALSO]
    : (Array.isArray(entrada.opciones) ? entrada.opciones : []).map(comoTexto);

  const datos = {
    tipo,
    enunciado: comoTexto(entrada.enunciado),
    opciones,
    respuestaCorrecta: comoTexto(entrada.respuestaCorrecta),
    explicacion: comoTexto(entrada.explicacion),
  };

  const errores = {};

  if (!TIPOS_PREGUNTA.includes(tipo)) {
    errores.tipo = "Elegí un tipo de pregunta.";
  }

  if (
    datos.enunciado.length < enunciadoMin ||
    datos.enunciado.length > enunciadoMax
  ) {
    errores.enunciado = `El enunciado tiene que tener entre ${enunciadoMin} y ${enunciadoMax} caracteres.`;
  }

  if (tipo === "seleccion_multiple") {
    if (opciones.length < opcionesMin || opciones.length > opcionesMax) {
      errores.opciones = `Tiene que haber entre ${opcionesMin} y ${opcionesMax} opciones.`;
    }

    const vistas = new Set();

    opciones.forEach((opcion, indice) => {
      if (opcion === "") {
        errores[`opcion-${indice}`] = "Completá esta opción o quitala.";
      } else if (opcion.length > opcionMax) {
        errores[`opcion-${indice}`] = `La opción no puede superar los ${opcionMax} caracteres.`;
      } else if (vistas.has(clave(opcion))) {
        errores[`opcion-${indice}`] =
          "Esta opción está repetida: cada opción tiene que ser distinta.";
      }

      if (opcion !== "") {
        vistas.add(clave(opcion));
      }
    });
  }

  if (TIPOS_PREGUNTA.includes(tipo)) {
    if (datos.respuestaCorrecta === "") {
      errores.respuestaCorrecta = "Elegí cuál es la respuesta correcta.";
    } else if (!opciones.includes(datos.respuestaCorrecta)) {
      errores.respuestaCorrecta =
        "La respuesta correcta tiene que ser una de las opciones.";
    }
  }

  if (datos.explicacion.length > explicacionMax) {
    errores.explicacion = `La explicación no puede superar los ${explicacionMax} caracteres.`;
  }

  return { ok: Object.keys(errores).length === 0, errores, datos };
};
