import { Navigate, Route, Routes } from "react-router-dom";

import PublicLayout from "../layouts/PublicLayout";
import StudentLayout from "../layouts/StudentLayout";

import Login from "../pages/auth/Login/Login";
import Register from "../pages/auth/Register/Register";
import ForgotPassword from "../pages/auth/ForgotPassword/Forgotpassword";
import PublicLibrary from "../pages/public/PublicLibrary/PublicLibrary";
import Profile from "../pages/perfil/Profile";
import StudentDashboard from "../pages/estudiante/StudentDashboard/StudentDashboard";
import Library from "../pages/estudiante/Library/Library";
import Reading from "../pages/estudiante/Reading/Reading";
import Activity from "../pages/estudiante/Activity/Activity";
import Statistics from "../pages/estudiante/Statistics/Statistics";
import ResolverActividad from "../pages/estudiante/ResolverActividad/ResolverActividad";
import PrivateRoutes from "./PrivateRoutes";
import AdminRoute from "./AdminRoute";

const ComingSoon = ({ title }) => {
  return (
    <div style={{ padding: "40px" }}>
      <h1>{title}</h1>
      <p>Módulo en construcción.</p>
    </div>
  );
};

function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* =====================================
            RUTAS PÚBLICAS
           ===================================== */}

      <Route element={<PublicLayout />}>
        <Route path="/login" element={<Login />} />

        <Route path="/auth/login" element={<Login />} />

        <Route path="/registro" element={<Register />} />

        <Route path="/recuperar-password" element={<ForgotPassword />} />

        {/* Biblioteca pública limitada */}
        <Route path="/biblioteca" element={<PublicLibrary />} />

        {/* Lectura pública por ID */}
        <Route path="/lecturas/:lecturaId" element={<Reading />} />
      </Route>

      {/* =====================================
            ÁREA DEL ESTUDIANTE (requiere sesión)
           ===================================== */}

      <Route element={<PrivateRoutes />}>
        <Route element={<StudentLayout />}>
          <Route path="/estudiante" element={<StudentDashboard />} />

          <Route
            path="/estudiante/inicio"
            element={<Navigate to="/estudiante" replace />}
          />

          <Route path="/estudiante/biblioteca" element={<Library />} />

          <Route
            path="/estudiante/lecturas"
            element={<Navigate to="/estudiante/biblioteca" replace />}
          />

          {/* =================================
                LECTURA DESDE EL ÁREA ESTUDIANTE
               ================================= */}

          <Route path="/estudiante/reading/:lecturaId" element={<Reading />} />

          {/* =================================
                ACTIVIDAD REAL

                IMPORTANTE:
                actividadId ≠ lecturaId
               ================================= */}

          <Route path="/estudiante/actividades" element={<Activity />} />

          <Route
            path="/estudiante/actividades/:actividadId"
            element={<ResolverActividad />}
          />

          <Route
            path="/estudiante/logros"
            element={<ComingSoon title="Logros" />}
          />

          <Route
            path="/estudiante/ranking"
            element={<ComingSoon title="Ranking" />}
          />

          <Route path="/estudiante/estadisticas" element={<Statistics />} />

          <Route
            path="/estudiante/progreso"
            element={<Navigate to="/estudiante/estadisticas" replace />}
          />

          <Route path="/estudiante/perfil" element={<Profile />} />

          <Route
            path="/estudiante/mascota"
            element={<ComingSoon title="Mascota" />}
          />

          <Route
            path="/estudiante/ajustes"
            element={<ComingSoon title="Ajustes" />}
          />
        </Route>
      </Route>

      {/* =====================================
            DOCENTE (requiere sesión)
           ===================================== */}

      <Route element={<PrivateRoutes />}>
        <Route
          path="/docente"
          element={<ComingSoon title="Panel docente" />}
        />
      </Route>

      {/* =====================================
            ADMINISTRADOR (requiere sesión + rol administrador)
           ===================================== */}

      <Route element={<AdminRoute />}>
        <Route
          path="/admin"
          element={<ComingSoon title="Panel administrador" />}
        />
      </Route>

      {/* =====================================
            RUTA NO ENCONTRADA
           ===================================== */}

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default AppRouter;
