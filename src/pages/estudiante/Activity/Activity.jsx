// src/pages/estudiante/Activity/Activity.jsx

import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";

import useActivity from "../../../hooks/useActivity";
import QuestionCard from "../../../components/QuestionCard";
import FeedbackPanel from "../../../components/FeedbackPanel";

import "./Activity.css";

const Activity = () => {
  const { actividadId } = useParams();

  const {
    preguntas,
    respuestas,
    resultado,
    cargando,
    enviando,
    error,
    cargarActividad,
    seleccionarRespuesta,
    enviarRespuestas,
  } = useActivity(actividadId);

  const [preguntaActual, setPreguntaActual] = useState(0);
  const [errorLocal, setErrorLocal] = useState("");

  useEffect(() => {
    if (typeof cargarActividad === "function") {
      cargarActividad();
    }
  }, [cargarActividad]);

  const handleRespuesta = (preguntaId, respuesta) => {
    setErrorLocal("");

    if (typeof seleccionarRespuesta === "function") {
      seleccionarRespuesta(preguntaId, respuesta);
    }
  };

  const handleEnviar = async () => {
    if (enviando) {
      return;
    }

    const preguntasSinResponder = preguntas.filter(
      (pregunta) => respuestas?.[pregunta.id] === undefined
    );

    if (preguntasSinResponder.length > 0) {
      setErrorLocal("Debes responder todas las preguntas antes de enviar.");
      return;
    }

    try {
      setErrorLocal("");

      if (typeof enviarRespuestas === "function") {
        await enviarRespuestas();
      }
    } catch (err) {
      console.error("Error enviando respuestas:", err);
      setErrorLocal(
        "No fue posible enviar la actividad. Puedes intentarlo nuevamente."
      );
    }
  };

  if (cargando) {
    return (
      <main className="activity-page">
        <section className="activity-state">
          <div className="activity-spinner" />
          <p>Cargando actividad...</p>
        </section>
      </main>
    );
  }

  if (error && !preguntas?.length) {
    return (
      <main className="activity-page">
        <section className="activity-state activity-state--error">
          <h2>No se pudo cargar la actividad</h2>
          <p>{error}</p>

          {typeof cargarActividad === "function" && (
            <button
              type="button"
              className="activity-button"
              onClick={cargarActividad}
            >
              Intentar nuevamente
            </button>
          )}
        </section>
      </main>
    );
  }

  if (!preguntas || preguntas.length === 0) {
    return (
      <main className="activity-page">
        <section className="activity-state">
          <h2>Actividad sin preguntas</h2>
          <p>
            Esta actividad todavía no tiene preguntas disponibles para
            resolver.
          </p>

          <Link to="/estudiante" className="activity-secondary-button">
            Volver
          </Link>
        </section>
      </main>
    );
  }

  const actividadRespondida = Boolean(resultado);

  if (actividadRespondida) {
    return (
      <main className="activity-page">
        <section className="activity-container">
          <FeedbackPanel
            resultado={resultado}
            porcentaje={
              resultado.porcentajeAciertos ??
              resultado.porcentaje ??
              resultado.porcentajeFinal
            }
          />

          <div className="activity-final-result">
            <span className="activity-final-result__label">
              Porcentaje final confirmado por el servidor
            </span>

            <strong className="activity-final-result__percentage">
              {resultado.porcentajeAciertos ??
                resultado.porcentaje ??
                resultado.porcentajeFinal ??
                0}
              %
            </strong>
          </div>

          <div className="activity-actions">
            <Link to="/estudiante" className="activity-secondary-button">
              Volver al inicio
            </Link>
          </div>
        </section>
      </main>
    );
  }

  const pregunta = preguntas[preguntaActual];
  const respuestaSeleccionada = respuestas?.[pregunta.id];

  return (
    <main className="activity-page">
      <section className="activity-container">
        <header className="activity-header">
          <div>
            <span className="activity-label">Actividad</span>
            <h1>Comprueba tu comprensión</h1>
          </div>

          <span className="activity-progress">
            {preguntaActual + 1} / {preguntas.length}
          </span>
        </header>

        <div className="activity-progress-bar">
          <span
            style={{
              width: `${
                ((preguntaActual + 1) / preguntas.length) * 100
              }%`,
            }}
          />
        </div>

        <section className="activity-question">
          <QuestionCard
            pregunta={pregunta}
            respuestaSeleccionada={respuestaSeleccionada}
            respuesta={respuestaSeleccionada}
            onRespuesta={(respuesta) =>
              handleRespuesta(pregunta.id, respuesta)
            }
            onSelectAnswer={(respuesta) =>
              handleRespuesta(pregunta.id, respuesta)
            }
            disabled={enviando}
          />
        </section>

        {(errorLocal || error) && (
          <div className="activity-error" role="alert">
            <span>{errorLocal || error}</span>

            {error && !errorLocal && (
              <button
                type="button"
                onClick={() => setErrorLocal("")}
                className="activity-error__close"
              >
                Cerrar
              </button>
            )}
          </div>
        )}

        <footer className="activity-navigation">
          <button
            type="button"
            className="activity-secondary-button"
            onClick={() =>
              setPreguntaActual((actual) => Math.max(actual - 1, 0))
            }
            disabled={preguntaActual === 0 || enviando}
          >
            Anterior
          </button>

          {preguntaActual < preguntas.length - 1 ? (
            <button
              type="button"
              className="activity-button"
              onClick={() => {
                if (respuestaSeleccionada === undefined) {
                  setErrorLocal("Responde esta pregunta antes de continuar.");
                  return;
                }

                setErrorLocal("");
                setPreguntaActual((actual) =>
                  Math.min(actual + 1, preguntas.length - 1)
                );
              }}
              disabled={enviando}
            >
              Siguiente
            </button>
          ) : (
            <button
              type="button"
              className="activity-button"
              onClick={handleEnviar}
              disabled={enviando}
            >
              {enviando ? "Enviando..." : "Enviar respuestas"}
            </button>
          )}
        </footer>
      </section>
    </main>
  );
};

export default Activity;