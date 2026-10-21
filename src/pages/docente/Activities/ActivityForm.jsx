import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";

import { useLecturasAsignables } from "../../../hooks/useLecturasAsignables";
import { asignarActividad } from "../../../repositories/actividadesDocenteRepository";
import { formatearFecha } from "../../../utils/formatearFecha";
import {
  LIMITES_ASIGNACION,
  aValorDatetimeLocal,
  avisoCorreosInvalidos,
  fechaLimiteSugerida,
  parsearCorreos,
  validarAsignacion,
} from "../../../utils/validarAsignacion";
import "./ActivityForm.css";

const RUTA_LISTA = "/docente/actividades";

const ORDEN_CAMPOS = ["lecturaId", "correosTexto", "fechaLimite"];

const MENSAJE_GENERICO =
  "No pudimos asignar la actividad. Revisá tu conexión y probá de nuevo.";

// Códigos de la Cloud Function cuyo mensaje ya está pensado para el docente.
const CODIGOS_CON_MENSAJE = new Set([
  "unauthenticated",
  "permission-denied",
  "invalid-argument",
  "failed-precondition",
  "not-found",
  "unavailable",
]);

// Los mensajes de la función son frases en español. Si el SDK devuelve un
// código pelado ("NOT_FOUND" cuando la función no está desplegada), mejor el
// mensaje genérico que mostrárselo al docente.
const mensajeDeError = (error) => {
  const codigo = typeof error?.code === "string" ? error.code : "";
  const mensaje = typeof error?.message === "string" ? error.message.trim() : "";

  if (
    codigo.startsWith("functions/") &&
    CODIGOS_CON_MENSAJE.has(codigo.slice("functions/".length)) &&
    /\s/.test(mensaje)
  ) {
    return mensaje;
  }

  return MENSAJE_GENERICO;
};

const valoresIniciales = () => ({
  lecturaId: "",
  correosTexto: "",
  fechaLimite: fechaLimiteSugerida(new Date()),
});

const textoPreguntas = (cantidad) =>
  cantidad === 1 ? "1 pregunta" : `${cantidad} preguntas`;

// Un campo con su etiqueta, ayuda opcional, notas informativas y error en
// línea. Le pasa a su control los atributos de accesibilidad ya resueltos.
// notas: [{ clave, texto, tono? }], se anuncian de forma educada (aria-live).
const Campo = ({ id, etiqueta, error, ayuda, notas = [], children }) => {
  const describedBy =
    [
      ayuda ? `${id}-ayuda` : null,
      ...notas.map((nota) => `${id}-${nota.clave}`),
      error ? `${id}-error` : null,
    ]
      .filter(Boolean)
      .join(" ") || undefined;

  return (
    <div className="docente-actividad-form__campo">
      <label htmlFor={id}>{etiqueta}</label>

      {children({
        id,
        "aria-describedby": describedBy,
        "aria-invalid": error ? "true" : undefined,
      })}

      {ayuda && (
        <p id={`${id}-ayuda`} className="docente-actividad-form__ayuda">
          {ayuda}
        </p>
      )}

      {notas.map((nota) => (
        <p
          key={nota.clave}
          id={`${id}-${nota.clave}`}
          className={`docente-actividad-form__nota${
            nota.tono === "aviso" ? " docente-actividad-form__nota--aviso" : ""
          }`}
          aria-live="polite"
        >
          {nota.texto}
        </p>
      ))}

      {error && (
        <p id={`${id}-error`} className="docente-actividad-form__error">
          {error}
        </p>
      )}
    </div>
  );
};

