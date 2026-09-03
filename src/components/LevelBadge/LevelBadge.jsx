// src/components/LevelBadge/LevelBadge.jsx

import { FiStar, FiTrendingUp } from "react-icons/fi";

import "./LevelBadge.css";

function LevelBadge({
	level = 1,
	levelName = "Principiante",
	currentXp = 0,
	nextLevelXp = 100,
	showProgress = true,
	size = "medium",
	icon,
}) {
	const normalizedXp = Math.max(currentXp, 0);

	const progressPercentage =
		nextLevelXp > 0
			? Math.min(Math.round((normalizedXp / nextLevelXp) * 100), 100)
			: 0;

	return (
		<div
			className={`
        level-badge
        level-badge--${size}
      `}
		>
			{/* Icono */}

			<div className="level-badge__icon">{icon || <FiStar />}</div>

			{/* Información */}

			<div className="level-badge__content">
				<div className="level-badge__header">
					<div>
						<span className="level-badge__label">Nivel {level}</span>

						<h3 className="level-badge__name">{levelName}</h3>
					</div>

					<span className="level-badge__xp">{normalizedXp} XP</span>
				</div>

				{/* Progreso */}

				{showProgress && (
					<div className="level-badge__progress">
						<div className="level-badge__progress-info">
							<span>Progreso al siguiente nivel</span>

							<span>
								{normalizedXp}/{nextLevelXp} XP
							</span>
						</div>

						<div className="level-badge__progress-track">
							<div
								className="level-badge__progress-bar"
								style={{
									width: `${progressPercentage}%`,
								}}
							/>
						</div>
					</div>
				)}

				{/* Mensaje */}

				{showProgress && normalizedXp < nextLevelXp && (
					<div className="level-badge__remaining">
						<FiTrendingUp />

						<span>
							Te faltan {nextLevelXp - normalizedXp} XP para subir de nivel
						</span>
					</div>
				)}

				{showProgress && normalizedXp >= nextLevelXp && (
					<div className="level-badge__completed">
						<FiStar />

						<span>¡Nivel completado!</span>
					</div>
				)}
			</div>
		</div>
	);
}

export default LevelBadge;
