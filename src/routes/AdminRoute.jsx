import { Navigate, Outlet } from "react-router-dom";

import { useAuth } from "../hooks/useAuth";

function AdminRoute() {
	const { user, loading } = useAuth();

	if (loading) {
		return null;
	}

	if (!user) {
		return <Navigate to="/" replace />;
	}

	if (user.rol !== "administrador") {
		return <Navigate to="/estudiante" replace />;
	}

	return <Outlet />;
}

export default AdminRoute;
