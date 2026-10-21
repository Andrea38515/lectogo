// Validación pura del formulario "Asignar actividad" del docente. Sin imports a
// propósito: se puede probar con un script de node sin Firebase ni React.
// Refleja los límites de la Cloud Function asignarActividad; el servidor sigue
// siendo la autoridad (por ejemplo, decide qué correos son estudiantes).

export const LIMITES_ASIGNACION = {
  maxCorreos: 100,
  // Mismo tope que el servidor: 2 años (730 días) de anticipación.
  maxDiasAnticipacion: 730,
};

const MS_POR_DIA = 24 * 60 * 60 * 1000;

// Forma que entrega <input type="datetime-local">: hora local, sin zona.
const DATETIME_LOCAL = /^(\d{4})-(\d{2})-(\d{2})T\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/;

// Misma comprobación laxa de forma que usa el servidor: sirve para avisar, no
// para bloquear.
const CORREO_PLAUSIBLE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const dosDigitos = (numero) => String(numero).padStart(2, "0");

/**
 * Separa el texto pegado por el docente en correos.
 *
 * Divide por comas, punto y coma, espacios y saltos de línea; recorta, pasa a
 * minúsculas y descarta vacíos y repetidos (queda la primera aparición, en el
 * orden original).
 *
 * @param {string} texto
 * @returns {{ correos: string[], duplicados: number }} correos únicos y cuántos
 *   se descartaron por estar repetidos
 */
export const parsearCorreos = (texto) => {
  if (typeof texto !== "string") {
    return { correos: [], duplicados: 0 };
  }

  const vistos = new Set();
  let duplicados = 0;

  texto
    .split(/[\s,;]+/)
    .map((pieza) => pieza.trim().toLowerCase())
    .filter(Boolean)
    .forEach((correo) => {
      if (vistos.has(correo)) {
        duplicados += 1;
      } else {
        vistos.add(correo);
      }
    });

  return { correos: [...vistos], duplicados };
};

/**
 * Correos que no tienen forma de correo. Es un aviso NO bloqueante: el envío
 * sigue y el servidor los devuelve en noAsignados.
 *
 * @param {string[]} correos
 * @returns {string[]}
 */
export const correosSinFormatoValido = (correos) =>
  (Array.isArray(correos) ? correos : []).filter(
    (correo) => correo.length > 254 || !CORREO_PLAUSIBLE.test(correo),
  );

/**
 * Texto del aviso no bloqueante sobre correos con forma dudosa ("" si no hay).
 *
 * @param {string[]} correos
 * @returns {string}
 */
export const avisoCorreosInvalidos = (correos) => {
  const cantidad = correosSinFormatoValido(correos).length;

  if (cantidad === 0) return "";

  return cantidad === 1
    ? "1 no parece un correo válido."
    : `${cantidad} no parecen correos válidos.`;
};

/**
 * Date -> "YYYY-MM-DDTHH:mm" en hora local, el formato de datetime-local.
 *
 * @param {Date} fecha
 * @returns {string}
 */
export const aValorDatetimeLocal = (fecha) =>
  `${fecha.getFullYear()}-${dosDigitos(fecha.getMonth() + 1)}-${dosDigitos(fecha.getDate())}` +
  `T${dosDigitos(fecha.getHours())}:${dosDigitos(fecha.getMinutes())}`;

/**
 * Fecha límite sugerida: dentro de 7 días a las 23:59 (hora local).
 *
 * @param {Date} ahora
 * @returns {string} valor para datetime-local
 */
export const fechaLimiteSugerida = (ahora) => {
  const fecha = new Date(ahora.getTime());

  fecha.setDate(fecha.getDate() + 7);
  fecha.setHours(23, 59, 0, 0);

  return aValorDatetimeLocal(fecha);
};

// Convierte el valor de datetime-local en Date, o null si no es una fecha real
// (formato roto o un día que no existe, como 31 de febrero, que Date correría
// en silencio al mes siguiente).
const parsearDatetimeLocal = (valor) => {
  const partes = DATETIME_LOCAL.exec(valor);

  if (!partes) return null;

  const [, anio, mes, dia] = partes.map(Number);
  const fecha = new Date(valor);

  if (Number.isNaN(fecha.getTime())) return null;

  if (
    fecha.getFullYear() !== anio ||
    fecha.getMonth() !== mes - 1 ||
    fecha.getDate() !== dia
  ) {
    return null;
  }

  return fecha;
};

/**
 * @param {{ lecturaId?: string, correosTexto?: string, fechaLimite?: string }}
 *   valores fechaLimite es el valor crudo de datetime-local
 * @param {Date} [ahora] instante de referencia (parámetro para poder probarlo)
 * @returns {{ ok: boolean, errores: Record<string, string>, datos: {
 *   lecturaId: string, correos: string[], fechaLimite: string }}} datos.fechaLimite
 *   es un ISO-8601 con zona (UTC, "Z") listo para la Cloud Function; solo es
 *   fiable cuando ok es true
 */
export const validarAsignacion = (valores, ahora = new Date()) => {
  const entrada = valores ?? {};
  const { maxCorreos, maxDiasAnticipacion } = LIMITES_ASIGNACION;

  const lecturaId =
    typeof entrada.lecturaId === "string" ? entrada.lecturaId.trim() : "";
  const { correos } = parsearCorreos(entrada.correosTexto);
  const fechaTexto =
    typeof entrada.fechaLimite === "string" ? entrada.fechaLimite.trim() : "";

  const errores = {};

  if (!lecturaId) {
    errores.lecturaId = "Elegí la lectura que querés asignar.";
  }

  if (correos.length === 0) {
    errores.correosTexto =
      "No detectamos ningún correo. Pegá al menos uno.";
  } else if (correos.length > maxCorreos) {
    errores.correosTexto = `Detectamos ${correos.length} correos y el máximo es ${maxCorreos} por actividad.`;
  }

  let fechaIso = "";

  if (!fechaTexto) {
    errores.fechaLimite = "Elegí la fecha límite.";
  } else {
    const fecha = parsearDatetimeLocal(fechaTexto);
    const referencia = ahora instanceof Date ? ahora.getTime() : Number(ahora);

    if (!fecha) {
      errores.fechaLimite = "La fecha límite no es válida.";
    } else if (fecha.getTime() <= referencia) {
      errores.fechaLimite =
        "La fecha límite tiene que ser posterior a este momento.";
    } else if (fecha.getTime() > referencia + maxDiasAnticipacion * MS_POR_DIA) {
      errores.fechaLimite = `La fecha límite no puede superar los ${maxDiasAnticipacion} días (2 años) desde hoy.`;
    } else {
      // El servidor exige zona horaria: datetime-local no la trae, así que se
      // interpreta como hora local y se envía como instante UTC.
      fechaIso = fecha.toISOString();
    }
  }

  return {
    ok: Object.keys(errores).length === 0,
    errores,
    datos: { lecturaId, correos, fechaLimite: fechaIso },
  };
};
