import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import * as authServices from "../../../services/authServices";
import "./Login.css";

function Login() {
	const navigate = useNavigate();

	const [correo, setCorreo] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);

	const handleSubmit = async (e) => {
		e.preventDefault();

		setError("");
		setIsSubmitting(true);

		try {
			await authServices.login(correo, password);

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

				<label>
					Correo
					<input
						type="email"
						value={correo}
						onChange={(e) => setCorreo(e.target.value)}
						required
					/>
				</label>

				<label>
					Contraseña
					<input
						type="password"
						value={password}
						onChange={(e) => setPassword(e.target.value)}
						required
					/>
				</label>

				{error && <p className="auth-error">{error}</p>}

				<button type="submit" disabled={isSubmitting}>
					{isSubmitting ? "Ingresando..." : "Ingresar"}
				</button>

				<div className="auth-links">
					<Link to="/registro">Crear cuenta</Link>
					<Link to="/recuperar-password">Olvidé mi contraseña</Link>
				</div>
			</form>
		</main>
	);
}

export default Login;
