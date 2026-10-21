import { useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";

import { usePreguntasDeLectura } from "../../../hooks/usePreguntasDeLectura";
import { eliminarPregunta } from "../../../repositories/preguntasDocenteRepository";
import { ETIQUETA_TIPO_PREGUNTA } from "../../../utils/validarPregunta";
import "./Questions.css";

const RUTA_BANCO = "/docente/preguntas";

const ETIQUETA_ESTADO = {
  borrador: "Borrador",
  publicada: "Publicada",
  archivada: "Archivada",
};

const AVISO_PUBLICADA =
  "Esta lectura está publicada: para agregar o eliminar preguntas pasala primero a borrador desde Lecturas.";

// Preguntas de UNA lectura propia. El <main> lo aporta DocenteLayout.
const QuestionsLectura = () => {
  const { lecturaId } = useParams();
  const location = useLocation();
  const { estado, lectura, preguntas, recargando, recargar } =
    usePreguntasDeLectura(lecturaId);

  // Mensaje de éxito que deja el formulario al volver a la lista.
  const [aviso, setAviso] = useState(location.state?.aviso ?? "");
  const [pendienteId, setPendienteId] = useState(null);
  const [eliminandoId, setEliminandoId] = useState(null);
  const [errorAccion, setErrorAccion] = useState(null);

  if (estado === "cargando") {
    return (
      <div className="docente-preguntas">
        <p role="status" className="docente-preguntas__estado-vacio">
          Cargando las preguntas...
        </p>
      </div>
    );
  }

  if (estado === "error") {
    return (
      <div className="docente-preguntas">
        <div role="alert" className="docente-preguntas__estado-vacio">
          <h1>No pudimos cargar las preguntas</h1>
          <p>Revisá tu conexión y probá de nuevo.</p>
          <div className="docente-preguntas__acciones">
            <button
              type="button"
              className="docente-preguntas__boton docente-preguntas__boton--primario"
              onClick={recargar}
            >
              Reintentar
            </button>
            <Link to={RUTA_BANCO} className="docente-preguntas__boton">
              Volver al banco de preguntas
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (estado === "no-encontrada") {
    return (
      <div className="docente-preguntas">
        <div className="docente-preguntas__estado-vacio">
          <h1>No encontramos esa lectura</h1>
          <p>Revisá el enlace o volvé a tu banco de preguntas.</p>
          <Link
            to={RUTA_BANCO}
            className="docente-preguntas__boton docente-preguntas__boton--primario"
          >
            Volver al banco de preguntas
          </Link>
        </div>
      </div>
    );
  }

  // Agregar o eliminar preguntas solo se permite mientras la lectura NO está
  // publicada. Un estudiante puede estar resolviendo la actividad en este
  // momento y registrarIntento exige responder TODAS las preguntas de la
  // lectura: sumar o quitar una a mitad de camino lo dejaría sin poder
  // enviar. Además un docente no ve las actividades de otros docentes sobre su
  // lectura publicada, así que el estado es la única señal confiable. Editar
  // sí se permite siempre (no cambia qué preguntas hay).
  const publicada = lectura.estado === "publicada";

  const eliminar = async (pregunta) => {
    if (publicada) return;

    setPendienteId(null);
    setErrorAccion(null);
    setAviso("");
    setEliminandoId(pregunta.id);

    try {
      await eliminarPregunta(pregunta.id);
      setAviso("Eliminamos la pregunta.");
      recargar();
    } catch (error) {
      console.error("Error eliminando la pregunta:", error);
      setErrorAccion({
        id: pregunta.id,
        mensaje: "No pudimos eliminar la pregunta. Probá de nuevo en un rato.",
      });
    } finally {
      setEliminandoId(null);
    }
  };

  const base = `/docente/lecturas/${lectura.id}/preguntas`;

  return (
    <div className="docente-preguntas">
      <Link to={RUTA_BANCO} className="docente-preguntas__volver">
        Volver al banco de preguntas
      </Link>

      <div className="docente-preguntas__encabezado">
        <div className="docente-preguntas__titulos">
          <h1>Preguntas de la lectura</h1>
          <p className="docente-preguntas__contexto">
            <span>{lectura.titulo}</span>
            <span
              className={`docente-preguntas__estado docente-preguntas__estado--${lectura.estado}`}
            >
              {ETIQUETA_ESTADO[lectura.estado] ?? "Sin estado"}
            </span>
          </p>
        </div>

        {!publicada && (
          <Link
            to={`${base}/nueva`}
            className="docente-preguntas__boton docente-preguntas__boton--primario"
          >
            Nueva pregunta
          </Link>
        )}
      </div>

      {publicada && (
        <p role="note" className="docente-preguntas__nota">
          {AVISO_PUBLICADA}
        </p>
      )}

      {aviso && (
        <p role="status" className="docente-preguntas__aviso">
          {aviso}
        </p>
      )}

      {preguntas.length === 0 && (
        <div className="docente-preguntas__estado-vacio">
          <h2>Esta lectura todavía no tiene preguntas</h2>
          <p>
            {publicada
              ? "Pasala a borrador desde Lecturas para poder agregar preguntas."
              : "Agregá preguntas de comprensión para poder armar actividades con esta lectura."}
          </p>
        </div>
      )}

      {preguntas.length > 0 && (
        <ol className="docente-preguntas__preguntas" aria-busy={recargando}>
          {preguntas.map((pregunta) => {
            const ocupada = eliminandoId === pregunta.id || recargando;
            const confirmando = pendienteId === pregunta.id;
            const puedeEliminar = !publicada && pregunta.propia;

            return (
              <li key={pregunta.id}>
                <article className="docente-preguntas__tarjeta">
                  <div className="docente-preguntas__tarjeta-cabecera">
                    <span className="docente-preguntas__categoria">
                      {ETIQUETA_TIPO_PREGUNTA[pregunta.tipo] ?? pregunta.tipo}
                    </span>

                    {pregunta.propia && pregunta.respuestaCorrecta === null && (
                      <span className="docente-preguntas__estado docente-preguntas__estado--sin-respuesta">
                        Sin respuesta cargada
                      </span>
                    )}
                  </div>

                  <p className="docente-preguntas__enunciado">
                    {pregunta.enunciado}
                  </p>

                  <ul className="docente-preguntas__opciones">
                    {pregunta.opciones.map((opcion, indice) => {
                      // registrarIntento compara sin mayúsculas ni espacios.
                      const correcta =
                        pregunta.respuestaCorrecta !== null &&
                        opcion.trim().toLowerCase() ===
                          pregunta.respuestaCorrecta.trim().toLowerCase();

                      return (
                        <li
                          key={indice}
                          className={
                            correcta
                              ? "docente-preguntas__opcion docente-preguntas__opcion--correcta"
                              : "docente-preguntas__opcion"
                          }
                        >
                          {opcion}
                          {correcta && " (correcta)"}
                        </li>
                      );
                    })}
                  </ul>

                  {pregunta.explicacion && (
                    <p className="docente-preguntas__explicacion">
                      <strong>Explicación:</strong> {pregunta.explicacion}
                    </p>
                  )}

                  {!pregunta.propia && (
                    <p className="docente-preguntas__explicacion">
                      Esta pregunta la creó otra persona: no podés editarla ni
                      eliminarla.
                    </p>
                  )}

                  {pregunta.propia && (
                    <div className="docente-preguntas__acciones">
                      <Link
                        to={`${base}/${pregunta.id}/editar`}
                        className="docente-preguntas__boton"
                        aria-label={`Editar la pregunta "${pregunta.enunciado}"`}
                      >
                        Editar
                      </Link>

                      {puedeEliminar && (
                        <button
                          type="button"
                          className="docente-preguntas__boton"
                          disabled={ocupada}
                          aria-label={`Eliminar la pregunta "${pregunta.enunciado}"`}
                          onClick={() => {
                            setErrorAccion(null);
                            setPendienteId(pregunta.id);
                          }}
                        >
                          Eliminar
                        </button>
                      )}
                    </div>
                  )}

                  {confirmando && (
                    <div
                      className="docente-preguntas__confirmacion"
                      role="group"
                      aria-label="Confirmar eliminación"
                    >
                      <p>Vas a eliminar la pregunta y su respuesta. No se puede deshacer.</p>

                      <div className="docente-preguntas__acciones">
                        <button
                          type="button"
                          className="docente-preguntas__boton docente-preguntas__boton--peligro"
                          onClick={() => eliminar(pregunta)}
                        >
                          Confirmar: eliminar
                        </button>

                        <button
                          type="button"
                          className="docente-preguntas__boton"
                          onClick={() => setPendienteId(null)}
                          autoFocus
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}

                  {errorAccion?.id === pregunta.id && (
                    <p role="alert" className="docente-preguntas__error">
                      {errorAccion.mensaje}
                    </p>
                  )}
                </article>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
};

export default QuestionsLectura;
