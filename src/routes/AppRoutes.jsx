import { BrowserRouter, Routes, Route } from "react-router-dom";

import Login from "../pages/auth/Login";
import StudentDashboard from "../pages/estudiante/StudentDashboard";
import TeacherDashboard from "../pages/docente/TeacherDashboard";
import AdminDashboard from "../pages/admin/AdminDashboard";

function AppRouter() {
	return (
		<BrowserRouter>
			<Routes>
				<Route path="/" element={<Login />} />

				<Route path="/estudiante" element={<StudentDashboard />} />

				<Route path="/docente" element={<TeacherDashboard />} />

				<Route path="/admin" element={<AdminDashboard />} />
			</Routes>
		</BrowserRouter>
	);
}

export default AppRouter;
