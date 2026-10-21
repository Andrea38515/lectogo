import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";

import { db, functions } from "../config/firebase";

const USUARIOS_COLLECTION = "usuarios";
const AUDITORIA_COLLECTION = "auditoria";

const comparadorNombres = new Intl.Collator("es", { sensitivity: "base" });

// Solo se copian los campos que el panel necesita: nada de xp, institución, etc.
const aUsuario = (usuarioDoc) => {
  const data = usuarioDoc.data();

  return {
    uid: usuarioDoc.id,
    nombre: data.nombre || "",
    correo: data.correo || "",
    rol: data.rol || "",
  };
};

const aEntradaAuditoria = (entradaDoc) => {
  const data = entradaDoc.data();

  return {
    id: entradaDoc.id,
    accion: data.accion || "",
    actorId: data.actorId || "",
    objetivoId: data.objetivoId || "",
    detalle:
      data.detalle && typeof data.detalle === "object" ? data.detalle : {},
    // Millis para que el estado de React no guarde un Timestamp de Firestore.
    creadoEn: data.creadoEn?.toMillis?.() ?? null,
  };
};

/**
 * Todos los usuarios, ordenados por nombre. Solo un administrador puede listar
 * la colección (reglas de Firestore).
 *
 * @returns {Promise<Array<{uid: string, nombre: string, correo: string, rol: string}>>}
 */
export const getUsuarios = async () => {
  const snapshot = await getDocs(collection(db, USUARIOS_COLLECTION));

  return snapshot.docs
    .map(aUsuario)
    .sort((a, b) => comparadorNombres.compare(a.nombre, b.nombre));
};

/**
 * Últimas entradas de auditoría, de la más nueva a la más vieja. Solo un
 * administrador puede leerlas y nadie las escribe desde el cliente.
 *
 * @param {number} [max=50]
 * @returns {Promise<Array>}
 */
export const getAuditoria = async (max = 50) => {
  const consulta = query(
    collection(db, AUDITORIA_COLLECTION),
    orderBy("creadoEn", "desc"),
    limit(max),
  );

  const snapshot = await getDocs(consulta);

  return snapshot.docs.map(aEntradaAuditoria);
};

/**
 * Cambia el rol de un usuario mediante la Cloud Function cambiarRol (el cliente
 * no puede escribir `rol`).
 *
 * @param {{uid: string, rol: "estudiante"|"docente"|"administrador"}} payload
 * @returns {Promise<{ok: boolean, uid: string, rolAnterior: string, rolNuevo: string, cambiado: boolean}>}
 */
export const cambiarRol = async ({ uid, rol }) => {
  const callable = httpsCallable(functions, "cambiarRol");
  const { data } = await callable({ uid, rol });

  return data;
};

/**
 * Crea, edita o elimina una categoría mediante la Cloud Function
 * gestionarCategoria.
 *
 * @param {{accion: "crear"|"editar"|"eliminar", id?: string, nombre?: string, descripcion?: string}} payload
 * @returns {Promise<{ok: boolean, id: string, accion: string, nombre?: string}>}
 */
export const gestionarCategoria = async (payload) => {
  const callable = httpsCallable(functions, "gestionarCategoria");
  const { data } = await callable(payload);

  return data;
};
