import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";

import FeedbackPanel from "../../../components/FeedbackPanel/FeedbackPanel";
import { formatearFecha } from "../../../utils/formatearFecha";

/*
 * Vista de resultados. Se usa tanto con la respuesta de registrarIntento
 * como con un intento ya guardado: ambos comparten la forma
 * { respuestas, porcentajeAciertos, xpGanado, resueltoEn, duplicado? }.
 */
const ResultadosActividad = ({ titulo, preguntas, resultado }) => {
  const tituloRef = useRef(null);

  // Lleva el foco al encabezado para que lectores de pantalla y teclado
  // arranquen en los resultados al reemplazar el formulario.
  useEffect(() => {
    tituloRef.current?.focus();
  }, []);

  const preguntasPorId = new Map(preguntas.map((pregunta) => [pregunta.id, pregunta]));
  const respuestas = resultado.respuestas || [];
  const aciertos = respuestas.filter((respuesta) => respuesta.correcta).length;
  const porcentaje = Math.round(Number(resultado.porcentajeAciertos) || 0);
  const xpGanado = Number(resultado.xpGanado) || 0;

  return (
    <>
      <header className="resolver-actividad__encabezado">
        <span className="resolver-actividad__etiqueta">Resultados</span>

        <h1 ref={tituloRef} tabIndex={-1} className="resolver-actividad__titulo">
          {titulo}
        </h1>

        <p className="resolver-actividad__meta">
          Resuelta el {formatearFecha(resultado.resueltoEn)}
        </p>
      </header>

      {resultado.duplicado && (
        <p className="resolver-actividad__aviso" role="status">
          Ya habías resuelto esta actividad antes. Estos son tus resultados
          originales.
        </p>
      )}

      <section
        className="resolver-actividad__resumen"
        aria-label="Resumen de resultados"
      >
        <div className="resolver-actividad__dato">
          <strong>{porcentaje}%</strong>
          <span>de aciertos</span>
        </div>

        <div className="resolver-actividad__dato">
          <strong>
            {aciertos}/{respuestas.length}
          </strong>
          <span>respuestas correctas</span>
        </div>

        <div className="resolver-actividad__dato">
          <strong>+{xpGanado}</strong>
          <span>XP ganados</span>
        </div>
      </section>

      <section className="resolver-actividad__seccion">
        <h2 className="resolver-actividad__subtitulo">Revisión de respuestas</h2>

        <ol className="resolver-actividad__lista">
          {respuestas.map((respuesta, indice) => {
            const pregunta = preguntasPorId.get(respuesta.preguntaId);

            return (
              <li key={respuesta.preguntaId} className="resolver-actividad__tarjeta">
                <p className="resolver-actividad__enunciado">
                  <span className="resolver-actividad__numero">
                    Pregunta {indice + 1}
                  </span>
                  {pregunta?.enunciado || "Pregunta no disponible"}
                </p>

                <p className="resolver-actividad__tu-respuesta">
                  Tu respuesta: <strong>{respuesta.respuestaDada}</strong>
                </p>

                <FeedbackPanel
                  esCorrecta={Boolean(respuesta.correcta)}
                  explicacion={respuesta.explicacion}
                />
              </li>
            );
          })}
        </ol>
      </section>

      <nav className="resolver-actividad__acciones" aria-label="Siguientes pasos">
        <Link
          to="/estudiante/actividades"
          className="resolver-actividad__enlace resolver-actividad__enlace--primario"
        >
          Volver a mis actividades
        </Link>

        <Link
          to="/estudiante/estadisticas"
          className="resolver-actividad__enlace resolver-actividad__enlace--secundario"
        >
          Ver mis estadísticas
        </Link>
      </nav>
    </>
  );
};

export default ResultadosActividad;
