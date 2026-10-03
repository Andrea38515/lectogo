// functions/src/registrarIntento.js

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const {
  getFirestore,
  FieldValue,
} = require("firebase-admin/firestore");

const db = getFirestore();

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
  const rol = request.auth.token.role;

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

  if (
    typeof actividadId !== "string" ||
    !actividadId.trim()
  ) {
    throw new HttpsError(
      "invalid-argument",
      "actividadId es obligatorio."
    );
  }

  if (!Array.isArray(respuestas) || respuestas.length === 0) {
    throw new HttpsError(
      "invalid-argument",
      "Debes enviar al menos una respuesta."
    );
  }

  /*
   * Evita preguntas duplicadas en la misma solicitud.
   */
  const preguntaIds = respuestas.map((respuesta) => respuesta?.preguntaId);

  if (
    preguntaIds.some(
      (preguntaId) =>
        typeof preguntaId !== "string" || !preguntaId.trim()
    )
  ) {
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

  /*
   * ============================================================
   * 4. TRANSACCIÓN
   * ============================================================
   *
   * La transacción hace que la comprobación de idempotencia y
   * la creación del intento sean atómicas.
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
        resueltoEn: data.resueltoEn ?? null,
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

      if (
        !Number.isNaN(fechaLimite.getTime()) &&
        Date.now() > fechaLimite.getTime()
      ) {
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

    const preguntaRefs = preguntaIds.map((preguntaId) =>
      db.collection("preguntas").doc(preguntaId)
    );

    const preguntaSnapshots = await Promise.all(
      preguntaRefs.map((ref) => transaction.get(ref))
    );

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

      preguntasMap.set(preguntaIds[index], pregunta);
    });

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
       * preguntas.respuestaCorrecta.
       */
      const correcta =
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
     * El cálculo de XP se mantiene compatible con la configuración
     * definida en el DDS:
     *
     * xpPorRespuestaCorrecta = 10
     * xpBonoActividadCompleta = 20
     *
     * Esta función registra el intento. Las funciones de
     * gamificación pueden procesar posteriormente el XP.
     */
    const xpPorRespuestaCorrecta = 10;
    const xpBonoActividadCompleta = 20;

    const xpGanado =
      respuestasCorrectas * xpPorRespuestaCorrecta +
      (porcentajeAciertos === 100
        ? xpBonoActividadCompleta
        : 0);

    /*
     * ==========================================================
     * 7. GUARDAR INTENTO
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

    return {
      duplicado: false,
      intentoId,
      porcentajeAciertos,
      respuestas: respuestasCalificadas,
      xpGanado,
      resueltoEn: null,
    };
  });

  /*
   * ============================================================
   * 8. RESPUESTA AL CLIENTE
   * ============================================================
   *
   * Las explicaciones viajan dentro de cada respuesta para que
   * FeedbackPanel pueda mostrarlas inmediatamente.
   */

  return {
    ok: true,
    duplicado: resultado.duplicado,
    intentoId: resultado.intentoId,
    porcentajeAciertos: resultado.porcentajeAciertos,
    respuestas: resultado.respuestas,
    xpGanado: resultado.xpGanado,
    resueltoEn: resultado.resueltoEn,
  };
});

module.exports = {
  registrarIntento,
};
