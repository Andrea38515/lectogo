import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { useAuth } from "../../../hooks/useAuth";
import { useLecturaEditable } from "../../../hooks/useLecturaEditable";
import {
  actualizarLectura,
  crearLectura,
} from "../../../repositories/lecturasDocenteRepository";
import {
  LIMITES_LECTURA,
  NIVELES_DIFICULTAD,
  validarLectura,
} from "../../../utils/validarLectura";
import "./LectureForm.css";

const RUTA_LISTA = "/docente/lecturas";

const OPCIONES_ESTADO = [
  { valor: "borrador", etiqueta: "Borrador" },
  { valor: "publicada", etiqueta: "Publicada" },
  { valor: "archivada", etiqueta: "Archivada" },
];

const ORDEN_CAMPOS = [
  "titulo",
  "categoriaId",
  "nivelDificultad",
  "contenido",
  "estado",
];

const AVISO_PUBLICADA =
  "Si la lectura ya está en una actividad, los estudiantes no podrán abrirla.";

const valoresIniciales = (lectura) => ({
  titulo: lectura?.titulo ?? "",
  categoriaId: lectura?.categoriaId ?? "",
  nivelDificultad: lectura?.nivelDificultad ?? "",
  contenido: lectura?.contenido ?? "",
  estado: lectura?.estado ?? "borrador",
});

// Un campo con su etiqueta, ayuda opcional y error en línea. Le pasa a su
// control los atributos de accesibilidad ya resueltos.
const Campo = ({ id, etiqueta, error, ayuda, children }) => {
  const describedBy =
    [ayuda ? `${id}-ayuda` : null, error ? `${id}-error` : null]
      .filter(Boolean)
      .join(" ") || undefined;

  return (
    <div className="docente-lectura-form__campo">
      <label htmlFor={id}>{etiqueta}</label>

      {children({
        id,
        "aria-describedby": describedBy,
        "aria-invalid": error ? "true" : undefined,
      })}

      {ayuda && (
        <p id={`${id}-ayuda`} className="docente-lectura-form__ayuda">
          {ayuda}
        </p>
      )}

      {error && (
        <p id={`${id}-error`} className="docente-lectura-form__error">
          {error}
        </p>
      )}
    </div>
  );
};

