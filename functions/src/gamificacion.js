// functions/src/gamificacion.js
//
// Reglas de gamificación (XP, nivel, racha y logros) como funciones PURAS:
// no importan Firestore ni leen el reloj. Reciben datos ya leídos y
// devuelven el resultado, así registrarIntento puede llamarlas dentro de la
// transacción (que Firestore puede reejecutar) y los tests no necesitan
// ningún doble. Ninguna lanza ante datos corruptos: el elemento malo se
// ignora o se reemplaza por un valor seguro, porque un dato mal sembrado no
// debe impedir que el estudiante registre su intento.

// Los días de la racha se cuentan con el calendario de Colombia; con UTC un
// estudiante que lee a las 8 p. m. caería en el día siguiente.
const ZONA_HORARIA = "America/Bogota";

// Valores del DDS. Se usan si config_negocio/gamificacion no está sembrada
// o es inválida, para no bloquear los intentos por un seed pendiente.
const CONFIG_POR_DEFECTO = Object.freeze({
  xpPorRespuestaCorrecta: 10,
  xpBonoActividadCompleta: 20,
});

const esNumeroNoNegativo = (valor) =>
  typeof valor === "number" && Number.isFinite(valor) && valor >= 0;

const esObjeto = (valor) => valor !== null && typeof valor === "object";

/*
 * ============================================================
 * XP
 * ============================================================
 */

/**
 * Indica si el documento trae los dos campos con valores usables. Sirve
 * para que quien llama decida si avisar de que se usan los valores por
 * defecto; normalizarConfigXp nunca falla aunque devuelva false.
 */
const esConfigXpValida = (doc) =>
  esObjeto(doc) &&
  esNumeroNoNegativo(doc.xpPorRespuestaCorrecta) &&
  esNumeroNoNegativo(doc.xpBonoActividadCompleta);

/**
 * Devuelve siempre una configuración completa: cada campo inválido o
 * ausente se reemplaza por el del DDS (así un solo campo roto no descarta
 * el otro).
 */
const normalizarConfigXp = (doc) => {
  const origen = esObjeto(doc) ? doc : {};

  return {
    xpPorRespuestaCorrecta: esNumeroNoNegativo(origen.xpPorRespuestaCorrecta)
      ? origen.xpPorRespuestaCorrecta
      : CONFIG_POR_DEFECTO.xpPorRespuestaCorrecta,
    xpBonoActividadCompleta: esNumeroNoNegativo(origen.xpBonoActividadCompleta)
      ? origen.xpBonoActividadCompleta
      : CONFIG_POR_DEFECTO.xpBonoActividadCompleta,
  };
};

/**
 * XP de un intento: lo configurado por cada respuesta correcta más el bono
 * sólo cuando la actividad se completa al 100 %. Se vuelve a normalizar la
 * config por si llega sin pasar por normalizarConfigXp.
 */
const calcularXp = (config, respuestasCorrectas, porcentajeAciertos) => {
  const { xpPorRespuestaCorrecta, xpBonoActividadCompleta } =
    normalizarConfigXp(config);

  const correctas = esNumeroNoNegativo(respuestasCorrectas)
    ? respuestasCorrectas
    : 0;

  // Siempre entero: así usuarios.xp y ranking.xp (que se trunca a entero)
  // no pueden diferir aunque un administrador configure un XP fraccionario.
  return Math.round(
    correctas * xpPorRespuestaCorrecta +
      (porcentajeAciertos === 100 ? xpBonoActividadCompleta : 0)
  );
};

/*
 * ============================================================
 * NIVELES
 * ============================================================
 */

// Number(null), Number(""), Number(false) y Number([]) dan 0 y Number(true)
// da 1, así que un documento roto como { nivel: 9, xpMinimo: "" } pasaría por
// un nivel legítimo y subiría a todos al nivel 9. Por eso se valida el TIPO
// antes de convertir: sólo números, o cadenas decimales simples ("100",
// "250.5") que sí pueden venir de una edición manual en la consola.
const aNumero = (valor) => {
  if (typeof valor === "number") return valor;
  if (typeof valor === "string" && /^\d+(\.\d+)?$/.test(valor)) {
    return Number(valor);
  }
  return NaN;
};

