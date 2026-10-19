import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";

import Button from "../../../components/Button/Button";
import Loading from "../../../components/Loading/Loading";
import { useResolverActividad } from "../../../hooks/useResolverActividad";
import { registrarIntento } from "../../../repositories/intentosRepository";
import { formatearFecha } from "../../../utils/formatearFecha";
import ResultadosActividad from "./ResultadosActividad";
import "./ResolverActividad.css";

const MENSAJES_GUARDA = {
  "no-encontrada": {
    titulo: "Actividad no encontrada",
    texto: "La actividad que buscas no existe o ya no está disponible.",
  },
  "sin-acceso": {
    titulo: "No tienes acceso a esta actividad",
    texto: "Esta actividad no existe o no está asignada a tu cuenta.",
  },
  cerrada: {
    titulo: "Actividad cerrada",
    texto: "Esta actividad ya no está disponible para resolverse.",
  },
  "sin-lectura": {
    titulo: "Lectura no disponible",
    texto: "No pudimos encontrar la lectura de esta actividad.",
  },
  "sin-preguntas": {
    titulo: "Actividad sin preguntas",
    texto: "Esta actividad todavía no tiene preguntas para resolver.",
  },
  "sin-sesion": {
    titulo: "Necesitas iniciar sesión",
    texto: "Inicia sesión de nuevo para resolver la actividad.",
  },
  error: {
    titulo: "No pudimos cargar la actividad",
    texto: "Ocurrió un problema al obtener la actividad. Inténtalo nuevamente.",
  },
};

const MENSAJES_ERROR_ENVIO = {
  "functions/unauthenticated":
    "Tu sesión expiró. Inicia sesión de nuevo para enviar tus respuestas.",
  "functions/permission-denied":
    "No tienes permiso para resolver esta actividad. Verifica que te la hayan asignado y que tu cuenta sea de estudiante.",
  // El docente pudo agregar o quitar preguntas después de cargar la página:
  // reintentar con las mismas respuestas fallaría igual, hay que recargar.
  "functions/invalid-argument":
    "Faltan respuestas o la actividad cambió mientras la resolvías. Recarga la actividad para ver las preguntas actuales.",
  "functions/not-found":
    "No encontramos la actividad o alguna de sus preguntas. Puede que haya sido eliminada.",
};

const MENSAJE_ERROR_GENERICO =
  "No pudimos enviar tus respuestas. Revisa tu conexión e inténtalo de nuevo; tus respuestas siguen en esta pantalla.";

const MENSAJE_NO_DISPONIBLE =
  "Esta actividad no está disponible para recibir respuestas.";

const CODIGOS_PARA_RECARGAR = new Set([
  "functions/invalid-argument",
  "functions/not-found",
]);

// El SDK de Firebase agrega " [<status HTTP>]" al final del mensaje del servidor.
const limpiarMensajeServidor = (mensaje) =>
  (mensaje || "").replace(/\s*\[\d{3}\]\s*$/, "").trim();

// failed-precondition cubre casos distintos (actividad cerrada, fecha límite
// vencida, contenido incompleto): el servidor ya los explica en español.
const obtenerMensajeErrorEnvio = (err) => {
  if (err?.code === "functions/failed-precondition") {
    return limpiarMensajeServidor(err.message) || MENSAJE_NO_DISPONIBLE;
  }

  return MENSAJES_ERROR_ENVIO[err?.code] || MENSAJE_ERROR_GENERICO;
};

// El contenido separa los párrafos con líneas en blanco ("\n\n").
const dividirParrafos = (contenido) =>
  (contenido || "")
    .split(/\n{2,}/)
    .map((parrafo) => parrafo.trim())
    .filter(Boolean);

const EnlaceActividades = () => (
  <Link
    to="/estudiante/actividades"
    className="resolver-actividad__enlace resolver-actividad__enlace--secundario"
  >
    Volver a mis actividades
  </Link>
);

