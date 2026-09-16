import React from "react";
import { Link, Outlet } from "react-router-dom";
import "./PublicLayout.css";

const PublicLayout = () => {
  return (
    <div className="public-layout">
      <header className="public-layout__header">
        <div className="public-layout__container">
          <Link to="/" className="public-layout__logo">
            <div className="public-layout__logo-icon">F</div>

            <div className="public-layout__logo-text">
              <strong>FocUsly</strong>
              <span>Aprende y crece</span>
            </div>
          </Link>

          <nav className="public-layout__nav">
            <Link
              to="/"
              className="public-layout__nav-link"
            >
              Inicio
            </Link>

            <Link
              to="/login"
              className="public-layout__nav-link"
            >
              Iniciar sesión
            </Link>

            <Link
              to="/registro"
              className="public-layout__button"
            >
              Registrarse
            </Link>
          </nav>
        </div>
      </header>

      <main className="public-layout__main">
        <Outlet />
      </main>

      <footer className="public-layout__footer">
        <div className="public-layout__container public-layout__footer-content">
          <div>
            <strong>FocUsly</strong>
            <p>
              Una forma más sencilla y dinámica de aprender.
            </p>
          </div>

          <div className="public-layout__footer-links">
            <Link to="/">Inicio</Link>
            <Link to="/login">Iniciar sesión</Link>
            <Link to="/registro">Registrarse</Link>
          </div>

          <span className="public-layout__copyright">
            © {new Date().getFullYear()} FocUsly
          </span>
        </div>
      </footer>
    </div>
  );
};

export default PublicLayout;