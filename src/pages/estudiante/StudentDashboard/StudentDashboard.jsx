import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../../hooks/useAuth";
import { getActividadesAsignadas } from "../../../repositories/actividadesRepository";
import XpBar from "../../../components/XpBartx/XpBar";
import LevelBadge from "../../../components/LevelBadge/LevelBadge";

const StudentDashboard = () => {
  const { user } = useAuth();
  const uid = user?.uid;

  const xp = user?.xp ?? 0;
  const nivel = user?.nivel ?? 1;
  const nextLevelXp = user?.nextLevelXp ?? 100;

  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const cargarActividades = async () => {
      if (!uid) {
        setActivities([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const actividades = await getActividadesAsignadas(uid);
        setActivities(actividades);
      } catch (err) {
        console.error("Error al cargar las actividades:", err);
        setError("No se pudieron cargar las actividades.");
      } finally {
        setLoading(false);
      }
    };

    cargarActividades();
  }, [uid]);

  if (loading) {
    return (
      <section className="student-dashboard">
        <h1>Mis actividades</h1>
        <p>Cargando actividades...</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="student-dashboard">
        <h1>Mis actividades</h1>
        <p>{error}</p>
      </section>
    );
  }

  return (
    <section className="student-dashboard">
      <header className="student-dashboard__header">
        <h1>Mis actividades</h1>
        <p>Consulta las actividades que tienes asignadas.</p>
      </header>

      <section className="student-dashboard__gamification">
        <LevelBadge level={nivel} />

        <XpBar
          currentXp={xp}
          nextLevelXp={nextLevelXp}
          level={nivel}
        />
      </section>

      {activities.length === 0 ? (
        <div className="student-dashboard__empty">
          <h2>No tienes actividades asignadas</h2>
          <p>
            Cuando un docente te asigne una actividad, aparecerá aquí.
          </p>
        </div>
      ) : (
        <div className="student-dashboard__activities">
          {activities.map((activity) => (
            <article
              key={activity.id}
              className="student-dashboard__activity-card"
            >
              <div className="student-dashboard__activity-content">
                <h2>
                  {activity.titulo ||
                    activity.actividadTitulo ||
                    "Actividad de comprensión lectora"}
                </h2>

                {activity.estado && (
                  <span className="student-dashboard__activity-status">
                    {activity.estado}
                  </span>
                )}

                {activity.fechaLimite && (
                  <p>
                    Fecha límite:{" "}
                    {activity.fechaLimite?.toDate
                      ? activity.fechaLimite.toDate().toLocaleDateString()
                      : new Date(
                          activity.fechaLimite
                        ).toLocaleDateString()}
                  </p>
                )}
              </div>

              <Link
                to={`/estudiante/actividades/${activity.id}`}
                className="student-dashboard__activity-link"
              >
                Resolver actividad
              </Link>
            </article>
          ))}
        </div>
      )}
    </section>
  );
};

export default StudentDashboard;