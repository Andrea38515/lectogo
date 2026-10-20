import { NavLink, Outlet, useNavigate } from "react-router-dom";

import { useAuth } from "../hooks/useAuth";
import { logout } from "../services/authServices";

import "./DocenteLayout.css";

const SECCIONES = [
  { path: "/docente", label: "Inicio", end: true },
  { path: "/docente/lecturas", label: "Lecturas" },
  { path: "/docente/preguntas", label: "Preguntas" },
  { path: "/docente/actividades", label: "Actividades" },
  { path: "/docente/progreso", label: "Progreso" },
];

const DocenteLayout = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login", { replace: true });
    } catch (error) {
      console.error("Error cerrando sesión:", error);
    }
  };

  const userName = user?.nombre || "Docente";

  return (
    <div className="docente-layout">
      <header className="docente-layout__header">
        <div className="docente-layout__bar">
          <p className="docente-layout__brand">
            <span className="docente-layout__brand-lecto">Lecto</span>
            <span className="docente-layout__brand-go">Go</span>
            <span className="docente-layout__brand-tag">Docente</span>
          </p>

          <div className="docente-layout__user">
            <span className="docente-layout__user-name">{userName}</span>
            <button
              type="button"
              className="docente-layout__logout"
              onClick={handleLogout}
            >
              Cerrar sesión
            </button>
          </div>
        </div>

        <nav className="docente-layout__nav" aria-label="Panel docente">
          <ul className="docente-layout__nav-list">
            {SECCIONES.map(({ path, label, end }) => (
              <li key={path}>
                <NavLink
                  to={path}
                  end={end}
                  className={({ isActive }) =>
                    isActive
                      ? "docente-layout__link docente-layout__link--active"
                      : "docente-layout__link"
                  }
                >
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      {/* El layout es dueño del único <main>: las páginas usan <div>. */}
      <main className="docente-layout__content">
        <Outlet />
      </main>
    </div>
  );
};

export default DocenteLayout;
