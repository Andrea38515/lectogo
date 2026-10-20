import { Link } from "react-router-dom";

import { useAuth } from "../../../hooks/useAuth";
import "./DocenteInicio.css";

const ATAJOS = [
  {
    path: "/docente/lecturas",
    titulo: "Lecturas",
    descripcion: "Creá y organizá los textos que leerán tus estudiantes.",
  },
  {
    path: "/docente/preguntas",
    titulo: "Preguntas",
    descripcion: "Armá el banco de preguntas de comprensión lectora.",
  },
  {
    path: "/docente/actividades",
    titulo: "Actividades",
    descripcion: "Combiná lecturas y preguntas en actividades para asignar.",
  },
  {
    path: "/docente/progreso",
    titulo: "Progreso",
    descripcion: "Seguí cómo avanzan tus estudiantes.",
  },
];

// El <main> lo aporta DocenteLayout, por eso acá solo hay <div>.
const DocenteInicio = () => {
  const { user } = useAuth();
  const nombre = user?.nombre || "Docente";

  return (
    <div className="docente-inicio">
      <div className="docente-inicio__bienvenida">
        <h1>¡Hola, {nombre}!</h1>
        <p>Desde acá gestionás las lecturas, preguntas y actividades de tus estudiantes.</p>
      </div>

      <ul className="docente-inicio__atajos">
        {ATAJOS.map(({ path, titulo, descripcion }) => (
          <li key={path}>
            <Link to={path} className="docente-inicio__tarjeta">
              <h2>{titulo}</h2>
              <p>{descripcion}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default DocenteInicio;
