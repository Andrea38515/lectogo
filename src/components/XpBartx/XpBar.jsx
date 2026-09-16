// src/components/XpBar/XpBar.jsx

import { FiZap } from "react-icons/fi";

import "./XpBar.css";

function XpBar({
	currentXp = 0,
	nextLevelXp = 100,
	level = 1,
	showLevel = true,
	showText = true,
	size = "medium",
}) {
	const normalizedXp = Math.max(currentXp, 0);

	const progressPercentage =
		nextLevelXp > 0
			? Math.min(Math.round((normalizedXp / nextLevelXp) * 100), 100)
			: 0;

	const remainingXp = Math.max(nextLevelXp - normalizedXp, 0);

	return (
		<div
			className={`
        xp-bar
        xp-bar--${size}
      `}
		>
			{/* Información superior */}

			<div className="xp-bar__header">
				<div className="xp-bar__title">
					<FiZap />

					<span>Experiencia</span>
				</div>

				{showLevel && <span className="xp-bar__level">Nivel {level}</span>}
			</div>

			{/* Barra */}

			<div
				className="xp-bar__track"
				role="progressbar"
				aria-valuemin="0"
				aria-valuemax={nextLevelXp}
				aria-valuenow={normalizedXp}
				aria-label="Progreso de experiencia"
			>
				<div
					className="xp-bar__progress"
					style={{
						width: `${progressPercentage}%`,
					}}
				/>
			</div>

			{/* Información inferior */}

			{showText && (
				<div className="xp-bar__info">
					<span className="xp-bar__current">{normalizedXp} XP</span>

					{remainingXp > 0 ? (
						<span className="xp-bar__remaining">Faltan {remainingXp} XP</span>
					) : (
						<span className="xp-bar__completed">¡Nivel completado!</span>
					)}

					<span className="xp-bar__target">{nextLevelXp} XP</span>
				</div>
			)}
		</div>
	);
}

export default XpBar;
