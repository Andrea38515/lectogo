import { Routes, Route } from "react-router-dom";

import Login from "../pages/auth/Login/Login";
import Register from "../pages/auth/Register/Register";
import ForgotPassword from "../pages/auth/ForgotPassword/Forgotpassword";
import Profile from "../pages/perfil/Profile";
import StudentDashboard from "../pages/estudiante/StudentDashboard/StudentDashboard";
import TeacherDashboard from "../pages/docente/TeacherDashboard/TeacherDashboard";
import AdminDashboard from "../pages/admin/AdminDashboard/AdminDashboard";
import PrivateRoutes from "./PrivateRoutes";

function AppRouter() {
	return (
		<Routes>
			<Route path="/" element={<Login />} />

			<Route path="/registro" element={<Register />} />

			<Route path="/recuperar-password" element={<ForgotPassword />} />

			<Route element={<PrivateRoutes />}>
				<Route path="/estudiante" element={<StudentDashboard />} />

				<Route path="/perfil" element={<Profile />} />
			</Route>

			<Route path="/docente" element={<TeacherDashboard />} />

			<Route path="/admin" element={<AdminDashboard />} />
		</Routes>
	);
}

export default AppRouter;
