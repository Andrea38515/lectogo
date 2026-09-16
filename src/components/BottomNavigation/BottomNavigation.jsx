// src/components/BottomNavigation/BottomNavigation.jsx

import { NavLink } from "react-router-dom";

import {
	FiHome,
	FiBookOpen,
	FiCheckSquare,
	FiAward,
	FiUser,
} from "react-icons/fi";

import "./BottomNavigation.css";

function BottomNavigation() {
	const navigationItems = [
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

	return (
		<nav className="bottom-navigation">
			{navigationItems.map((item) => (
				<NavLink
					key={item.path}
					to={item.path}
					end={item.end}
					className={({ isActive }) =>
						`bottom-navigation__item ${
							isActive ? "bottom-navigation__item--active" : ""
						}`
					}
				>
					<span className="bottom-navigation__icon">{item.icon}</span>

					<span className="bottom-navigation__label">{item.label}</span>
				</NavLink>
			))}
		</nav>
	);
}

export default BottomNavigation;
