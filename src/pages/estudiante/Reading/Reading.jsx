import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useLectura } from "../../../hooks/useLectura";
import "./Reading.css";

const Reading = () => {
  const { lecturaId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const { estado, lectura, categoria, reintentar } = useLectura(lecturaId);

  const [fontSize, setFontSize] = useState("medium");
  const [progreso, setProgreso] = useState(0);

  /*
   * La misma pantalla vive en dos rutas: dentro del área del estudiante y
   * en la biblioteca pública. "Volver" tiene que respetar de dónde vino.
   */
  const esAreaEstudiante = location.pathname.startsWith("/estudiante");
  const rutaBiblioteca = esAreaEstudiante ? "/estudiante/biblioteca" : "/biblioteca";

  // StudentLayout ya da margen lateral en móvil; PublicLayout no.
  const claseRaiz = esAreaEstudiante ? "reading-page" : "reading-page reading-page--publica";

  const hayLectura = estado === "ok";

  useEffect(() => {
    if (!hayLectura) {
      return undefined;
    }

    const actualizarProgreso = () => {
      const scrollTop = window.scrollY;
      const altura = document.documentElement.scrollHeight - window.innerHeight;

      if (altura <= 0) {
        setProgreso(0);
        return;
      }

      const porcentaje = Math.min(100, Math.round((scrollTop / altura) * 100));

      setProgreso(porcentaje);
    };

    window.addEventListener("scroll", actualizarProgreso, { passive: true });

    // Sin esto, un valor viejo (otra lectura o scroll restaurado por el
    // navegador) se queda hasta el próximo evento de scroll.
    const frame = window.requestAnimationFrame(actualizarProgreso);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", actualizarProgreso);
    };
  }, [hayLectura]);

  const irABiblioteca = () => {
    navigate(rutaBiblioteca);
  };

  /* ==============================
     ESTADO: CARGANDO
     ============================== */

  if (estado === "cargando") {
    return (
      <div className={claseRaiz}>
        <div className="reading-loading" role="status">
          <div className="reading-spinner"></div>
          <p>Cargando lectura...</p>
        </div>
      </div>
    );
  }

  /* ==============================
     ESTADO: ERROR
     ============================== */

  if (estado === "error") {
    return (
      <div className={claseRaiz}>
        <div className="reading-error" role="alert">
          <div className="reading-error-icon">⚠️</div>

          <h2>Ocurrió un error</h2>

          <p>No fue posible cargar la lectura. Intenta nuevamente.</p>

          <div className="reading-error-actions">
            <button
              className="reading-action-button primary"
              onClick={reintentar}
            >
              Intentar nuevamente
            </button>

            <button
              className="reading-action-button secondary"
              onClick={irABiblioteca}
            >
              Volver a la biblioteca
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ==============================
     ESTADO: NO DISPONIBLE
     (no existe, no está publicada o no se tiene permiso: Firestore
     no distingue entre estos casos y tampoco debemos hacerlo nosotros)
     ============================== */

  if (estado === "no-disponible") {
    return (
      <div className={claseRaiz}>
        <div className="reading-error">
          <div className="reading-error-icon">📖</div>

          <h2>Lectura no disponible</h2>

          <p>
            La lectura que estás buscando no existe o ya no está disponible.
          </p>

          <div className="reading-error-actions">
            <button
              className="reading-action-button primary"
              onClick={irABiblioteca}
            >
              Volver a la biblioteca
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ==============================
     LECTURA
     ============================== */

  const parrafos = lectura.contenido
    .split(/\r?\n\s*\r?\n/)
    .map((texto) => texto.trim())
    .filter(Boolean);

  return (
    <div className={claseRaiz}>
      {/* HEADER */}

      <header className="reading-header">
        <div className="reading-header-content">
          <button className="reading-back-button" onClick={irABiblioteca}>
            ← Volver
          </button>

          <div className="reading-header-title">{lectura.titulo}</div>
        </div>

        {/* PROGRESO */}

        <div className="reading-progress-container">
          <div
            className="reading-progress-bar"
            style={{ width: `${progreso}%` }}
          ></div>
        </div>
      </header>

      {/* CONTENIDO PRINCIPAL */}

      <div className="reading-main">
        <section className="reading-info">
          <span className="reading-category">{categoria}</span>

          <h1 className="reading-title">{lectura.titulo}</h1>

          {lectura.nivelDificultad ? (
            <span className="reading-difficulty">
              Nivel: {lectura.nivelDificultad}
            </span>
          ) : null}
        </section>

        {/* CONTROLES DE TEXTO */}

        <div className="reading-controls">
          <span className="reading-controls-label">Tamaño del texto:</span>

          <button
            className={`reading-size-button ${
              fontSize === "small" ? "active" : ""
            }`}
            onClick={() => setFontSize("small")}
            aria-pressed={fontSize === "small"}
          >
            A-
          </button>

          <button
            className={`reading-size-button ${
              fontSize === "medium" ? "active" : ""
            }`}
            onClick={() => setFontSize("medium")}
            aria-pressed={fontSize === "medium"}
          >
            A
          </button>

          <button
            className={`reading-size-button ${
              fontSize === "large" ? "active" : ""
            }`}
            onClick={() => setFontSize("large")}
            aria-pressed={fontSize === "large"}
          >
            A+
          </button>
        </div>

        {/* TEXTO */}

        <article className="reading-article">
          <div className={`reading-content font-${fontSize}`}>
            {parrafos.map((parrafo, index) => (
              <p key={index}>{parrafo}</p>
            ))}
          </div>
        </article>

        {/* FINALIZACIÓN */}

        {progreso >= 90 ? (
          <div className="reading-complete">
            ✓ Has avanzado hasta el final de la lectura.
          </div>
        ) : null}

        {/* ACCIONES */}

        <div className="reading-actions">
          <button
            className="reading-action-button secondary"
            onClick={irABiblioteca}
          >
            ← Biblioteca
          </button>
        </div>
      </div>
    </div>
  );
};

export default Reading;
