import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";

import { db } from "../config/firebase";
import { convertirFecha } from "../utils/formatearFecha";
import { getTitulosLecturas } from "./actividadesDocenteRepository";

const ACTIVIDADES_COLLECTION = "actividades";
const ASIGNADOS_COLLECTION = "asignados";
const INTENTOS_COLLECTION = "intentos";

const LECTURA_NO_DISPONIBLE = "Lectura no disponible";

const aIntento = (data) => ({
  porcentajeAciertos: Number(data.porcentajeAciertos) || 0,
  xpGanado: Number(data.xpGanado) || 0,
  resueltoEn: data.resueltoEn?.toMillis?.() ?? null,
});

// Para "no hay actividad que mostrar": las reglas responden permission-denied
// tanto si la actividad no existe (resource es null) como si es de otro docente,
// y invalid-argument si el id está mal formado.
const esActividadInaccesible = (error) =>
  error?.code === "permission-denied" ||
  error?.code === "not-found" ||
  error?.code === "invalid-argument";

/**
 * Intentos de la actividad indexados por estudianteId.
 *
 * Camino principal: una sola consulta por actividadId. Las reglas no filtran,
 * por eso la consulta DEBE llevar el where("actividadId"); la regla del docente
 * resuelve el dueño con get() sobre la actividad.
 *
 * Camino de respaldo: si Firestore rechaza esa consulta con permission-denied
 * (no podemos asegurar que acepte el get() dentro de una consulta de lista), se
 * lee el intento de cada estudiante asignado por id
 * (intentos/{actividadId}_{uid}) en paralelo. Un getDoc sobre un intento que no
 * existe también responde permission-denied (la regla lee resource.data y
 * resource es null), así que ahí significa "pendiente" y no es un error.
 */
const getIntentosPorEstudiante = async (actividadId, estudianteIds) => {
  const porEstudiante = new Map();

  try {
    const snapshot = await getDocs(
      query(
        collection(db, INTENTOS_COLLECTION),
        where("actividadId", "==", actividadId),
      ),
    );

    snapshot.docs.forEach((intentoDoc) => {
      const data = intentoDoc.data();

      porEstudiante.set(data.estudianteId, aIntento(data));
    });

    return porEstudiante;
  } catch (error) {
    if (error?.code !== "permission-denied") {
      throw error;
    }
  }

  await Promise.all(
    estudianteIds.map(async (estudianteId) => {
      try {
        const snapshot = await getDoc(
          doc(db, INTENTOS_COLLECTION, `${actividadId}_${estudianteId}`),
        );

        if (snapshot.exists()) {
          porEstudiante.set(estudianteId, aIntento(snapshot.data()));
        }
      } catch (error) {
        if (error?.code !== "permission-denied" && error?.code !== "not-found") {
          throw error;
        }
      }
    }),
  );

  return porEstudiante;
};

/**
 * Progreso de una actividad del docente: quiénes la tenían asignada y quiénes
 * ya la resolvieron.
 *
 * Devuelve null si la actividad no existe, no se puede leer o es de otro
 * docente (los tres casos se tratan igual para no revelar su existencia).
 *
 * @param {string} actividadId
 * @param {string} uid uid del docente autenticado
 * @returns {Promise<null | {
 *   actividad: { id: string, lecturaId: string|null, lecturaTitulo: string,
 *     fechaLimite: number|null, estado: string|null },
 *   estudiantes: Array<{ estudianteId: string, nombre: string, correo: string,
 *     intento: null | { porcentajeAciertos: number, xpGanado: number,
 *       resueltoEn: number|null } }>
 * }>}
 */
export const getProgresoDeActividad = async (actividadId, uid) => {
  if (!actividadId || !uid) {
    return null;
  }

  let actividadSnapshot;

  try {
    actividadSnapshot = await getDoc(doc(db, ACTIVIDADES_COLLECTION, actividadId));
  } catch (error) {
    if (esActividadInaccesible(error)) {
      return null;
    }

    throw error;
  }

  if (!actividadSnapshot.exists()) {
    return null;
  }

  const data = actividadSnapshot.data();

  if (data.docenteId !== uid) {
    return null;
  }

  const lecturaId = data.lecturaId || null;
  const idsAsignados = Array.isArray(data.estudiantesAsignados)
    ? data.estudiantesAsignados
    : [];

  const [asignadosSnapshot, titulos] = await Promise.all([
    getDocs(collection(db, ACTIVIDADES_COLLECTION, actividadId, ASIGNADOS_COLLECTION)),
    getTitulosLecturas([lecturaId]),
  ]);

  // Nombre y correo salen de la subcolección asignados; si a un uid asignado le
  // falta su documento (actividad anterior a esa subcolección) se lo muestra
  // igual, sin datos de perfil, para no ocultar a nadie.
  const perfiles = new Map();

  asignadosSnapshot.docs.forEach((asignadoDoc) => {
    const perfil = asignadoDoc.data();

    perfiles.set(asignadoDoc.id, {
      nombre: perfil.nombre || perfil.correo || "Estudiante sin nombre",
      correo: perfil.correo || "",
    });
  });

  idsAsignados.forEach((estudianteId) => {
    if (!perfiles.has(estudianteId)) {
      perfiles.set(estudianteId, { nombre: "Estudiante sin nombre", correo: "" });
    }
  });

  const intentos = await getIntentosPorEstudiante(actividadId, [...perfiles.keys()]);

  const estudiantes = [...perfiles.entries()]
    .map(([estudianteId, perfil]) => ({
      estudianteId,
      nombre: perfil.nombre,
      correo: perfil.correo,
      intento: intentos.get(estudianteId) ?? null,
    }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));

  return {
    actividad: {
      id: actividadSnapshot.id,
      lecturaId,
      lecturaTitulo: titulos[lecturaId] ?? LECTURA_NO_DISPONIBLE,
      fechaLimite: convertirFecha(data.fechaLimite)?.getTime() ?? null,
      estado: data.estado || null,
    },
    estudiantes,
  };
};
