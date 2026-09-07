// src/components/AchievementBadge/AchievementBadge.jsx

import { FiAward, FiLock, FiCheck } from "react-icons/fi";

import "./AchievementBadge.css";

function AchievementBadge({
	title = "Logro",
	description = "",
	icon,
	unlocked = false,
	progress = 0,
	required = 100,
	xpReward = 0,
	unlockedDate = "",
	size = "medium",
}) {
	const normalizedProgress = Math.min(Math.max(progress, 0), required);

	const progressPercentage =
		required > 0 ? Math.round((normalizedProgress / required) * 100) : 0;

	return (
		<article
			className={`
        achievement-badge
        achievement-badge--${size}
        ${
					unlocked ? "achievement-badge--unlocked" : "achievement-badge--locked"
				}
      `}
		>
			{/* Icono */}

			<div className="achievement-badge__icon-container">
				<div className="achievement-badge__icon">{icon || <FiAward />}</div>

				{unlocked ? (
					<span
						className="achievement-badge__status
              achievement-badge__status--unlocked"
						aria-label="Logro desbloqueado"
					>
						<FiCheck />
					</span>
				) : (
					<span
						className="achievement-badge__status
              achievement-badge__status--locked"
						aria-label="Logro bloqueado"
					>
						<FiLock />
					</span>
				)}
			</div>

			{/* Información */}

			<div className="achievement-badge__content">
				<h3 className="achievement-badge__title">{title}</h3>

				{description && (
					<p className="achievement-badge__description">{description}</p>
				)}

				{/* Progreso */}

				{!unlocked && required > 0 && (
					<div className="achievement-badge__progress">
						<div className="achievement-badge__progress-info">
							<span>Progreso</span>

							<span>
								{normalizedProgress}/{required}
							</span>
						</div>

						<div className="achievement-badge__progress-track">
							<div
								className="achievement-badge__progress-bar"
								style={{
									width: `${progressPercentage}%`,
								}}
							/>
						</div>
					</div>
				)}

				{/* Recompensa */}

				{xpReward > 0 && (
					<span className="achievement-badge__reward">+{xpReward} XP</span>
				)}

				{/* Fecha */}

				{unlocked && unlockedDate && (
					<span className="achievement-badge__date">
						Obtenido: {unlockedDate}
					</span>
				)}
			</div>
		</article>
	);
}

export default AchievementBadge;
