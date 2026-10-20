// functions/src/asignarActividad.js

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const {
  getFirestore,
  FieldValue,
  Timestamp,
} = require("firebase-admin/firestore");
const { getAuth } = require("firebase-admin/auth");

const db = getFirestore();

// getUsers() de Auth admite como máximo 100 identificadores por llamada.
const MAX_CORREOS = 100;

// Tope de anticipación de la fecha límite: 2 años (730 días). Evita fechas
// absurdas (año 10000, etc.) que harían fallar Timestamp.fromDate con un
// error interno en vez de un invalid-argument.
const MAX_ANTICIPACION_MS = 2 * 365 * 24 * 60 * 60 * 1000;

// Firestore admite ids de hasta 1500 bytes; aquí se acota a 128 caracteres.
const MAX_LONGITUD_ID = 128;

// Firestore reserva los ids con la forma __algo__.
const ID_RESERVADO = /^__.*__$/;

// Un id con "/" se interpretaría como una ruta de documento anidada. Esta
// versión es más estricta que la de registrarIntento (largo y ids
// reservados); allí no se toca para no cambiar su comportamiento.
const esIdValido = (valor) =>
  typeof valor === "string" &&
  valor.trim() !== "" &&
  valor.length <= MAX_LONGITUD_ID &&
  !ID_RESERVADO.test(valor) &&
  !valor.includes("/") &&
  valor !== "." &&
  valor !== "..";

// Comprobación laxa de forma, no de existencia: lo que no la cumpla ni se
// envía a Auth y termina en noAsignados como cualquier otro correo no válido.
const CORREO_PLAUSIBLE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const esCorreoPlausible = (correo) =>
  correo.length <= 254 && CORREO_PLAUSIBLE.test(correo);

/*
 * ISO-8601 completo (fecha, hora y zona). Se exige zona para que "las 23:59"
 * no dependa del servidor, y el aserto de día/mes evita que Date acepte
 * "2026-02-31" desplazándola en silencio al 3 de marzo.
 */
