import { NavLink, Outlet, useNavigate } from "react-router-dom";

import { useAuth } from "../hooks/useAuth";
import { logout } from "../services/authServices";

import "./AdminLayout.css";

const SECCIONES = [
  { path: "/admin", label: "Inicio", end: true },
  { path: "/admin/categorias", label: "Categorías" },
  { path: "/admin/usuarios", label: "Usuarios" },
  { path: "/admin/auditoria", label: "Auditoría" },
];

const AdminLayout = () => {
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

  const userName = user?.nombre || "Administrador";

  return (
    <div className="admin-layout">
      <header className="admin-layout__header">
        <div className="admin-layout__bar">
          <p className="admin-layout__brand">
            <span className="admin-layout__brand-lecto">Lecto</span>
            <span className="admin-layout__brand-go">Go</span>
            <span className="admin-layout__brand-tag">Administrador</span>
          </p>

          <div className="admin-layout__user">
            <span className="admin-layout__user-name">{userName}</span>
            <button
              type="button"
              className="admin-layout__logout"
              onClick={handleLogout}
            >
              Cerrar sesión
            </button>
          </div>
        </div>

        <nav className="admin-layout__nav" aria-label="Panel de administración">
          <ul className="admin-layout__nav-list">
            {SECCIONES.map(({ path, label, end }) => (
              <li key={path}>
                <NavLink
                  to={path}
                  end={end}
                  className={({ isActive }) =>
                    isActive
                      ? "admin-layout__link admin-layout__link--active"
                      : "admin-layout__link"
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
      <main className="admin-layout__content">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
