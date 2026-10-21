import { useState } from "react";

import { useCategoriasAdmin } from "../../../hooks/useCategoriasAdmin";
import { gestionarCategoria } from "../../../repositories/adminRepository";
import { mensajeErrorFuncion } from "../../../utils/mensajeErrorFuncion";
import {
  LIMITES_CATEGORIA,
  validarCategoria,
} from "../../../utils/validarCategoria";
import "./Categorias.css";

const VALORES_VACIOS = { nombre: "", descripcion: "" };

// Un campo con su etiqueta, ayuda y error en línea. Le pasa a su control los
// atributos de accesibilidad ya resueltos.
const Campo = ({ id, etiqueta, error, ayuda, children }) => {
  const describedBy =
    [ayuda ? `${id}-ayuda` : null, error ? `${id}-error` : null]
      .filter(Boolean)
      .join(" ") || undefined;

  return (
    <div className="admin-categorias__campo">
      <label htmlFor={id}>{etiqueta}</label>

      {children({
        id,
        "aria-describedby": describedBy,
        "aria-invalid": error ? "true" : undefined,
      })}

      {ayuda && (
        <p id={`${id}-ayuda`} className="admin-categorias__ayuda">
          {ayuda}
        </p>
      )}

      {error && (
        <p id={`${id}-error`} className="admin-categorias__error">
          {error}
        </p>
      )}
    </div>
  );
};