const ResultadoAsignacion = ({ resultado, onOtra }) => {
  const contenedor = useRef(null);

  // El formulario desaparece al asignar: se lleva el foco al resultado para
  // que quien usa lector de pantalla o teclado no quede en el vacío.
  useEffect(() => {
    contenedor.current?.focus();
  }, []);

  const { asignados, noAsignados, fechaLimite } = resultado;

  return (
    <div
      ref={contenedor}
      tabIndex={-1}
      className="docente-actividad-form__resultado"
    >
      <div role="status" className="docente-actividad-form__exito">
        <h2>Actividad asignada</h2>
        <p>
          La asignamos a {asignados.length === 1 ? "1 estudiante" : `${asignados.length} estudiantes`}
          {/* formatearFecha ya termina en "p. m.": otro punto daría "p. m.." */}
          {fechaLimite ? `, con fecha límite: ${formatearFecha(fechaLimite)}` : "."}
        </p>
      </div>

      <section className="docente-actividad-form__bloque">
        <h3>Asignada a:</h3>
        <ul className="docente-actividad-form__lista">
          {asignados.map((asignado) => (
            <li key={asignado.estudianteId}>
              {asignado.nombre} ({asignado.correo})
            </li>
          ))}
        </ul>
      </section>

      {noAsignados.length > 0 && (
        <section className="docente-actividad-form__bloque docente-actividad-form__bloque--aparte">
          <h3>No encontramos una cuenta de estudiante para:</h3>
          <ul className="docente-actividad-form__lista">
            {noAsignados.map((correo) => (
              <li key={correo}>{correo}</li>
            ))}
          </ul>
        </section>
      )}

      <div className="docente-actividad-form__acciones">
        <button
          type="button"
          className="docente-actividad-form__boton docente-actividad-form__boton--primario"
          onClick={onOtra}
        >
          Asignar otra actividad
        </button>

        <Link to={RUTA_LISTA} className="docente-actividad-form__boton">
          Volver a mis actividades
        </Link>
      </div>
    </div>
  );
};

const FormularioActividad = ({ lecturas, categorias }) => {
  const [valores, setValores] = useState(valoresIniciales);
  const [errores, setErrores] = useState({});
  const [errorGeneral, setErrorGeneral] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState(null);

  // Guarda síncrona contra doble envío: la función no es idempotente.
  const envioEnCurso = useRef(false);

  // Mínimo del selector de fecha: el momento en que se abrió el formulario.
  const [minimo] = useState(() => aValorDatetimeLocal(new Date()));

  const nombresCategoria = Object.fromEntries(
    categorias.map((categoria) => [categoria.id, categoria.nombre]),
  );

  const { correos, duplicados } = useMemo(
    () => parsearCorreos(valores.correosTexto),
    [valores.correosTexto],
  );

  const { maxCorreos } = LIMITES_ASIGNACION;

  const notasCorreos = [];

  let resumen = `${correos.length} ${correos.length === 1 ? "correo detectado" : "correos detectados"}`;

  if (duplicados > 0) {
    resumen += ` (ignoramos ${duplicados} ${duplicados === 1 ? "repetido" : "repetidos"})`;
  }

  if (correos.length > maxCorreos) {
    resumen += `: el máximo es ${maxCorreos}`;
  }

  notasCorreos.push({
    clave: "resumen",
    texto: `${resumen}.`,
    tono: correos.length > maxCorreos ? "aviso" : undefined,
  });

  const avisoFormato = avisoCorreosInvalidos(correos);

  if (avisoFormato) {
    notasCorreos.push({
      clave: "formato",
      texto: `${avisoFormato} Igual los vamos a intentar asignar.`,
      tono: "aviso",
    });
  }

  const cambiar = (campo) => (evento) => {
    const { value } = evento.target;

    setValores((actuales) => ({ ...actuales, [campo]: value }));
    setErrores((actuales) => {
      if (!actuales[campo]) return actuales;

      const siguientes = { ...actuales };
      delete siguientes[campo];
      return siguientes;
    });
  };

  const manejarEnvio = async (evento) => {
    evento.preventDefault();

    if (envioEnCurso.current || resultado) return;

    setErrorGeneral("");

    const validacion = validarAsignacion(valores, new Date());

    setErrores(validacion.errores);

    if (!validacion.ok) {
      const primero = ORDEN_CAMPOS.find((campo) => validacion.errores[campo]);
      document.getElementById(`actividad-${primero}`)?.focus();
      return;
    }

    envioEnCurso.current = true;
    setEnviando(true);

    try {
      const respuesta = await asignarActividad(validacion.datos);

      setResultado({
        asignados: Array.isArray(respuesta?.asignados) ? respuesta.asignados : [],
        noAsignados: Array.isArray(respuesta?.noAsignados)
          ? respuesta.noAsignados
          : [],
        fechaLimite: validacion.datos.fechaLimite,
      });
    } catch (error) {
      console.error("Error asignando la actividad:", error);
      setErrorGeneral(mensajeDeError(error));
    } finally {
      envioEnCurso.current = false;
      setEnviando(false);
    }
  };

  const asignarOtra = () => {
    setResultado(null);
    setValores(valoresIniciales());
    setErrores({});
    setErrorGeneral("");
  };

  if (resultado) {
    return <ResultadoAsignacion resultado={resultado} onOtra={asignarOtra} />;
  }

  return (
    <form
      className="docente-actividad-form__formulario"
      onSubmit={manejarEnvio}
      noValidate
    >
      <Campo
        id="actividad-lecturaId"
        etiqueta="Lectura"
        error={errores.lecturaId}
        ayuda="Solo aparecen lecturas publicadas con al menos una pregunta."
      >
        {(atributos) => (
          <select
            {...atributos}
            value={valores.lecturaId}
            onChange={cambiar("lecturaId")}
          >
            <option value="">Elegí una lectura</option>
            {lecturas.map((lectura) => (
              <option key={lectura.id} value={lectura.id}>
                {`${lectura.titulo} · ${nombresCategoria[lectura.categoriaId] || "Sin categoría"} · ${textoPreguntas(lectura.totalPreguntas)}`}
              </option>
            ))}
          </select>
        )}
      </Campo>

      <Campo
        id="actividad-correosTexto"
        etiqueta="Correos de los estudiantes"
        error={errores.correosTexto}
        ayuda={`Pegá los correos separados por coma, espacio o salto de línea (hasta ${maxCorreos}).`}
        notas={notasCorreos}
      >
        {(atributos) => (
          <textarea
            {...atributos}
            rows={6}
            value={valores.correosTexto}
            onChange={cambiar("correosTexto")}
            autoComplete="off"
            spellCheck={false}
          />
        )}
      </Campo>

      <Campo
        id="actividad-fechaLimite"
        etiqueta="Fecha límite"
        error={errores.fechaLimite}
        ayuda="Es en tu hora local. Pasada esa fecha la actividad queda vencida."
      >
        {(atributos) => (
          <input
            {...atributos}
            type="datetime-local"
            min={minimo}
            value={valores.fechaLimite}
            onChange={cambiar("fechaLimite")}
          />
        )}
      </Campo>

      {errorGeneral && (
        <p role="alert" className="docente-actividad-form__error-general">
          {errorGeneral}
        </p>
      )}

      <div className="docente-actividad-form__acciones">
        <button
          type="submit"
          className="docente-actividad-form__boton docente-actividad-form__boton--primario"
          disabled={enviando}
        >
          {enviando ? "Asignando…" : "Asignar actividad"}
        </button>

        <Link to={RUTA_LISTA} className="docente-actividad-form__boton">
          Cancelar
        </Link>
      </div>
    </form>
  );
};

