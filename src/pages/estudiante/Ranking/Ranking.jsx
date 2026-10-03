import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../../hooks/useAuth";
import { getRanking } from "../../../repositories/rankingRepository";
import "./Ranking.css";

const Ranking = () => {
  const { user } = useAuth();
  const uid = user?.uid;

  const [ranking, setRanking] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const cargarRanking = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const datos = await getRanking();
      setRanking(datos);
    } catch (err) {
      console.error("Error al cargar el ranking:", err);
      setError("No se pudo cargar el ranking.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarRanking();
  }, [cargarRanking]);

  if (loading) {
    return (
      <section className="ranking">
        <header className="ranking__header">
          <h1>Ranking</h1>
          <p>Consulta la clasificación por experiencia y logros.</p>
        </header>

        <div className="ranking__loading">
          <span className="ranking__spinner" />
          <span>Cargando ranking...</span>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="ranking">
        <header className="ranking__header">
          <h1>Ranking</h1>
          <p>Consulta la clasificación por experiencia y logros.</p>
        </header>

        <div className="ranking__error">
          <span className="ranking__error-icon">⚠️</span>
          <h2>No se pudo cargar el ranking</h2>
          <p>{error}</p>

          <button
            type="button"
            className="ranking__retry"
            onClick={cargarRanking}
          >
            Reintentar
          </button>
        </div>
      </section>
    );
  }

  if (ranking.length === 0) {
    return (
      <section className="ranking">
        <header className="ranking__header">
          <h1>Ranking</h1>
          <p>Consulta la clasificación por experiencia y logros.</p>
        </header>

        <div className="ranking__empty">
          <span className="ranking__empty-icon">🏆</span>
          <h2>El ranking está vacío</h2>
          <p>
            Todavía no hay estudiantes disponibles para mostrar en la
            clasificación.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="ranking">
      <header className="ranking__header">
        <div>
          <h1>Ranking</h1>
          <p>Clasificación de estudiantes por progreso.</p>
        </div>
      </header>

      <div className="ranking__table-container">
        <table className="ranking__table">
          <thead>
            <tr>
              <th scope="col">Posición</th>
              <th scope="col">Estudiante</th>
              <th scope="col">XP</th>
              <th scope="col">Logros</th>
              <th scope="col">Actividades</th>
            </tr>
          </thead>

          <tbody>
            {ranking.map((estudiante, index) => {
              const esUsuarioActual =
                estudiante.estudianteId === uid;

              const posicion =
                estudiante.position ?? estudiante.posicion ?? index + 1;

              return (
                <tr
                  key={estudiante.id ?? estudiante.estudianteId ?? index}
                  className={
                    esUsuarioActual
                      ? "ranking__row ranking__row--current"
                      : "ranking__row"
                  }
                >
                  <td>
                    <span className="ranking__position">
                      {posicion}
                    </span>
                  </td>

                  <td>
                    <div className="ranking__student">
                      <span className="ranking__avatar">
                        {posicion <= 3
                          ? ["🥇", "🥈", "🥉"][posicion - 1]
                          : "👤"}
                      </span>

                      <div>
                        <span className="ranking__alias">
                          {estudiante.alias || "Estudiante"}
                        </span>

                        {esUsuarioActual && (
                          <span className="ranking__current-label">
                            Tú
                          </span>
                        )}
                      </div>
                    </div>
                  </td>

                  <td>{estudiante.xp ?? 0}</td>

                  <td>{estudiante.logros ?? 0}</td>

                  <td>{estudiante.actividades ?? 0}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="ranking__privacy">
        El ranking utiliza alias para proteger la privacidad de los
        estudiantes.
      </p>
    </section>
  );
};

export default Ranking;