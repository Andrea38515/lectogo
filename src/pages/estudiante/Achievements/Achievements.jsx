import { useEffect, useState } from "react";
import { FiAward } from "react-icons/fi";

import AchievementBadge from "../../../components/AchievementBadge/AchievementBadge";
import Loading from "../../../components/Loading/Loading";
import { useAuth } from "../../../hooks/useAuth";
import { useLogros } from "../../../hooks/useLogros";
import { formatearFecha } from "../../../utils/formatearFecha";
import "./Achievements.css";

// Imagen del catálogo; si la URL falla se vuelve al ícono por defecto en vez
// de dejar una imagen rota dentro del círculo.
const IconoLogro = ({ url }) => {
  const [fallida, setFallida] = useState(false);

  if (fallida) {
    return <FiAward />;
  }

  return <img src={url} alt="" loading="lazy" onError={() => setFallida(true)} />;
};

const ListaLogros = ({ titulo, logros }) => (
  <section className="achievements-group">
    <h2>
      {titulo} <span>({logros.length})</span>
    </h2>

    <ul className="achievements-grid">
      {logros.map((logro) => (
        <li key={logro.id}>
          <AchievementBadge
            title={logro.nombre}
            description={logro.descripcion}
            icon={logro.iconoUrl ? <IconoLogro url={logro.iconoUrl} /> : undefined}
            unlocked={logro.desbloqueado}
            // required = 0 oculta la barra del componente: se usa cuando no
            // hay avance calculable en vez de mostrar un 0/100 inventado.
            progress={logro.avance?.actual ?? 0}
            required={logro.avance?.requerido ?? 0}
            // Si el dato de fecha falta se omite la línea, no se inventa.
            unlockedDate={logro.obtenidoEn ? formatearFecha(logro.obtenidoEn) : ""}
          />
        </li>
      ))}
    </ul>
  </section>
);

const Achievements = () => {
  const { loading: cargandoPerfil, refreshUser } = useAuth();
  const { isLoading, datos, reintentar } = useLogros();

  // El perfil del contexto se lee una sola vez al iniciar sesión: sin esto, la
  // racha (base del progreso de los logros de racha) quedaría desactualizada
  // después de resolver una actividad y venir acá sin recargar la página.
  useEffect(() => {
    refreshUser().catch(() => {});
    // refreshUser cambia de identidad en cada render del contexto; solo
    // interesa refrescar al montar la pantalla.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  let contenido;

  if (cargandoPerfil || isLoading) {
    contenido = <Loading message="Cargando tus logros..." />;
  } else if (!datos?.catalogoDisponible) {
    contenido = (
      <div className="achievements-message achievements-message--error" role="alert">
        <p>No pudimos cargar los logros.</p>

        <button className="achievements-button" type="button" onClick={reintentar}>
          Intentar nuevamente
        </button>
      </div>
    );
  } else if (datos.total === 0) {
    contenido = (
      <div className="achievements-message">
        <p>Todavía no hay logros disponibles.</p>
      </div>
    );
  } else if (!datos.estadoDisponible) {
    // Sin esta lectura no se sabe cuáles se obtuvieron: mostrarlos todos como
    // bloqueados sería un dato falso.
    contenido = (
      <div className="achievements-message achievements-message--error" role="alert">
        <p>No pudimos comprobar cuáles logros ya desbloqueaste.</p>

        <button className="achievements-button" type="button" onClick={reintentar}>
          Intentar nuevamente
        </button>
      </div>
    );
  } else {
    const cantidadDesbloqueados = datos.desbloqueados.length;
    const porcentaje = Math.round((cantidadDesbloqueados / datos.total) * 100);
    const resumen = `${cantidadDesbloqueados} de ${datos.total} logros desbloqueados`;

    contenido = (
      <>
        <section className="achievements-summary">
          <p>{resumen}</p>

          <div
            className="achievements-summary__track"
            role="progressbar"
            aria-label="Logros desbloqueados"
            aria-valuemin={0}
            aria-valuemax={datos.total}
            aria-valuenow={cantidadDesbloqueados}
            aria-valuetext={resumen}
          >
            <div
              className="achievements-summary__fill"
              style={{ width: `${porcentaje}%` }}
            />
          </div>
        </section>

        {datos.avanceCompleto ? null : (
          <div className="achievements-message achievements-message--warning" role="status">
            <p>
              No pudimos cargar tus actividades resueltas, así que algunos
              avances no se muestran.
            </p>

            <button className="achievements-button" type="button" onClick={reintentar}>
              Intentar nuevamente
            </button>
          </div>
        )}

        {cantidadDesbloqueados > 0 ? (
          <ListaLogros titulo="Desbloqueados" logros={datos.desbloqueados} />
        ) : (
          <div className="achievements-message">
            <p>
              Aún no has desbloqueado ningún logro. Resuelve una actividad para
              empezar.
            </p>
          </div>
        )}

        {datos.bloqueados.length > 0 ? (
          <ListaLogros titulo="Por desbloquear" logros={datos.bloqueados} />
        ) : null}
      </>
    );
  }

  return (
    <main className="student-achievements">
      <header className="achievements-header">
        <h1>Mis logros</h1>
        <p>Desbloquea logros resolviendo actividades y manteniendo tu racha.</p>
      </header>

      {contenido}
    </main>
  );
};

export default Achievements;
