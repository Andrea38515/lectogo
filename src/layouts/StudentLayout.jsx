import React from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import "./StudentLayout.css";

const StudentLayout = () => {
  const navigate = useNavigate();

  const menuItems = [
    {
      label: "Inicio",
      path: "/estudiante",
      icon: "🏠",
    },
    {
      label: "Actividades",
      path: "/estudiante/actividades",
      icon: "📝",
    },
    {
      label: "Biblioteca",
      path: "/estudiante/library",
      icon: "📚",
    },
    {
      label: "Progreso",
      path: "/estudiante/progreso",
      icon: "📊",
    },
    {
      label: "Logros",
      path: "/estudiante/logros",
      icon: "🏆",
    },
  ];

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  return (
    <div className="student-layout">
      <aside className="student-layout__sidebar">
        <div className="student-layout__logo">
          <div className="student-layout__logo-icon">F</div>
          <div>
            <h2>FocUsly</h2>
            <span>Aprende y crece</span>
          </div>
        </div>

        <nav className="student-layout__nav">
          <span className="student-layout__nav-title">
            MENÚ PRINCIPAL
          </span>

          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/estudiante"}
              className={({ isActive }) =>
                `student-layout__nav-link ${
                  isActive
                    ? "student-layout__nav-link--active"
                    : ""
                }`
              }
            >
              <span className="student-layout__nav-icon">
                {item.icon}
              </span>

              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="student-layout__sidebar-bottom">
          <button
            type="button"
            className="student-layout__logout"
            onClick={handleLogout}
          >
            <span>🚪</span>
            <span>Cerrar sesión</span>
          </button>
        </div>
      </aside>

      <div className="student-layout__main">
        <header className="student-layout__header">
          <div className="student-layout__mobile-brand">
            <div className="student-layout__logo-icon">
              F
            </div>
            <span>FocUsly</span>
          </div>

          <div className="student-layout__header-content">
            <div className="student-layout__welcome">
              <span>👋</span>
              <span>¡Hola, estudiante!</span>
            </div>

            <div className="student-layout__profile">
              <div className="student-layout__avatar">
                E
              </div>

              <div className="student-layout__profile-info">
                <strong>Estudiante</strong>
                <span>Aprendiz</span>
              </div>
            </div>
          </div>
        </header>

        <main className="student-layout__content">
          <Outlet />
        </main>

        <footer className="student-layout__footer">
          <span>© {new Date().getFullYear()} FocUsly</span>
          <span>Aprender también puede ser divertido 💜</span>
        </footer>
      </div>
    </div>
  );
};

export default StudentLayout;