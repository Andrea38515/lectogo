import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../../hooks/useAuth";
import {
  getAllLogros,
  getLogrosByEstudiante,
} from "../../../repositories/logrosRepository";
import "./Achievements.css";

const obtenerTextoCriterio = (logro) => {
  const valor = logro.criterioValor;

  switch (logro.criterioTipo) {
    case "racha":
      return `Completar actividades durante ${valor} días consecutivos.`;

    case "actividades":
      return `Completar ${valor} actividades.`;

    case "desempeño":
      return `Alcanzar un desempeño de ${valor}%.`;

    default:
      return "Cumplir el criterio establecido para este logro.";
  }
};

const Achievements = () => {
  const { user } = useAuth();
  const uid = user?.uid;

  const [logros, setLogros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const cargarLogros = useCallback(async () => {
    if (!uid) {
      setLogros([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const [catalogo, obtenidos] = await Promise.all([
        getAllLogros(),
        getLogrosByEstudiante(uid),
      ]);

      const logrosObtenidos = new Set(
        obtenidos
          .map((logro) => logro.logroId)
          .filter(Boolean)
      );

      const logrosCombinados = catalogo.map((logro) => ({
        ...logro,
        obtenido: logrosObtenidos.has(logro.id),
      }));

      setLogros(logrosCombinados);
    } catch (err) {
      console.error("Error al cargar los logros:", err);
      setError("No se pudieron cargar los logros.");
    } finally {
      setLoading(false);
    }
  }, [uid]);

  useEffect(() => {
    cargarLogros();
  }, [cargarLogros]);

  if (loading) {
    return (
      <section className="achievements">
        <header className="achievements__header">
          <h1>Mis logros</h1>
          <p>Cargando tus logros...</p>
        </header>

        <div className="achievements__loading">
          <span className="achievements__spinner" />
          <span>Consultando logros...</span>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="achievements">
        <header className="achievements__header">
          <h1>Mis logros</h1>
        </header>

        <div className="achievements__error">
          <span className="achievements__error-icon">⚠️</span>
          <h2>No se pudieron cargar los logros</h2>
          <p>{error}</p>

          <button
            type="button"
            className="achievements__retry"
            onClick={cargarLogros}
          >
            Reintentar
          </button>
        </div>
      </section>
    );
  }

  if (logros.length === 0) {
    return (
      <section className="achievements">
        <header className="achievements__header">
          <h1>Mis logros</h1>
          <p>Consulta los logros que puedes conseguir.</p>
        </header>

        <div className="achievements__empty">
          <span className="achievements__empty-icon">🏆</span>
          <h2>No hay logros disponibles</h2>
          <p>
            El catálogo de logros todavía no tiene elementos para mostrar.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="achievements">
      <header className="achievements__header">
        <div>
          <h1>Mis logros</h1>
          <p>Completa actividades y alcanza nuevos objetivos.</p>
        </div>

        <div className="achievements__counter">
          <strong>
            {logros.filter((logro) => logro.obtenido).length}
          </strong>
          <span>de {logros.length} obtenidos</span>
        </div>
      </header>

      <div className="achievements__grid">
        {logros.map((logro) => (
          <article
            key={logro.id}
            className={`achievement-card ${
              logro.obtenido ? "achievement-card--obtained" : ""
            }`}
          >
            <div className="achievement-card__icon">
              {logro.iconoUrl ? (
                <img
                  src={logro.iconoUrl}
                  alt={`Icono de ${logro.nombre}`}
                />
              ) : (
                <span aria-hidden="true">🏆</span>
              )}
            </div>

            <div className="achievement-card__content">
              <div className="achievement-card__top">
                <h2>{logro.nombre}</h2>

                <span
                  className={`achievement-card__status ${
                    logro.obtenido
                      ? "achievement-card__status--obtained"
                      : "achievement-card__status--pending"
                  }`}
                >
                  {logro.obtenido ? "Obtenido" : "Pendiente"}
                </span>
              </div>

              {logro.descripcion && (
                <p className="achievement-card__description">
                  {logro.descripcion}
                </p>
              )}

              {!logro.obtenido && (
                <p className="achievement-card__criterion">
                  <strong>Criterio:</strong>{" "}
                  {obtenerTextoCriterio(logro)}
                </p>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
};

export default Achievements;