/**
 * Deja sólo los umbrales usables, ordenados por xpMinimo. Aplica las mismas
 * condiciones que el frontend (src/repositories/nivelesRepository.js), pero
 * más estrictas con el tipo (ver aNumero): un documento que el frontend
 * aceptara por la coerción de Number() aquí se descarta.
 */
const normalizarNiveles = (docs) => {
  if (!Array.isArray(docs)) return [];

  return docs
    .filter(esObjeto)
    .map((data) => ({
      nivel: aNumero(data.nivel),
      xpMinimo: aNumero(data.xpMinimo),
    }))
    .filter(
      (item) =>
        Number.isInteger(item.nivel) &&
        item.nivel > 0 &&
        Number.isFinite(item.xpMinimo) &&
        item.xpMinimo >= 0
    )
    .sort((a, b) => a.xpMinimo - b.xpMinimo || a.nivel - b.nivel);
};

/**
 * Nivel correspondiente al XP total: el mayor `nivel` cuyo xpMinimo ya se
 * alcanzó. Sin tabla utilizable (o sin umbral alcanzado) se conserva el
 * nivel actual, o 1 si éste tampoco es válido: nunca se inventa un nivel.
 */
const calcularNivel = (niveles, xp, nivelActual) => {
  const base =
    Number.isInteger(nivelActual) && nivelActual >= 1 ? nivelActual : 1;

  if (!Array.isArray(niveles) || niveles.length === 0) return base;
  if (typeof xp !== "number" || !Number.isFinite(xp)) return base;

  let resultado = null;

  for (const { nivel, xpMinimo } of niveles) {
    if (xpMinimo <= xp && (resultado === null || nivel > resultado)) {
      resultado = nivel;
    }
  }

  return resultado === null ? base : resultado;
};

/*
 * ============================================================
 * RACHA
 * ============================================================
 */

// Intl.DateTimeFormat es caro de construir; uno por zona horaria basta.
const formateadores = new Map();

const obtenerFormateador = (timeZone) => {
  if (!formateadores.has(timeZone)) {
    formateadores.set(
      timeZone,
      new Intl.DateTimeFormat("en-CA", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      })
    );
  }

  return formateadores.get(timeZone);
};

/**
 * Fecha calendario (YYYY-MM-DD) de un instante en la zona dada. Es lo que
 * permite comparar "el mismo día" sin depender de la zona del servidor.
 * Devuelve null si la fecha no es válida.
 */
const claveDeDia = (fecha, timeZone = ZONA_HORARIA) => {
  if (!(fecha instanceof Date) || Number.isNaN(fecha.getTime())) return null;

  const partes = {};
  for (const { type, value } of obtenerFormateador(timeZone).formatToParts(fecha)) {
    partes[type] = value;
  }

  return `${partes.year}-${partes.month}-${partes.day}`;
};

/**
 * Claves de hoy y de ayer en la zona dada. "Ayer" se calcula sobre la
 * fecha calendario (en UTC, que no tiene saltos de horario) y no restando
 * 24 h al instante, para no fallar en días de cambio de hora.
 */
const clavesDeDia = (fecha, timeZone = ZONA_HORARIA) => {
  const hoy = claveDeDia(fecha, timeZone);
  if (hoy === null) return { hoy: null, ayer: null };

  const [anio, mes, dia] = hoy.split("-").map(Number);
  const ayer = new Date(Date.UTC(anio, mes - 1, dia - 1))
    .toISOString()
    .slice(0, 10);

  return { hoy, ayer };
};

// Acepta un Timestamp de Firestore (toDate) o un Date; cualquier otra cosa,
// o una fecha ilegible, cuenta como "sin actividad previa".
const aFecha = (valor) => {
  try {
    const fecha =
      valor instanceof Date
        ? valor
        : esObjeto(valor) && typeof valor.toDate === "function"
          ? valor.toDate()
          : null;

    return fecha instanceof Date && !Number.isNaN(fecha.getTime())
      ? fecha
      : null;
  } catch {
    return null;
  }
};

/**
 * Racha tras una actividad hecha en `ahora`:
 *  - mismo día que la última actividad: no cambia (mínimo 1);
 *  - día calendario siguiente: suma 1;
 *  - cualquier otro caso (primera vez, hueco, fecha ilegible): 1.
 */
