import { Navigate, Route, Routes } from "react-router-dom";

import PublicLayout from "../layouts/PublicLayout";
import StudentLayout from "../layouts/StudentLayout";
import DocenteLayout from "../layouts/DocenteLayout";

import Login from "../pages/auth/Login/Login";
import Register from "../pages/auth/Register/Register";
import ForgotPassword from "../pages/auth/ForgotPassword/Forgotpassword";
import PublicLibrary from "../pages/public/PublicLibrary/PublicLibrary";
import Profile from "../pages/perfil/Profile";
import StudentDashboard from "../pages/estudiante/StudentDashboard/StudentDashboard";
import Library from "../pages/estudiante/Library/Library";
import Reading from "../pages/estudiante/Reading/Reading";
import Activity from "../pages/estudiante/Activity/Activity";
import Achievements from "../pages/estudiante/Achievements/Achievements";
import Statistics from "../pages/estudiante/Statistics/Statistics";
import Ranking from "../pages/estudiante/Ranking/Ranking";
import ResolverActividad from "../pages/estudiante/ResolverActividad/ResolverActividad";
import DocenteInicio from "../pages/docente/DocenteInicio/DocenteInicio";
import EnConstruccion from "../pages/docente/EnConstruccion/EnConstruccion";
import Lectures from "../pages/docente/Lectures/Lectures";
import LectureForm from "../pages/docente/Lectures/LectureForm";
import Activities from "../pages/docente/Activities/Activities";
import ActivityForm from "../pages/docente/Activities/ActivityForm";
import PrivateRoutes from "./PrivateRoutes";
import AdminRoute from "./AdminRoute";
import DocenteRoute from "./DocenteRoute";

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

          <Route path="/estudiante/logros" element={<Achievements />} />

          <Route path="/estudiante/ranking" element={<Ranking />} />

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
            DOCENTE (requiere sesión + rol docente)
           ===================================== */}

      <Route element={<DocenteRoute />}>
        <Route element={<DocenteLayout />}>
          <Route path="/docente" element={<DocenteInicio />} />

          <Route path="/docente/lecturas" element={<Lectures />} />

          <Route path="/docente/lecturas/nueva" element={<LectureForm />} />

          <Route
            path="/docente/lecturas/:lecturaId/editar"
            element={<LectureForm />}
          />

          <Route
            path="/docente/preguntas"
            element={
              <EnConstruccion
                titulo="Preguntas"
                descripcion="Armá el banco de preguntas de comprensión lectora."
              />
            }
          />

          <Route path="/docente/actividades" element={<Activities />} />

          <Route
            path="/docente/actividades/nueva"
            element={<ActivityForm />}
          />

          <Route
            path="/docente/progreso"
            element={
              <EnConstruccion
                titulo="Progreso"
                descripcion="Seguí cómo avanzan tus estudiantes."
              />
            }
          />

          <Route
            path="/docente/*"
            element={<Navigate to="/docente" replace />}
          />
        </Route>
      </Route>

      {/* =====================================
            ADMINISTRADOR (requiere sesión + rol administrador)
           ===================================== */}

      <Route element={<AdminRoute />}>
        <Route
          path="/admin/*"
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