const FormularioLectura = ({ lectura, categorias }) => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const esEdicion = Boolean(lectura);
  const [valores, setValores] = useState(() => valoresIniciales(lectura));
  const [errores, setErrores] = useState({});
  const [errorGeneral, setErrorGeneral] = useState("");
  const [guardando, setGuardando] = useState(false);

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

    if (guardando) return;

    setErrorGeneral("");

    const resultado = validarLectura(
      valores,
      categorias.map((categoria) => categoria.id),
    );

    setErrores(resultado.errores);

    if (!resultado.ok) {
      const primero = ORDEN_CAMPOS.find((campo) => resultado.errores[campo]);
      document.getElementById(`lectura-${primero}`)?.focus();
      return;
    }

    setGuardando(true);

    try {
      if (esEdicion) {
        await actualizarLectura(lectura.id, resultado.datos);
      } else {
        await crearLectura(user.uid, resultado.datos);
      }

      navigate(RUTA_LISTA, {
        state: {
          aviso: esEdicion
            ? "Guardamos los cambios de la lectura."
            : "Creamos la lectura.",
        },
      });
    } catch (error) {
      console.error("Error guardando la lectura:", error);
      setErrorGeneral(
        "No pudimos guardar la lectura. Revisá tu conexión y probá de nuevo.",
      );
      setGuardando(false);
    }
  };

  const retiraDePublicadas =
    lectura?.estado === "publicada" && valores.estado !== "publicada";

  return (
    <div className="docente-lectura-form">
      <div className="docente-lectura-form__encabezado">
        <h1>{esEdicion ? "Editar lectura" : "Nueva lectura"}</h1>
        <p>
          {esEdicion
            ? "Cambiá lo que necesites y guardá."
            : "Escribí el texto y elegí cómo lo van a encontrar tus estudiantes."}
        </p>
      </div>

      <form
        className="docente-lectura-form__formulario"
        onSubmit={manejarEnvio}
        noValidate
      >
        <Campo id="lectura-titulo" etiqueta="Título" error={errores.titulo}>
          {(atributos) => (
            <input
              {...atributos}
              type="text"
              value={valores.titulo}
              onChange={cambiar("titulo")}
              autoComplete="off"
            />
          )}
        </Campo>

        <Campo
          id="lectura-categoriaId"
          etiqueta="Categoría"
          error={errores.categoriaId}
        >
          {(atributos) => (
            <select
              {...atributos}
              value={valores.categoriaId}
              onChange={cambiar("categoriaId")}
            >
              <option value="">Elegí una categoría</option>
              {categorias.map((categoria) => (
                <option key={categoria.id} value={categoria.id}>
                  {categoria.nombre}
                </option>
              ))}
            </select>
          )}
        </Campo>

        <Campo
          id="lectura-nivelDificultad"
          etiqueta="Nivel de dificultad"
          error={errores.nivelDificultad}
        >
          {(atributos) => (
            <select
              {...atributos}
              value={valores.nivelDificultad}
              onChange={cambiar("nivelDificultad")}
            >
              <option value="">Elegí un nivel</option>
              {NIVELES_DIFICULTAD.map((nivel) => (
                <option key={nivel} value={nivel}>
                  {nivel}
                </option>
              ))}
            </select>
          )}
        </Campo>

        <Campo
          id="lectura-contenido"
          etiqueta="Texto de la lectura"
          error={errores.contenido}
          ayuda={`${valores.contenido.length} de ${LIMITES_LECTURA.contenidoMax} caracteres (mínimo ${LIMITES_LECTURA.contenidoMin}).`}
        >
          {(atributos) => (
            <textarea
              {...atributos}
              rows={12}
              value={valores.contenido}
              onChange={cambiar("contenido")}
            />
          )}
        </Campo>

        <Campo
          id="lectura-estado"
          etiqueta="Estado"
          error={errores.estado}
          ayuda={
            retiraDePublicadas
              ? AVISO_PUBLICADA
              : "Los estudiantes solo ven las lecturas publicadas."
          }
        >
          {(atributos) => (
            <select
              {...atributos}
              value={valores.estado}
              onChange={cambiar("estado")}
            >
              {OPCIONES_ESTADO.map(({ valor, etiqueta }) => (
                <option key={valor} value={valor}>
                  {etiqueta}
                </option>
              ))}
            </select>
          )}
        </Campo>

        {errorGeneral && (
          <p role="alert" className="docente-lectura-form__error-general">
            {errorGeneral}
          </p>
        )}

        <div className="docente-lectura-form__acciones">
          <button
            type="submit"
            className="docente-lectura-form__boton docente-lectura-form__boton--primario"
            disabled={guardando}
          >
            {guardando
              ? "Guardando..."
              : esEdicion
                ? "Guardar cambios"
                : "Crear lectura"}
          </button>

          <Link to={RUTA_LISTA} className="docente-lectura-form__boton">
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
};

// Sirve para /docente/lecturas/nueva y /docente/lecturas/:lecturaId/editar.
// El <main> lo aporta DocenteLayout, por eso acá solo hay <div>.
const LectureForm = () => {
  const { lecturaId } = useParams();
  const { estado, lectura, categorias, reintentar } =
    useLecturaEditable(lecturaId);

  if (estado === "cargando") {
    return (
      <div className="docente-lectura-form">
        <p role="status" className="docente-lectura-form__mensaje">
          Cargando...
        </p>
      </div>
    );
  }

  if (estado === "error") {
    return (
      <div className="docente-lectura-form">
        <div role="alert" className="docente-lectura-form__mensaje">
          <h1>No pudimos cargar el formulario</h1>
          <p>Revisá tu conexión y probá de nuevo.</p>
          <div className="docente-lectura-form__acciones">
            <button
              type="button"
              className="docente-lectura-form__boton docente-lectura-form__boton--primario"
              onClick={reintentar}
            >
              Reintentar
            </button>
            <Link to={RUTA_LISTA} className="docente-lectura-form__boton">
              Volver a mis lecturas
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (estado === "no-encontrada") {
    return (
      <div className="docente-lectura-form">
        <div className="docente-lectura-form__mensaje">
          <h1>No encontramos esa lectura</h1>
          <p>Revisá el enlace o volvé a tu lista de lecturas.</p>
          <div className="docente-lectura-form__acciones">
            <Link
              to={RUTA_LISTA}
              className="docente-lectura-form__boton docente-lectura-form__boton--primario"
            >
              Volver a mis lecturas
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <FormularioLectura
      key={lectura?.id ?? "nueva"}
      lectura={lectura}
      categorias={categorias}
    />
  );
};

export default LectureForm;
