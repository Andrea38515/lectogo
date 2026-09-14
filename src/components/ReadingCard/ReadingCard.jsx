// src/components/ReadingCard/ReadingCard.jsx

import { FiBookOpen, FiClock, FiBarChart2 } from "react-icons/fi";

import Button from "../Button/Button";

import "./ReadingCard.css";

function ReadingCard({
	id,
	title,
	description = "",
	image = "",
	category = "General",
	difficulty = "Básico",
	readingTime = 5,
	progress = 0,
	onRead,
}) {
	// Evita valores menores de 0 o mayores de 100
	const normalizedProgress = Math.min(Math.max(progress, 0), 100);

	const handleRead = () => {
		if (onRead) {
			onRead(id);
		}
	};

	const getButtonText = () => {
		if (normalizedProgress === 0) {
			return "Leer ahora";
		}

		if (normalizedProgress === 100) {
			return "Leer de nuevo";
		}

		return "Continuar";
	};

	return (
		<article className="reading-card">
			{/* Imagen */}

			<div className="reading-card__image-container">
				{image ? (
					<img
						src={image}
						alt={`Portada de ${title}`}
						className="reading-card__image"
						loading="lazy"
					/>
				) : (
					<div className="reading-card__image-placeholder">
						<FiBookOpen />
					</div>
				)}

				{/* Categoría */}

				<span className="reading-card__category">{category}</span>
			</div>

			{/* Contenido */}

			<div className="reading-card__content">
				<h3 className="reading-card__title">{title}</h3>

				{description && (
					<p className="reading-card__description">{description}</p>
				)}

				{/* Información */}

				<div className="reading-card__info">
					<span className="reading-card__info-item">
						<FiBarChart2 />

						{difficulty}
					</span>

					<span className="reading-card__info-item">
						<FiClock />
						{readingTime} min
					</span>
				</div>

				{/* Progreso */}

				{normalizedProgress > 0 && (
					<div className="reading-card__progress">
						<div className="reading-card__progress-header">
							<span>Progreso</span>

							<span>{normalizedProgress}%</span>
						</div>

						<div className="reading-card__progress-track">
							<div
								className="reading-card__progress-bar"
								style={{
									width: `${normalizedProgress}%`,
								}}
							/>
						</div>
					</div>
				)}

				{/* Botón */}

				<Button fullWidth onClick={handleRead}>
					<FiBookOpen />

					{getButtonText()}
				</Button>
			</div>
		</article>
	);
}

export default ReadingCard;
