// src/components/LevelBadge/LevelBadge.jsx

const LevelBadge = ({ level = 1, currentXp = 0, nextLevelXp = 100 }) => {
  const nivelActual = Math.max(1, Number(level) || 1);
  const xp = Math.max(0, Number(currentXp) || 0);
  const siguienteNivel = Math.max(0, Number(nextLevelXp) || 0);

  return (
    <div
      className="level-badge"
      title={`${xp} / ${siguienteNivel} XP`}
    >
      <span className="level-badge__label">Nivel</span>
      <strong className="level-badge__level">{nivelActual}</strong>
    </div>
  );
};

export default LevelBadge;