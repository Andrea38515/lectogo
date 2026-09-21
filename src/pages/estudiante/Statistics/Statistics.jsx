import React, { useEffect, useMemo, useState } from "react";
import { collection, getDocs, orderBy, query, where } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../../../config/firebase";
import "./Statistics.css";

const Statistics = () => {
  const [intentos, setIntentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filtro, setFiltro] = useState("todos");

  useEffect(() => {
    let unsubscribeAuth;

    const cargarIntentos = async (user) => {
      if (!user) {
        setIntentos([]);
        setLoading(false);
        setError("Debes iniciar sesión para consultar tus estadísticas.");
        return;
      }

      try {
        setLoading(true);
        setError("");

        /*
         * S5-04:
         * Consulta los intentos del estudiante autenticado.
         *
         * Se utiliza orderBy para aprovechar el índice compuesto
         * definido para la consulta de historial.
         */
        const intentosRef = collection(db, "intentos");

        const q = query(
          intentosRef,
          where("estudianteId", "==", user.uid),
          orderBy("fechaCreacion", "desc"),
        );

        const snapshot = await getDocs(q);

        const datos = snapshot.docs.map((doc) => {
          const data = doc.data();

          return {
            id: doc.id,
            actividadId: data.actividadId || "",
            actividadTitulo:
              data.actividadTitulo || data.tituloActividad || "Actividad",
            aciertos: Number(data.aciertos || 0),
            totalPreguntas: Number(
              data.totalPreguntas || data.preguntasTotales || 0,
            ),
            porcentaje:
              data.porcentaje !== undefined
                ? Number(data.porcentaje)
                : calcularPorcentaje(
                    Number(data.aciertos || 0),
                    Number(data.totalPreguntas || data.preguntasTotales || 0),
                  ),
            estado: data.estado || "completado",
            fechaCreacion: convertirFecha(data.fechaCreacion),
          };
        });

        setIntentos(datos);
      } catch (err) {
        console.error("Error cargando estadísticas:", err);

        if (err.code === "failed-precondition") {
          setError(
            "La consulta necesita el índice de Firestore configurado para el historial de intentos.",
          );
        } else {
          setError("No fue posible cargar tus estadísticas.");
        }
      } finally {
        setLoading(false);
      }
    };

    unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      cargarIntentos(user);
    });

    return () => {
      if (unsubscribeAuth) {
        unsubscribeAuth();
      }
    };
  }, []);

  const actividadesCompletadas = useMemo(() => {
    return intentos.filter(
      (intento) =>
        intento.estado === "completado" ||
        intento.estado === "finalizado" ||
        intento.estado === "aprobado",
    ).length;
  }, [intentos]);

  const porcentajeAciertos = useMemo(() => {
    if (intentos.length === 0) return 0;

    const totalAciertos = intentos.reduce(
      (total, intento) => total + intento.aciertos,
      0,
    );

    const totalPreguntas = intentos.reduce(
      (total, intento) => total + intento.totalPreguntas,
      0,
    );

    if (totalPreguntas === 0) return 0;

    return Math.round((totalAciertos / totalPreguntas) * 100);
  }, [intentos]);

  const historialFiltrado = useMemo(() => {
    if (filtro === "todos") {
      return intentos;
    }

    if (filtro === "completadas") {
      return intentos.filter(
        (intento) =>
          intento.estado === "completado" ||
          intento.estado === "finalizado" ||
          intento.estado === "aprobado",
      );
    }

    if (filtro === "pendientes") {
      return intentos.filter(
        (intento) =>
          intento.estado !== "completado" &&
          intento.estado !== "finalizado" &&
          intento.estado !== "aprobado",
      );
    }

    return intentos;
  }, [intentos, filtro]);

  return (
    <section className="statistics-page">
      <header className="statistics-header">
        <div>
          <span className="statistics-eyebrow">Mi progreso</span>
          <h1>Estadísticas</h1>
          <p>
            Consulta tus resultados y revisa el historial de actividades que has
            realizado.
          </p>
        </div>
      </header>

      {loading && (
        <div className="statistics-state">
          <div className="statistics-spinner"></div>
          <p>Cargando tus estadísticas...</p>
        </div>
      )}

      {!loading && error && (
        <div className="statistics-state statistics-error">
          <span className="statistics-state-icon">⚠️</span>
          <h2>No se pudieron cargar las estadísticas</h2>
          <p>{error}</p>
        </div>
      )}

      {!loading && !error && (
        <>
          <div className="statistics-cards">
            <article className="statistics-card">
              <div className="statistics-card-icon">🎯</div>
              <div>
                <span>Porcentaje de aciertos</span>
                <strong>{porcentajeAciertos}%</strong>
              </div>
            </article>

            <article className="statistics-card">
              <div className="statistics-card-icon">✅</div>
              <div>
                <span>Actividades completadas</span>
                <strong>{actividadesCompletadas}</strong>
              </div>
            </article>

            <article className="statistics-card">
              <div className="statistics-card-icon">📚</div>
              <div>
                <span>Intentos registrados</span>
                <strong>{intentos.length}</strong>
              </div>
            </article>
          </div>

          <section className="statistics-history">
            <div className="statistics-history-header">
              <div>
                <h2>Historial de actividades</h2>
                <p>
                  Tus actividades aparecen de la más reciente a la más antigua.
                </p>
              </div>

              <div className="statistics-filter">
                <label htmlFor="filtro-estadisticas">Filtrar</label>
                <select
                  id="filtro-estadisticas"
                  value={filtro}
                  onChange={(event) => setFiltro(event.target.value)}
                >
                  <option value="todos">Todos</option>
                  <option value="completadas">Completadas</option>
                  <option value="pendientes">Pendientes</option>
                </select>
              </div>
            </div>

            {historialFiltrado.length === 0 ? (
              <div className="statistics-empty">
                <span>📖</span>
                <h3>No hay actividades para mostrar</h3>
                <p>
                  Cuando realices actividades, aquí podrás consultar tus
                  resultados.
                </p>
              </div>
            ) : (
              <div className="statistics-list">
                {historialFiltrado.map((intento) => (
                  <article className="statistics-history-item" key={intento.id}>
                    <div className="statistics-history-icon">
                      {obtenerIconoEstado(intento.estado)}
                    </div>

                    <div className="statistics-history-main">
                      <h3>{intento.actividadTitulo}</h3>

                      <div className="statistics-history-details">
                        <span>
                          {intento.aciertos}/{intento.totalPreguntas} aciertos
                        </span>

                        <span>{intento.porcentaje}% de aciertos</span>

                        <span>{formatearFecha(intento.fechaCreacion)}</span>
                      </div>
                    </div>

                    <div className="statistics-history-result">
                      <strong>{intento.porcentaje}%</strong>
                      <span className={obtenerClaseEstado(intento.estado)}>
                        {formatearEstado(intento.estado)}
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </section>
  );
};

function calcularPorcentaje(aciertos, total) {
  if (!total) return 0;

  return Math.round((aciertos / total) * 100);
}

function convertirFecha(fecha) {
  if (!fecha) return null;

  if (typeof fecha.toDate === "function") {
    return fecha.toDate();
  }

  if (fecha instanceof Date) {
    return fecha;
  }

  const fechaConvertida = new Date(fecha);

  return Number.isNaN(fechaConvertida.getTime()) ? null : fechaConvertida;
}

function formatearFecha(fecha) {
  if (!fecha) return "Fecha no disponible";

  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(fecha);
}

function formatearEstado(estado) {
  switch (estado) {
    case "completado":
      return "Completada";

    case "finalizado":
      return "Finalizada";

    case "aprobado":
      return "Aprobada";

    case "pendiente":
      return "Pendiente";

    default:
      return "Registrada";
  }
}

function obtenerClaseEstado(estado) {
  switch (estado) {
    case "completado":
    case "finalizado":
    case "aprobado":
      return "status-success";

    case "pendiente":
      return "status-pending";

    default:
      return "status-neutral";
  }
}

function obtenerIconoEstado(estado) {
  switch (estado) {
    case "completado":
    case "finalizado":
    case "aprobado":
      return "✓";

    case "pendiente":
      return "⏳";

    default:
      return "📝";
  }
}

export default Statistics;
