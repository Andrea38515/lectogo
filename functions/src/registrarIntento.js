// functions/src/registrarIntento.js

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const {
  getFirestore,
  FieldValue,
  Timestamp,
} = require("firebase-admin/firestore");

const {
  ZONA_HORARIA,
  CONFIG_POR_DEFECTO,
  esConfigXpValida,
  normalizarConfigXp,
  calcularXp,
  normalizarNiveles,
  calcularNivel,
  calcularRacha,
  evaluarLogros,
  contarLogrosDistintos,
  construirFilaRanking,
} = require("./gamificacion");

const db = getFirestore();

// Tope defensivo: cada respuesta cuesta dos lecturas dentro de la transacción.
const MAX_RESPUESTAS = 100;

/*
 * La configuración de XP y la tabla de niveles cambian muy rara vez y no
 * dependen del intento, así que se leen una sola vez ANTES de la
 * transacción: Firestore puede reejecutar el callback y no tiene sentido
 * repetir estas lecturas ni bloquearlas.
 *
 * Dos situaciones distintas:
 *  - El documento falta o es inválido (seed pendiente): se avisa en el log
 *    y se sigue con valores seguros, para no bloquear a los estudiantes.
 *  - La LECTURA falla (error transitorio): se aborta con "unavailable"
 *    antes de escribir nada. El id del intento es determinista y no hay
 *    reintento posterior, así que seguir con valores por defecto fijaría
 *    XP y nivel equivocados para siempre; que el cliente reintente es
 *    barato.
 */
const errorConfigNoDisponible = (docPath, error) => {
  console.error(`No se pudo leer ${docPath}:`, error);

  return new HttpsError(
    "unavailable",
    "No pudimos cargar la configuración, inténtalo de nuevo en unos segundos."
  );
};

const leerConfigXp = async () => {
  let datos;
  let problema = null;
  let snap;

  try {
    snap = await db.collection("config_negocio").doc("gamificacion").get();
  } catch (error) {
    throw errorConfigNoDisponible("config_negocio/gamificacion", error);
  }

  if (snap.exists) {
    datos = snap.data();
  } else {
    problema = "no existe";
  }

  if (!problema && !esConfigXpValida(datos)) {
    problema = "tiene campos inválidos";
  }

  if (problema) {
    console.warn(
      `config_negocio/gamificacion ${problema}: se usan los valores ` +
        `del DDS (${CONFIG_POR_DEFECTO.xpPorRespuestaCorrecta} por ` +
        `respuesta, ${CONFIG_POR_DEFECTO.xpBonoActividadCompleta} de bono).`
    );
  }

  return normalizarConfigXp(datos);
};

const leerNiveles = async () => {
  let snap;

  try {
    snap = await db.collection("niveles_config").get();
  } catch (error) {
    throw errorConfigNoDisponible("niveles_config", error);
  }

  const niveles = normalizarNiveles(snap.docs.map((doc) => doc.data()));
  let problema = null;

  if (niveles.length === 0) {
    problema = "está vacía o no tiene documentos válidos";
  }

  if (problema) {
    console.warn(
      `niveles_config ${problema}: el nivel del estudiante no se modifica.`
    );
  }

  return niveles;
};

// Un id con "/" se interpretaría como una ruta de documento anidada.
const esIdValido = (valor) =>
  typeof valor === "string" &&
  valor.trim() !== "" &&
  !valor.includes("/") &&
  valor !== "." &&
  valor !== "..";

