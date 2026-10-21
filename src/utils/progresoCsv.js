// Módulo puro (sin imports) para exportar el progreso de una actividad a CSV.
// Pensado para abrirse en Excel con configuración regional en español: separador
// ";", saltos CRLF y BOM UTF-8 para que las tildes y la ñ se vean bien.

const SEPARADOR = ";";
const SALTO_DE_LINEA = "\r\n";
const BOM = "﻿";

const ENCABEZADOS = [
  "Nombre",
  "Correo",
  "Estado",
  "Aciertos (%)",
  "XP",
  "Resuelta el",
];

// Una celda que empieza con estos caracteres puede ser interpretada como fórmula
// por Excel / Sheets / LibreOffice. Nombres y correos vienen de perfiles que
// escribe el usuario, así que se neutralizan con un apóstrofe inicial.
const INICIOS_DE_FORMULA = new Set(["=", "+", "-", "@", "\t", "\r"]);

const escaparCelda = (texto) => {
  const seguro = INICIOS_DE_FORMULA.has(texto.charAt(0)) ? `'${texto}` : texto;

  // RFC 4180: se entrecomilla si hay separador, comillas o saltos de línea.
  if (/[;"\r\n]/.test(seguro)) {
    return `"${seguro.replace(/"/g, '""')}"`;
  }

  return seguro;
};

// Los números van como los espera Excel en español (coma decimal) y sin la
// protección anti-fórmula: un número negativo no es una inyección.
const celdaNumerica = (numero) =>
  String(numero).replace(".", ",");

const aCelda = (valor) => {
  if (valor === null || valor === undefined) {
    return "";
  }

  if (typeof valor === "number") {
    return Number.isFinite(valor) ? celdaNumerica(valor) : "";
  }

  return escaparCelda(String(valor));
};

/**
 * Construye el contenido del CSV de progreso.
 *
 * @param {Array<{ nombre: string, correo: string, estado: 'Resolvió'|'Pendiente',
 *   porcentajeAciertos: number|null, xpGanado: number|null,
 *   resueltoEn: string|null }>} filas
 * @returns {string} BOM + encabezado + una línea por fila, separadas por CRLF
 */
export const construirCsv = (filas) => {
  const lineas = [ENCABEZADOS.join(SEPARADOR)];

  for (const fila of filas ?? []) {
    lineas.push(
      [
        fila.nombre,
        fila.correo,
        fila.estado,
        fila.porcentajeAciertos,
        fila.xpGanado,
        fila.resueltoEn,
      ]
        .map(aCelda)
        .join(SEPARADOR),
    );
  }

  return BOM + lineas.join(SALTO_DE_LINEA) + SALTO_DE_LINEA;
};

const MAX_LARGO_SLUG = 60;

const dosDigitos = (numero) => String(numero).padStart(2, "0");

/**
 * Nombre de archivo seguro: progreso-<titulo-en-slug>-AAAA-MM-DD.csv
 *
 * @param {string|null|undefined} tituloLectura
 * @param {Date|number} [ahora] fecha de la descarga (hora local)
 * @returns {string}
 */
export const nombreArchivoCsv = (tituloLectura, ahora = new Date()) => {
  const slug = String(tituloLectura ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_LARGO_SLUG)
    .replace(/-+$/g, "");

  const fecha = ahora instanceof Date ? ahora : new Date(ahora);
  const dia = Number.isNaN(fecha.getTime())
    ? "sin-fecha"
    : `${fecha.getFullYear()}-${dosDigitos(fecha.getMonth() + 1)}-${dosDigitos(fecha.getDate())}`;

  return `progreso-${slug || "actividad"}-${dia}.csv`;
};

/**
 * Fecha y hora local sin ambigüedad para la columna "Resuelta el":
 * AAAA-MM-DD HH:mm. Devuelve null si el valor no es una fecha válida.
 *
 * @param {number|Date|null|undefined} valor milisegundos o Date
 * @returns {string|null}
 */
export const formatearFechaCsv = (valor) => {
  if (valor === null || valor === undefined) {
    return null;
  }

  const fecha = valor instanceof Date ? valor : new Date(valor);

  if (Number.isNaN(fecha.getTime())) {
    return null;
  }

  return `${fecha.getFullYear()}-${dosDigitos(fecha.getMonth() + 1)}-${dosDigitos(fecha.getDate())} ${dosDigitos(fecha.getHours())}:${dosDigitos(fecha.getMinutes())}`;
};
