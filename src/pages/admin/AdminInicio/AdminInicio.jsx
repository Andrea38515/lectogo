import { Link } from "react-router-dom";

import { useAuth } from "../../../hooks/useAuth";
import "./AdminInicio.css";

const ATAJOS = [
  {
    path: "/admin/categorias",
    titulo: "Categorías",
    descripcion: "Creá, editá y eliminá las categorías de las lecturas.",
  },
  {
    path: "/admin/usuarios",
    titulo: "Usuarios",
    descripcion: "Mirá quién está en la plataforma y cambiá roles.",
  },
  {
    path: "/admin/auditoria",
    titulo: "Auditoría",
    descripcion: "Revisá los últimos cambios hechos en la plataforma.",
  },
];

// El <main> lo aporta AdminLayout, por eso acá solo hay <div>.
const AdminInicio = () => {
  const { user } = useAuth();
  const nombre = user?.nombre || "Administrador";

  return (
    <div className="admin-inicio">
      <div className="admin-inicio__bienvenida">
        <h1>¡Hola, {nombre}!</h1>
        <p>Desde acá administrás las categorías, los usuarios y el registro de cambios.</p>
      </div>

      <ul className="admin-inicio__atajos">
        {ATAJOS.map(({ path, titulo, descripcion }) => (
          <li key={path}>
            <Link to={path} className="admin-inicio__tarjeta">
              <h2>{titulo}</h2>
              <p>{descripcion}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default AdminInicio;
