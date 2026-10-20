import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import Loading from "../../../components/Loading/Loading";
import XpBar from "../../../components/XpBar/XpBar";
import { useAuth } from "../../../hooks/useAuth";
import { useDashboardEstudiante } from "../../../hooks/useDashboardEstudiante";
import { formatearFecha } from "../../../utils/formatearFecha";
import "./StudentDashboard.css";

const NO_DISPONIBLE = "—";

const RUTA_ACTIVIDADES = "/estudiante/actividades";

// El perfil aún puede no traer nivel: la gamificación se escribe desde el
// servidor y un estudiante nuevo parte en el nivel 1.
const obtenerNivel = (user) => (Number(user?.nivel) > 0 ? Number(user.nivel) : 1);

// Próximo umbral de XP según niveles_config; null si no hay configuración
// legible o el estudiante ya está en el último nivel.
const obtenerXpSiguienteNivel = (niveles, xp) =>
  niveles.find((nivel) => nivel.xpMinimo > xp)?.xpMinimo ?? null;

const limitarPorcentaje = (valor) => Math.min(Math.max(valor, 0), 100);

const StudentDashboard = () => {
  const { user, loading: cargandoPerfil, refreshUser } = useAuth();
  const { isLoading, datos, reintentar } = useDashboardEstudiante();

  // Guarda la URL que falló para no reintentar una foto rota en cada render.
  const [fotoFallida, setFotoFallida] = useState(null);

  // El perfil del contexto se lee una sola vez al iniciar sesión: sin esto, XP,
  // nivel y racha quedarían desactualizados después de resolver una actividad
  // y volver al panel sin recargar la página.
  useEffect(() => {
    refreshUser().catch(() => {});
    // refreshUser cambia de identidad en cada render del contexto; solo
    // interesa refrescar al montar la pantalla.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (cargandoPerfil || isLoading) {
    return (
      <div className="student-dashboard">
        <Loading message="Cargando tu panel..." />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="student-dashboard">
        <div className="dashboard-empty dashboard-error" role="alert">
          <p>
            No pudimos cargar tu perfil. Cierra sesión e inicia de nuevo para
            continuar.
          </p>
        </div>
      </div>
    );
  }

  const nombre = user?.nombre?.trim().split(/\s+/)[0] || "Estudiante";
  const nivel = obtenerNivel(user);
  const xp = Math.max(Number(user?.xp) || 0, 0);
  const racha = Math.max(Number(user?.rachaActual) || 0, 0);
  const mostrarFoto = Boolean(user?.fotoUrl) && fotoFallida !== user.fotoUrl;

  const actividades = datos?.actividades ?? null;
  const totalLogros = datos?.logros ?? null;
  const xpSiguienteNivel = obtenerXpSiguienteNivel(datos?.niveles ?? [], xp);

  // completadas es null cuando los intentos no se pudieron leer: ahí no hay
  // cifra fiable de nada que dependa de ellos.
  const hayIntentos = actividades?.completadas != null;
  const porcentajeCompletado = actividades?.porcentajeCompletado ?? 0;

  return (
    <div className="student-dashboard">
      {/* =========================
          HEADER
      ========================= */}
      <section className="dashboard-header">
        <div className="welcome-section">
          <div className="student-avatar">
            {mostrarFoto ? (
              <img
                src={user.fotoUrl}
                alt={`Foto de ${nombre}`}
                onError={() => setFotoFallida(user.fotoUrl)}
              />
            ) : (
              nombre.charAt(0).toUpperCase()
            )}
          </div>

          <div>
            <span className="dashboard-eyebrow">
              PANEL DEL ESTUDIANTE
            </span>

            <h1>
              ¡Hola, {nombre}! 👋
            </h1>

            <p>
              Continúa aprendiendo y alcanza tus objetivos.
            </p>
          </div>
        </div>

        <div className="student-level">
          <span>Tu nivel</span>
          <strong>Nivel {nivel}</strong>
        </div>
      </section>

      {/* =========================
          STATS
      ========================= */}
      <section className="dashboard-stats">
        <article className="stat-card">
          <div className="stat-icon purple" aria-hidden="true">
            📚
          </div>

          <div>
            <span>Actividades</span>
            <strong>{actividades ? actividades.total : NO_DISPONIBLE}</strong>
          </div>
        </article>

        <article className="stat-card">
          <div className="stat-icon green" aria-hidden="true">
            ✅
          </div>

          <div>
            <span>Completadas</span>
            <strong>{hayIntentos ? actividades.completadas : NO_DISPONIBLE}</strong>
          </div>
        </article>

        <article className="stat-card">
          <div className="stat-icon blue" aria-hidden="true">
            📈
          </div>

          <div>
            <span>Progreso</span>
            <strong>
              {hayIntentos ? `${porcentajeCompletado}%` : NO_DISPONIBLE}
            </strong>
          </div>
        </article>

        <article className="stat-card">
          <div className="stat-icon orange" aria-hidden="true">
            🏆
          </div>

          <div>
            <span>Logros</span>
            <strong>{totalLogros ?? NO_DISPONIBLE}</strong>
          </div>
        </article>
      </section>

      {/* =========================
          MAIN CONTENT
      ========================= */}
      <section className="dashboard-grid">

        {/* Actividades pendientes */}
        <div className="dashboard-panel activities-panel">
          <div className="panel-header">
            <div>
              <h2>Mis actividades</h2>
              <p>Continúa donde lo dejaste</p>
            </div>

            <Link className="view-all-button" to={RUTA_ACTIVIDADES}>
              Ver todas
            </Link>
          </div>

          <div className="activity-list">
            {actividades === null || !hayIntentos ? (
              <div className="dashboard-empty dashboard-error" role="alert">
                <p>
                  {actividades === null
                    ? "No pudimos cargar tus actividades."
                    : "No pudimos comprobar cuáles actividades ya resolviste."}
                </p>

                <button
                  className="activity-button"
                  type="button"
                  onClick={reintentar}
                >
                  Intentar nuevamente
                </button>
              </div>
            ) : actividades.total === 0 ? (
              <div className="dashboard-empty">
                <p>
                  Aún no tienes actividades asignadas. Mientras tanto, explora
                  la biblioteca y empieza a leer.
                </p>

                <Link className="activity-button" to="/estudiante/biblioteca">
                  Ir a la biblioteca
                </Link>
              </div>
            ) : actividades.pendientes.length === 0 ? (
              <div className="dashboard-empty">
                <p>¡Estás al día! No tienes actividades pendientes.</p>
              </div>
            ) : (
              actividades.pendientes.map((actividad) => (
                <article className="dashboard-activity" key={actividad.id}>
                  <div className="activity-icon" aria-hidden="true">
                    📖
                  </div>

                  <div className="activity-info">
                    <div className="activity-title-row">
                      <div>
                        <span className="activity-subject">
                          {actividad.categoria}
                        </span>

                        <h3>{actividad.titulo}</h3>
                      </div>

                      {actividad.vencida ? (
                        <strong className="activity-overdue">Vencida</strong>
                      ) : null}
                    </div>

                    <span className="activity-questions">
                      {actividad.fechaLimite
                        ? `Fecha límite: ${formatearFecha(actividad.fechaLimite)}`
                        : "Sin fecha límite"}
                    </span>
                  </div>

                  <Link
                    className="activity-button"
                    to={`${RUTA_ACTIVIDADES}/${actividad.id}`}
                    aria-label={`${actividad.vencida ? "Ver" : "Resolver"} ${actividad.titulo}`}
                  >
                    {actividad.vencida ? "Ver actividad" : "Resolver"}
                  </Link>
                </article>
              ))
            )}

            {hayIntentos && actividades.totalPendientes > actividades.pendientes.length ? (
              <Link className="view-all-button" to={RUTA_ACTIVIDADES}>
                Y {actividades.totalPendientes - actividades.pendientes.length} más
                por resolver
              </Link>
            ) : null}
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
            <div
              className="progress-circle"
              style={{ "--progress": `${porcentajeCompletado}%` }}
            >
              <div className="progress-circle-inner">
                <strong>
                  {hayIntentos ? `${porcentajeCompletado}%` : NO_DISPONIBLE}
                </strong>
                <span>Progreso</span>
              </div>
            </div>
          </div>

          <div className="progress-summary">
            <div>
              <span>Actividades realizadas</span>
              <strong>
                {hayIntentos
                  ? `${actividades.completadas}/${actividades.total}`
                  : NO_DISPONIBLE}
              </strong>
            </div>

            <div>
              <span>Promedio de aciertos</span>
              <strong>
                {actividades?.promedioAciertos != null
                  ? `${actividades.promedioAciertos}%`
                  : NO_DISPONIBLE}
              </strong>
            </div>

            <div>
              <span>Experiencia</span>
              <strong>{xp} XP</strong>
            </div>

            <div>
              <span>Racha actual</span>
              <strong>
                {racha === 1 ? "1 día" : `${racha} días`}
                {racha > 0 ? " 🔥" : ""}
              </strong>
            </div>
          </div>

          {xpSiguienteNivel !== null ? (
            <div className="progress-xp">
              <XpBar
                currentXp={xp}
                nextLevelXp={xpSiguienteNivel}
                level={nivel}
                showLevel={false}
                size="small"
              />
            </div>
          ) : null}
        </aside>
      </section>

      {/* =========================
          RESULTADOS RECIENTES
      ========================= */}
      <section className="dashboard-panel results-panel">
        <div className="panel-header">
          <div>
            <h2>Resultados recientes</h2>
            <p>Tus últimas actividades resueltas</p>
          </div>

          <Link className="view-all-button" to="/estudiante/estadisticas">
            Ver estadísticas
          </Link>
        </div>

        <div className="activity-list">
          {actividades === null || !hayIntentos ? (
            <div className="dashboard-empty dashboard-error">
              <p>No pudimos cargar tus resultados.</p>
            </div>
          ) : actividades.recientes.length === 0 ? (
            <div className="dashboard-empty">
              <p>
                Aún no has resuelto ninguna actividad. Cuando lo hagas, verás
                aquí tus resultados.
              </p>
            </div>
          ) : (
            actividades.recientes.map((intento) => {
              const porcentaje = limitarPorcentaje(intento.porcentajeAciertos);

              return (
                <article className="dashboard-activity" key={intento.id}>
                  <div className="activity-icon" aria-hidden="true">
                    ✅
                  </div>

                  <div className="activity-info">
                    <div className="activity-title-row">
                      <div>
                        <h3>{intento.titulo}</h3>
                      </div>

                      <strong>{porcentaje}%</strong>
                    </div>

                    <div className="progress-track">
                      <div
                        className="progress-fill"
                        style={{ width: `${porcentaje}%` }}
                      />
                    </div>

                    <span className="activity-questions">
                      {formatearFecha(intento.resueltoEn)}
                    </span>
                  </div>

                  <Link
                    className="activity-button completed"
                    to={`${RUTA_ACTIVIDADES}/${intento.actividadId}`}
                    aria-label={`Revisar ${intento.titulo}`}
                  >
                    Revisar
                  </Link>
                </article>
              );
            })
          )}
        </div>
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
          <Link className="quick-card" to="/estudiante/biblioteca">
            <span className="quick-icon" aria-hidden="true">📚</span>

            <div>
              <strong>Biblioteca</strong>
              <span>
                Explora recursos educativos
              </span>
            </div>

            <span className="quick-arrow" aria-hidden="true">→</span>
          </Link>

          <Link className="quick-card" to={RUTA_ACTIVIDADES}>
            <span className="quick-icon" aria-hidden="true">📝</span>

            <div>
              <strong>Actividades</strong>
              <span>
                Continúa tus ejercicios
              </span>
            </div>

            <span className="quick-arrow" aria-hidden="true">→</span>
          </Link>

          <Link className="quick-card" to="/estudiante/logros">
            <span className="quick-icon" aria-hidden="true">🏆</span>

            <div>
              <strong>Mis logros</strong>
              <span>
                Revisa tus recompensas
              </span>
            </div>

            <span className="quick-arrow" aria-hidden="true">→</span>
          </Link>
        </div>
      </section>
    </div>
  );
};

export default StudentDashboard;
