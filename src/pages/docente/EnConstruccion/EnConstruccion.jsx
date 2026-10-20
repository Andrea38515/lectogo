import "./EnConstruccion.css";

// Marcador de las secciones del panel docente que aún no existen. El <main>
// lo aporta DocenteLayout, por eso acá solo hay un <div>.
const EnConstruccion = ({ titulo, descripcion }) => {
  return (
    <div className="docente-en-construccion">
      <h1>{titulo}</h1>
      {descripcion && (
        <p className="docente-en-construccion__descripcion">{descripcion}</p>
      )}
      <p className="docente-en-construccion__aviso">
        Esta sección se construye en los próximos días.
      </p>
    </div>
  );
};

export default EnConstruccion;
