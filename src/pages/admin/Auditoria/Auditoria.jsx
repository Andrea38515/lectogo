import { useAuditoria } from "../../../hooks/useAuditoria";
import {
  abreviarUid,
  describirDetalle,
  etiquetaAccion,
} from "../../../utils/auditoriaTexto";
import { formatearFecha } from "../../../utils/formatearFecha";
import "./Auditoria.css";

// El <main> lo aporta AdminLayout, por eso acá solo hay <div>.
const Auditoria = () => {
  const { entradas, nombres, cargando, error, recargar } = useAuditoria();

  const nombreDe = (uid) => nombres.get(uid) || abreviarUid(uid);

  const hayEntradas = entradas.length > 0;
  const primeraCarga = cargando && !hayEntradas;

  return (
    <div className="admin-auditoria">
      <div className="admin-auditoria__encabezado">
        <div className="admin-auditoria__titulos">
          <h1>Auditoría</h1>
          <p>Los últimos 50 cambios hechos en la plataforma, del más nuevo al más viejo.</p>
        </div>

        <button
          type="button"
          className="admin-auditoria__boton"
          onClick={recargar}
          disabled={cargando}
        >
          {cargando ? "Actualizando..." : "Actualizar"}
        </button>
      </div>

      {primeraCarga && (
        <p role="status" className="admin-auditoria__estado-vacio">
          Cargando el registro...
        </p>
      )}

      {error && (
        <div role="alert" className="admin-auditoria__estado-vacio">
          <p>No pudimos cargar el registro de auditoría.</p>
          <button
            type="button"
            className="admin-auditoria__boton"
            onClick={recargar}
          >
            Reintentar
          </button>
        </div>
      )}

      {!cargando && !error && !hayEntradas && (
        <div className="admin-auditoria__estado-vacio">
          <p>Todavía no hay cambios registrados.</p>
        </div>
      )}

      {hayEntradas && (
        <div
          className="admin-auditoria__tabla-contenedor"
          role="region"
          aria-label="Registro de auditoría, desplazable horizontalmente"
          tabIndex={0}
          aria-busy={cargando}
        >
          <table className="admin-auditoria__tabla">
            <caption>
              {entradas.length === 1
                ? "1 entrada reciente"
                : `${entradas.length} entradas recientes`}
            </caption>

            <thead>
              <tr>
                <th scope="col">Fecha</th>
                <th scope="col">Actor</th>
                <th scope="col">Acción</th>
                <th scope="col">Detalle</th>
              </tr>
            </thead>

            <tbody>
              {entradas.map((entrada) => {
                const objetivoNombre = entrada.objetivoId
                  ? nombreDe(entrada.objetivoId)
                  : "";
                const detalle = describirDetalle(
                  entrada.accion,
                  entrada.detalle,
                  objetivoNombre,
                );

                return (
                  <tr key={entrada.id}>
                    <td className="admin-auditoria__fecha">
                      {formatearFecha(entrada.creadoEn)}
                    </td>
                    <td className="admin-auditoria__actor">
                      {entrada.actorId ? nombreDe(entrada.actorId) : "Desconocido"}
                    </td>
                    <td>{etiquetaAccion(entrada.accion)}</td>
                    <td className="admin-auditoria__detalle">{detalle || "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Auditoria;
