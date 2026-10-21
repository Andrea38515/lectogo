import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { useAuth } from "../../../hooks/useAuth";
import { usePreguntasDeLectura } from "../../../hooks/usePreguntasDeLectura";
import {
  actualizarPregunta,
  crearPregunta,
} from "../../../repositories/preguntasDocenteRepository";
import {
  ETIQUETA_TIPO_PREGUNTA,
  LIMITES_PREGUNTA,
  OPCIONES_VERDADERO_FALSO,
  TIPOS_PREGUNTA,
  validarPregunta,
} from "../../../utils/validarPregunta";
import "./QuestionsEditor.css";

const RUTA_BANCO = "/docente/preguntas";

const AVISO_EDITAR_PUBLICADA =
  "Esta lectura está publicada. Si cambiás la respuesta correcta, los intentos que ya se resolvieron conservan su calificación.";

const AVISO_PUBLICADA_NUEVA =
  "Esta lectura está publicada: para agregar o eliminar preguntas pasala primero a borrador desde Lecturas.";

const opcionesIniciales = (tipo) =>
  tipo === "verdadero_falso" ? [...OPCIONES_VERDADERO_FALSO] : ["", ""];

// La respuesta correcta se guarda como texto, pero en el formulario se elige
// por posición: así sigue apuntando a la misma opción aunque se la reescriba.
const valoresIniciales = (pregunta) => {
  if (!pregunta) {
    return {
      tipo: "seleccion_multiple",
      enunciado: "",
      opciones: opcionesIniciales("seleccion_multiple"),
      correcta: null,
      explicacion: "",
    };
  }

  // Verdadero/falso siempre usa las dos opciones fijas; si el dato guardado
  // difiere solo en mayúsculas o espacios, la respuesta se ubica igual.
  const opciones =
    pregunta.tipo === "verdadero_falso"
      ? [...OPCIONES_VERDADERO_FALSO]
      : [...pregunta.opciones];
  const normalizar = (texto) => texto.trim().toLowerCase();
  const indice =
    pregunta.respuestaCorrecta === null
      ? -1
      : opciones.findIndex(
          (opcion) =>
            normalizar(opcion) === normalizar(pregunta.respuestaCorrecta),
        );

  return {
    tipo: pregunta.tipo,
    enunciado: pregunta.enunciado,
    opciones,
    correcta: indice === -1 ? null : indice,
    explicacion: pregunta.explicacion,
  };
};

// Un campo con su etiqueta, ayuda opcional y error en línea.
const Campo = ({ id, etiqueta, error, ayuda, children }) => {
  const describedBy =
    [ayuda ? `${id}-ayuda` : null, error ? `${id}-error` : null]
      .filter(Boolean)
      .join(" ") || undefined;

  return (
    <div className="docente-pregunta-form__campo">
      <label htmlFor={id}>{etiqueta}</label>

      {children({
        id,
        "aria-describedby": describedBy,
        "aria-invalid": error ? "true" : undefined,
      })}

      {ayuda && (
        <p id={`${id}-ayuda`} className="docente-pregunta-form__ayuda">
          {ayuda}
        </p>
      )}

      {error && (
        <p id={`${id}-error`} className="docente-pregunta-form__error">
          {error}
        </p>
      )}
    </div>
  );
};

