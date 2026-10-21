import { useState } from "react";
import { Link, useLocation } from "react-router-dom";

import { useMisLecturas } from "../../../hooks/useMisLecturas";
import { cambiarEstadoLectura } from "../../../repositories/lecturasDocenteRepository";
import "./Lectures.css";

const ETIQUETA_ESTADO = {
  borrador: "Borrador",
  publicada: "Publicada",
  archivada: "Archivada",
};

const FRASE_ESTADO = {
  borrador: "quedó en borrador",
  publicada: "quedó publicada",
  archivada: "quedó archivada",
};

const ACCIONES_POR_ESTADO = {
  borrador: [
    { estado: "publicada", etiqueta: "Publicar" },
    { estado: "archivada", etiqueta: "Archivar" },
  ],
  publicada: [
    { estado: "borrador", etiqueta: "Pasar a borrador" },
    { estado: "archivada", etiqueta: "Archivar" },
  ],
  archivada: [
    { estado: "publicada", etiqueta: "Publicar" },
    { estado: "borrador", etiqueta: "Pasar a borrador" },
  ],
};

const AVISO_PUBLICADA =
  "Si la lectura ya está en una actividad, los estudiantes no podrán abrirla.";

// El <main> lo aporta DocenteLayout, por eso acá solo hay <div>.
const Lectures = () => {
  const location = useLocation();
  const { lecturas, categorias, cargando, error, recargar } = useMisLecturas();

  // Mensaje de éxito que deja el formulario al volver a la lista.
  const [aviso, setAviso] = useState(location.state?.aviso ?? "");
  const [pendiente, setPendiente] = useState(null);
  const [guardandoId, setGuardandoId] = useState(null);
  const [errorAccion, setErrorAccion] = useState(null);

  const nombresCategoria = Object.fromEntries(
    categorias.map((categoria) => [categoria.id, categoria.nombre]),
  );

  const ejecutar = async (lectura, accion) => {
    setPendiente(null);
    setErrorAccion(null);
    setAviso("");
    setGuardandoId(lectura.id);

    try {
      await cambiarEstadoLectura(lectura.id, accion.estado);
      setAviso(`"${lectura.titulo}" ${FRASE_ESTADO[accion.estado]}.`);
      recargar();
    } catch (err) {
      console.error("Error cambiando el estado de la lectura:", err);
      setErrorAccion({
        id: lectura.id,
        mensaje: "No pudimos cambiar el estado. Probá de nuevo en un rato.",
      });
    } finally {
      setGuardandoId(null);
    }
  };

  // Sacar de circulación una lectura publicada puede dejar actividades
  // imposibles de abrir: antes de hacerlo se pide una confirmación en la propia tarjeta.
  const pedirCambio = (lectura, accion) => {
    if (lectura.estado === "publicada") {
      setErrorAccion(null);
      setPendiente({ id: lectura.id, ...accion });
      return;
    }

    ejecutar(lectura, accion);
  };

  const hayLecturas = lecturas.length > 0;
  const primeraCarga = cargando && !hayLecturas;

  return (
    <div className="docente-lecturas">
      <div className="docente-lecturas__encabezado">
        <div className="docente-lecturas__titulos">
          <h1>Lecturas</h1>
          <p>Creá y organizá los textos que leerán tus estudiantes.</p>
        </div>

        <Link
          to="/docente/lecturas/nueva"
          className="docente-lecturas__boton docente-lecturas__boton--primario"
        >
          Nueva lectura
        </Link>
      </div>

      {aviso && (
        <p role="status" className="docente-lecturas__aviso">
          {aviso}
        </p>
      )}

      {primeraCarga && (
        <p role="status" className="docente-lecturas__estado-vacio">
          Cargando tus lecturas...
        </p>
      )}

      {error && (
        <div role="alert" className="docente-lecturas__estado-vacio">
          <p>No pudimos cargar tus lecturas.</p>
          <button
            type="button"
            className="docente-lecturas__boton"
            onClick={recargar}
          >
            Reintentar
          </button>
        </div>
      )}

      {!cargando && !error && !hayLecturas && (
        <div className="docente-lecturas__estado-vacio">
          <h2>Todavía no creaste ninguna lectura</h2>
          <p>Escribí tu primer texto y publicalo para que lo lean tus estudiantes.</p>
          <Link
            to="/docente/lecturas/nueva"
            className="docente-lecturas__boton docente-lecturas__boton--primario"
          >
            Crear mi primera lectura
          </Link>
        </div>
      )}

      {hayLecturas && (
        <ul className="docente-lecturas__lista" aria-busy={cargando}>
          {lecturas.map((lectura) => {
            const acciones = ACCIONES_POR_ESTADO[lectura.estado] ?? [];
            const ocupada = guardandoId === lectura.id || cargando;
            const confirmando = pendiente?.id === lectura.id;

            return (
              <li key={lectura.id}>
                <article className="docente-lecturas__tarjeta">
                  <div className="docente-lecturas__tarjeta-cabecera">
                    <span className="docente-lecturas__categoria">
                      {nombresCategoria[lectura.categoriaId] || "Sin categoría"}
                    </span>

                    <span
                      className={`docente-lecturas__estado docente-lecturas__estado--${lectura.estado}`}
                    >
                      {ETIQUETA_ESTADO[lectura.estado] ?? "Sin estado"}
                    </span>
                  </div>

                  <h2>{lectura.titulo}</h2>

                  <p className="docente-lecturas__nivel">
                    Nivel: {lectura.nivelDificultad || "sin definir"}
                  </p>

                  <div className="docente-lecturas__acciones">
                    <Link
                      to={`/docente/lecturas/${lectura.id}/editar`}
                      className="docente-lecturas__boton"
                      aria-label={`Editar "${lectura.titulo}"`}
                    >
                      Editar
                    </Link>

                    {acciones.map((accion) => (
                      <button
                        key={accion.estado}
                        type="button"
                        className="docente-lecturas__boton"
                        disabled={ocupada}
                        aria-label={`${accion.etiqueta} "${lectura.titulo}"`}
                        onClick={() => pedirCambio(lectura, accion)}
                      >
                        {accion.etiqueta}
                      </button>
                    ))}
                  </div>

                  {confirmando && (
                    <div
                      className="docente-lecturas__confirmacion"
                      role="group"
                      aria-label="Confirmar cambio de estado"
                    >
                      <p>{AVISO_PUBLICADA}</p>

                      <div className="docente-lecturas__acciones">
                        <button
                          type="button"
                          className="docente-lecturas__boton docente-lecturas__boton--primario"
                          onClick={() => ejecutar(lectura, pendiente)}
                        >
                          Confirmar: {pendiente.etiqueta}
                        </button>

                        <button
                          type="button"
                          className="docente-lecturas__boton"
                          onClick={() => setPendiente(null)}
                          autoFocus
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}

                  {errorAccion?.id === lectura.id && (
                    <p role="alert" className="docente-lecturas__error">
                      {errorAccion.mensaje}
                    </p>
                  )}
                </article>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default Lectures;
