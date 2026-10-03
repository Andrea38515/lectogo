// src/pages/estudiante/Reading/Reading.jsx

import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getLecturaById } from "../../../repositories/lecturasRepository";
import "./Reading.css";

const Reading = () => {
  const { lecturaId } = useParams();

  const [lectura, setLectura] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [noEncontrada, setNoEncontrada] = useState(false);
  const [noAutorizada, setNoAutorizada] = useState(false);

  useEffect(() => {
    const cargarLectura = async () => {
      if (!lecturaId) {
        setNoEncontrada(true);
        setCargando(false);
        return;
      }

      try {
        setCargando(true);
        setError("");
        setNoEncontrada(false);
        setNoAutorizada(false);

        const resultado = await getLecturaById(lecturaId);

        if (!resultado) {
          setNoEncontrada(true);
          return;
        }

        if (
          resultado.estado === "borrador" ||
          resultado.publicada === false
        ) {
          setNoAutorizada(true);
          return;
        }

        setLectura(resultado);
      } catch (err) {
        console.error("Error cargando la lectura:", err);
        setError("No fue posible cargar la lectura.");
      } finally {
        setCargando(false);
      }
    };

    cargarLectura();
  }, [lecturaId]);

  if (cargando) {
    return (
      <main className="reading-page">
        <section className="reading-state">
          <div className="reading-spinner" />
          <p>Cargando lectura...</p>
        </section>
      </main>
    );
  }

  if (error) {
    return (
      <main className="reading-page">
        <section className="reading-state reading-state--error">
          <h2>Ocurrió un error</h2>
          <p>{error}</p>
        </section>
      </main>
    );
  }

  if (noEncontrada) {
    return (
      <main className="reading-page">
        <section className="reading-state">
          <h2>Lectura no encontrada</h2>
          <p>La lectura que buscas no existe o ya no está disponible.</p>
        </section>
      </main>
    );
  }

  if (noAutorizada) {
    return (
      <main className="reading-page">
        <section className="reading-state reading-state--warning">
          <h2>Lectura no disponible</h2>
          <p>
            Esta lectura todavía no está publicada o no tienes autorización
            para verla.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="reading-page">
      <article className="reading-container">
        <header className="reading-header">
          {lectura.categoria && (
            <span className="reading-category">{lectura.categoria}</span>
          )}

          <h1>{lectura.titulo}</h1>

          {lectura.descripcion && (
            <p className="reading-description">{lectura.descripcion}</p>
          )}

          <div className="reading-meta">
            {lectura.dificultad && (
              <span>
                <strong>Dificultad:</strong> {lectura.dificultad}
              </span>
            )}

            {lectura.autor && (
              <span>
                <strong>Autor:</strong> {lectura.autor}
              </span>
            )}
          </div>
        </header>

        <section className="reading-content">
          {lectura.contenido ? (
            <div className="reading-text">{lectura.contenido}</div>
          ) : (
            <p className="reading-empty">
              Esta lectura no tiene contenido disponible.
            </p>
          )}
        </section>

        {lectura.actividadId && (
          <footer className="reading-footer">
            <Link
              to={`/estudiante/actividad/${lectura.actividadId}`}
              className="reading-activity-button"
            >
              Ir a la actividad
            </Link>
          </footer>
        )}
      </article>
    </main>
  );
};

export default Reading;