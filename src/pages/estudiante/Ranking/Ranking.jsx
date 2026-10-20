import { useAuth } from "../../../hooks/useAuth";
import { useRanking } from "../../../hooks/useRanking";
import RankingVista from "./RankingVista";

// Valores estables para cuando no hay datos (sin sesión): el ranking no se
// puede leer y se muestra el estado de error con reintento.
const TOP_NO_DISPONIBLE = { estado: "error", filas: [] };
const PROPIA_NO_DISPONIBLE = { estado: "error", fila: null, posicion: null };

function Ranking() {
  const { user } = useAuth();
  const { isLoading, datos, reintentar } = useRanking();

  return (
    <RankingVista
      uid={user?.uid ?? null}
      isLoading={isLoading}
      top={datos?.top ?? TOP_NO_DISPONIBLE}
      propia={datos?.propia ?? PROPIA_NO_DISPONIBLE}
      total={datos?.total ?? null}
      onReintentar={reintentar}
    />
  );
}

export default Ranking;
