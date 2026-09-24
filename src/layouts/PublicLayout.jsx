import { Outlet } from "react-router-dom";

import "./PublicLayout.css";

const PublicLayout = ({ children }) => {
  return (
    <div className="public-layout">
      <div className="public-layout-background">
        <div className="public-decoration public-decoration-one"></div>
        <div className="public-decoration public-decoration-two"></div>
        <div className="public-decoration public-decoration-three"></div>
      </div>

      <main className="public-layout-main">
        {children ? children : <Outlet />}
      </main>

      <footer className="public-layout-footer">
        <div className="public-layout-logo">
          <span className="public-layout-logo-icon">📖</span>

          <span className="public-layout-logo-text">LectoGo</span>
        </div>

        <p>Aprende, lee y descubre nuevas historias.</p>

        <small>© {new Date().getFullYear()} LectoGo</small>
      </footer>
    </div>
  );
};

export default PublicLayout;
