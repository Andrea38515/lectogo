import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { useAuth } from "../../../hooks/useAuth";
import * as authServices from "../../../services/authServices";
import { isEmailValido, esPasswordSegura } from "../../../utils/validators";
import Input from "../../../components/Input/Input";
import Button from "../../../components/Button/Button";
import "./Register.css";

function Register() {
	const navigate = useNavigate();
	const { setPerfilLocal } = useAuth();

	const [nombre, setNombre] = useState("");
	const [correo, setCorreo] = useState("");
	const [password, setPassword] = useState("");
	const [confirmarPassword, setConfirmarPassword] = useState("");
	const [error, setError] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);

	const handleSubmit = async (e) => {
		e.preventDefault();

		setError("");

		if (!nombre.trim()) {
			setError("El nombre es obligatorio.");
			return;
		}

		if (!isEmailValido(correo)) {
			setError("Ingresá un correo válido.");
			return;
		}

		if (!esPasswordSegura(password)) {
			setError(
				"La contraseña debe tener al menos 8 caracteres, con letras y números.",
			);
			return;
		}

		if (password !== confirmarPassword) {
			setError("Las contraseñas no coinciden.");
			return;
		}

		setIsSubmitting(true);

		try {
			const perfil = await authServices.register({ nombre, correo, password });

			// El listener de auth global también intentará leer este perfil de Firestore,
			// pero puede ganarle la carrera a la escritura recién hecha y devolver null;
			// lo sembramos acá con el valor que ya tenemos para no depender de esa carrera.
			setPerfilLocal(perfil);

			navigate("/estudiante");
		} catch (err) {
			setError(err.message);
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<main className="auth-page">
			<form className="auth-form" onSubmit={handleSubmit}>
				<h1>LectoGo</h1>

				<Input
					label="Nombre"
					name="nombre"
					value={nombre}
					onChange={(e) => setNombre(e.target.value)}
					disabled={isSubmitting}
					required
				/>

				<Input
					label="Correo"
					name="correo"
					type="email"
					value={correo}
					onChange={(e) => setCorreo(e.target.value)}
					disabled={isSubmitting}
					required
				/>

				<Input
					label="Contraseña"
					name="password"
					type="password"
					value={password}
					onChange={(e) => setPassword(e.target.value)}
					disabled={isSubmitting}
					required
				/>

				<Input
					label="Confirmar contraseña"
					name="confirmarPassword"
					type="password"
					value={confirmarPassword}
					onChange={(e) => setConfirmarPassword(e.target.value)}
					disabled={isSubmitting}
					required
				/>

				{error && <p className="auth-error">{error}</p>}

				<Button type="submit" fullWidth disabled={isSubmitting}>
					{isSubmitting ? "Creando cuenta..." : "Crear cuenta"}
				</Button>

				<div className="auth-links">
					<Link to="/">Ya tengo cuenta</Link>
				</div>
			</form>
		</main>
	);
}

export default Register;
