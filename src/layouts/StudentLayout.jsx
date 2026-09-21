import React from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";

import { logout } from "../repositories/authRepository";

import "./StudentLayout.css";

const StudentLayout = ({ children }) => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login", { replace: true });
    } catch (error) {
      console.error("Error cerrando sesión:", error);
    }
  };

  const menuItems = [
    {
      path: "/estudiante",
      label: "Inicio",
      icon: "⌂",
      end: true,
    },
    {
      path: "/estudiante/biblioteca",
      label: "Biblioteca",
      icon: "📚",
    },
    {
      path: "/estudiante/actividades",
      label: "Actividades",
      icon: "✏️",
    },
    {
      path: "/estudiante/logros",
      label: "Logros",
      icon: "🏆",
    },
    {
      path: "/estudiante/ranking",
      label: "Ranking",
      icon: "📊",
    },
  ];

  return (
    <div className="student-layout">
      {/* =====================================
          SIDEBAR
         ===================================== */}

      <aside className="student-sidebar">
        <div className="student-sidebar-logo">
          <div className="student-logo-icon">📖</div>

          <div>
            <strong>LectoGo</strong>
            <span>Aprender leyendo</span>
          </div>
        </div>

        {/* PERFIL */}

        <div className="student-mini-profile">
          <div className="student-avatar">👤</div>

          <div className="student-mini-info">
            <strong>Estudiante</strong>
            <span>0 XP</span>
          </div>
        </div>

        {/* MENÚ */}

        <nav className="student-sidebar-nav">
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              className={({ isActive }) =>
                `student-nav-link ${isActive ? "active" : ""}`
              }
            >
              <span className="student-nav-icon">{item.icon}</span>

              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* OPCIONES */}

        <div className="student-sidebar-bottom">
          <NavLink
            to="/estudiante/perfil"
            className={({ isActive }) =>
              `student-nav-link ${isActive ? "active" : ""}`
            }
          >
            <span className="student-nav-icon">👤</span>

            <span>Perfil</span>
          </NavLink>

          <NavLink
            to="/estudiante/ajustes"
            className={({ isActive }) =>
              `student-nav-link ${isActive ? "active" : ""}`
            }
          >
            <span className="student-nav-icon">⚙️</span>

            <span>Ajustes</span>
          </NavLink>

          <button className="student-logout-button" onClick={handleLogout}>
            <span>↪</span>
            <span>Cerrar sesión</span>
          </button>
        </div>
      </aside>

      {/* =====================================
          CONTENIDO
         ===================================== */}

      <div className="student-content">
        {/* HEADER */}

        <header className="student-header">
          <div className="student-mobile-logo">📖 LectoGo</div>

          <div className="student-header-spacer"></div>

          <div className="student-header-stats">
            <div className="student-stat">
              <span>⭐</span>
              <strong>0 XP</strong>
            </div>

            <div className="student-stat">
              <span>🔥</span>
              <strong>0 días</strong>
            </div>
          </div>

          <button
            className="student-header-profile"
            onClick={() => navigate("/estudiante/perfil")}
          >
            👤
          </button>
        </header>

        {/* =====================================
            PÁGINA
           ===================================== */}

        <main className="student-main">{children ? children : <Outlet />}</main>
      </div>

      {/* =====================================
          NAVEGACIÓN MÓVIL
         ===================================== */}

      <nav className="student-mobile-nav">
        {menuItems.slice(0, 5).map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.end}
            className={({ isActive }) =>
              `student-mobile-nav-item ${isActive ? "active" : ""}`
            }
          >
            <span>{item.icon}</span>
            <small>{item.label}</small>
          </NavLink>
        ))}
      </nav>
    </div>
  );
};

export default StudentLayout;
