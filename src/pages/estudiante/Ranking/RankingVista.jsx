import { Link } from "react-router-dom";

import Loading from "../../../components/Loading/Loading";
import {
  LIMITE_RANKING,
  dividirPodioYLista,
  esFilaPropia,
  estaEnTop,
  resolverPosicionPropia,
} from "../../../utils/ranking";
import "./Ranking.css";

const RUTA_ACTIVIDADES = "/estudiante/actividades";

const MEDALLAS = ["🥇", "🥈", "🥉"];

const formatoNumero = new Intl.NumberFormat("es-CO");

const MarcaPropia = () => <span className="ranking-yo">Tú</span>;

const BotonReintentar = ({ onReintentar }) => (
  <button className="ranking-boton" type="button" onClick={onReintentar}>
    Intentar nuevamente
  </button>
);

// Los tres datos públicos de una fila. Nunca recibe ni muestra el id del
// estudiante: solo alias, XP, nivel y logros.
const DatosFila = ({ fila }) => (
  <div className="ranking-datos">
    <span>
      <strong>{formatoNumero.format(fila.xp)}</strong> XP
    </span>
    <span>
      Nivel <strong>{fila.nivel}</strong>
    </span>
    <span>
      <strong>{formatoNumero.format(fila.logros)}</strong>{" "}
      {fila.logros === 1 ? "logro" : "logros"}
    </span>
  </div>
);

// El orden del DOM es el del ranking (1.º, 2.º, 3.º) para los lectores de
// pantalla; el podio 2-1-3 es solo visual y lo resuelve el CSS con `order`.
const Podio = ({ filas, uid }) => (
  <ol className="ranking-podio" role="list" aria-label="Podio">
    {filas.map((fila) => {
      const propia = esFilaPropia(fila, uid);

      return (
        <li
          key={fila.estudianteId}
          className={`ranking-podio__puesto ranking-podio__puesto--${fila.posicion}${
            propia ? " ranking-propia" : ""
          }`}
          aria-current={propia ? "true" : undefined}
        >
          <span className="ranking-podio__medalla" aria-hidden="true">
            {MEDALLAS[fila.posicion - 1]}
          </span>
          <span className="ranking-podio__posicion">#{fila.posicion}</span>
          <span className="ranking-alias">{fila.alias}</span>
          {propia ? <MarcaPropia /> : null}
          <DatosFila fila={fila} />
        </li>
      );
    })}
  </ol>
);

const FilaLista = ({ fila, uid }) => {
  const propia = esFilaPropia(fila, uid);

  return (
    <li
      className={`ranking-fila${propia ? " ranking-propia" : ""}`}
      aria-current={propia ? "true" : undefined}
    >
      <span className="ranking-fila__posicion">#{fila.posicion}</span>
      <span className="ranking-fila__alias">
        <span className="ranking-alias">{fila.alias}</span>
        {propia ? <MarcaPropia /> : null}
      </span>
      <DatosFila fila={fila} />
    </li>
  );
};

const ContenidoTuPosicion = ({ propia, posicion, total, onReintentar }) => {
  if (propia.estado === "error") {
    return (
      <div className="ranking-vacio" role="status">
        <p>No se pudo calcular tu posición.</p>
        <BotonReintentar onReintentar={onReintentar} />
      </div>
    );
  }

  if (propia.estado === "sin-fila") {
    return (
      <div className="ranking-vacio">
        <p>Resuelve tu primera actividad para entrar al ranking.</p>
        <Link className="ranking-boton" to={RUTA_ACTIVIDADES}>
          Ir a mis actividades
        </Link>
      </div>
    );
  }

  const { fila } = propia;
  // Si el total llegara menor que la posición (el ranking cambió entre las dos
  // lecturas) "#5 de 3" no tendría sentido: se omite en vez de mostrarlo.
  const mostrarTotal = total !== null && posicion !== null && total >= posicion;

  return (
    <>
      <div className="ranking-tu__cuerpo">
        <p className="ranking-tu__puesto">
          {posicion !== null ? (
            <>
              <strong>#{posicion}</strong>
              {mostrarTotal ? (
                <span> de {formatoNumero.format(total)}</span>
              ) : null}
            </>
          ) : (
            <strong>
              {/* aria-label no se anuncia en un <strong>; role="img" sí. */}
              <span role="img" aria-label="Posición no disponible">
                —
              </span>
            </strong>
          )}
        </p>

        <div className="ranking-tu__identidad">
          <span className="ranking-alias">{fila.alias}</span>
          <MarcaPropia />
        </div>

        <DatosFila fila={fila} />
      </div>

      {posicion === null ? (
        <div className="ranking-vacio" role="status">
          <p>No se pudo calcular tu posición.</p>
          <BotonReintentar onReintentar={onReintentar} />
        </div>
      ) : null}
    </>
  );
};

