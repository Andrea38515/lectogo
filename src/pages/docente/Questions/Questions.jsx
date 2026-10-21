import { Link } from "react-router-dom";

import { useMisLecturas } from "../../../hooks/useMisLecturas";
import "./Questions.css";

const ETIQUETA_ESTADO = {
  borrador: "Borrador",
  publicada: "Publicada",
  archivada: "Archivada",
};

// Banco de preguntas: punto de entrada que lista MIS lecturas. Las preguntas
// se administran por lectura. El <main> lo aporta DocenteLayout.
const Questions = () => {
  const { lecturas, categorias, cargando, error, recargar } = useMisLecturas();

  const nombresCategoria = Object.fromEntries(
    categorias.map((categoria) => [categoria.id, categoria.nombre]),
  );

  const hayLecturas = lecturas.length > 0;
  const primeraCarga = cargando && !hayLecturas;

  return (
    <div className="docente-preguntas">
      <div className="docente-preguntas__encabezado">
        <div className="docente-preguntas__titulos">
          <h1>Banco de preguntas</h1>
          <p>Elegí una lectura para armar o ajustar sus preguntas de comprensión.</p>
        </div>
      </div>

      {primeraCarga && (
        <p role="status" className="docente-preguntas__estado-vacio">
          Cargando tus lecturas...
        </p>
      )}

      {error && (
        <div role="alert" className="docente-preguntas__estado-vacio">
          <p>No pudimos cargar tus lecturas.</p>
          <button
            type="button"
            className="docente-preguntas__boton"
            onClick={recargar}
          >
            Reintentar
          </button>
        </div>
      )}

      {!cargando && !error && !hayLecturas && (
        <div className="docente-preguntas__estado-vacio">
          <h2>Todavía no tenés lecturas</h2>
          <p>Las preguntas se arman sobre una lectura. Creá la primera y volvé acá.</p>
          <Link
            to="/docente/lecturas/nueva"
            className="docente-preguntas__boton docente-preguntas__boton--primario"
          >
            Crear mi primera lectura
          </Link>
        </div>
      )}

      {hayLecturas && (
        <ul className="docente-preguntas__lista" aria-busy={cargando}>
          {lecturas.map((lectura) => (
            <li key={lectura.id}>
              <article className="docente-preguntas__tarjeta">
                <div className="docente-preguntas__tarjeta-cabecera">
                  <span className="docente-preguntas__categoria">
                    {nombresCategoria[lectura.categoriaId] || "Sin categoría"}
                  </span>

                  <span
                    className={`docente-preguntas__estado docente-preguntas__estado--${lectura.estado}`}
                  >
                    {ETIQUETA_ESTADO[lectura.estado] ?? "Sin estado"}
                  </span>
                </div>

                <h2>{lectura.titulo}</h2>

                <div className="docente-preguntas__acciones">
                  <Link
                    to={`/docente/lecturas/${lectura.id}/preguntas`}
                    className="docente-preguntas__boton"
                    aria-label={`Administrar preguntas de "${lectura.titulo}"`}
                  >
                    Administrar preguntas
                  </Link>
                </div>
              </article>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Questions;
