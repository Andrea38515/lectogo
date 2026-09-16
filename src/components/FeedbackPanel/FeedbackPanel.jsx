import "./FeedbackPanel.css";

const FeedbackPanel = ({
  type = "info",
  title,
  message,
  explanation,
  onContinue,
  continueText = "Continuar",
  showIcon = true,
}) => {
  const icons = {
    success: "✓",
    error: "✕",
    warning: "!",
    info: "i",
  };

  return (
    <div className={`feedback-panel feedback-panel--${type}`}>
      <div className="feedback-panel__header">
        {showIcon && (
          <div className="feedback-panel__icon">
            {icons[type] || icons.info}
          </div>
        )}

        <div className="feedback-panel__content">
          {title && <h3 className="feedback-panel__title">{title}</h3>}

          {message && (
            <p className="feedback-panel__message">
              {message}
            </p>
          )}

          {explanation && (
            <div className="feedback-panel__explanation">
              <span className="feedback-panel__explanation-label">
                Explicación
              </span>
              <p>{explanation}</p>
            </div>
          )}
        </div>
      </div>

      {onContinue && (
        <div className="feedback-panel__actions">
          <button
            type="button"
            className="feedback-panel__button"
            onClick={onContinue}
          >
            {continueText}
          </button>
        </div>
      )}
    </div>
  );
};

export default FeedbackPanel;