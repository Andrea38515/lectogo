import { useState } from "react";

import { useAuth } from "../../hooks/useAuth";
import * as userService from "../../services/userService";
import * as storageService from "../../services/storageService";
import { esPasswordSegura } from "../../utils/validators";
import Input from "../../components/Input/Input";
import Button from "../../components/Button/Button";
import "./Profile.css";

function Profile() {
	const { user, refreshUser } = useAuth();

	const [nombre, setNombre] = useState(user.nombre ?? "");
	const [institucion, setInstitucion] = useState(user.institucion ?? "");
	const [foto, setFoto] = useState(null);
	const [datosError, setDatosError] = useState("");
	const [datosExito, setDatosExito] = useState("");
	const [guardandoDatos, setGuardandoDatos] = useState(false);

	const [currentPassword, setCurrentPassword] = useState("");
	const [newPassword, setNewPassword] = useState("");
	const [confirmNewPassword, setConfirmNewPassword] = useState("");
	const [passwordError, setPasswordError] = useState("");
	const [passwordExito, setPasswordExito] = useState("");
	const [guardandoPassword, setGuardandoPassword] = useState(false);

	const handleSubmitDatos = async (e) => {
		e.preventDefault();

		setDatosError("");
		setDatosExito("");

		if (!nombre.trim()) {
			setDatosError("El nombre es obligatorio.");
			return;
		}

		setGuardandoDatos(true);

		try {
			let fotoUrl = user.fotoUrl ?? "";

			if (foto) {
				fotoUrl = await storageService.uploadProfilePhoto(user.uid, foto);
			}

			await userService.updateProfile(user.uid, {
				nombre,
				institucion,
				fotoUrl,
			});

			await refreshUser();

			setDatosExito("Perfil actualizado correctamente.");
		} catch (err) {
			setDatosError(err.message);
		} finally {
			setGuardandoDatos(false);
		}
	};

	const handleSubmitPassword = async (e) => {
		e.preventDefault();

		setPasswordError("");
		setPasswordExito("");

		if (!esPasswordSegura(newPassword)) {
			setPasswordError(
				"La contraseña debe tener al menos 8 caracteres, con letras y números.",
			);
			return;
		}

		if (newPassword !== confirmNewPassword) {
			setPasswordError("Las contraseñas no coinciden.");
			return;
		}

		setGuardandoPassword(true);

		try {
			await userService.changePassword(currentPassword, newPassword);

			setCurrentPassword("");
			setNewPassword("");
			setConfirmNewPassword("");
			setPasswordExito("Contraseña actualizada correctamente.");
		} catch (err) {
			setPasswordError(err.message);
		} finally {
			setGuardandoPassword(false);
		}
	};

	return (
		<main className="profile-page">
			<form className="profile-form" onSubmit={handleSubmitDatos}>
				<h2>Mi perfil</h2>

				<Input
					label="Nombre"
					name="nombre"
					value={nombre}
					onChange={(e) => setNombre(e.target.value)}
					disabled={guardandoDatos}
					required
				/>

				<Input
					label="Institución"
					name="institucion"
					value={institucion}
					onChange={(e) => setInstitucion(e.target.value)}
					disabled={guardandoDatos}
				/>

				<label>
					Foto de perfil
					<input
						type="file"
						accept="image/*"
						onChange={(e) => setFoto(e.target.files?.[0] ?? null)}
					/>
				</label>

				{datosError && <p className="profile-error">{datosError}</p>}
				{datosExito && <p className="profile-success">{datosExito}</p>}

				<Button type="submit" disabled={guardandoDatos}>
					{guardandoDatos ? "Guardando..." : "Guardar cambios"}
				</Button>
			</form>

			<form className="profile-form" onSubmit={handleSubmitPassword}>
				<h2>Cambiar contraseña</h2>

				<Input
					label="Contraseña actual"
					name="currentPassword"
					type="password"
					value={currentPassword}
					onChange={(e) => setCurrentPassword(e.target.value)}
					disabled={guardandoPassword}
					required
				/>

				<Input
					label="Contraseña nueva"
					name="newPassword"
					type="password"
					value={newPassword}
					onChange={(e) => setNewPassword(e.target.value)}
					disabled={guardandoPassword}
					required
				/>

				<Input
					label="Confirmar contraseña nueva"
					name="confirmNewPassword"
					type="password"
					value={confirmNewPassword}
					onChange={(e) => setConfirmNewPassword(e.target.value)}
					disabled={guardandoPassword}
					required
				/>

				{passwordError && <p className="profile-error">{passwordError}</p>}
				{passwordExito && <p className="profile-success">{passwordExito}</p>}

				<Button type="submit" disabled={guardandoPassword}>
					{guardandoPassword ? "Guardando..." : "Cambiar contraseña"}
				</Button>
			</form>
		</main>
	);
}

export default Profile;