// Sirve para crear y para editar. `onEnviar` recibe los datos ya validados y
// devuelve "" si salió bien o el mensaje de error para mostrar en el formulario.
const FormularioCategoria = ({
  prefijo,
  inicial,
  etiquetaEnviar,
  ocupado,
  limpiarAlExito = false,
  autoFocusNombre = false,
  exitos = 0,
  onEnviar,
  onCancelar,
}) => {
  const [valores, setValores] = useState(inicial);
  const [errores, setErrores] = useState({});
  // El error se guarda con el contador de acciones exitosas del momento: si
  // después ocurre otra acción que sí salió bien, el error viejo deja de verse.
  const [errorGeneral, setErrorGeneral] = useState(null);
  const [enviando, setEnviando] = useState(false);

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

    if (ocupado || enviando) return;

    setErrorGeneral(null);

    const resultado = validarCategoria(valores);

    setErrores(resultado.errores);

    if (!resultado.ok) {
      const primero = resultado.errores.nombre ? "nombre" : "descripcion";
      document.getElementById(`${prefijo}-${primero}`)?.focus();
      return;
    }

    setEnviando(true);

    const mensaje = await onEnviar(resultado.datos);

    if (mensaje) {
      setErrorGeneral({ texto: mensaje, exitos });
    } else if (limpiarAlExito) {
      setValores(inicial);
    }

    setEnviando(false);
  };

  return (
    <form
      className="admin-categorias__formulario"
      onSubmit={manejarEnvio}
      noValidate
    >
      <Campo
        id={`${prefijo}-nombre`}
        etiqueta="Nombre"
        error={errores.nombre}
        ayuda={`${valores.nombre.length} de ${LIMITES_CATEGORIA.nombreMax} caracteres (mínimo ${LIMITES_CATEGORIA.nombreMin}).`}
      >
        {(atributos) => (
          <input
            {...atributos}
            type="text"
            value={valores.nombre}
            onChange={cambiar("nombre")}
            autoComplete="off"
            autoFocus={autoFocusNombre}
          />
        )}
      </Campo>

      <Campo
        id={`${prefijo}-descripcion`}
        etiqueta="Descripción (opcional)"
        error={errores.descripcion}
        ayuda={`${valores.descripcion.length} de ${LIMITES_CATEGORIA.descripcionMax} caracteres.`}
      >
        {(atributos) => (
          <textarea
            {...atributos}
            rows={3}
            value={valores.descripcion}
            onChange={cambiar("descripcion")}
          />
        )}
      </Campo>

      {errorGeneral && errorGeneral.exitos === exitos && (
        <p role="alert" className="admin-categorias__error-general">
          {errorGeneral.texto}
        </p>
      )}

      <div className="admin-categorias__acciones">
        <button
          type="submit"
          className="admin-categorias__boton admin-categorias__boton--primario"
          disabled={ocupado || enviando}
        >
          {enviando ? "Guardando..." : etiquetaEnviar}
        </button>

        {onCancelar && (
          <button
            type="button"
            className="admin-categorias__boton"
            onClick={onCancelar}
            disabled={ocupado || enviando}
          >
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
};

// El <main> lo aporta AdminLayout, por eso acá solo hay <div>.
const Categorias = () => {
  const { categorias, cargando, error, recargar } = useCategoriasAdmin();

  const [aviso, setAviso] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [confirmandoId, setConfirmandoId] = useState(null);
  const [errorFila, setErrorFila] = useState(null);
  // Cuenta las acciones que salieron bien: los errores de los formularios
  // anteriores a la última dejan de mostrarse.
  const [exitos, setExitos] = useState(0);

  // Ejecuta una acción del servidor. Devuelve "" si salió bien o el mensaje de
  // error; nunca lanza, para que cada llamador decida dónde mostrarlo.
  const ejecutar = async (payload, avisoExito) => {
    setAviso("");
    setErrorFila(null);
    setOcupado(true);

    try {
      const datos = await gestionarCategoria(payload);

      setAviso(avisoExito(datos));
      setExitos((actual) => actual + 1);
      recargar();
      return "";
    } catch (err) {
      console.error("Error gestionando la categoría:", err);
      return mensajeErrorFuncion(err);
    } finally {
      setOcupado(false);
    }
  };

  const crear = (datos) =>
    ejecutar(
      {
        accion: "crear",
        nombre: datos.nombre,
        descripcion: datos.descripcion,
      },
      (respuesta) => `Creamos la categoría «${respuesta?.nombre || datos.nombre}».`,
    );

  const editar = async (categoria, datos) => {
    const mensaje = await ejecutar(
      {
        accion: "editar",
        id: categoria.id,
        nombre: datos.nombre,
        descripcion: datos.descripcion,
      },
      (respuesta) =>
        `Guardamos los cambios de «${respuesta?.nombre || datos.nombre}».`,
    );

    if (!mensaje) setEditandoId(null);

    return mensaje;
  };

  const eliminar = async (categoria) => {
    const mensaje = await ejecutar(
      { accion: "eliminar", id: categoria.id },
      () => `Eliminamos la categoría «${categoria.nombre || categoria.id}».`,
    );

    if (mensaje) {
      setErrorFila({ id: categoria.id, mensaje });
    } else {
      setConfirmandoId(null);
    }
  };

  const abrirEdicion = (categoria) => {
    setConfirmandoId(null);
    setErrorFila(null);
    setEditandoId(categoria.id);
  };

  const pedirEliminar = (categoria) => {
    setEditandoId(null);
    setErrorFila(null);
    setConfirmandoId(categoria.id);
  };

  const hayCategorias = categorias.length > 0;
  const primeraCarga = cargando && !hayCategorias;

  return (
    <div className="admin-categorias">
      <div className="admin-categorias__encabezado">
        <h1>Categorías</h1>
        <p>Organizá las lecturas en categorías para que sea fácil encontrarlas.</p>
      </div>

      {aviso && (
        <p role="status" className="admin-categorias__aviso">
          {aviso}
        </p>
      )}

      <section
        className="admin-categorias__panel"
        aria-labelledby="categorias-nueva-titulo"
      >
        <h2 id="categorias-nueva-titulo">Nueva categoría</h2>

        <FormularioCategoria
          prefijo="categoria-nueva"
          inicial={VALORES_VACIOS}
          etiquetaEnviar="Crear categoría"
          ocupado={ocupado}
          exitos={exitos}
          limpiarAlExito
          onEnviar={crear}
        />
      </section>

      <section aria-labelledby="categorias-lista-titulo">
        <h2 id="categorias-lista-titulo" className="admin-categorias__subtitulo">
          Categorías existentes{hayCategorias ? ` (${categorias.length})` : ""}
        </h2>

        {primeraCarga && (
          <p role="status" className="admin-categorias__estado-vacio">
            Cargando las categorías...
          </p>
        )}

        {error && (
          <div role="alert" className="admin-categorias__estado-vacio">
            <p>No pudimos cargar las categorías.</p>
            <button
              type="button"
              className="admin-categorias__boton"
              onClick={recargar}
            >
              Reintentar
            </button>
          </div>
        )}

        {!cargando && !error && !hayCategorias && (
          <div className="admin-categorias__estado-vacio">
            <p>Todavía no hay categorías. Creá la primera con el formulario de arriba.</p>
          </div>
        )}

        {hayCategorias && (
          <ul className="admin-categorias__lista" aria-busy={cargando}>
            {categorias.map((categoria) => {
              const editando = editandoId === categoria.id;
              const confirmando = confirmandoId === categoria.id;
              const nombreVisible = categoria.nombre || categoria.id;

              return (
                <li key={categoria.id}>
                  <article className="admin-categorias__tarjeta">
                    {editando ? (
                      <>
                        <h3>Editar «{nombreVisible}»</h3>

                        <FormularioCategoria
                          prefijo={`categoria-${categoria.id}`}
                          inicial={{
                            nombre: categoria.nombre,
                            descripcion: categoria.descripcion,
                          }}
                          etiquetaEnviar="Guardar cambios"
                          ocupado={ocupado}
                          exitos={exitos}
                          autoFocusNombre
                          onEnviar={(datos) => editar(categoria, datos)}
                          onCancelar={() => setEditandoId(null)}
                        />
                      </>
                    ) : (
                      <>
                        <h3>{nombreVisible}</h3>

                        <p className="admin-categorias__descripcion">
                          {categoria.descripcion || "Sin descripción."}
                        </p>

                        <p className="admin-categorias__id">
                          Identificador: {categoria.id}
                        </p>

                        <div className="admin-categorias__acciones">
                          <button
                            type="button"
                            className="admin-categorias__boton"
                            disabled={ocupado || cargando}
                            aria-label={`Editar «${nombreVisible}»`}
                            onClick={() => abrirEdicion(categoria)}
                          >
                            Editar
                          </button>

                          <button
                            type="button"
                            className="admin-categorias__boton"
                            disabled={ocupado || cargando}
                            aria-label={`Eliminar «${nombreVisible}»`}
                            onClick={() => pedirEliminar(categoria)}
                          >
                            Eliminar
                          </button>
                        </div>
                      </>
                    )}

                    {confirmando && (
                      <div
                        className="admin-categorias__confirmacion"
                        role="group"
                        aria-label="Confirmar eliminación"
                      >
                        <p>
                          ¿Eliminar la categoría «{nombreVisible}»? No se puede
                          deshacer y solo es posible si ninguna lectura la usa.
                        </p>

                        <div className="admin-categorias__acciones">
                          <button
                            type="button"
                            className="admin-categorias__boton admin-categorias__boton--peligro"
                            disabled={ocupado}
                            onClick={() => eliminar(categoria)}
                          >
                            {ocupado ? "Eliminando..." : "Confirmar: eliminar"}
                          </button>

                          <button
                            type="button"
                            className="admin-categorias__boton"
                            disabled={ocupado}
                            onClick={() => setConfirmandoId(null)}
                            autoFocus
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    )}

                    {errorFila?.id === categoria.id && (
                      <p role="alert" className="admin-categorias__error-general">
                        {errorFila.mensaje}
                      </p>
                    )}
                  </article>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
};

export default Categorias;