// Sirve para /docente/actividades/nueva.
// El <main> lo aporta DocenteLayout, por eso acá solo hay <div>.
const ActivityForm = () => {
  const { lecturas, categorias, cargando, error, reintentar } =
    useLecturasAsignables();

  let contenido;

  if (cargando) {
    contenido = (
      <p role="status" className="docente-actividad-form__mensaje">
        Cargando...
      </p>
    );
  } else if (error) {
    contenido = (
      <div role="alert" className="docente-actividad-form__mensaje">
        <p>No pudimos cargar las lecturas. Revisá tu conexión y probá de nuevo.</p>
        <div className="docente-actividad-form__acciones">
          <button
            type="button"
            className="docente-actividad-form__boton docente-actividad-form__boton--primario"
            onClick={reintentar}
          >
            Reintentar
          </button>
          <Link to={RUTA_LISTA} className="docente-actividad-form__boton">
            Volver a mis actividades
          </Link>
        </div>
      </div>
    );
  } else if (lecturas.length === 0) {
    contenido = (
      <div className="docente-actividad-form__mensaje">
        <h2>Todavía no hay nada para asignar</h2>
        <p>
          Para asignar una actividad necesitás una lectura publicada con al
          menos una pregunta.
        </p>
        <div className="docente-actividad-form__acciones">
          <Link
            to="/docente/lecturas"
            className="docente-actividad-form__boton docente-actividad-form__boton--primario"
          >
            Lecturas
          </Link>
          <Link
            to="/docente/preguntas"
            className="docente-actividad-form__boton"
          >
            Preguntas
          </Link>
        </div>
      </div>
    );
  } else {
    contenido = (
      <FormularioActividad lecturas={lecturas} categorias={categorias} />
    );
  }

  return (
    <div className="docente-actividad-form">
      <div className="docente-actividad-form__encabezado">
        <h1>Nueva actividad</h1>
        <p>
          Elegí una lectura, indicá a quiénes se la asignás y hasta cuándo
          pueden resolverla.
        </p>
      </div>

      {contenido}
    </div>
  );
};

export default ActivityForm;