const ContenidoTop = ({ top, uid, propia, posicion, onReintentar }) => {
  if (top.estado === "error") {
    return (
      <div className="ranking-vacio ranking-vacio--error" role="alert">
        <p>No pudimos cargar el ranking.</p>
        <BotonReintentar onReintentar={onReintentar} />
      </div>
    );
  }

  if (top.estado === "no-disponible") {
    return (
      <div className="ranking-vacio" role="status">
        <p>El ranking todavía no está disponible.</p>
        <BotonReintentar onReintentar={onReintentar} />
      </div>
    );
  }

  if (top.filas.length === 0) {
    return (
      <div className="ranking-vacio">
        <p>Todavía no hay estudiantes en el ranking.</p>
        <p>Resuelve una actividad y serás de los primeros en aparecer.</p>
      </div>
    );
  }

  const { podio, lista } = dividirPodioYLista(top.filas);

  // Solo se agrega la fila propia aparte si no está en el top y su puesto real
  // cae después del último puesto listado. Una posición <= LIMITE_RANKING que
  // no aparece en la lista es inconsistente (el ranking cambió entre lecturas):
  // la tarjeta muestra el número, pero no se inventa una fila aparte.
  const mostrarPropiaFuera =
    propia.estado === "ok" &&
    Number.isInteger(posicion) &&
    posicion > LIMITE_RANKING &&
    !estaEnTop(top.filas, uid);

  return (
    <>
      <Podio filas={podio} uid={uid} />

      {lista.length > 0 ? (
        <ol className="ranking-lista" role="list" start={lista[0].posicion}>
          {lista.map((fila) => (
            <FilaLista key={fila.estudianteId} fila={fila} uid={uid} />
          ))}
        </ol>
      ) : null}

      {mostrarPropiaFuera ? (
        <div className="ranking-fuera">
          <p className="ranking-fuera__separador" aria-hidden="true">
            ⋯
          </p>
          <ol
            className="ranking-lista"
            role="list"
            start={posicion}
            aria-label={`Tu posición, fuera de los primeros ${LIMITE_RANKING}`}
          >
            <FilaLista fila={{ ...propia.fila, posicion }} uid={uid} />
          </ol>
        </div>
      ) : null}
    </>
  );
};

/*
 * Vista pura del ranking: recibe todo por props y no toca Firebase ni los
 * hooks de datos, así se puede renderizar con datos de prueba (solo necesita
 * un Router por los <Link>).
 *
 * - uid: id del estudiante en sesión (solo para reconocer su fila; no se muestra).
 * - isLoading: true mientras se cargan las fuentes.
 * - top: { estado: "ok" | "error" | "no-disponible", filas: Fila[] } con las
 *   filas ya ordenadas de la primera posición hacia abajo.
 * - propia: { estado: "ok" | "sin-fila" | "error", fila: Fila | null,
 *   posicion: number | null } con la posición calculada por conteos.
 * - total: cantidad de participantes, o null si no se pudo contar.
 * - onReintentar: recarga todas las fuentes.
 */
const RankingVista = ({ uid, isLoading, top, propia, total, onReintentar }) => {
  if (isLoading) {
    return (
      <section className="student-ranking">
        <Loading message="Cargando el ranking..." />
      </section>
    );
  }

  const posicion =
    propia.estado === "ok"
      ? resolverPosicionPropia(
          top.estado === "ok" ? top.filas : [],
          uid,
          propia.posicion,
        )
      : null;

  return (
    <section className="student-ranking">
      <header className="ranking-encabezado">
        <h1>Ranking</h1>
        <p>
          Los estudiantes se ordenan por XP y aparecen con un alias, no con su
          nombre. Si dos tienen los mismos XP, queda arriba quien los alcanzó
          primero.
        </p>
      </header>

      <section className="ranking-panel" aria-labelledby="ranking-tu-titulo">
        <h2 id="ranking-tu-titulo">Tu posición</h2>
        <ContenidoTuPosicion
          propia={propia}
          posicion={posicion}
          total={total}
          onReintentar={onReintentar}
        />
      </section>

      <section className="ranking-panel" aria-labelledby="ranking-top-titulo">
        <h2 id="ranking-top-titulo">Mejores posiciones</h2>
        <ContenidoTop
          top={top}
          uid={uid}
          propia={propia}
          posicion={posicion}
          onReintentar={onReintentar}
        />
      </section>
    </section>
  );
};

export default RankingVista;
