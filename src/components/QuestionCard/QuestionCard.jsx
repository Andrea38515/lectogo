import PropTypes from "prop-types";
import "./QuestionCard.css";

const QuestionCard = ({
  enunciado,
  opciones = [],
  respuestaSeleccionada,
  onSeleccionar,
  deshabilitado = false,
}) => {
  const handleSeleccion = (opcion) => {
    if (deshabilitado) return;

    onSeleccionar(opcion);
  };

  return (
    <article className="question-card">
      <div className="question-card__header">
        <h2 className="question-card__title">Pregunta</h2>
      </div>

      <div className="question-card__content">
        <p className="question-card__enunciado">{enunciado}</p>

        <div className="question-card__options">
          {opciones.map((opcion, index) => {
            const valor =
              typeof opcion === "object" && opcion !== null
                ? opcion.id ?? opcion.valor ?? opcion.texto ?? opcion.label
                : opcion;

            const texto =
              typeof opcion === "object" && opcion !== null
                ? opcion.texto ?? opcion.label ?? opcion.valor ?? opcion.id
                : opcion;

            const seleccionada = respuestaSeleccionada === valor;

            return (
              <button
                key={valor ?? index}
                type="button"
                className={`question-card__option ${
                  seleccionada ? "question-card__option--selected" : ""
                }`}
                onClick={() => handleSeleccion(valor)}
                disabled={deshabilitado}
                aria-pressed={seleccionada}
              >
                <span className="question-card__option-indicator">
                  {String.fromCharCode(65 + index)}
                </span>

                <span className="question-card__option-text">
                  {texto}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </article>
  );
};

QuestionCard.propTypes = {
  enunciado: PropTypes.string.isRequired,
  opciones: PropTypes.arrayOf(
    PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.number,
      PropTypes.shape({
        id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        valor: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        texto: PropTypes.string,
        label: PropTypes.string,
      }),
    ])
  ),
  respuestaSeleccionada: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.number,
  ]),
  onSeleccionar: PropTypes.func.isRequired,
  deshabilitado: PropTypes.bool,
};

export default QuestionCard;