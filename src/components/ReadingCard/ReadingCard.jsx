import React from "react";
import "./ReadingCard.css";

const ReadingCard = ({
  title,
  description,
  category,
  difficulty = "Intermedio",
  duration,
  image,
  progress = 0,
  onClick,
}) => {
  return (
    <article className="reading-card">
      <div className="reading-card__image">
        {image ? (
          <img src={image} alt={title} />
        ) : (
          <span className="reading-card__icon">📖</span>
        )}

        <span className="reading-card__difficulty">
          {difficulty}
        </span>
      </div>

      <div className="reading-card__content">
        {category && (
          <span className="reading-card__category">
            {category}
          </span>
        )}

        <h3 className="reading-card__title">
          {title}
        </h3>

        {description && (
          <p className="reading-card__description">
            {description}
          </p>
        )}

        <div className="reading-card__info">
          {duration && (
            <span>
              ⏱️ {duration}
            </span>
          )}

          <span>
            📚 Lectura
          </span>
        </div>

        {progress > 0 && (
          <div className="reading-card__progress">
            <div className="reading-card__progress-header">
              <span>Progreso</span>
              <span>{progress}%</span>
            </div>

            <div className="reading-card__progress-bar">
              <div
                className="reading-card__progress-fill"
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
          </div>
        )}

        <button
          type="button"
          className="reading-card__button"
          onClick={onClick}
        >
          {progress > 0 ? "Continuar lectura" : "Comenzar lectura"}
          <span>→</span>
        </button>
      </div>
    </article>
  );
};

export default ReadingCard;