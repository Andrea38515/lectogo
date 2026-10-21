import { Link } from "react-router-dom";

import { useMisActividades } from "../../../hooks/useMisActividades";
import { formatearFecha } from "../../../utils/formatearFecha";
import "./Activities.css";

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
const Activities = () => {
  const { actividades, cargando, error, recargar } = useMisActividades();

  const hayActividades = actividades.length > 0;
  const primeraCarga = cargando && !hayActividades;

  return (
    <div className="docente-actividades">
      <div className="docente-actividades__encabezado">
        <div className="docente-actividades__titulos">
          <h1>Actividades</h1>
          <p>Asigná lecturas a tus estudiantes y revisá las que ya enviaste.</p>
        </div>

        <Link
          to={RUTA_NUEVA}
          className="docente-actividades__boton docente-actividades__boton--primario"
        >
          Nueva actividad
        </Link>
      </div>

      {primeraCarga && (
        <p role="status" className="docente-actividades__estado-vacio">
          Cargando tus actividades...
        </p>
      )}

      {error && (
        <div role="alert" className="docente-actividades__estado-vacio">
          <p>No pudimos cargar tus actividades.</p>
          <button
            type="button"
            className="docente-actividades__boton"
            onClick={recargar}
          >
            Reintentar
          </button>
        </div>
      )}

      {!cargando && !error && !hayActividades && (
        <div className="docente-actividades__estado-vacio">
          <h2>Todavía no asignaste ninguna actividad</h2>
          <p>
            Elegí una lectura publicada, indicá los correos de tus estudiantes y
            fijá una fecha límite.
          </p>
          <Link
            to={RUTA_NUEVA}
            className="docente-actividades__boton docente-actividades__boton--primario"
          >
            Asignar mi primera actividad
          </Link>
        </div>
      )}

      {hayActividades && (
        <ul className="docente-actividades__lista" aria-busy={cargando}>
          {actividades.map((actividad) => {
            const estado = estadoDeActividad(actividad);

            return (
              <li key={actividad.id}>
                <article className="docente-actividades__tarjeta">
                  <div className="docente-actividades__tarjeta-cabecera">
                    <span
                      className={`docente-actividades__estado docente-actividades__estado--${estado.clave}`}
                    >
                      {estado.etiqueta}
                    </span>
                  </div>

                  <h2>{actividad.lecturaTitulo ?? "Lectura no disponible"}</h2>

                  <dl className="docente-actividades__datos">
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
                    className="docente-actividades__boton"
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

export default Activities;
