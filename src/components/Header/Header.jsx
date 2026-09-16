// src/components/Header/Header.jsx

import { FiBell, FiMenu } from "react-icons/fi";

import "./Header.css";

function Header({
	title = "LectoGo",
	subtitle = "",
	userName = "Usuario",
	userRole = "",
	userPhoto = "",
	notificationCount = 0,
	onMenuClick,
	onNotificationClick,
	onProfileClick,
}) {
	// Obtener inicial del usuario
	const userInitial = userName ? userName.charAt(0).toUpperCase() : "U";

	return (
		<header className="header">
			{/* Parte izquierda */}

			<div className="header__left">
				{/* Menú para móvil */}

				{onMenuClick && (
					<button
						type="button"
						className="header__menu-button"
						onClick={onMenuClick}
						aria-label="Abrir menú"
					>
						<FiMenu />
					</button>
				)}

				{/* Título */}

				<div className="header__titles">
					<h1 className="header__title">{title}</h1>

					{subtitle && <p className="header__subtitle">{subtitle}</p>}
				</div>
			</div>

			{/* Parte derecha */}

			<div className="header__right">
				{/* Notificaciones */}

				<button
					type="button"
					className="header__notification"
					onClick={onNotificationClick}
					aria-label="Notificaciones"
				>
					<FiBell />

					{notificationCount > 0 && (
						<span className="header__notification-badge">
							{notificationCount > 9 ? "9+" : notificationCount}
						</span>
					)}
				</button>

				{/* Perfil */}

				<button
					type="button"
					className="header__profile"
					onClick={onProfileClick}
				>
					{/* Foto o inicial */}

					<div className="header__avatar">
						{userPhoto ? (
							<img
								src={userPhoto}
								alt={`Foto de ${userName}`}
								className="header__avatar-image"
							/>
						) : (
							<span className="header__avatar-initial">{userInitial}</span>
						)}
					</div>

					{/* Información del usuario */}

					<div className="header__user-info">
						<span className="header__user-name">{userName}</span>

						{userRole && <span className="header__user-role">{userRole}</span>}
					</div>
				</button>
			</div>
		</header>
	);
}

export default Header;
