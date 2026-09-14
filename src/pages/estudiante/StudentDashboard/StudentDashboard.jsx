
import React, { useMemo } from "react";
import "./StudentDashboard.css";

const StudentDashboard = () => {
  /*
   * Datos temporales.
   * Posteriormente pueden reemplazarse por información
   * proveniente de los hooks de actividades y resultados.
   */
  const student = {
    name: "Estudiante",
    level: "Nivel 11",
    avatar: "👩‍🎓",
  };

  const activities = [
    {
      id: 1,
      title: "Comprensión lectora",
      subject: "Lenguaje",
      progress: 75,
      questions: 10,
      completed: false,
    },
    {
      id: 2,
      title: "Pensamiento crítico",
      subject: "Filosofía",
      progress: 40,
      questions: 8,
      completed: false,
    },
    {
      id: 3,
      title: "Literatura universal",
      subject: "Literatura",
      progress: 100,
      questions: 12,
      completed: true,
    },
  ];

  const stats = useMemo(() => {
    const completed = activities.filter(
      (activity) => activity.completed
    ).length;

    const averageProgress =
      activities.length > 0
        ? Math.round(
            activities.reduce(
              (total, activity) => total + activity.progress,
              0
            ) / activities.length
          )
        : 0;

    return {
      completed,
      total: activities.length,
      averageProgress,
    };
  }, []);

  return (
    <main className="student-dashboard">
      {/* =========================
          HEADER
      ========================= */}
      <section className="dashboard-header">
        <div className="welcome-section">
          <div className="student-avatar">
            {student.avatar}
          </div>

          <div>
            <span className="dashboard-eyebrow">
              PANEL DEL ESTUDIANTE
            </span>

            <h1>
              ¡Hola, {student.name}! 👋
            </h1>

            <p>
              Continúa aprendiendo y alcanza tus objetivos.
            </p>
          </div>
        </div>

        <div className="student-level">
          <span>Tu nivel</span>
          <strong>{student.level}</strong>
        </div>
      </section>

      {/* =========================
          STATS
      ========================= */}
      <section className="dashboard-stats">
        <article className="stat-card">
          <div className="stat-icon purple">
            📚
          </div>

          <div>
            <span>Actividades</span>
            <strong>{stats.total}</strong>
          </div>
        </article>

        <article className="stat-card">
          <div className="stat-icon green">
            ✅
          </div>

          <div>
            <span>Completadas</span>
            <strong>{stats.completed}</strong>
          </div>
        </article>

        <article className="stat-card">
          <div className="stat-icon blue">
            📈
          </div>

          <div>
            <span>Progreso</span>
            <strong>{stats.averageProgress}%</strong>
          </div>
        </article>

        <article className="stat-card">
          <div className="stat-icon orange">
            🏆
          </div>

          <div>
            <span>Logros</span>
            <strong>3</strong>
          </div>
        </article>
      </section>

      {/* =========================
          MAIN CONTENT
      ========================= */}
      <section className="dashboard-grid">

        {/* Actividades */}
        <div className="dashboard-panel activities-panel">
          <div className="panel-header">
            <div>
              <h2>Mis actividades</h2>
              <p>Continúa donde lo dejaste</p>
            </div>

            <button
              className="view-all-button"
              type="button"
            >
              Ver todas
            </button>
          </div>

          <div className="activity-list">
            {activities.map((activity) => (
              <article
                className="dashboard-activity"
                key={activity.id}
              >
                <div className="activity-icon">
                  {activity.completed
                    ? "✅"
                    : "📖"}
                </div>

                <div className="activity-info">
                  <div className="activity-title-row">
                    <div>
                      <span className="activity-subject">
                        {activity.subject}
                      </span>

                      <h3>{activity.title}</h3>
                    </div>

                    <strong>
                      {activity.progress}%
                    </strong>
                  </div>

                  <div className="progress-track">
                    <div
                      className="progress-fill"
                      style={{
                        width: `${activity.progress}%`,
                      }}
                    />
                  </div>

                  <span className="activity-questions">
                    {activity.questions} preguntas
                  </span>
                </div>

                <button
                  className={`activity-button ${
                    activity.completed
                      ? "completed"
                      : ""
                  }`}
                  type="button"
                >
                  {activity.completed
                    ? "Revisar"
                    : "Continuar"}
                </button>
              </article>
            ))}
          </div>
        </div>

        {/* Progreso */}
        <aside className="dashboard-panel progress-panel">
          <div className="panel-header">
            <div>
              <h2>Mi progreso</h2>
              <p>Resumen de aprendizaje</p>
            </div>
          </div>

          <div className="progress-circle-container">
            <div className="progress-circle">
              <div className="progress-circle-inner">
                <strong>{stats.averageProgress}%</strong>
                <span>Progreso</span>
              </div>
            </div>
          </div>

          <div className="progress-summary">
            <div>
              <span>Actividades realizadas</span>
              <strong>
                {stats.completed}/{stats.total}
              </strong>
            </div>

            <div>
              <span>Rendimiento</span>
              <strong>Excelente</strong>
            </div>

            <div>
              <span>Racha actual</span>
              <strong>5 días 🔥</strong>
            </div>
          </div>
        </aside>
      </section>

      {/* =========================
          QUICK ACCESS
      ========================= */}
      <section className="quick-section">
        <div className="panel-header">
          <div>
            <h2>Accesos rápidos</h2>
            <p>Encuentra rápidamente lo que necesitas</p>
          </div>
        </div>

        <div className="quick-grid">
          <button
            className="quick-card"
            type="button"
          >
            <span className="quick-icon">📚</span>

            <div>
              <strong>Biblioteca</strong>
              <span>
                Explora recursos educativos
              </span>
            </div>

            <span className="quick-arrow">→</span>
          </button>

          <button
            className="quick-card"
            type="button"
          >
            <span className="quick-icon">📝</span>

            <div>
              <strong>Actividades</strong>
              <span>
                Continúa tus ejercicios
              </span>
            </div>

            <span className="quick-arrow">→</span>
          </button>

          <button
            className="quick-card"
            type="button"
          >
            <span className="quick-icon">🏆</span>

            <div>
              <strong>Mis logros</strong>
              <span>
                Revisa tus recompensas
              </span>
            </div>

            <span className="quick-arrow">→</span>
          </button>
        </div>
      </section>
    </main>
  );
};

export default StudentDashboard;