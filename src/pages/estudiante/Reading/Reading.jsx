import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import "./Reading.css";

const lecturasDemo = [
  {
    id: "1",
    titulo: "El principito",
    autor: "Antoine de Saint-Exupéry",
    categoria: "Literatura",
    nivelDificultad: "Fácil",
    contenido: `
      Había una vez un pequeño príncipe que vivía en un planeta muy pequeño.

      Desde allí observaba las estrellas y soñaba con conocer otros lugares.

      Durante su viaje descubrió que cada persona puede ver el mundo de una
      manera diferente y que algunas cosas importantes no siempre son visibles
      a simple vista.
    `,
    actividadId: "1",
    estado: "publicado",
  },
  {
    id: "2",
    titulo: "La importancia de leer",
    autor: "LectoGo",
    categoria: "Comprensión lectora",
    nivelDificultad: "Medio",
    contenido: `
      Leer es una actividad que permite conocer nuevas ideas, ampliar el
      vocabulario y desarrollar la imaginación.

      La lectura también ayuda a comprender diferentes puntos de vista y a
      construir nuevos conocimientos.
    `,
    actividadId: "2",
    estado: "publicado",
  },
];

const Reading = () => {
  const { lecturaId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [lectura, setLectura] = useState(null);
  const [estado, setEstado] = useState("cargando");
  const [fontSize, setFontSize] = useState("medium");
  const [favorita, setFavorita] = useState(false);
  const [progreso, setProgreso] = useState(0);

  /*
   * Si la lectura viene desde /biblioteca se permite el acceso público
   * solamente cuando la lectura está publicada.
   */
  const accesoPublico =
    location.pathname.startsWith("/biblioteca") ||
    location.pathname.startsWith("/lecturas/");

  useEffect(() => {
    const cargarLectura = async () => {
      setEstado("cargando");
      setLectura(null);

      try {
        /*
         * Aquí posteriormente se puede reemplazar por:
         *
         * const data = await obtenerLecturaPorId(lecturaId);
         *
         * usando el readingRepository.
         */

        await new Promise((resolve) => setTimeout(resolve, 300));

        const resultado = lecturasDemo.find(
          (item) => String(item.id) === String(lecturaId),
        );

        if (!resultado) {
          setEstado("no-encontrada");
          return;
        }

        /*
         * El acceso público solamente permite lecturas publicadas.
         */
        if (accesoPublico && resultado.estado !== "publicado") {
          setEstado("no-autorizada");
          return;
        }

        setLectura(resultado);
        setEstado("ok");
      } catch (error) {
        console.error("Error cargando lectura:", error);
        setEstado("error");
      }
    };

    if (lecturaId) {
      cargarLectura();
    } else {
      setEstado("no-encontrada");
    }
  }, [lecturaId, accesoPublico]);

  useEffect(() => {
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

    window.addEventListener("scroll", actualizarProgreso);

    return () => {
      window.removeEventListener("scroll", actualizarProgreso);
    };
  }, [lectura]);

  const irABiblioteca = () => {
    navigate("/biblioteca");
  };

  /*
   * IMPORTANTE:
   * Aquí NO usamos lecturaId para la actividad.
   *
   * lectura.id      -> identifica la lectura
   * lectura.actividadId -> identifica la actividad
   */
  const irAActividad = () => {
    if (!lectura?.actividadId) {
      return;
    }

    navigate(`/estudiante/actividades/${lectura.actividadId}`);
  };

  const marcarCompletada = () => {
    setProgreso(100);
  };

  /* ==============================
     ESTADO: CARGANDO
     ============================== */

  if (estado === "cargando") {
    return (
      <div className="reading-page">
        <div className="reading-loading">
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
      <div className="reading-page">
        <div className="reading-error">
          <div className="reading-error-icon">⚠️</div>

          <h2>Ocurrió un error</h2>

          <p>No fue posible cargar la lectura. Intenta nuevamente.</p>

          <button
            className="reading-action-button primary"
            onClick={() => window.location.reload()}
          >
            Intentar nuevamente
          </button>
        </div>
      </div>
    );
  }

  /* ==============================
     ESTADO: NO ENCONTRADA
     ============================== */

  if (estado === "no-encontrada") {
    return (
      <div className="reading-page">
        <div className="reading-error">
          <div className="reading-error-icon">📖</div>

          <h2>Lectura no encontrada</h2>

          <p>
            La lectura que estás buscando no existe o ya no está disponible.
          </p>

          <button
            className="reading-action-button primary"
            onClick={irABiblioteca}
          >
            Volver a la biblioteca
          </button>
        </div>
      </div>
    );
  }

  /* ==============================
     ESTADO: NO AUTORIZADA
     ============================== */

  if (estado === "no-autorizada") {
    return (
      <div className="reading-page">
        <div className="reading-error">
          <div className="reading-error-icon">🔒</div>

          <h2>Lectura no disponible</h2>

          <p>Esta lectura no está disponible mediante el acceso público.</p>

          <button
            className="reading-action-button primary"
            onClick={irABiblioteca}
          >
            Volver a la biblioteca
          </button>
        </div>
      </div>
    );
  }

  /* ==============================
     LECTURA
     ============================== */

  const contenido =
    lectura.contenido
      ?.split("\n")
      .map((texto) => texto.trim())
      .filter(Boolean) || [];

  return (
    <div className="reading-page">
      {/* HEADER */}

      <header className="reading-header">
        <div className="reading-header-content">
          <button className="reading-back-button" onClick={irABiblioteca}>
            ← Volver
          </button>

          <div className="reading-header-title">{lectura.titulo}</div>

          <button
            className={`reading-favorite-button ${favorita ? "active" : ""}`}
            onClick={() => setFavorita(!favorita)}
            aria-label="Marcar como favorita"
          >
            {favorita ? "★" : "☆"}
          </button>
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

      <main className="reading-main">
        <section className="reading-info">
          <span className="reading-category">{lectura.categoria}</span>

          <h1 className="reading-title">{lectura.titulo}</h1>

          <p className="reading-author">
            Por <strong>{lectura.autor}</strong>
          </p>

          <span className="reading-difficulty">
            Nivel: {lectura.nivelDificultad}
          </span>
        </section>

        {/* CONTROLES DE TEXTO */}

        <div className="reading-controls">
          <span className="reading-controls-label">Tamaño del texto:</span>

          <button
            className={`reading-size-button ${
              fontSize === "small" ? "active" : ""
            }`}
            onClick={() => setFontSize("small")}
          >
            A-
          </button>

          <button
            className={`reading-size-button ${
              fontSize === "medium" ? "active" : ""
            }`}
            onClick={() => setFontSize("medium")}
          >
            A
          </button>

          <button
            className={`reading-size-button ${
              fontSize === "large" ? "active" : ""
            }`}
            onClick={() => setFontSize("large")}
          >
            A+
          </button>
        </div>

        {/* TEXTO */}

        <article className="reading-card">
          <div className={`reading-content font-${fontSize}`}>
            {contenido.map((parrafo, index) => (
              <p key={index}>{parrafo}</p>
            ))}
          </div>
        </article>

        {/* FINALIZACIÓN */}

        {progreso >= 90 && (
          <div className="reading-complete">
            ✓ Has avanzado hasta el final de la lectura.
          </div>
        )}

        {/* ACCIONES */}

        <div className="reading-actions">
          <button
            className="reading-action-button secondary"
            onClick={irABiblioteca}
          >
            ← Biblioteca
          </button>

          {lectura.actividadId && (
            <button
              className="reading-action-button primary"
              onClick={irAActividad}
            >
              Ir a la actividad →
            </button>
          )}
        </div>

        {progreso < 90 && lectura.actividadId && (
          <div className="reading-actions">
            <button
              className="reading-action-button secondary"
              onClick={marcarCompletada}
            >
              Marcar lectura como completada
            </button>
          </div>
        )}
      </main>

      {/* NAVEGACIÓN INFERIOR */}

      <nav className="reading-bottom-nav">
        <div className="reading-bottom-nav-content">
          <button
            className="reading-bottom-item active"
            onClick={irABiblioteca}
          >
            <span>📚</span>
            <span>Biblioteca</span>
          </button>

          <button
            className="reading-bottom-item"
            onClick={() => navigate("/estudiante")}
          >
            <span>⌂</span>
            <span>Inicio</span>
          </button>

          <button
            className="reading-bottom-item"
            onClick={() => navigate("/estudiante/perfil")}
          >
            <span>👤</span>
            <span>Perfil</span>
          </button>
        </div>
      </nav>
    </div>
  );
};

export default Reading;