const FormularioPregunta = ({ lectura, pregunta }) => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const esEdicion = Boolean(pregunta);
  const rutaLista = `/docente/lecturas/${lectura.id}/preguntas`;

  const [valores, setValores] = useState(() => valoresIniciales(pregunta));
  const [errores, setErrores] = useState({});
  const [errorGeneral, setErrorGeneral] = useState("");
  const [guardando, setGuardando] = useState(false);

  const esVerdaderoFalso = valores.tipo === "verdadero_falso";
  const { opciones } = valores;

  const limpiarErrores = (predicado) =>
    setErrores((actuales) => {
      const siguientes = Object.fromEntries(
        Object.entries(actuales).filter(([clave]) => !predicado(clave)),
      );

      return Object.keys(siguientes).length === Object.keys(actuales).length
        ? actuales
        : siguientes;
    });

  const cambiarCampo = (campo) => (evento) => {
    const { value } = evento.target;

    setValores((actuales) => ({ ...actuales, [campo]: value }));
    limpiarErrores((clave) => clave === campo);
  };

  const cambiarTipo = (evento) => {
    const tipo = evento.target.value;

    // Cada tipo tiene sus propias opciones: al cambiar se parte de cero.
    setValores((actuales) => ({
      ...actuales,
      tipo,
      opciones: opcionesIniciales(tipo),
      correcta: null,
    }));
    limpiarErrores((clave) => clave !== "enunciado" && clave !== "explicacion");
  };

  const cambiarOpcion = (indice) => (evento) => {
    const { value } = evento.target;

    setValores((actuales) => ({
      ...actuales,
      opciones: actuales.opciones.map((opcion, i) =>
        i === indice ? value : opcion,
      ),
    }));
    limpiarErrores((clave) => clave === `opcion-${indice}`);
  };

  const agregarOpcion = () => {
    setValores((actuales) =>
      actuales.opciones.length >= LIMITES_PREGUNTA.opcionesMax
        ? actuales
        : { ...actuales, opciones: [...actuales.opciones, ""] },
    );
    limpiarErrores((clave) => clave === "opciones");
  };

  const quitarOpcion = (indice) => {
    setValores((actuales) => {
      if (actuales.opciones.length <= LIMITES_PREGUNTA.opcionesMin) {
        return actuales;
      }

      let { correcta } = actuales;

      if (correcta === indice) correcta = null;
      else if (correcta !== null && correcta > indice) correcta -= 1;

      return {
        ...actuales,
        opciones: actuales.opciones.filter((_, i) => i !== indice),
        correcta,
      };
    });
    // Los errores por opción quedan indexados por posición: se recalculan.
    limpiarErrores((clave) => clave === "opciones" || clave.startsWith("opcion-"));
  };

  const elegirCorrecta = (indice) => {
    setValores((actuales) => ({ ...actuales, correcta: indice }));
    limpiarErrores((clave) => clave === "respuestaCorrecta");
  };

  const enfocarPrimerError = (resultado) => {
    const claves = Object.keys(resultado.errores);
    const idsPorClave = (clave) => {
      if (clave === "opciones") return "pregunta-opcion-0";
      if (clave.startsWith("opcion-")) return `pregunta-${clave}`;
      if (clave === "respuestaCorrecta") return "pregunta-respuesta-0";
      return `pregunta-${clave}`;
    };
    const orden = (clave) => {
      if (clave === "tipo") return 0;
      if (clave === "enunciado") return 1;
      if (clave === "opciones" || clave.startsWith("opcion-")) return 2;
      if (clave === "respuestaCorrecta") return 3;
      return 4;
    };
    const primera = [...claves].sort((a, b) => orden(a) - orden(b))[0];

    document.getElementById(idsPorClave(primera))?.focus();
  };

  const manejarEnvio = async (evento) => {
    evento.preventDefault();

    if (guardando) return;

    setErrorGeneral("");

    const resultado = validarPregunta({
      tipo: valores.tipo,
      enunciado: valores.enunciado,
      opciones: valores.opciones,
      respuestaCorrecta:
        valores.correcta === null ? "" : (valores.opciones[valores.correcta] ?? ""),
      explicacion: valores.explicacion,
    });

    setErrores(resultado.errores);

    if (!resultado.ok) {
      enfocarPrimerError(resultado);
      return;
    }

    setGuardando(true);

    try {
      if (esEdicion) {
        await actualizarPregunta(pregunta.id, resultado.datos);
      } else {
        await crearPregunta(user.uid, lectura.id, resultado.datos);
      }

      navigate(rutaLista, {
        state: {
          aviso: esEdicion
            ? "Guardamos los cambios de la pregunta."
            : "Creamos la pregunta.",
        },
      });
    } catch (error) {
      console.error("Error guardando la pregunta:", error);
      setErrorGeneral(
        "No pudimos guardar la pregunta. Revisá tu conexión y probá de nuevo.",
      );
      setGuardando(false);
    }
  };

  const puedeAgregar = opciones.length < LIMITES_PREGUNTA.opcionesMax;
  const puedeQuitar = opciones.length > LIMITES_PREGUNTA.opcionesMin;

  return (
    <div className="docente-pregunta-form">
      <div className="docente-pregunta-form__encabezado">
        <h1>{esEdicion ? "Editar pregunta" : "Nueva pregunta"}</h1>
        <p>
          Lectura: <strong>{lectura.titulo}</strong>
        </p>
      </div>

      {esEdicion && lectura.estado === "publicada" && (
        <p role="note" className="docente-pregunta-form__advertencia">
          {AVISO_EDITAR_PUBLICADA}
        </p>
      )}

      <form
        className="docente-pregunta-form__formulario"
        onSubmit={manejarEnvio}
        noValidate
      >
        {esEdicion ? (
          <p className="docente-pregunta-form__tipo">
            Tipo de pregunta:{" "}
            <strong>{ETIQUETA_TIPO_PREGUNTA[valores.tipo] ?? valores.tipo}</strong>{" "}
            (no se puede cambiar)
          </p>
        ) : (
          <Campo id="pregunta-tipo" etiqueta="Tipo de pregunta" error={errores.tipo}>
            {(atributos) => (
              <select {...atributos} value={valores.tipo} onChange={cambiarTipo}>
                {TIPOS_PREGUNTA.map((tipo) => (
                  <option key={tipo} value={tipo}>
                    {ETIQUETA_TIPO_PREGUNTA[tipo]}
                  </option>
                ))}
              </select>
            )}
          </Campo>
        )}

        <Campo
          id="pregunta-enunciado"
          etiqueta="Enunciado"
          error={errores.enunciado}
          ayuda={`${valores.enunciado.length} de ${LIMITES_PREGUNTA.enunciadoMax} caracteres (mínimo ${LIMITES_PREGUNTA.enunciadoMin}).`}
        >
          {(atributos) => (
            <textarea
              {...atributos}
              rows={3}
              value={valores.enunciado}
              onChange={cambiarCampo("enunciado")}
            />
          )}
        </Campo>

        {!esVerdaderoFalso && (
          <fieldset
            className="docente-pregunta-form__grupo"
            aria-describedby={errores.opciones ? "pregunta-opciones-error" : undefined}
          >
            <legend>
              Opciones ({LIMITES_PREGUNTA.opcionesMin} a {LIMITES_PREGUNTA.opcionesMax})
            </legend>

            {opciones.map((opcion, indice) => {
              const error = errores[`opcion-${indice}`];
              const id = `pregunta-opcion-${indice}`;

              return (
                <div key={indice} className="docente-pregunta-form__opcion">
                  <div className="docente-pregunta-form__campo">
                    <label htmlFor={id}>Opción {indice + 1}</label>

                    <div className="docente-pregunta-form__opcion-fila">
                      <input
                        id={id}
                        type="text"
                        value={opcion}
                        onChange={cambiarOpcion(indice)}
                        autoComplete="off"
                        aria-invalid={error ? "true" : undefined}
                        aria-describedby={error ? `${id}-error` : undefined}
                      />

                      {puedeQuitar && (
                        <button
                          type="button"
                          className="docente-pregunta-form__boton"
                          onClick={() => quitarOpcion(indice)}
                          aria-label={`Quitar la opción ${indice + 1}`}
                        >
                          Quitar
                        </button>
                      )}
                    </div>

                    {error && (
                      <p id={`${id}-error`} className="docente-pregunta-form__error">
                        {error}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}

            {errores.opciones && (
              <p id="pregunta-opciones-error" className="docente-pregunta-form__error">
                {errores.opciones}
              </p>
            )}

            <div className="docente-pregunta-form__acciones">
              <button
                type="button"
                className="docente-pregunta-form__boton"
                onClick={agregarOpcion}
                disabled={!puedeAgregar}
              >
                Agregar opción
              </button>
            </div>
          </fieldset>
        )}

        <fieldset
          className="docente-pregunta-form__grupo"
          aria-describedby={
            errores.respuestaCorrecta ? "pregunta-respuesta-error" : undefined
          }
        >
          <legend>Respuesta correcta</legend>

          {opciones.map((opcion, indice) => (
            <label key={indice} className="docente-pregunta-form__radio">
              <input
                id={`pregunta-respuesta-${indice}`}
                type="radio"
                name="respuestaCorrecta"
                checked={valores.correcta === indice}
                onChange={() => elegirCorrecta(indice)}
                aria-invalid={errores.respuestaCorrecta ? "true" : undefined}
              />
              <span>{opcion.trim() || `Opción ${indice + 1} (vacía)`}</span>
            </label>
          ))}

          {errores.respuestaCorrecta && (
            <p id="pregunta-respuesta-error" className="docente-pregunta-form__error">
              {errores.respuestaCorrecta}
            </p>
          )}
        </fieldset>

        <Campo
          id="pregunta-explicacion"
          etiqueta="Explicación (opcional)"
          error={errores.explicacion}
          ayuda={`Se la mostramos al estudiante después de responder. ${valores.explicacion.length} de ${LIMITES_PREGUNTA.explicacionMax} caracteres.`}
        >
          {(atributos) => (
            <textarea
              {...atributos}
              rows={3}
              value={valores.explicacion}
              onChange={cambiarCampo("explicacion")}
            />
          )}
        </Campo>

        {errorGeneral && (
          <p role="alert" className="docente-pregunta-form__error-general">
            {errorGeneral}
          </p>
        )}

        <div className="docente-pregunta-form__acciones">
          <button
            type="submit"
            className="docente-pregunta-form__boton docente-pregunta-form__boton--primario"
            disabled={guardando}
          >
            {guardando
              ? "Guardando..."
              : esEdicion
                ? "Guardar cambios"
                : "Crear pregunta"}
          </button>

          <Link to={rutaLista} className="docente-pregunta-form__boton">
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
};

const Mensaje = ({ role, children }) => (
  <div className="docente-pregunta-form">
    <div role={role} className="docente-pregunta-form__mensaje">
      {children}
    </div>
  </div>
);

// Sirve para /docente/lecturas/:lecturaId/preguntas/nueva y
// .../preguntas/:preguntaId/editar. El <main> lo aporta DocenteLayout.
const QuestionsEditor = () => {
  const { lecturaId, preguntaId } = useParams();
  const { estado, lectura, preguntas, recargar } =
    usePreguntasDeLectura(lecturaId);

  if (estado === "cargando") {
    return (
      <div className="docente-pregunta-form">
        <p role="status" className="docente-pregunta-form__mensaje">
          Cargando...
        </p>
      </div>
    );
  }

  if (estado === "error") {
    return (
      <Mensaje role="alert">
        <h1>No pudimos cargar el formulario</h1>
        <p>Revisá tu conexión y probá de nuevo.</p>
        <div className="docente-pregunta-form__acciones">
          <button
            type="button"
            className="docente-pregunta-form__boton docente-pregunta-form__boton--primario"
            onClick={recargar}
          >
            Reintentar
          </button>
          <Link to={RUTA_BANCO} className="docente-pregunta-form__boton">
            Volver al banco de preguntas
          </Link>
        </div>
      </Mensaje>
    );
  }

  if (estado === "no-encontrada") {
    return (
      <Mensaje>
        <h1>No encontramos esa lectura</h1>
        <p>Revisá el enlace o volvé a tu banco de preguntas.</p>
        <div className="docente-pregunta-form__acciones">
          <Link
            to={RUTA_BANCO}
            className="docente-pregunta-form__boton docente-pregunta-form__boton--primario"
          >
            Volver al banco de preguntas
          </Link>
        </div>
      </Mensaje>
    );
  }

  const rutaLista = `/docente/lecturas/${lectura.id}/preguntas`;
  const pregunta = preguntaId
    ? preguntas.find((candidata) => candidata.id === preguntaId)
    : null;

  // Editar una pregunta que no existe o que es de otra persona: mismo mensaje.
  if (preguntaId && (!pregunta || !pregunta.propia)) {
    return (
      <Mensaje>
        <h1>No encontramos esa pregunta</h1>
        <p>Revisá el enlace o volvé a la lista de preguntas de la lectura.</p>
        <div className="docente-pregunta-form__acciones">
          <Link
            to={rutaLista}
            className="docente-pregunta-form__boton docente-pregunta-form__boton--primario"
          >
            Volver a las preguntas
          </Link>
        </div>
      </Mensaje>
    );
  }

  // Crear una pregunta nueva no se permite con la lectura publicada (ver la
  // explicación en QuestionsLectura): también se corta acá por si entran por
  // la URL directa.
  if (!pregunta && lectura.estado === "publicada") {
    return (
      <Mensaje>
        <h1>No se pueden agregar preguntas</h1>
        <p role="note">{AVISO_PUBLICADA_NUEVA}</p>
        <div className="docente-pregunta-form__acciones">
          <Link
            to={rutaLista}
            className="docente-pregunta-form__boton docente-pregunta-form__boton--primario"
          >
            Volver a las preguntas
          </Link>
        </div>
      </Mensaje>
    );
  }

  return (
    <FormularioPregunta
      key={pregunta?.id ?? "nueva"}
      lectura={lectura}
      pregunta={pregunta}
    />
  );
};

export default QuestionsEditor;
