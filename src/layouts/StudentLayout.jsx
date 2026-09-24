import { Outlet, useNavigate } from "react-router-dom";

import Sidebar from "../components/Siderbarg/Sidebar";
import Header from "../components/Header/Header";
import BottomNavigation from "../components/BottomNavigation/BottomNavigation";
import { useAuth } from "../hooks/useAuth";
import { logout } from "../services/authServices";

import "./StudentLayout.css";

const StudentLayout = ({ children }) => {
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

  const userName = user?.nombre || "Estudiante";
  const userRole = user?.rol || "estudiante";
  const userPhoto = user?.fotoUrl || "";

  return (
    <div className="student-layout">
      {/* =====================================
          SIDEBAR
          Componente reutilizable (src/components/Siderbarg/Sidebar.jsx),
          ya migrado a variables del design system. Reemplaza el <aside>
          inline que no tenía CSS propio.
         ===================================== */}

      <Sidebar
        role={userRole}
        userName={userName}
        userPhoto={userPhoto}
        onLogout={handleLogout}
      />

      {/* =====================================
          CONTENIDO
          Usa las clases que .student-layout__main / __content ya definen
          en StudentLayout.css (margin-left: 260px pensado para el ancho
          fijo del Sidebar real).
         ===================================== */}

      <div className="student-layout__main">
        {/* HEADER
            Componente reutilizable (src/components/Header/Header.jsx),
            ya migrado a variables del design system. */}

        <Header
          title="LectoGo"
          subtitle="Aprender leyendo"
          userName={userName}
          userRole={userRole}
          userPhoto={userPhoto}
          onProfileClick={() => navigate("/estudiante/perfil")}
        />

        {/* =====================================
            PÁGINA
           ===================================== */}

        <main className="student-layout__content">
          {children ? children : <Outlet />}
        </main>
      </div>

      {/* =====================================
          NAVEGACIÓN MÓVIL
          Componente reutilizable (src/components/BottomNavigation/
          BottomNavigation.jsx), ya migrado a variables del design system.
          Se oculta a sí mismo en desktop (min-width: 768px) y el Sidebar
          se oculta a sí mismo en mobile (max-width: 767px), así que ambos
          conviven sin superponerse.
         ===================================== */}

      <BottomNavigation />
    </div>
  );
};

export default StudentLayout;
