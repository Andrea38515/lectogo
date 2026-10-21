// functions/src/gestionarCategoria.js

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

const { esIdValido, exigirAdministrador } = require("./adminComun");

const db = getFirestore();

const NOMBRE_MIN = 2;
const NOMBRE_MAX = 60;
const DESCRIPCION_MAX = 200;
const SLUG_MAX = 60;

const errorNombre = () =>
  new HttpsError(
    "invalid-argument",
    `nombre es obligatorio y debe tener entre ${NOMBRE_MIN} y ${NOMBRE_MAX} caracteres.`
  );

const errorDescripcion = () =>
  new HttpsError(
    "invalid-argument",
    `descripcion debe ser un texto de hasta ${DESCRIPCION_MAX} caracteres.`
  );

const errorId = () =>
  new HttpsError(
    "invalid-argument",
    "id es obligatorio y no puede contener '/'."
  );

const validarNombre = (valor) => {
  if (typeof valor !== "string") {
    throw errorNombre();
  }

  const nombre = valor.trim();

  if (nombre.length < NOMBRE_MIN || nombre.length > NOMBRE_MAX) {
    throw errorNombre();
  }

  return nombre;
};

// La descripción es opcional: undefined significa "no enviada". Cualquier
// otra cosa que no sea un texto corto (incluido null) se rechaza.
const validarDescripcion = (valor) => {
  if (valor === undefined) {
    return undefined;
  }

  if (typeof valor !== "string") {
    throw errorDescripcion();
  }

  const descripcion = valor.trim();

  if (descripcion.length > DESCRIPCION_MAX) {
    throw errorDescripcion();
  }

  return descripcion;
};

const validarId = (valor) => {
  if (!esIdValido(valor)) {
    throw errorId();
  }

  return valor;
};

/*
 * Id de la categoría a partir del nombre: minúsculas, sin acentos (NFD y se
 * quitan las marcas), todo lo que no sea a-z o 0-9 pasa a "-", sin guiones
 * en los extremos. El resultado solo tiene [a-z0-9-], así que nunca es un id
 * reservado ni contiene "/" o ".".
 */
const generarSlug = (nombre) =>
  nombre
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, SLUG_MAX)
    .replace(/-+$/g, "");

const registrarAuditoria = (transaction, { accion, actorId, objetivoId, detalle }) => {
  transaction.create(db.collection("auditoria").doc(), {
    accion,
    actorId,
    objetivoId,
    detalle,
    creadoEn: FieldValue.serverTimestamp(),
  });
};

const errorColision = (id) =>
  new HttpsError(
    "already-exists",
    `Ya existe una categoría con el identificador «${id}». Probá con otro nombre.`
  );

// El create falla en el commit (fuera del callback) si otra escritura creó el
// documento entre la lectura y el commit; llega como error crudo de Firestore
// (gRPC 6 / ALREADY_EXISTS), no como HttpsError.
const esAlreadyExistsCrudo = (error) =>
  error?.code === 6 ||
  (typeof error?.message === "string" && error.message.includes("ALREADY_EXISTS"));

const crear = async ({ adminId, nombre, descripcion }) => {
  const id = generarSlug(nombre);

  // Un nombre en otro alfabeto (japonés, cirílico...) no tiene un id válido:
  // los ids solo usan a-z y 0-9.
  if (id === "") {
    throw new HttpsError(
      "invalid-argument",
      "El nombre debe incluir al menos una letra latina o un número."
    );
  }

  try {
    return await crearEnTransaccion({ adminId, id, nombre, descripcion });
  } catch (error) {
    if (esAlreadyExistsCrudo(error)) {
      throw errorColision(id);
    }

    throw error;
  }
};

const crearEnTransaccion = ({ adminId, id, nombre, descripcion }) =>
  db.runTransaction(async (transaction) => {
    const ref = db.collection("categorias").doc(id);
    const existente = await transaction.get(ref);

    if (existente.exists) {
      throw errorColision(id);
    }

    // Mismos campos que el seed: nombre y descripcion, y nada más.
    transaction.create(ref, { nombre, descripcion: descripcion ?? "" });

    registrarAuditoria(transaction, {
      accion: "categoria.crear",
      actorId: adminId,
      objetivoId: id,
      detalle: { nombre },
    });

    return { ok: true, id, accion: "crear", nombre };
  });

