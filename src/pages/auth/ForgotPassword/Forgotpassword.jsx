import { useState } from "react";
import { Link } from "react-router-dom";

import * as authServices from "../../../services/authServices";
import { isEmailValido } from "../../../utils/validators";
import Input from "../../../components/Input/Input";
import Button from "../../../components/Button/Button";
import "./Forgotpassword.css";

function ForgotPassword() {
	const [correo, setCorreo] = useState("");
	const [error, setError] = useState("");
	const [enviado, setEnviado] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);

	const handleSubmit = async (e) => {
		e.preventDefault();

		setError("");

		if (!isEmailValido(correo)) {
			setError("Ingresá un correo válido.");
			return;
		}

		setIsSubmitting(true);

		try {
			await authServices.resetPassword(correo);

			setEnviado(true);
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
					label="Correo"
					name="correo"
					type="email"
					value={correo}
					onChange={(e) => setCorreo(e.target.value)}
					disabled={isSubmitting}
					required
				/>

				{error && <p className="auth-error">{error}</p>}

				{enviado && (
					<p className="auth-success">
						Si el correo existe, te enviamos un enlace para restablecer tu
						contraseña.
					</p>
				)}

				<Button type="submit" fullWidth disabled={isSubmitting}>
					{isSubmitting ? "Enviando..." : "Enviar enlace"}
				</Button>

				<div className="auth-links">
					<Link to="/">Volver a iniciar sesión</Link>
				</div>
			</form>
		</main>
	);
}

export default ForgotPassword;
