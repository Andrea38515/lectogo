// src/components/XpBartx/XpBar.jsx

const XpBar = ({ currentXp = 0, nextLevelXp = 100, level = 1 }) => {
  const xp = Math.max(0, Number(currentXp) || 0);
  const siguienteNivel = Math.max(0, Number(nextLevelXp) || 0);
  const nivelActual = Math.max(1, Number(level) || 1);

  const porcentaje =
    siguienteNivel > 0
      ? Math.min((xp / siguienteNivel) * 100, 100)
      : 0;

  return (
    <div className="xp-bar">
      <div className="xp-bar__header">
        <span>Nivel {nivelActual}</span>
        <span>
          {xp} / {siguienteNivel} XP
        </span>
      </div>

      <div
        className="xp-bar__track"
        role="progressbar"
        aria-valuenow={xp}
        aria-valuemin="0"
        aria-valuemax={siguienteNivel}
        aria-label={`Progreso de XP del nivel ${nivelActual}`}
      >
        <div
          className="xp-bar__progress"
          style={{ width: `${porcentaje}%` }}
        />
      </div>
    </div>
  );
};

export default XpBar;