import { Link } from "react-router-dom";

import { useMisActividades } from "../../../hooks/useMisActividades";
import { formatearFecha } from "../../../utils/formatearFecha";
import "./StudentProgress.css";

const RUTA_NUEVA = "/docente/actividades/nueva";

// "cerrada" es el único estado que el resto de la app trata distinto de
// "asignada"; sin él, la vigencia depende solo de la fecha límite.
const estadoDeActividad = (actividad) => {
  if (actividad.estado === "cerrada") {
    return { clave: "cerrada", etiqueta: "Cerrada" };
  }

  return actividad.vencida
    ? { clave: "vencida", etiqueta: "Vencida" }
    : { clave: "vigente", etiqueta: "Vigente" };
};

const textoEstudiantes = (cantidad) =>
  cantidad === 1 ? "1 estudiante asignado" : `${cantidad} estudiantes asignados`;

// El <main> lo aporta DocenteLayout, por eso acá solo hay <div>.
const StudentProgress = () => {
  const { actividades, cargando, error, recargar } = useMisActividades();

  const hayActividades = actividades.length > 0;
  const primeraCarga = cargando && !hayActividades;

  return (
    <div className="docente-progreso">
      <div className="docente-progreso__titulos">
        <h1>Progreso</h1>
        <p>Elegí una actividad para ver quién la resolvió y con qué resultado.</p>
      </div>

      {primeraCarga && (
        <p role="status" className="docente-progreso__estado-vacio">
          Cargando tus actividades...
        </p>
      )}

      {error && (
        <div role="alert" className="docente-progreso__estado-vacio">
          <p>No pudimos cargar tus actividades.</p>
          <button
            type="button"
            className="docente-progreso__boton"
            onClick={recargar}
          >
            Reintentar
          </button>
        </div>
      )}

      {!cargando && !error && !hayActividades && (
        <div className="docente-progreso__estado-vacio">
          <h2>Todavía no hay actividades para seguir</h2>
          <p>
            Cuando asignes una lectura a tus estudiantes vas a poder ver acá su
            progreso.
          </p>
          <Link
            to={RUTA_NUEVA}
            className="docente-progreso__boton docente-progreso__boton--primario"
          >
            Asignar una actividad
          </Link>
        </div>
      )}

      {hayActividades && (
        <ul className="docente-progreso__lista" aria-busy={cargando}>
          {actividades.map((actividad) => {
            const estado = estadoDeActividad(actividad);

            return (
              <li key={actividad.id}>
                <article className="docente-progreso__tarjeta">
                  <div className="docente-progreso__tarjeta-cabecera">
                    <span
                      className={`docente-progreso__estado docente-progreso__estado--${estado.clave}`}
                    >
                      {estado.etiqueta}
                    </span>
                  </div>

                  <h2>{actividad.lecturaTitulo ?? "Lectura no disponible"}</h2>

                  <dl className="docente-progreso__datos">
                    <div>
                      <dt>Fecha límite</dt>
                      <dd>{formatearFecha(actividad.fechaLimite)}</dd>
                    </div>
                    <div>
                      <dt>Estudiantes</dt>
                      <dd>{textoEstudiantes(actividad.estudiantesAsignados.length)}</dd>
                    </div>
                  </dl>

                  <Link
                    to={`/docente/progreso/${actividad.id}`}
                    className="docente-progreso__boton docente-progreso__boton--primario"
                  >
                    Ver progreso
                  </Link>
                </article>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default StudentProgress;
