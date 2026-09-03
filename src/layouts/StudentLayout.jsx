import { Outlet, useNavigate } from "react-router-dom";

import Sidebar from "../components/Sidebar/Sidebar";
import Header from "../components/Header/Header";
import BottomNavigation from "../components/BottomNavigation/BottomNavigation";

import "./StudentLayout.css";

function StudentLayout() {
	const navigate = useNavigate();

	return (
		<div className="student-layout">
			<Sidebar />

			<div className="student-layout__main">
				<Header
					title="Inicio"
					subtitle="Continúa aprendiendo y mejora tu comprensión lectora"
					userName="María López"
					userRole="Estudiante"
					notificationCount={3}
					onNotificationClick={() => console.log("Abrir notificaciones")}
					onProfileClick={() => navigate("/estudiante/perfil")}
				/>

				<main className="student-layout__content">
					<Outlet />
				</main>
			</div>

			<BottomNavigation />
		</div>
	);
}

export default StudentLayout;
