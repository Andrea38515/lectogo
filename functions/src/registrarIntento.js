// functions/src/registrarIntento.js

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const {
  getFirestore,
  FieldValue,
} = require("firebase-admin/firestore");

const db = getFirestore();

// Tope defensivo: cada respuesta cuesta dos lecturas dentro de la transacción.
const MAX_RESPUESTAS = 100;

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
      // El serverTimestamp guardado aún no se resuelve aquí; se devuelve
      // la hora de la función en ISO, igual que en la repetición.
      resueltoEn: new Date().toISOString(),
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
