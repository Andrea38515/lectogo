import "./FeedbackPanel.css";

function FeedbackPanel({ esCorrecta, explicacion }) {
  return (
    <div
      className={`feedback-panel ${
        esCorrecta ? "feedback-panel--correcta" : "feedback-panel--incorrecta"
      }`}
      role="status"
      aria-live="polite"
    >
      <p className="feedback-panel__estado">
        {esCorrecta ? "¡Respuesta correcta!" : "Respuesta incorrecta"}
      </p>

      {explicacion && (
        <p className="feedback-panel__explicacion">{explicacion}</p>
      )}
    </div>
  );
}

export default FeedbackPanel;