const FormularioActividad = ({
  actividadId,
  lectura,
  preguntas,
  fechaLimite,
  fechaPasada,
  onRecargar,
}) => {
  const [respuestas, setRespuestas] = useState({});
  const [enviando, setEnviando] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState(null);
  const [resultado, setResultado] = useState(null);

  // El estado tarda un render en reflejarse: la ref bloquea el doble envío.
  const enviandoRef = useRef(false);
  const errorRef = useRef(null);

  // Al deshabilitarse los campos durante el envío, el foco del teclado cae al
  // <body>; al fallar se lleva al mensaje para no obligar a recorrer la página.
  useEffect(() => {
    if (errorEnvio) {
      errorRef.current?.focus();
    }
  }, [errorEnvio]);

  const respondidas = preguntas.filter((pregunta) => respuestas[pregunta.id]).length;
  const todasRespondidas = respondidas === preguntas.length;
  const porcentajeAvance = Math.round((respondidas / preguntas.length) * 100);

  if (resultado) {
    return (
      <ResultadosActividad
        titulo={lectura.titulo}
        preguntas={preguntas}
        resultado={resultado}
      />
    );
  }

  const seleccionarOpcion = (preguntaId, opcion) => {
    setRespuestas((actuales) => ({ ...actuales, [preguntaId]: opcion }));
  };

  const enviarRespuestas = async (event) => {
    event.preventDefault();

    if (enviandoRef.current || !todasRespondidas) {
      return;
    }

    enviandoRef.current = true;
    setEnviando(true);
    setErrorEnvio(null);

    try {
      const data = await registrarIntento(
        actividadId,
        preguntas.map((pregunta) => ({
          preguntaId: pregunta.id,
          respuestaDada: respuestas[pregunta.id],
        })),
      );

      setResultado({
        respuestas: data.respuestas,
        porcentajeAciertos: data.porcentajeAciertos,
        xpGanado: data.xpGanado,
        resueltoEn: data.resueltoEn,
        duplicado: Boolean(data.duplicado),
      });
    } catch (err) {
      // Se conservan las respuestas del estudiante para que pueda reintentar.
      setErrorEnvio({
        mensaje: obtenerMensajeErrorEnvio(err),
        recargar: CODIGOS_PARA_RECARGAR.has(err?.code),
      });
    } finally {
      enviandoRef.current = false;
      setEnviando(false);
    }
  };

  return (
    <>
      <header className="resolver-actividad__encabezado">
        <span className="resolver-actividad__etiqueta">Actividad</span>

        <h1 className="resolver-actividad__titulo">{lectura.titulo}</h1>

        <p className="resolver-actividad__meta">
          {lectura.nivelDificultad && <span>Nivel: {lectura.nivelDificultad}</span>}
          {fechaLimite && <span>Fecha límite: {formatearFecha(fechaLimite)}</span>}
        </p>

        {fechaPasada && (
          <p className="resolver-actividad__aviso">
            La fecha límite ya pasó según la hora de tu dispositivo. Puedes
            intentar enviar tus respuestas: si el plazo terminó, el sistema te lo
            indicará.
          </p>
        )}
      </header>

      <article className="resolver-actividad__lectura">
        <h2 className="resolver-actividad__subtitulo">Lectura</h2>

        {dividirParrafos(lectura.contenido).map((parrafo, indice) => (
          <p key={indice}>{parrafo}</p>
        ))}
      </article>

      <form className="resolver-actividad__form" onSubmit={enviarRespuestas} noValidate>
        <div className="resolver-actividad__progreso">
          <p>
            <strong>
              {respondidas} de {preguntas.length}
            </strong>{" "}
            respondidas
          </p>

          <div
            className="resolver-actividad__barra"
            role="progressbar"
            aria-label="Preguntas respondidas"
            aria-valuemin={0}
            aria-valuemax={preguntas.length}
            aria-valuenow={respondidas}
          >
            <div
              className="resolver-actividad__barra-relleno"
              style={{ width: `${porcentajeAvance}%` }}
            />
          </div>
        </div>

        <ol className="resolver-actividad__lista">
          {preguntas.map((pregunta, indice) => (
            <li key={pregunta.id} className="resolver-actividad__tarjeta">
              <fieldset className="resolver-actividad__pregunta" disabled={enviando}>
                <legend className="resolver-actividad__enunciado">
                  <span className="resolver-actividad__numero">
                    Pregunta {indice + 1}
                  </span>
                  {pregunta.enunciado}
                </legend>

                <div className="resolver-actividad__opciones">
                  {pregunta.opciones.map((opcion, posicion) => (
                    <label
                      key={posicion}
                      className={`resolver-actividad__opcion ${
                        respuestas[pregunta.id] === opcion
                          ? "resolver-actividad__opcion--seleccionada"
                          : ""
                      }`}
                    >
                      <input
                        type="radio"
                        name={`pregunta-${pregunta.id}`}
                        value={opcion}
                        checked={respuestas[pregunta.id] === opcion}
                        onChange={() => seleccionarOpcion(pregunta.id, opcion)}
                      />
                      <span>{opcion}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            </li>
          ))}
        </ol>

        {errorEnvio && (
          <div
            className="resolver-actividad__error"
            role="alert"
            tabIndex={-1}
            ref={errorRef}
          >
            <p>{errorEnvio.mensaje}</p>

            {errorEnvio.recargar && (
              <Button variant="secondary" onClick={onRecargar}>
                Recargar actividad
              </Button>
            )}
          </div>
        )}

        <div className="resolver-actividad__envio">
          <Button
            type="submit"
            size="large"
            disabled={!todasRespondidas || enviando}
          >
            {enviando ? "Enviando..." : "Enviar respuestas"}
          </Button>

          {!todasRespondidas && (
            <p className="resolver-actividad__ayuda">
              Responde todas las preguntas para poder enviar.
            </p>
          )}
        </div>
      </form>
    </>
  );
};

const ResolverActividadContenido = ({ actividadId }) => {
  const { isLoading, datos, reintentar } = useResolverActividad(actividadId);

  if (isLoading) {
    return (
      <section className="resolver-actividad">
        <Loading message="Cargando actividad..." />
      </section>
    );
  }

  if (datos.estado !== "listo") {
    const mensaje = MENSAJES_GUARDA[datos.estado] || MENSAJES_GUARDA.error;

    return (
      <section className="resolver-actividad">
        <div
          className="resolver-actividad__estado"
          role={datos.estado === "error" ? "alert" : undefined}
        >
          <h1>{mensaje.titulo}</h1>

          <p>{mensaje.texto}</p>

          <div className="resolver-actividad__acciones">
            {datos.estado === "error" && (
              <Button onClick={reintentar}>Intentar nuevamente</Button>
            )}

            <EnlaceActividades />
          </div>
        </div>
      </section>
    );
  }

  const { actividad, lectura, preguntas, intento, fechaLimite, fechaPasada } = datos;

  return (
    <section className="resolver-actividad">
      {intento ? (
        <ResultadosActividad
          titulo={lectura?.titulo || "Actividad"}
          preguntas={preguntas}
          resultado={intento}
        />
      ) : (
        <FormularioActividad
          actividadId={actividad.id}
          lectura={lectura}
          preguntas={preguntas}
          fechaLimite={fechaLimite}
          fechaPasada={fechaPasada}
          onRecargar={reintentar}
        />
      )}
    </section>
  );
};

const ResolverActividad = () => {
  const { actividadId } = useParams();

  // La key reinicia respuestas y resultados si cambia la actividad en la URL.
  return <ResolverActividadContenido key={actividadId} actividadId={actividadId} />;
};

export default ResolverActividad;