const calcularRacha = (
  rachaActual,
  ultimaActividadEn,
  ahora,
  timeZone = ZONA_HORARIA
) => {
  const base =
    Number.isInteger(rachaActual) && rachaActual > 0 ? rachaActual : 0;

  const { hoy, ayer } = clavesDeDia(ahora, timeZone);
  const ultima = aFecha(ultimaActividadEn);

  if (hoy === null || ultima === null) return 1;

  const ultimo = claveDeDia(ultima, timeZone);

  if (ultimo === hoy) return Math.max(base, 1);
  if (ultimo === ayer) return base + 1;

  return 1;
};

/*
 * ============================================================
 * LOGROS
 * ============================================================
 */

// Los datos sembrados a mano llegan con "desempeño", "desempeno", mayúsculas
// o la ñ descompuesta (n + tilde combinada): se compara sin acentos ni
// mayúsculas para que una ñ mal escrita no deje un logro muerto.
const normalizarTipo = (tipo) =>
  typeof tipo === "string"
    ? tipo
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
    : "";

// El id forma parte de logros_usuario/{estudianteId}_{logroId}; con "/" se
// interpretaría como una ruta anidada.
const esIdDeLogroValido = (id) =>
  typeof id === "string" && id.trim() !== "" && !id.includes("/");

const cumpleCriterio = (tipo, valor, contexto) => {
  const comparar = (actual) =>
    typeof actual === "number" && Number.isFinite(actual) && actual >= valor;

  switch (normalizarTipo(tipo)) {
    case "actividades":
      return comparar(contexto.actividadesCompletadas);
    case "desempeno":
      return comparar(contexto.porcentajeAciertos);
    case "racha":
      return comparar(contexto.racha);
    default:
      // Tipo desconocido: se omite, no se lanza.
      return false;
  }
};

/**
 * Logros del catálogo que el estudiante gana ahora: los que cumplen su
 * criterio con el contexto del intento y todavía no tiene. `contexto` es
 * { actividadesCompletadas, porcentajeAciertos, racha }, con la actividad
 * actual ya contada y la racha ya actualizada.
 *
 * Devuelve la forma que se envía al cliente: { id, nombre, descripcion,
 * iconoUrl|null }.
 */
const evaluarLogros = (catalogo, yaObtenidos, contexto) => {
  if (!Array.isArray(catalogo)) return [];

  const obtenidos = new Set(
    Array.isArray(yaObtenidos) || yaObtenidos instanceof Set ? yaObtenidos : []
  );
  const ctx = esObjeto(contexto) ? contexto : {};
  const otorgados = new Set();
  const nuevos = [];

  for (const logro of catalogo) {
    if (!esObjeto(logro) || !esIdDeLogroValido(logro.id)) continue;
    if (obtenidos.has(logro.id) || otorgados.has(logro.id)) continue;
    if (!esNumeroNoNegativo(logro.criterioValor)) continue;
    if (!cumpleCriterio(logro.criterioTipo, logro.criterioValor, ctx)) continue;

    otorgados.add(logro.id);
    nuevos.push({
      id: logro.id,
      nombre: typeof logro.nombre === "string" ? logro.nombre : "",
      descripcion:
        typeof logro.descripcion === "string" ? logro.descripcion : "",
      iconoUrl:
        typeof logro.iconoUrl === "string" && logro.iconoUrl.trim() !== ""
          ? logro.iconoUrl
          : null,
    });
  }

  return nuevos;
};

/*
 * ============================================================
 * RANKING
 * ============================================================
 */

/**
 * Alias público del estudiante en el ranking, que cualquier usuario con
 * sesión puede leer. Siempre es neutro y determinista, derivado sólo del
 * uid: "Lector " + sus últimos 4 caracteres en mayúsculas ("Lector 5R6Z").
 * Mismo uid, mismo alias; jamás se deriva del nombre ni del correo.
 *
 * Es aproximado a propósito: dos uids que terminen igual comparten alias,
 * así que el frontend debe usar estudianteId como clave, no el alias.
 *
 * NO se usa ningún alias guardado en el perfil: hoy ese campo no existe y,
 * si algún día un estudiante puede elegir el suyo, tendrá que validarse en
 * el servidor (longitud, caracteres, contenido ofensivo, datos personales)
 * ANTES de guardarlo o mostrarlo, porque lo lee cualquier usuario con sesión.
 */