const editar = ({ adminId, id, nombre, descripcion }) =>
  db.runTransaction(async (transaction) => {
    const ref = db.collection("categorias").doc(id);
    const existente = await transaction.get(ref);

    if (!existente.exists) {
      throw new HttpsError("not-found", "La categoría no existe.");
    }

    const actual = existente.data();
    const nombreAnterior =
      typeof actual.nombre === "string" ? actual.nombre : "";

    // Sin descripción en la petición se conserva la que ya tenía: editar
    // solo el nombre no debe borrarla en silencio. El id nunca cambia.
    const descripcionAnterior =
      typeof actual.descripcion === "string" ? actual.descripcion : "";
    const descripcionFinal = descripcion ?? descripcionAnterior;

    transaction.update(ref, { nombre, descripcion: descripcionFinal });

    registrarAuditoria(transaction, {
      accion: "categoria.editar",
      actorId: adminId,
      objetivoId: id,
      // Con la descripción también, un cambio solo de descripción se
      // distingue de una edición sin efecto.
      detalle: {
        nombre,
        nombreAnterior,
        descripcion: descripcionFinal,
        descripcionAnterior,
      },
    });

    return { ok: true, id, accion: "editar", nombre };
  });

const eliminar = ({ adminId, id }) =>
  db.runTransaction(async (transaction) => {
    const ref = db.collection("categorias").doc(id);
    const existente = await transaction.get(ref);

    if (!existente.exists) {
      throw new HttpsError("not-found", "La categoría no existe.");
    }

    // Cualquier lectura (también un borrador) que use la categoría la
    // bloquea: borrarla dejaría lecturas apuntando a una categoría que ya no
    // existe. La consulta va dentro de la transacción, antes de escribir.
    const enUso = await transaction.get(
      db.collection("lecturas").where("categoriaId", "==", id).limit(1)
    );

    if (!enUso.empty) {
      throw new HttpsError(
        "failed-precondition",
        "Hay lecturas en esta categoría: movelas o eliminalas primero."
      );
    }

    const nombre =
      typeof existente.data().nombre === "string" ? existente.data().nombre : "";

    transaction.delete(ref);

    registrarAuditoria(transaction, {
      accion: "categoria.eliminar",
      actorId: adminId,
      objetivoId: id,
      detalle: { nombre },
    });

    return { ok: true, id, accion: "eliminar" };
  });

/*
 * Sin límite de frecuencia ni App Check, a propósito: solo un administrador
 * puede llamar a esta función, así que quien llega aquí es un usuario de
 * confianza. Es la única vía para modificar categorías (las reglas de
 * Firestore solo permiten leerlas), así cada cambio queda auditado.
 */
const gestionarCategoria = onCall(async (request) => {
  /*
   * ============================================================
   * 1. VALIDAR SESIÓN Y ROL
   * ============================================================
   */

  const adminId = await exigirAdministrador(
    db,
    request,
    "gestionar categorías"
  );

  /*
   * ============================================================
   * 2. VALIDAR DATOS Y EJECUTAR LA ACCIÓN
   * ============================================================
   *
   * Todo se valida antes de abrir la transacción. En "crear" el id nunca
   * viene del cliente: se genera a partir del nombre.
   */

  const { accion, id, nombre, descripcion } = request.data || {};

  switch (accion) {
    case "crear":
      return crear({
        adminId,
        nombre: validarNombre(nombre),
        descripcion: validarDescripcion(descripcion),
      });

    case "editar": {
      const idValido = validarId(id);

      return editar({
        adminId,
        id: idValido,
        nombre: validarNombre(nombre),
        descripcion: validarDescripcion(descripcion),
      });
    }

    case "eliminar":
      return eliminar({ adminId, id: validarId(id) });

    default:
      throw new HttpsError(
        "invalid-argument",
        "accion debe ser 'crear', 'editar' o 'eliminar'."
      );
  }
});

module.exports = {
  gestionarCategoria,
};
