import React from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import PublicLayout from "../layouts/PublicLayout";
import StudentLayout from "../layouts/StudentLayout";

import Login from "../pages/auth/Login/Login";
import Register from "../pages/auth/Register/Register";
import ForgotPassword from "../pages/auth/ForgotPassword/Forgotpassword";
import Profile from "../pages/perfil/Profile";
import StudentDashboard from "../pages/estudiante/StudentDashboard/StudentDashboard";
import TeacherDashboard from "../pages/docente/TeacherDashboard/TeacherDashboard";
import AdminDashboard from "../pages/admin/AdminDashboard/AdminDashboard";
import PrivateRoutes from "./PrivateRoutes";

const ComingSoon = ({ title }) => {
  return (
    <div style={{ padding: "40px" }}>
      <h1>{title}</h1>
      <p>Módulo en construcción.</p>
    </div>
  );
};

/*
 * =========================================
 * BIBLIOTECA PÚBLICA
 * =========================================
 *
 * Acceso limitado:
 * - Permite consultar lecturas publicadas.
 * - No requiere entrar al panel del estudiante.
 * - No da acceso a actividades.
 */
const PublicLibrary = () => {
  const lecturas = [
    {
      id: "1",
      titulo: "El principito",
      autor: "Antoine de Saint-Exupéry",
      categoria: "Literatura",
    },
    {
      id: "2",
      titulo: "La importancia de leer",
      autor: "LectoGo",
      categoria: "Comprensión lectora",
    },
  ];

  return (
    <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "40px 20px" }}>
      <div style={{ textAlign: "center", marginBottom: "35px" }}>
        <h1>Biblioteca LectoGo</h1>

        <p>Explora nuestras lecturas disponibles para consulta pública.</p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: "20px",
        }}
      >
        {lecturas.map((lectura) => (
          <article
            key={lectura.id}
            style={{
              background: "#fff",
              border: "1px solid #e7e8ef",
              borderRadius: "16px",
              padding: "24px",
            }}
          >
            <span>{lectura.categoria}</span>

            <h2>{lectura.titulo}</h2>

            <p>Por {lectura.autor}</p>

            <a
              href={`/lecturas/${lectura.id}`}
              style={{
                display: "inline-block",
                marginTop: "15px",
                padding: "10px 16px",
                borderRadius: "10px",
                background: "#6366f1",
                color: "#fff",
                textDecoration: "none",
                fontWeight: "600",
              }}
            >
              Leer
            </a>
          </article>
        ))}
      </div>
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

        {/* Biblioteca pública limitada */}
        <Route path="/biblioteca" element={<PublicLibrary />} />

        {/* Lectura pública por ID */}
        <Route path="/lecturas/:lecturaId" element={<Reading />} />
      </Route>

      {/* =====================================
            ÁREA DEL ESTUDIANTE
           ===================================== */}

      <Route element={<StudentLayout />}>
        <Route
          path="/estudiante"
          element={<ComingSoon title="Panel del estudiante" />}
        />

        <Route
          path="/estudiante/inicio"
          element={<ComingSoon title="Inicio del estudiante" />}
        />

        <Route
          path="/estudiante/biblioteca"
          element={<ComingSoon title="Biblioteca del estudiante" />}
        />

        <Route
          path="/estudiante/lecturas"
          element={<ComingSoon title="Lecturas" />}
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

        <Route
          path="/estudiante/actividades/:actividadId"
          element={<Activity />}
        />

        <Route
          path="/estudiante/actividades"
          element={<ComingSoon title="Actividades" />}
        />

        <Route
          path="/estudiante/logros"
          element={<ComingSoon title="Logros" />}
        />

        <Route
          path="/estudiante/ranking"
          element={<ComingSoon title="Ranking" />}
        />

        <Route
          path="/estudiante/estadisticas"
          element={<ComingSoon title="Estadísticas" />}
        />

        <Route
          path="/estudiante/perfil"
          element={<ComingSoon title="Perfil" />}
        />

        <Route
          path="/estudiante/mascota"
          element={<ComingSoon title="Mascota" />}
        />

        <Route
          path="/estudiante/ajustes"
          element={<ComingSoon title="Ajustes" />}
        />
      </Route>

      {/* =====================================
            DOCENTE
           ===================================== */}

      <Route path="/docente" element={<ComingSoon title="Panel docente" />} />

      {/* =====================================
            ADMINISTRADOR
           ===================================== */}

      <Route
        path="/admin"
        element={<ComingSoon title="Panel administrador" />}
      />

      {/* =====================================
            RUTA NO ENCONTRADA
           ===================================== */}

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default AppRouter;
