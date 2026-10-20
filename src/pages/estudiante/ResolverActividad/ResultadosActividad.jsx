import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";

import FeedbackPanel from "../../../components/FeedbackPanel/FeedbackPanel";
import { formatearFecha } from "../../../utils/formatearFecha";

/*
 * Lo que este intento hizo avanzar: subida de nivel, logros nuevos y el total
 * acumulado. Solo existe justo después de enviar; al reabrir un intento guardado
 * no se muestra, porque la celebración corresponde a ese momento.
 */
const ProgresoDelIntento = ({ gamificacion }) => {
  const { subioDeNivel, nivel, xpTotal, racha, logrosNuevos } = gamificacion;
  const hayTotales = xpTotal !== null || racha !== null;

  if (!subioDeNivel && logrosNuevos.length === 0 && !hayTotales) {
    return null;
  }

  return (
    <section className="resolver-actividad__progreso-intento">
      {subioDeNivel && nivel !== null && (
        <div className="resolver-actividad__celebracion" role="status">
          <span className="resolver-actividad__celebracion-icono" aria-hidden="true">
            ⭐
          </span>

          <div>
            <strong>¡Subiste al nivel {nivel}!</strong>
            {xpTotal !== null && <span>Ya acumulas {xpTotal} XP.</span>}
          </div>
        </div>
      )}

      {logrosNuevos.length > 0 && (
        <div className="resolver-actividad__logros" role="status">
          <h2 className="resolver-actividad__subtitulo">
            {logrosNuevos.length === 1 ? "Logro desbloqueado" : "Logros desbloqueados"}
          </h2>

          <ul className="resolver-actividad__logros-lista">
            {logrosNuevos.map((logro) => (
              <li key={logro.id || logro.nombre} className="resolver-actividad__logro">
                <span className="resolver-actividad__logro-icono" aria-hidden="true">
                  🏆
                </span>

                <div>
                  <strong>{logro.nombre}</strong>
                  {logro.descripcion && <span>{logro.descripcion}</span>}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {hayTotales && (
        <p className="resolver-actividad__totales">
          {xpTotal !== null && <span>Llevas {xpTotal} XP en total</span>}
          {racha !== null && racha > 0 && (
            <span>
              Racha: {racha} {racha === 1 ? "día" : "días"}
            </span>
          )}
        </p>
      )}
    </section>
  );
};

/*
 * Vista de resultados. Se usa tanto con la respuesta de registrarIntento
 * como con un intento ya guardado: ambos comparten la forma
 * { respuestas, porcentajeAciertos, xpGanado, resueltoEn, duplicado? } y la
 * respuesta real añade `gamificacion` (ver resumirGamificacion).
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
  const gamificacion = resultado.gamificacion;

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

      {gamificacion && <ProgresoDelIntento gamificacion={gamificacion} />}

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
