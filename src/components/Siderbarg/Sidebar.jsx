// src/components/Sidebar/Sidebar.jsx

import { NavLink } from "react-router-dom";

import {
	FiHome,
	FiBookOpen,
	FiCheckSquare,
	FiBarChart2,
	FiAward,
	FiUser,
	FiUsers,
	FiFolder,
	FiSettings,
	FiLogOut,
} from "react-icons/fi";

import "./Sidebar.css";

function Sidebar({
	role = "estudiante",
	userName = "Usuario",
	userPhoto = "",
	onLogout,
}) {
	const studentItems = [
		{
			label: "Inicio",
			path: "/estudiante",
			icon: <FiHome />,
			end: true,
		},
		{
			label: "Biblioteca",
			path: "/estudiante/biblioteca",
			icon: <FiBookOpen />,
		},
		{
			label: "Actividades",
			path: "/estudiante/actividades",
			icon: <FiCheckSquare />,
		},
		{
			label: "Mi progreso",
			path: "/estudiante/progreso",
			icon: <FiBarChart2 />,
		},
		{
			label: "Ranking",
			path: "/estudiante/ranking",
			icon: <FiAward />,
		},
		{
			label: "Perfil",
			path: "/estudiante/perfil",
			icon: <FiUser />,
		},
	];

	const teacherItems = [
		{
			label: "Inicio",
			path: "/docente",
			icon: <FiHome />,
			end: true,
		},
		{
			label: "Mis lecturas",
			path: "/docente/lecturas",
			icon: <FiBookOpen />,
		},
		{
			label: "Banco de preguntas",
			path: "/docente/preguntas",
			icon: <FiCheckSquare />,
		},
		{
			label: "Actividades",
			path: "/docente/actividades",
			icon: <FiFolder />,
		},
		{
			label: "Estudiantes",
			path: "/docente/estudiantes",
			icon: <FiUsers />,
		},
		{
			label: "Progreso",
			path: "/docente/progreso",
			icon: <FiBarChart2 />,
		},
		{
			label: "Perfil",
			path: "/docente/perfil",
			icon: <FiUser />,
		},
	];

	const adminItems = [
		{
			label: "Inicio",
			path: "/admin",
			icon: <FiHome />,
			end: true,
		},
		{
			label: "Usuarios",
			path: "/admin/usuarios",
			icon: <FiUsers />,
		},
		{
			label: "Lecturas",
			path: "/admin/lecturas",
			icon: <FiBookOpen />,
		},
		{
			label: "Categorías",
			path: "/admin/categorias",
			icon: <FiFolder />,
		},
		{
			label: "Estadísticas",
			path: "/admin/estadisticas",
			icon: <FiBarChart2 />,
		},
		{
			label: "Configuración",
			path: "/admin/configuracion",
			icon: <FiSettings />,
		},
		{
			label: "Perfil",
			path: "/admin/perfil",
			icon: <FiUser />,
		},
	];

	const getNavigationItems = () => {
		switch (role) {
			case "docente":
				return teacherItems;

			case "administrador":
				return adminItems;

			default:
				return studentItems;
		}
	};

	const navigationItems = getNavigationItems();

	const userInitial = userName ? userName.charAt(0).toUpperCase() : "U";

	return (
		<aside className="sidebar">
			{/* Logo */}

			<div className="sidebar__brand">
				<div className="sidebar__logo">L</div>

				<div className="sidebar__brand-info">
					<span className="sidebar__brand-name">LectoGo</span>

					<span className="sidebar__brand-description">
						Comprensión lectora
					</span>
				</div>
			</div>

			{/* Navegación */}

			<nav className="sidebar__navigation">
				{navigationItems.map((item) => (
					<NavLink
						key={item.path}
						to={item.path}
						end={item.end}
						className={({ isActive }) =>
							`sidebar__item ${isActive ? "sidebar__item--active" : ""}`
						}
					>
						<span className="sidebar__item-icon">{item.icon}</span>

						<span className="sidebar__item-label">{item.label}</span>
					</NavLink>
				))}
			</nav>

			{/* Perfil */}

			<div className="sidebar__footer">
				<div className="sidebar__user">
					<div className="sidebar__avatar">
						{userPhoto ? (
							<img
								src={userPhoto}
								alt={`Foto de ${userName}`}
								className="sidebar__avatar-image"
							/>
						) : (
							<span className="sidebar__avatar-initial">{userInitial}</span>
						)}
					</div>

					<div className="sidebar__user-info">
						<span className="sidebar__user-name">{userName}</span>

						<span className="sidebar__user-role">{role}</span>
					</div>
				</div>

				{/* Cerrar sesión */}

				<button type="button" className="sidebar__logout" onClick={onLogout}>
					<FiLogOut />

					<span>Cerrar sesión</span>
				</button>
			</div>
		</aside>
	);
}

export default Sidebar;
