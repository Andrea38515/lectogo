import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { getLecturas } from "../../../repositories/lecturasRepository";
import { getAllCategorias } from "../../../repositories/categoriasRepository";
import "./PublicLibrary.css";

/*
 * Biblioteca pública (sin sesión).
 *
 * - Lista solo lecturas publicadas (getLecturas ya filtra por estado).
 * - No da acceso a actividades: la lectura se abre en /lecturas/:lecturaId.
 */
const PublicLibrary = () => {
  const [intento, setIntento] = useState(0);
  const [resultado, setResultado] = useState(null);

  // "Cargando" se deriva de que el resultado no sea del intento actual, así
  // el effect no necesita setState síncrono para reiniciar la pantalla.
  const cargando = resultado?.intento !== intento;

  useEffect(() => {
    let cancelado = false;

    const cargar = async () => {
      try {
        const [lecturas, categorias] = await Promise.all([
          getLecturas(),
          // Sin sesión las reglas no dejan listar categorías: se cae a
          // "General" en lugar de mostrar un error.
          getAllCategorias().catch(() => []),
        ]);

        if (cancelado) return;

        const nombres = Object.fromEntries(
          categorias.map((categoria) => [categoria.id, categoria.nombre]),
        );

        setResultado({
          intento,
          error: false,
          lecturas: lecturas.map((lectura) => ({
            id: lectura.id,
            titulo: lectura.titulo,
            nivel: lectura.nivelDificultad,
            categoria: nombres[lectura.categoriaId] || "General",
          })),
        });
      } catch (error) {
        if (cancelado) return;

        console.error("Error cargando la biblioteca pública:", error);
        setResultado({ intento, error: true, lecturas: [] });
      }
    };

    cargar();

    return () => {
      cancelado = true;
    };
  }, [intento]);

  return (
    <section className="public-library">
      <header className="public-library-header">
        <h1>Biblioteca LectoGo</h1>

        <p>Explora nuestras lecturas disponibles para consulta pública.</p>
      </header>

      {cargando ? (
        <div className="public-library-state" role="status">
          <div className="public-library-spinner"></div>
          <p>Cargando lecturas...</p>
        </div>
      ) : null}

      {!cargando && resultado.error ? (
        <div className="public-library-state" role="alert">
          <div className="public-library-state-icon">⚠️</div>

          <h2>No se pudo cargar la biblioteca</h2>

          <p>Ocurrió un problema al obtener las lecturas. Intenta nuevamente.</p>

          <button
            className="public-library-button"
            onClick={() => setIntento((actual) => actual + 1)}
          >
            Intentar nuevamente
          </button>
        </div>
      ) : null}

      {!cargando && !resultado.error && resultado.lecturas.length === 0 ? (
        <div className="public-library-state">
          <div className="public-library-state-icon">📚</div>

          <h2>Aún no hay lecturas disponibles</h2>

          <p>Vuelve pronto: estamos preparando nuevas lecturas para ti.</p>
        </div>
      ) : null}

      {!cargando && !resultado.error && resultado.lecturas.length > 0 ? (
        <div className="public-library-grid">
          {resultado.lecturas.map((lectura) => (
            <article className="public-library-card" key={lectura.id}>
              <div className="public-library-card-top">
                <span className="public-library-category">
                  {lectura.categoria}
                </span>

                {lectura.nivel ? (
                  <span className="public-library-level">{lectura.nivel}</span>
                ) : null}
              </div>

              <h2>{lectura.titulo}</h2>

              <Link
                className="public-library-button"
                to={`/lecturas/${lectura.id}`}
                aria-label={`Leer ${lectura.titulo}`}
              >
                Leer
              </Link>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
};

export default PublicLibrary;