const generarAlias = (uid) => {
  const sufijo = typeof uid === "string" ? uid.slice(-4).toUpperCase() : "";

  return sufijo ? `Lector ${sufijo}` : "Lector";
};

/**
 * Cuántos logros distintos tiene el estudiante: los ya obtenidos más los
 * recién otorgados, por id de logro. Contar ids (y no documentos) evita
 * inflar el ranking si un logro aparece duplicado en logros_usuario.
 * Acepta listas de ids; lo que no sea un id no vacío se ignora.
 */
const contarLogrosDistintos = (yaObtenidos, nuevos) => {
  const distintos = new Set();

  for (const lista of [yaObtenidos, nuevos]) {
    if (!Array.isArray(lista) && !(lista instanceof Set)) continue;

    for (const id of lista) {
      if (typeof id === "string" && id !== "") distintos.add(id);
    }
  }

  return distintos.size;
};

// Entero finito >= 0; cualquier otra cosa (texto, NaN, negativos) es 0.
const enteroNoNegativo = (valor) =>
  typeof valor === "number" && Number.isFinite(valor) && valor >= 0
    ? Math.trunc(valor)
    : 0;

/**
 * Fila de ranking/{estudianteId}. Se arma campo a campo y no copiando el
 * perfil, para que nombre, correo o foto no puedan colarse nunca. No lleva
 * `posicion`: se calcula al leer. `actualizadoEn` lo pone quien llama
 * (serverTimestamp), así este módulo sigue sin depender de Firestore.
 */
const construirFilaRanking = ({
  estudianteId,
  xp,
  nivel,
  logros,
  actividades,
  actualizadoEn,
} = {}) => ({
  estudianteId,
  alias: generarAlias(estudianteId),
  xp: enteroNoNegativo(xp),
  // Como en la ruta en vivo, nadie tiene nivel 0.
  nivel: Math.max(enteroNoNegativo(nivel), 1),
  logros: enteroNoNegativo(logros),
  actividades: enteroNoNegativo(actividades),
  actualizadoEn,
});

/**
 * Fila de ranking de un estudiante ya existente (backfill): xp y nivel
 * salen del perfil (0 y 1 si faltan o son inválidos) y los contadores los
 * pasa quien llama tras contar sus intentos y logros.
 */
const filaRankingDesdePerfil = (uid, perfil, contadores, actualizadoEn) => {
  const datos = esObjeto(perfil) ? perfil : {};
  const conteos = esObjeto(contadores) ? contadores : {};

  return construirFilaRanking({
    estudianteId: uid,
    xp: datos.xp,
    nivel:
      typeof datos.nivel === "number" &&
      Number.isInteger(datos.nivel) &&
      datos.nivel >= 1
        ? datos.nivel
        : 1,
    logros: conteos.logros,
    actividades: conteos.actividades,
    actualizadoEn,
  });
};

/**
 * Decisión del backfill para un estudiante: qué fila crear o por qué se
 * omite. La regla de elegibilidad es la de la ruta en vivo: sólo existe fila
 * para quien tiene al menos un intento (registrarIntento escribe la fila
 * después de un intento), así que no se crean filas en cero. `contadores` =
 * { actividades: cantidad de intentos, logroIds: ids de logro obtenidos }.
 * El script sólo hace la E/S alrededor de esta función.
 */
const decidirFilaBackfill = (uid, perfil, contadores, actualizadoEn) => {
  const conteos = esObjeto(contadores) ? contadores : {};
  const actividades = enteroNoNegativo(conteos.actividades);

  if (actividades === 0) {
    return { accion: "omitir", motivo: "sin-actividad" };
  }

  return {
    accion: "crear",
    fila: filaRankingDesdePerfil(
      uid,
      perfil,
      {
        actividades,
        logros: contarLogrosDistintos(conteos.logroIds, []),
      },
      actualizadoEn
    ),
  };
};

module.exports = {
  decidirFilaBackfill,
  generarAlias,
  contarLogrosDistintos,
  construirFilaRanking,
  filaRankingDesdePerfil,
  ZONA_HORARIA,
  CONFIG_POR_DEFECTO,
  esConfigXpValida,
  normalizarConfigXp,
  calcularXp,
  normalizarNiveles,
  calcularNivel,
  claveDeDia,
  clavesDeDia,
  calcularRacha,
  evaluarLogros,
};