const registrarIntento = onCall(async (request) => {
  /*
   * ============================================================
   * 1. VALIDAR SESIÓN Y ROL
   * ============================================================
   */

  if (!request.auth) {
    throw new HttpsError(
      "unauthenticated",
      "Debes iniciar sesión para registrar un intento."
    );
  }

  const estudianteId = request.auth.uid;

  /*
   * El rol vive en usuarios/{uid}.rol (lo crea onUserCreate). No se lee
   * de request.auth.token: ninguna función asigna custom claims, así que
   * ese valor siempre llegaba vacío y rechazaba a todos los estudiantes.
   */
  const usuarioSnap = await db
    .collection("usuarios")
    .doc(estudianteId)
    .get();

  const rol = usuarioSnap.exists ? usuarioSnap.data().rol : null;

  if (rol !== "estudiante") {
    throw new HttpsError(
      "permission-denied",
      "Solo los estudiantes pueden registrar intentos."
    );
  }

  /*
   * ============================================================
   * 2. VALIDAR DATOS RECIBIDOS
   * ============================================================
   */

  const { actividadId, respuestas } = request.data || {};

  if (!esIdValido(actividadId)) {
    throw new HttpsError(
      "invalid-argument",
      "actividadId es obligatorio y no puede contener '/'."
    );
  }

  if (!Array.isArray(respuestas) || respuestas.length === 0) {
    throw new HttpsError(
      "invalid-argument",
      "Debes enviar al menos una respuesta."
    );
  }

  if (respuestas.length > MAX_RESPUESTAS) {
    throw new HttpsError(
      "invalid-argument",
      `No se permiten más de ${MAX_RESPUESTAS} respuestas por intento.`
    );
  }

  /*
   * Evita preguntas duplicadas en la misma solicitud.
   */
  const preguntaIds = respuestas.map((respuesta) => respuesta?.preguntaId);

  if (!preguntaIds.every(esIdValido)) {
    throw new HttpsError(
      "invalid-argument",
      "Cada respuesta debe contener un preguntaId válido."
    );
  }

  if (new Set(preguntaIds).size !== preguntaIds.length) {
    throw new HttpsError(
      "invalid-argument",
      "No se permiten preguntas duplicadas en un intento."
    );
  }

  /*
   * ============================================================
   * 3. REFERENCIAS FIRESTORE
   * ============================================================
   */

  const actividadRef = db.collection("actividades").doc(actividadId);

  /*
   * ID determinista:
   *
   * actividadId + estudianteId
   *
   * Esto permite que el mismo envío repetido encuentre
   * exactamente el mismo documento.
   */
  const intentoId = `${actividadId}_${estudianteId}`;
  const intentoRef = db.collection("intentos").doc(intentoId);
  const usuarioRef = db.collection("usuarios").doc(estudianteId);

  /*
   * La hora se toma UNA vez, fuera de la transacción: el callback puede
   * reejecutarse y debe ser función pura de lo que lee más este valor. De
   * ella salen el día de la racha y ultimaActividadEn.
   */
  const ahora = new Date();

  const [configXp, niveles] = await Promise.all([
    leerConfigXp(),
    leerNiveles(),
  ]);

  /*
   * ============================================================
   * 4. TRANSACCIÓN
   * ============================================================
   *
   * La transacción hace que la comprobación de idempotencia, la
   * creación del intento y la actualización de XP, nivel, racha y
   * logros sean atómicas: o ocurre todo o no ocurre nada.
   */

  const resultado = await db.runTransaction(async (transaction) => {
    /*
     * ----------------------------------------------------------
     * 4.1 IDEMPOTENCIA
     * ----------------------------------------------------------
     */

    const intentoExistente = await transaction.get(intentoRef);

    if (intentoExistente.exists) {
      const data = intentoExistente.data();

      return {
        duplicado: true,
        intentoId: intentoExistente.id,
        porcentajeAciertos: data.porcentajeAciertos ?? 0,
        respuestas: data.respuestas ?? [],
        xpGanado: data.xpGanado ?? 0,
        // Misma forma (ISO) que en el primer envío; un Timestamp de
        // Firestore llegaría al cliente con otra estructura.
        resueltoEn:
          typeof data.resueltoEn?.toDate === "function"
            ? data.resueltoEn.toDate().toISOString()
            : null,
      };
    }

    /*
     * ----------------------------------------------------------
     * 4.2 OBTENER ACTIVIDAD
     * ----------------------------------------------------------
     */

    const actividadSnap = await transaction.get(actividadRef);

    if (!actividadSnap.exists) {
      throw new HttpsError(
        "not-found",
        "La actividad no existe."
      );
    }

    const actividad = actividadSnap.data();

    /*
     * ----------------------------------------------------------
     * 4.3 VALIDAR PERTENENCIA DEL ESTUDIANTE
     * ----------------------------------------------------------
     */

    const estudiantesAsignados =
      Array.isArray(actividad.estudiantesAsignados)
        ? actividad.estudiantesAsignados
        : [];

    if (!estudiantesAsignados.includes(estudianteId)) {
      throw new HttpsError(
        "permission-denied",
        "No estás asignado a esta actividad."
      );
    }

    /*
     * ----------------------------------------------------------
     * 4.4 VALIDAR ESTADO DE LA ACTIVIDAD
     * ----------------------------------------------------------
     */

    if (actividad.estado !== "asignada") {
      throw new HttpsError(
        "failed-precondition",
        "La actividad ya no está disponible para recibir intentos."
      );
    }

    /*
     * ----------------------------------------------------------
     * 4.5 VALIDAR FECHA LÍMITE
     * ----------------------------------------------------------
     */

    if (actividad.fechaLimite) {
      const fechaLimite =
        typeof actividad.fechaLimite.toDate === "function"
          ? actividad.fechaLimite.toDate()
          : new Date(actividad.fechaLimite);

      // Una fecha ilegible no puede significar "sin límite": se falla
      // cerrado y se deja el dato de la actividad para que lo corrijan.
      if (Number.isNaN(fechaLimite.getTime())) {
        throw new HttpsError(
          "failed-precondition",
          "La fecha límite de la actividad no es válida."
        );
      }

      if (Date.now() > fechaLimite.getTime()) {
        throw new HttpsError(
          "failed-precondition",
          "La fecha límite de esta actividad ya ha pasado."
        );
      }
    }

    /*
     * ----------------------------------------------------------
     * 4.6 OBTENER Y VALIDAR PREGUNTAS
     * ----------------------------------------------------------
     *
     * Las preguntas deben pertenecer a la misma lectura de
     * la actividad.
     */

    /*
     * El intento debe cubrir TODAS las preguntas de la lectura. Si se
     * calificara solo lo enviado, bastaría responder una pregunta fácil
     * para obtener 100 % y el XP completo, y el id determinista
     * bloquearía cualquier reintento.
     */
    const preguntasDeLaLectura = await transaction.get(
      db
        .collection("preguntas")
        .where("lecturaId", "==", actividad.lecturaId)
    );

    const respondidas = new Set(preguntaIds);
    const faltantes = preguntasDeLaLectura.docs.filter(
      (preguntaDoc) => !respondidas.has(preguntaDoc.id)
    );

    if (faltantes.length > 0) {
      throw new HttpsError(
        "invalid-argument",
        "Debes responder todas las preguntas de la actividad."
      );
    }

    const preguntaRefs = preguntaIds.map((preguntaId) =>
      db.collection("preguntas").doc(preguntaId)
    );

    /*
     * La respuesta correcta y la explicación viven en
     * preguntas/{id}/solucion/datos, una subcolección que las reglas
     * de Firestore no dejan leer a los estudiantes. Se leen aquí, con
     * Admin SDK, y todas las lecturas van antes de cualquier escritura
     * de la transacción.
     */
    const [preguntaSnapshots, solucionSnapshots] = await Promise.all([
      Promise.all(preguntaRefs.map((ref) => transaction.get(ref))),
      Promise.all(
        preguntaRefs.map((ref) =>
          transaction.get(ref.collection("solucion").doc("datos"))
        )
      ),
    ]);

    const preguntasMap = new Map();

    preguntaSnapshots.forEach((snapshot, index) => {
      if (!snapshot.exists) {
        throw new HttpsError(
          "not-found",
          `La pregunta ${preguntaIds[index]} no existe.`
        );
      }

      const pregunta = snapshot.data();

      if (pregunta.lecturaId !== actividad.lecturaId) {
        throw new HttpsError(
          "permission-denied",
          `La pregunta ${preguntaIds[index]} no pertenece a la actividad.`
        );
      }

      if (
        !["seleccion_multiple", "verdadero_falso"].includes(
          pregunta.tipo
        )
      ) {
        throw new HttpsError(
          "failed-precondition",
          `La pregunta ${preguntaIds[index]} tiene un tipo no permitido.`
        );
      }

      const solucionSnap = solucionSnapshots[index];

      /*
       * Sin solución no hay forma de calificar. Fallar es preferible a
       * dar por incorrecta una respuesta que quizá era válida.
       */
      if (!solucionSnap.exists) {
        throw new HttpsError(
          "failed-precondition",
          `La pregunta ${preguntaIds[index]} no tiene solución configurada.`
        );
      }

      const solucion = solucionSnap.data();

      // Un documento de solución sin respuesta usable tampoco se puede
      // calificar; si no, "" === "" daría por buena una respuesta vacía.
      if (
        typeof solucion.respuestaCorrecta !== "string" ||
        solucion.respuestaCorrecta.trim() === ""
      ) {
        throw new HttpsError(
          "failed-precondition",
          `La pregunta ${preguntaIds[index]} no tiene una respuesta correcta válida.`
        );
      }

      preguntasMap.set(preguntaIds[index], {
        ...pregunta,
        ...solucion,
      });
    });

    /*
     * ----------------------------------------------------------
     * 4.7 LEER EL ESTADO DE GAMIFICACIÓN
     * ----------------------------------------------------------
     *
     * Todo lo que el cálculo necesita se lee aquí, antes de la primera
     * escritura (Firestore rechaza lecturas posteriores a una escritura):
     * el perfil (XP, nivel y racha actuales), el catálogo de logros, los
     * logros que el estudiante ya tiene y sus intentos previos. Son
     * consultas de igualdad simple, sin índice compuesto.
     *
     * Va después de las validaciones: un duplicado o un intento inválido
     * ya terminó arriba y no paga estas lecturas.
     */
    const [
      usuarioTxSnap,
      catalogoSnap,
      logrosObtenidosSnap,
      intentosPreviosSnap,
    ] = await Promise.all([
      transaction.get(usuarioRef),
      transaction.get(db.collection("logros")),
      transaction.get(
        db
          .collection("logros_usuario")
          .where("estudianteId", "==", estudianteId)
      ),
      transaction.get(
        db
          .collection("intentos")
          .where("estudianteId", "==", estudianteId)
      ),
    ]);

    // Se actualiza con transaction.update: si el perfil desapareció tras
    // validar el rol, fallar aquí es más claro que un NOT_FOUND al confirmar.
    if (!usuarioTxSnap.exists) {
      throw new HttpsError(
        "failed-precondition",
        "No existe el perfil del estudiante."
      );
    }

    /*
     * ==========================================================
     * 5. CALIFICAR RESPUESTAS EN EL SERVIDOR
     * ==========================================================
     */

    let respuestasCorrectas = 0;

    const respuestasCalificadas = respuestas.map((respuesta) => {
      const pregunta = preguntasMap.get(respuesta.preguntaId);

      const respuestaDada =
        typeof respuesta.respuestaDada === "string"
          ? respuesta.respuestaDada.trim()
          : "";

      const respuestaCorrecta =
        typeof pregunta.respuestaCorrecta === "string"
          ? pregunta.respuestaCorrecta.trim()
          : "";

      /*
       * La comparación se realiza exclusivamente contra
       * preguntas/{id}/solucion/datos.respuestaCorrecta.
       */
      const correcta =
        respuestaDada !== "" &&
        respuestaDada.toLowerCase() ===
          respuestaCorrecta.toLowerCase();

      if (correcta) {
        respuestasCorrectas += 1;
      }

      return {
        preguntaId: respuesta.preguntaId,
        respuestaDada,
        correcta,
        explicacion: pregunta.explicacion || "",
      };
    });

    /*
     * ==========================================================
     * 6. CALCULAR PORCENTAJE
     * ==========================================================
     */

    const totalPreguntas = respuestasCalificadas.length;

    const porcentajeAciertos =
      totalPreguntas > 0
        ? Math.round(
            (respuestasCorrectas / totalPreguntas) * 100
          )
        : 0;

    /*
     * Los valores salen de config_negocio/gamificacion (por defecto los
     * del DDS: 10 por respuesta y 20 de bono por actividad completa).
     */
    const xpGanado = calcularXp(
      configXp,
      respuestasCorrectas,
      porcentajeAciertos
    );

    /*
     * ==========================================================
     * 7. CALCULAR GAMIFICACIÓN
     * ==========================================================
     *
     * Sólo cálculo, sin tocar Firestore: depende de lo leído arriba y de
     * `ahora`, así que un reintento de la transacción da lo mismo. Los
     * campos del perfil pueden faltar o venir corruptos; se toman valores
     * por defecto en vez de fallar.
     */
    const usuario = usuarioTxSnap.data() || {};

    const xpAnterior =
      typeof usuario.xp === "number" &&
      Number.isFinite(usuario.xp) &&
      usuario.xp >= 0
        ? usuario.xp
        : 0;

    const nivelAnterior =
      Number.isInteger(usuario.nivel) && usuario.nivel >= 1
        ? usuario.nivel
        : 1;

    // XP total absoluto (no FieldValue.increment): el nivel nuevo se
    // calcula sobre el total.
    const xpTotal = xpAnterior + xpGanado;
    const nivel = calcularNivel(niveles, xpTotal, nivelAnterior);

    const racha = calcularRacha(
      usuario.rachaActual,
      usuario.ultimaActividadEn,
      ahora,
      ZONA_HORARIA
    );

    // Este intento aún no existe en la consulta, de ahí el + 1.
    const actividadesCompletadas = intentosPreviosSnap.size + 1;

    const logrosObtenidosIds = logrosObtenidosSnap.docs.map(
      (doc) => doc.data().logroId
    );

    const logrosNuevos = evaluarLogros(
      catalogoSnap.docs.map((doc) => ({ ...doc.data(), id: doc.id })),
      logrosObtenidosIds,
      {
        actividadesCompletadas,
        porcentajeAciertos,
        racha,
      }
    );

    /*
     * Fila derivada del ranking global, con los valores DESPUÉS de este
     * intento. Sólo alias (nunca nombre ni correo): cualquier usuario con
     * sesión puede leer todo el ranking.
     */
    const filaRanking = construirFilaRanking({
      estudianteId,
      xp: xpTotal,
      nivel,
      logros: contarLogrosDistintos(
        logrosObtenidosIds,
        logrosNuevos.map((logro) => logro.id)
      ),
      actividades: actividadesCompletadas,
      actualizadoEn: FieldValue.serverTimestamp(),
    });

    /*
     * ==========================================================
     * 8. ESCRIBIR (todas las lecturas ya terminaron)
     * ==========================================================
     */

    const intentoData = {
      id: intentoId,
      actividadId,
      estudianteId,
      respuestas: respuestasCalificadas,
      porcentajeAciertos,
      xpGanado,
      resueltoEn: FieldValue.serverTimestamp(),
    };

    transaction.create(intentoRef, intentoData);

    transaction.update(usuarioRef, {
      xp: xpTotal,
      nivel,
      rachaActual: racha,
      ultimaActividadEn: Timestamp.fromDate(ahora),
    });

    // Id determinista: un logro no se duplica. Se usa set (upsert) y no
    // create porque la consulta de "ya obtenidos" filtra por estudianteId:
    // un documento existente sin ese campo (edición manual) no se vería, y
    // create fallaría con ALREADY_EXISTS dejando al estudiante sin poder
    // enviar la actividad nunca. Con set el resultado es el mismo.
    for (const logro of logrosNuevos) {
      const logroUsuarioId = `${estudianteId}_${logro.id}`;

      transaction.set(
        db.collection("logros_usuario").doc(logroUsuarioId),
        {
          id: logroUsuarioId,
          estudianteId,
          logroId: logro.id,
          obtenidoEn: FieldValue.serverTimestamp(),
        }
      );
    }

    // Sobrescritura completa: la fila es derivada, no hay nada que fusionar.
    transaction.set(db.collection("ranking").doc(estudianteId), filaRanking);

    return {
      duplicado: false,
      intentoId,
      porcentajeAciertos,
      respuestas: respuestasCalificadas,
      xpGanado,
      // El serverTimestamp guardado aún no se resuelve aquí; se devuelve
      // la hora de la función en ISO, igual que en la repetición.
      resueltoEn: new Date().toISOString(),
      nivel,
      nivelAnterior,
      subioDeNivel: nivel > nivelAnterior,
      xpTotal,
      racha,
      logrosNuevos,
    };
  });

  /*
   * ============================================================
   * 9. RESPUESTA AL CLIENTE
   * ============================================================
   *
   * Las explicaciones viajan dentro de cada respuesta para que
   * FeedbackPanel pueda mostrarlas inmediatamente.
   */

  const respuesta = {
    ok: true,
    duplicado: resultado.duplicado,
    intentoId: resultado.intentoId,
    porcentajeAciertos: resultado.porcentajeAciertos,
    respuestas: resultado.respuestas,
    xpGanado: resultado.xpGanado,
    resueltoEn: resultado.resueltoEn,
  };

  /*
   * Un duplicado no trae datos de gamificación: el primer envío ya los
   * otorgó y no se inventan valores para esta repetición.
   */
  if (resultado.duplicado) {
    return respuesta;
  }

  return {
    ...respuesta,
    nivel: resultado.nivel,
    nivelAnterior: resultado.nivelAnterior,
    subioDeNivel: resultado.subioDeNivel,
    xpTotal: resultado.xpTotal,
    racha: resultado.racha,
    logrosNuevos: resultado.logrosNuevos,
  };
});

module.exports = {
  registrarIntento,
};
