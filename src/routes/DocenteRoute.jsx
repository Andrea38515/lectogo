import { Navigate, Outlet } from "react-router-dom";

import { useAuth } from "../hooks/useAuth";

// Cada rol vuelve a su propio inicio; nunca a /login, porque un usuario con
// sesión rebotaría de vuelta. Un rol desconocido cae en el área estudiante,
// igual que en AdminRoute.
const rutaInicioPorRol = (rol) =>
	rol === "administrador" ? "/admin" : "/estudiante";

function DocenteRoute() {
	const { user, loading } = useAuth();

	if (loading) {
		return null;
	}

	if (!user) {
		return <Navigate to="/" replace />;
	}

	if (user.rol !== "docente") {
		return <Navigate to={rutaInicioPorRol(user.rol)} replace />;
	}

	return <Outlet />;
}

export default DocenteRoute;
