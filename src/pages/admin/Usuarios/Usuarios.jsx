import { useMemo, useState } from "react";

import { useAuth } from "../../../hooks/useAuth";
import { useUsuariosAdmin } from "../../../hooks/useUsuariosAdmin";
import { cambiarRol } from "../../../repositories/adminRepository";
import { enmascararCorreo } from "../../../utils/enmascararCorreo";
import { mensajeErrorFuncion } from "../../../utils/mensajeErrorFuncion";
import "./Usuarios.css";

const ROLES = ["estudiante", "docente", "administrador"];

const ETIQUETA_ROL = {
  estudiante: "Estudiante",
  docente: "Docente",
  administrador: "Administrador",
};

const etiquetaRol = (rol) =>
  Object.hasOwn(ETIQUETA_ROL, rol) ? ETIQUETA_ROL[rol] : "Sin rol";

// Compara sin distinguir mayúsculas ni tildes ("Ángela" coincide con "angela").
const normalizar = (texto) =>
  String(texto ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

const textoCantidad = (cantidad) =>
  cantidad === 1 ? "1 usuario" : `${cantidad} usuarios`;

// El <main> lo aporta AdminLayout, por eso acá solo hay <div>.
const Usuarios = () => {
  const { user } = useAuth();
  const { usuarios, cargando, error, recargar } = useUsuariosAdmin();

  const [mostrarCorreos, setMostrarCorreos] = useState(false);
  const [filtroRol, setFiltroRol] = useState("todos");
  const [busqueda, setBusqueda] = useState("");

  // Rol elegido en el selector de cada fila, por uid. Sin entrada = el actual.
  const [rolesElegidos, setRolesElegidos] = useState({});
  const [confirmacion, setConfirmacion] = useState(null);
  const [guardandoUid, setGuardandoUid] = useState(null);
  const [errorFila, setErrorFila] = useState(null);
  const [aviso, setAviso] = useState("");

  const visibles = useMemo(() => {
    const termino = normalizar(busqueda);

    return usuarios.filter(
      (usuario) =>
        (filtroRol === "todos" || usuario.rol === filtroRol) &&
        (!termino || normalizar(usuario.nombre).includes(termino)),
    );
  }, [usuarios, filtroRol, busqueda]);

  const elegirRol = (uid, rol) => {
    setConfirmacion(null);
    setErrorFila(null);
    setRolesElegidos((actuales) => ({ ...actuales, [uid]: rol }));
  };

  const pedirConfirmacion = (usuario, rolNuevo) => {
    setErrorFila(null);
    setConfirmacion({
      uid: usuario.uid,
      nombre: usuario.nombre,
      de: usuario.rol,
      a: rolNuevo,
    });
  };

  const aplicarCambio = async () => {
    if (!confirmacion) return;

    const { uid, nombre, de, a } = confirmacion;

    setConfirmacion(null);
    setErrorFila(null);
    setAviso("");
    setGuardandoUid(uid);

    try {
      const respuesta = await cambiarRol({ uid, rol: a });
      const quien = nombre || "El usuario";

      setAviso(
        respuesta?.cambiado === false
          ? `${quien} ya tenía el rol ${etiquetaRol(a).toLowerCase()}.`
          : `Cambiamos el rol de ${quien}: ${etiquetaRol(respuesta?.rolAnterior ?? de).toLowerCase()} → ${etiquetaRol(respuesta?.rolNuevo ?? a).toLowerCase()}.`,
      );
      setRolesElegidos((actuales) => {
        const siguientes = { ...actuales };
        delete siguientes[uid];
        return siguientes;
      });
      recargar();
    } catch (err) {
      console.error("Error cambiando el rol:", err);
      setErrorFila({ uid, mensaje: mensajeErrorFuncion(err) });
    } finally {
      setGuardandoUid(null);
    }
  };

  const hayUsuarios = usuarios.length > 0;
  const primeraCarga = cargando && !hayUsuarios;
  const hayFiltros = filtroRol !== "todos" || normalizar(busqueda) !== "";

  return (
    <div className="admin-usuarios">
      <div className="admin-usuarios__encabezado">
        <h1>Usuarios</h1>
        <p>Consultá las cuentas de la plataforma y cambiá el rol de cada una.</p>
      </div>

      {aviso && (
        <p role="status" className="admin-usuarios__aviso">
          {aviso}
        </p>
      )}

      {primeraCarga && (
        <p role="status" className="admin-usuarios__estado-vacio">
          Cargando los usuarios...
        </p>
      )}

      {error && (
        <div role="alert" className="admin-usuarios__estado-vacio">
          <p>No pudimos cargar los usuarios.</p>
          <button
            type="button"
            className="admin-usuarios__boton"
            onClick={recargar}
          >
            Reintentar
          </button>
        </div>
      )}

      {!cargando && !error && !hayUsuarios && (
        <div className="admin-usuarios__estado-vacio">
          <p>Todavía no hay usuarios registrados.</p>
        </div>
      )}

      {hayUsuarios && (
        <>
          <div className="admin-usuarios__controles">
            <div className="admin-usuarios__campo">
              <label htmlFor="usuarios-busqueda">Buscar por nombre</label>
              <input
                id="usuarios-busqueda"
                type="search"
                value={busqueda}
                onChange={(evento) => setBusqueda(evento.target.value)}
                autoComplete="off"
              />
            </div>

            <div className="admin-usuarios__campo">
              <label htmlFor="usuarios-filtro-rol">Filtrar por rol</label>
              <select
                id="usuarios-filtro-rol"
                value={filtroRol}
                onChange={(evento) => setFiltroRol(evento.target.value)}
              >
                <option value="todos">Todos</option>
                {ROLES.map((rol) => (
                  <option key={rol} value={rol}>
                    {etiquetaRol(rol)}
                  </option>
                ))}
              </select>
            </div>

            <label className="admin-usuarios__interruptor">
              <input
                type="checkbox"
                checked={mostrarCorreos}
                onChange={(evento) => setMostrarCorreos(evento.target.checked)}
              />
              <span>Mostrar correos completos</span>
            </label>
          </div>

          <p className="admin-usuarios__cantidad" aria-live="polite">
            {hayFiltros
              ? `${visibles.length} de ${textoCantidad(usuarios.length)}`
              : textoCantidad(usuarios.length)}
          </p>

          {visibles.length === 0 ? (
            <div className="admin-usuarios__estado-vacio">
              <p>Ningún usuario coincide con la búsqueda o el filtro.</p>
            </div>
          ) : (
            <div
              className="admin-usuarios__tabla-contenedor"
              role="region"
              aria-label="Tabla de usuarios, desplazable horizontalmente"
              tabIndex={0}
              aria-busy={cargando}
            >
              <table className="admin-usuarios__tabla">
                <caption>Usuarios de LectoGo</caption>

                <thead>
                  <tr>
                    <th scope="col">Nombre</th>
                    <th scope="col">Correo</th>
                    <th scope="col">Rol</th>
                    <th scope="col">Cambiar rol</th>
                  </tr>
                </thead>

                <tbody>
                  {visibles.map((usuario) => {
                    const esPropio = usuario.uid === user?.uid;
                    const nombre = usuario.nombre || "Sin nombre";
                    const rolValido = ROLES.includes(usuario.rol);
                    const elegido =
                      rolesElegidos[usuario.uid] ??
                      (rolValido ? usuario.rol : "");
                    const ocupada = guardandoUid === usuario.uid || cargando;
                    const confirmando = confirmacion?.uid === usuario.uid;
                    const idSelector = `rol-${usuario.uid}`;

                    return (
                      <tr key={usuario.uid}>
                        <th scope="row" className="admin-usuarios__nombre">
                          {nombre}
                          {esPropio && (
                            <span className="admin-usuarios__propio"> (vos)</span>
                          )}
                        </th>

                        <td className="admin-usuarios__correo">
                          {usuario.correo
                            ? mostrarCorreos
                              ? usuario.correo
                              : enmascararCorreo(usuario.correo)
                            : "—"}
                        </td>

                        <td>{etiquetaRol(usuario.rol)}</td>

                        <td className="admin-usuarios__acciones-celda">
                          {esPropio ? (
                            <p className="admin-usuarios__nota">
                              No podés cambiar tu propio rol
                            </p>
                          ) : (
                            <div className="admin-usuarios__acciones">
                              <label htmlFor={idSelector} className="admin-usuarios__oculto">
                                Nuevo rol de {nombre}
                              </label>

                              <select
                                id={idSelector}
                                value={elegido}
                                disabled={ocupada}
                                onChange={(evento) =>
                                  elegirRol(usuario.uid, evento.target.value)
                                }
                              >
                                {!rolValido && (
                                  <option value="" disabled>
                                    Elegí un rol
                                  </option>
                                )}
                                {ROLES.map((rol) => (
                                  <option key={rol} value={rol}>
                                    {etiquetaRol(rol)}
                                  </option>
                                ))}
                              </select>

                              <button
                                type="button"
                                className="admin-usuarios__boton"
                                disabled={
                                  ocupada || !elegido || elegido === usuario.rol
                                }
                                aria-label={`Cambiar rol de ${nombre}`}
                                onClick={() => pedirConfirmacion(usuario, elegido)}
                              >
                                {guardandoUid === usuario.uid
                                  ? "Cambiando..."
                                  : "Cambiar rol"}
                              </button>
                            </div>
                          )}

                          {confirmando && (
                            <div
                              className="admin-usuarios__confirmacion"
                              role="group"
                              aria-label="Confirmar cambio de rol"
                            >
                              <p>
                                ¿Cambiar el rol de {nombre} de{" "}
                                {etiquetaRol(confirmacion.de).toLowerCase()} a{" "}
                                {etiquetaRol(confirmacion.a).toLowerCase()}?
                              </p>

                              <div className="admin-usuarios__acciones">
                                <button
                                  type="button"
                                  className="admin-usuarios__boton admin-usuarios__boton--primario"
                                  onClick={aplicarCambio}
                                >
                                  Confirmar
                                </button>

                                <button
                                  type="button"
                                  className="admin-usuarios__boton"
                                  onClick={() => setConfirmacion(null)}
                                  autoFocus
                                >
                                  Cancelar
                                </button>
                              </div>
                            </div>
                          )}

                          {errorFila?.uid === usuario.uid && (
                            <p role="alert" className="admin-usuarios__error">
                              {errorFila.mensaje}
                            </p>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Usuarios;