const ISO_CON_ZONA =
  /^(\d{4})-(\d{2})-(\d{2})T([01]\d|2[0-3]):[0-5]\d(:[0-5]\d(\.\d+)?)?(Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/;

const parsearFechaIso = (valor) => {
  if (typeof valor !== "string") {
    return null;
  }

  const partes = ISO_CON_ZONA.exec(valor);

  if (!partes) {
    return null;
  }

  const [, anio, mes, dia] = partes.map(Number);
  const calendario = new Date(Date.UTC(anio, mes - 1, dia));

  if (
    calendario.getUTCFullYear() !== anio ||
    calendario.getUTCMonth() !== mes - 1 ||
    calendario.getUTCDate() !== dia
  ) {
    return null;
  }

  const fecha = new Date(valor);

  return Number.isNaN(fecha.getTime()) ? null : fecha;
};

const errorServicioNoDisponible = (que, error) => {
  console.error(`No se pudo ${que}:`, error);

  return new HttpsError(
    "unavailable",
    "No pudimos resolver los correos, inténtalo de nuevo en unos segundos."
  );
};

const errorLecturaNoDisponible = () =>
  new HttpsError("not-found", "La lectura no existe o no está publicada.");

/*
 * Sin límite de frecuencia ni App Check, a propósito y por ahora: el rol
 * docente solo lo concede un administrador, así que quien llega aquí es un
 * usuario de confianza. Es una limitación conocida que conviene revisar
 * (cada llamada consulta Auth y escribe hasta 102 documentos).
 */
const asignarActividad = onCall(async (request) => {
  /*
   * ============================================================
   * 1. VALIDAR SESIÓN Y ROL
   * ============================================================
   */

  if (!request.auth) {
    throw new HttpsError(
      "unauthenticated",
      "Debes iniciar sesión para asignar una actividad."
    );
  }

  const docenteId = request.auth.uid;

  /*
   * Rol desde usuarios/{uid}.rol (no hay custom claims). Solo "docente":
   * un administrador no pasa por aquí, y un perfil ausente se trata como
   * "sin permiso".
   */
  const docenteSnap = await db.collection("usuarios").doc(docenteId).get();
  const rol = docenteSnap.exists ? docenteSnap.data().rol : null;

  if (rol !== "docente") {
    throw new HttpsError(
      "permission-denied",
      "Solo los docentes pueden asignar actividades."
    );
  }

  /*
   * ============================================================
   * 2. VALIDAR DATOS RECIBIDOS
   * ============================================================
   */

  // La hora se toma UNA vez: toda la comparación de la fecha límite usa
  // este mismo instante.
  const ahora = new Date();

  const { lecturaId, correos, fechaLimite } = request.data || {};

  if (!esIdValido(lecturaId)) {
    throw new HttpsError(
      "invalid-argument",
      "lecturaId es obligatorio y no puede contener '/'."
    );
  }

  if (!Array.isArray(correos) || correos.length === 0) {
    throw new HttpsError(
      "invalid-argument",
      "Debes enviar al menos un correo."
    );
  }

  if (correos.length > MAX_CORREOS) {
    throw new HttpsError(
      "invalid-argument",
      `No se permiten más de ${MAX_CORREOS} correos por actividad.`
    );
  }

  if (!correos.every((correo) => typeof correo === "string")) {
    throw new HttpsError(
      "invalid-argument",
      "Cada correo debe ser un texto."
    );
  }

  const fechaLimiteDate = parsearFechaIso(fechaLimite);

  if (!fechaLimiteDate) {
    throw new HttpsError(
      "invalid-argument",
      "fechaLimite es obligatoria y debe ser una fecha ISO-8601 con zona horaria."
    );
  }

  if (fechaLimiteDate.getTime() <= ahora.getTime()) {
    throw new HttpsError(
      "invalid-argument",
      "La fecha límite debe ser posterior al momento actual."
    );
  }

  if (fechaLimiteDate.getTime() > ahora.getTime() + MAX_ANTICIPACION_MS) {
    throw new HttpsError(
      "invalid-argument",
      "La fecha límite no puede superar los 2 años desde hoy."
    );
  }

  // Normaliza y quita duplicados conservando el orden de llegada.
  const correosNormalizados = [
    ...new Set(correos.map((correo) => correo.trim().toLowerCase())),
  ];

  /*
   * ============================================================
   * 3. VALIDAR LA LECTURA
   * ============================================================
   *
   * Solo se asignan lecturas publicadas, también las del propio docente:
   * los estudiantes solo pueden leer lecturas publicadas (reglas), así que
   * un borrador daría una actividad imposible de abrir. Una lectura
   * inexistente y una no publicada devuelven EXACTAMENTE el mismo error
   * (código y mensaje): así no se puede averiguar si el id de un borrador
   * ajeno existe.
   */

  const lecturaSnap = await db.collection("lecturas").doc(lecturaId).get();

  if (!lecturaSnap.exists) {
    throw errorLecturaNoDisponible();
  }

  if (lecturaSnap.data().estado !== "publicada") {
    throw errorLecturaNoDisponible();
  }

  /*
   * ============================================================
   * 4. RESOLVER CORREOS -> ESTUDIANTES
   * ============================================================
   *
   * Los docentes no pueden leer perfiles ajenos (reglas), así que la
   * resolución se hace aquí con Admin SDK. Por privacidad, todo lo que no
   * termine siendo un estudiante (sin cuenta, sin perfil, otro rol o un
   * texto que no es un correo) sale igual: como el correo normalizado en
   * noAsignados, sin motivo. Nunca se devuelven uids ni nombres de quien
   * no es estudiante.
   */

  const plausibles = correosNormalizados.filter(esCorreoPlausible);
  const uidPorCorreo = new Map();

  if (plausibles.length > 0) {
    let resultadoAuth;

    // Limitación conocida: si getUsers rechaza los identificadores (p. ej.
    // auth/invalid-email o auth/invalid-argument) se responde "unavailable"
    // para toda la solicitud en vez de tratarlos como no resueltos. El filtro
    // de CORREO_PLAUSIBLE reduce ese caso, pero no lo elimina.
    try {
      resultadoAuth = await getAuth().getUsers(
        plausibles.map((email) => ({ email }))
      );
    } catch (error) {
      throw errorServicioNoDisponible("consultar Auth", error);
    }

    for (const usuario of resultadoAuth.users) {
      // Solo cuentan los correos que se pidieron; Auth puede devolverlo con
      // otras mayúsculas.
      const correo =
        typeof usuario.email === "string" ? usuario.email.toLowerCase() : "";

      if (plausibles.includes(correo)) {
        uidPorCorreo.set(correo, usuario.uid);
      }
    }
  }

  const perfilPorUid = new Map();

  if (uidPorCorreo.size > 0) {
    const uids = [...uidPorCorreo.values()];
    let perfiles;

    try {
      perfiles = await db.getAll(
        ...uids.map((uid) => db.collection("usuarios").doc(uid))
      );
    } catch (error) {
      throw errorServicioNoDisponible("leer los perfiles", error);
    }

    perfiles.forEach((perfil, indice) => {
      if (perfil.exists && perfil.data().rol === "estudiante") {
        perfilPorUid.set(uids[indice], perfil.data());
      }
    });
  }

  const asignados = [];
  const noAsignados = [];

  for (const correo of correosNormalizados) {
    const uid = uidPorCorreo.get(correo);
    const perfil = uid ? perfilPorUid.get(uid) : undefined;

    if (!perfil) {
      noAsignados.push(correo);
      continue;
    }

    asignados.push({
      estudianteId: uid,
      // Reservas por si el perfil no trae el dato: el correo identifica
      // mejor que una cadena vacía en la pantalla de progreso.
      nombre:
        typeof perfil.nombre === "string" && perfil.nombre.trim() !== ""
          ? perfil.nombre
          : correo,
      correo:
        typeof perfil.correo === "string" && perfil.correo.trim() !== ""
          ? perfil.correo
          : correo,
    });
  }

  if (asignados.length === 0) {
    throw new HttpsError(
      "failed-precondition",
      "Ninguno de los correos corresponde a un estudiante registrado."
    );
  }

  /*
   * ============================================================
   * 5. ESCRIBIR (un único batch atómico)
   * ============================================================
   *
   * Un batch admite 500 escrituras; con 100 estudiantes como máximo son
   * 1 actividad + 100 asignados + 1 auditoría = 102. Nada se escribe antes
   * de este punto: todas las validaciones ya pasaron.
   */

  const actividadRef = db.collection("actividades").doc();
  const batch = db.batch();

  // Solo lo que el estudiante puede ver: aquí no van nombres ni correos de
  // otros alumnos (eso vive en la subcolección asignados, solo para el docente).
  batch.set(actividadRef, {
    lecturaId,
    docenteId,
    estudiantesAsignados: asignados.map((asignado) => asignado.estudianteId),
    estado: "asignada",
    fechaLimite: Timestamp.fromDate(fechaLimiteDate),
    creadoEn: FieldValue.serverTimestamp(),
  });

  for (const asignado of asignados) {
    batch.set(actividadRef.collection("asignados").doc(asignado.estudianteId), {
      estudianteId: asignado.estudianteId,
      nombre: asignado.nombre,
      correo: asignado.correo,
      asignadoEn: FieldValue.serverTimestamp(),
    });
  }

  batch.set(db.collection("auditoria").doc(), {
    accion: "actividad.asignar",
    actorId: docenteId,
    objetivoId: actividadRef.id,
    detalle: { lecturaId, cantidad: asignados.length },
    creadoEn: FieldValue.serverTimestamp(),
  });

  await batch.commit();

  /*
   * ============================================================
   * 6. RESPUESTA AL CLIENTE
   * ============================================================
   */

  return {
    ok: true,
    actividadId: actividadRef.id,
    asignados,
    noAsignados,
  };
});

module.exports = {
  asignarActividad,
};
