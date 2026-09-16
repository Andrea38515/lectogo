import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useActivity } from "../../../hooks/useActivity";
import "./Activity.css";

const Activity = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Todas");

  const {
    activities = [],
    isLoading,
    error,
    refetch,
  } = useActivity();

  const categories = useMemo(() => {
    const values = activities
      .map(
        (activity) =>
          activity.category ||
          activity.categoria ||
          activity.tipo
      )
      .filter(Boolean);

    return ["Todas", ...new Set(values)];
  }, [activities]);

  const filteredActivities = useMemo(() => {
    return activities.filter((activity) => {
      const title =
        activity.title ||
        activity.titulo ||
        activity.name ||
        activity.nombre ||
        "";

      const description =
        activity.description ||
        activity.descripcion ||
        "";

      const category =
        activity.category ||
        activity.categoria ||
        activity.tipo ||
        "";

      const searchValue = search.toLowerCase().trim();

      const matchesSearch =
        title.toLowerCase().includes(searchValue) ||
        description.toLowerCase().includes(searchValue);

      const matchesCategory =
        selectedCategory === "Todas" ||
        category === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [activities, search, selectedCategory]);

  const handleStartActivity = (activity) => {
    const id = activity.id || activity._id;

    if (id) {
      navigate(`/estudiante/actividades/${id}`);
    }
  };

  if (isLoading) {
    return (
      <main className="activity">
        <div className="activity__loading">
          <div className="activity__spinner"></div>
          <p>Cargando actividades...</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="activity">
        <div className="activity__error">
          <div className="activity__error-icon">⚠️</div>

          <h2>No pudimos cargar las actividades</h2>

          <p>
            Ocurrió un problema al obtener las actividades.
            Intenta nuevamente.
          </p>

          <button
            type="button"
            className="activity__button"
            onClick={() => refetch()}
          >
            Intentar nuevamente
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="activity">
      <header className="activity__header">
        <div>
          <span className="activity__eyebrow">
            📝 FocUsly
          </span>

          <h1 className="activity__title">
            Actividades
          </h1>

          <p className="activity__description">
            Practica tus habilidades y fortalece tu
            comprensión lectora mediante actividades
            interactivas.
          </p>
        </div>
      </header>

      <section className="activity__toolbar">
        <div className="activity__search-wrapper">
          <span className="activity__search-icon">
            🔎
          </span>

          <input
            type="text"
            className="activity__search"
            placeholder="Buscar actividad..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />

          {search && (
            <button
              type="button"
              className="activity__clear"
              onClick={() => setSearch("")}
              aria-label="Limpiar búsqueda"
            >
              ×
            </button>
          )}
        </div>

        <div className="activity__categories">
          {categories.map((category) => (
            <button
              key={category}
              type="button"
              className={`activity__category ${
                selectedCategory === category
                  ? "activity__category--active"
                  : ""
              }`}
              onClick={() => setSelectedCategory(category)}
            >
              {category}
            </button>
          ))}
        </div>
      </section>

      <section className="activity__summary">
        <div>
          <h2>Mis actividades</h2>

          <p>
            {filteredActivities.length} actividad
            {filteredActivities.length !== 1 ? "es" : ""}
            disponible
            {filteredActivities.length !== 1 ? "s" : ""}
          </p>
        </div>
      </section>

      {filteredActivities.length === 0 ? (
        <section className="activity__empty">
          <div className="activity__empty-icon">
            📚
          </div>

          <h3>No encontramos actividades</h3>

          <p>
            Intenta cambiar la búsqueda o seleccionar otra
            categoría.
          </p>

          <button
            type="button"
            className="activity__button"
            onClick={() => {
              setSearch("");
              setSelectedCategory("Todas");
            }}
          >
            Limpiar filtros
          </button>
        </section>
      ) : (
        <section className="activity__grid">
          {filteredActivities.map((activity) => {
            const id = activity.id || activity._id;

            const title =
              activity.title ||
              activity.titulo ||
              activity.name ||
              activity.nombre ||
              "Actividad";

            const description =
              activity.description ||
              activity.descripcion ||
              "Actividad interactiva para fortalecer tus conocimientos.";

            const category =
              activity.category ||
              activity.categoria ||
              activity.tipo ||
              "Comprensión lectora";

            const difficulty =
              activity.difficulty ||
              activity.dificultad ||
              "Intermedio";

            const duration =
              activity.duration ||
              activity.duracion ||
              "15 min";

            const progress = Math.min(
              Math.max(
                Number(
                  activity.progress ||
                    activity.progreso ||
                    0
                ),
                0
              ),
              100
            );

            return (
              <article
                key={id || title}
                className="activity__card"
              >
                <div className="activity__card-header">
                  <div className="activity__card-icon">
                    {activity.icon || "📖"}
                  </div>

                  <span className="activity__difficulty">
                    {difficulty}
                  </span>
                </div>

                <span className="activity__tag">
                  {category}
                </span>

                <h3 className="activity__card-title">
                  {title}
                </h3>

                <p className="activity__card-description">
                  {description}
                </p>

                <div className="activity__card-info">
                  <span>⏱️ {duration}</span>
                  <span>📖 Lectura</span>
                </div>

                {progress > 0 && (
                  <div className="activity__progress">
                    <div className="activity__progress-header">
                      <span>Progreso</span>
                      <span>{progress}%</span>
                    </div>

                    <div className="activity__progress-bar">
                      <div
                        className="activity__progress-fill"
                        style={{
                          width: `${progress}%`,
                        }}
                      ></div>
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  className="activity__start"
                  onClick={() =>
                    handleStartActivity(activity)
                  }
                >
                  {progress > 0
                    ? "Continuar actividad"
                    : "Comenzar actividad"}

                  <span>→</span>
                </button>
              </article>
            );
          })}
        </section>
      )}
    </main>
  );
};

export default Activity;