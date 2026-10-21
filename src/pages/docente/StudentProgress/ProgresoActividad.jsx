import { Link, useParams } from "react-router-dom";

import { useProgresoActividad } from "../../../hooks/useProgresoActividad";
import { formatearFecha } from "../../../utils/formatearFecha";
import {
  construirCsv,
  formatearFechaCsv,
  nombreArchivoCsv,
} from "../../../utils/progresoCsv";
import "./ProgresoActividad.css";

const RUTA_LISTA = "/docente/progreso";

const ESTADO_RESOLVIO = "Resolvió";
const ESTADO_PENDIENTE = "Pendiente";

// Una fila por estudiante, con el mismo contenido que se ve en la tabla.
const aFilasCsv = (estudiantes) =>
  estudiantes.map(({ nombre, correo, intento }) => ({
    nombre,
    correo,
    estado: intento ? ESTADO_RESOLVIO : ESTADO_PENDIENTE,
    porcentajeAciertos: intento ? intento.porcentajeAciertos : null,
    xpGanado: intento ? intento.xpGanado : null,
    resueltoEn: intento ? formatearFechaCsv(intento.resueltoEn) : null,
  }));

const descargarCsv = (contenido, nombreArchivo) => {
  const blob = new Blob([contenido], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");

  enlace.href = url;
  enlace.download = nombreArchivo;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();

  // Se libera después de que el navegador tomó el archivo.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const Resumen = ({ estudiantes }) => {
  const resolvieron = estudiantes.filter((estudiante) => estudiante.intento);
  const pendientes = estudiantes.length - resolvieron.length;

  // El promedio es solo entre quienes resolvieron.
  const promedio = resolvieron.length
    ? Math.round(
        resolvieron.reduce(
          (suma, { intento }) => suma + intento.porcentajeAciertos,
          0,
        ) / resolvieron.length,
      )
    : null;

  return (
    <dl className="docente-progreso-detalle__resumen">
      <div>
        <dt>Avance</dt>
        <dd>
          {resolvieron.length} de {estudiantes.length} resolvieron
        </dd>
      </div>
      <div>
        <dt>Pendientes</dt>
        <dd>{pendientes}</dd>
      </div>
      <div>
        <dt>Promedio de aciertos</dt>
        <dd>{promedio === null ? "—" : `${promedio} %`}</dd>
      </div>
    </dl>
  );
};

// El <main> lo aporta DocenteLayout, por eso acá solo hay <div>.
const ProgresoActividad = () => {
  const { actividadId } = useParams();
  const { estado, datos, recargar } = useProgresoActividad(actividadId);

  if (estado === "no-encontrada") {
    return (
      <div className="docente-progreso-detalle">
        <div className="docente-progreso-detalle__mensaje">
          <h1>No encontramos esa actividad</h1>
          <p>Revisá el enlace o volvé a la lista de progreso.</p>
          <Link
            to={RUTA_LISTA}
            className="docente-progreso-detalle__boton docente-progreso-detalle__boton--primario"
          >
            Volver al progreso
          </Link>
        </div>
      </div>
    );
  }

  if (estado === "error") {
    return (
      <div className="docente-progreso-detalle">
        <div role="alert" className="docente-progreso-detalle__mensaje">
          <h1>No pudimos cargar el progreso</h1>
          <p>Revisá tu conexión e intentá de nuevo.</p>
          <div className="docente-progreso-detalle__acciones">
            <button
              type="button"
              className="docente-progreso-detalle__boton docente-progreso-detalle__boton--primario"
              onClick={recargar}
            >
              Reintentar
            </button>
            <Link to={RUTA_LISTA} className="docente-progreso-detalle__boton">
              Volver al progreso
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!datos) {
    return (
      <div className="docente-progreso-detalle">
        <p role="status" className="docente-progreso-detalle__mensaje">
          Cargando el progreso...
        </p>
      </div>
    );
  }

  const { actividad, estudiantes } = datos;
  const recargando = estado === "cargando";

  const handleDescargar = () => {
    descargarCsv(
      construirCsv(aFilasCsv(estudiantes)),
      nombreArchivoCsv(actividad.lecturaTitulo, new Date()),
    );
  };

  return (
    <div className="docente-progreso-detalle" aria-busy={recargando}>
      <Link to={RUTA_LISTA} className="docente-progreso-detalle__volver">
        ← Volver al progreso
      </Link>

      <div className="docente-progreso-detalle__encabezado">
        <div className="docente-progreso-detalle__titulos">
          <h1>{actividad.lecturaTitulo}</h1>
          <p>Fecha límite: {formatearFecha(actividad.fechaLimite)}</p>
        </div>

        <div className="docente-progreso-detalle__acciones">
          <button
            type="button"
            className="docente-progreso-detalle__boton"
            onClick={recargar}
            disabled={recargando}
          >
            {recargando ? "Actualizando..." : "Actualizar"}
          </button>
          <button
            type="button"
            className="docente-progreso-detalle__boton docente-progreso-detalle__boton--primario"
            onClick={handleDescargar}
            disabled={estudiantes.length === 0}
          >
            Descargar CSV
          </button>
        </div>
      </div>

      <p className="docente-progreso-detalle__aviso">
        El archivo incluye nombre y correo de tus estudiantes. Guardalo y
        compartilo con cuidado.
      </p>

      {recargando && (
        <p role="status" className="docente-progreso-detalle__sr">
          Actualizando el progreso...
        </p>
      )}

      {estudiantes.length === 0 ? (
        <div className="docente-progreso-detalle__mensaje">
          <p>Esta actividad no tiene estudiantes asignados.</p>
        </div>
      ) : (
        <>
          <Resumen estudiantes={estudiantes} />

          <div
            className="docente-progreso-detalle__tabla-contenedor"
            role="region"
            aria-label="Tabla de progreso de los estudiantes"
            tabIndex={0}
          >
            <table className="docente-progreso-detalle__tabla">
              <caption>
                Resultado de cada estudiante en «{actividad.lecturaTitulo}»
              </caption>
              <thead>
                <tr>
                  <th scope="col">Estudiante</th>
                  <th scope="col">Estado</th>
                  <th scope="col">Aciertos (%)</th>
                  <th scope="col">XP</th>
                  <th scope="col">Resuelta el</th>
                </tr>
              </thead>
              <tbody>
                {estudiantes.map(({ estudianteId, nombre, correo, intento }) => (
                  <tr key={estudianteId}>
                    <th scope="row">
                      <span className="docente-progreso-detalle__nombre">{nombre}</span>
                      {correo && (
                        <span className="docente-progreso-detalle__correo">{correo}</span>
                      )}
                    </th>
                    <td>
                      <span
                        className={`docente-progreso-detalle__estado docente-progreso-detalle__estado--${intento ? "resolvio" : "pendiente"}`}
                      >
                        {intento ? ESTADO_RESOLVIO : ESTADO_PENDIENTE}
                      </span>
                    </td>
                    <td>{intento ? `${intento.porcentajeAciertos} %` : "—"}</td>
                    <td>{intento ? intento.xpGanado : "—"}</td>
                    <td>
                      {intento?.resueltoEn ? formatearFecha(intento.resueltoEn) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

export default ProgresoActividad;
