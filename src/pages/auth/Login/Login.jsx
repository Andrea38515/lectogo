import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { useAuth } from "../../../hooks/useAuth";
import * as authServices from "../../../services/authServices";
import { isEmailValido } from "../../../utils/validators";
import "./Login.css";

const obtenerRutaPorRol = (rol) => {
	switch (rol) {
		case "administrador":
			return "/admin";
		case "docente":
			return "/docente";
		case "estudiante":
			return "/estudiante";
		default:
			return "/estudiante";
	}
};

function Login() {
	const navigate = useNavigate();
	const { setPerfilLocal } = useAuth();

	const [correo, setCorreo] = useState("");
	const [password, setPassword] = useState("");
	const [mostrarPassword, setMostrarPassword] = useState(false);
	const [error, setError] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);

	const handleSubmit = async (e) => {
		e.preventDefault();

		setError("");

		if (!correo.trim() || !password) {
			setError("Por favor, completá todos los campos.");
			return;
		}

		if (!isEmailValido(correo)) {
			setError("Ingresá un correo electrónico válido.");
			return;
		}

		setIsSubmitting(true);

		try {
			const perfil = await authServices.login(correo.trim(), password);

			// El listener de auth global también intentará leer este perfil de Firestore,
			// pero puede ganarle la carrera a esta lectura; lo sembramos acá con el valor
			// que ya tenemos para no depender de esa carrera (mismo patrón que en Register).
			setPerfilLocal(perfil);

			navigate(obtenerRutaPorRol(perfil.rol), { replace: true });
		} catch (err) {
			setError(err.message);
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<main className="login-page">
			<section className="login-container">
				<div className="login-brand">
					<div className="brand-content">
						<div className="brand-logo">
							<span className="brand-lecto">Lecto</span>
							<span className="brand-go">Go</span>
							<span className="brand-book" aria-hidden="true">
								📖
							</span>
						</div>

						<h1>Aprende, juega y mejora</h1>

						<p>
							Fortalece tu comprensión lectora mientras aprendés de una forma
							divertida.
						</p>

						<div className="mascot-wrapper">
							<div className="spark spark-1">✦</div>
							<div className="spark spark-2">✦</div>
							<div className="spark spark-3">✧</div>

							<div className="mascot">🦊</div>

							<div className="books">
								<span>📕</span>
								<span>📘</span>
								<span>📗</span>
							</div>
						</div>
					</div>
				</div>

				<div className="login-form-section">
					<div className="login-card">
						<div className="mobile-logo">
							<span className="brand-lecto">Lecto</span>
							<span className="brand-go">Go</span>
							<span className="brand-book" aria-hidden="true">
								📖
							</span>
						</div>

						<div className="login-header">
							<h2>Iniciar sesión</h2>
							<p>Ingresá a tu cuenta para continuar</p>
						</div>

						{error && (
							<div className="login-error" role="alert" aria-live="polite">
								<span className="error-icon">!</span>
								<span>{error}</span>
							</div>
						)}

						<form onSubmit={handleSubmit} className="login-form">
							<div className="form-group">
								<label htmlFor="correo">Correo electrónico</label>

								<div className="input-wrapper">
									<span className="input-icon" aria-hidden="true">
										✉
									</span>

									<input
										id="correo"
										name="correo"
										type="email"
										value={correo}
										onChange={(e) => setCorreo(e.target.value)}
										placeholder="ejemplo@correo.com"
										autoComplete="email"
										disabled={isSubmitting}
										required
									/>
								</div>
							</div>

							<div className="form-group">
								<label htmlFor="password">Contraseña</label>

								<div className="input-wrapper">
									<span className="input-icon" aria-hidden="true">
										🔒
									</span>

									<input
										id="password"
										name="password"
										type={mostrarPassword ? "text" : "password"}
										value={password}
										onChange={(e) => setPassword(e.target.value)}
										placeholder="••••••••"
										autoComplete="current-password"
										disabled={isSubmitting}
										required
									/>

									<button
										type="button"
										className="password-toggle"
										onClick={() => setMostrarPassword((prev) => !prev)}
										aria-label={
											mostrarPassword
												? "Ocultar contraseña"
												: "Mostrar contraseña"
										}
										disabled={isSubmitting}
									>
										{mostrarPassword ? "◉" : "◌"}
									</button>
								</div>
							</div>

							<div className="forgot-password">
								<Link to="/recuperar-password">¿Olvidaste tu contraseña?</Link>
							</div>

							<button
								type="submit"
								className="login-button"
								disabled={isSubmitting}
							>
								{isSubmitting ? (
									<>
										<span className="spinner"></span>
										Iniciando sesión...
									</>
								) : (
									"Iniciar sesión"
								)}
							</button>
						</form>

						<div className="register-section">
							<span>¿No tenés una cuenta?</span>
							<Link to="/registro">Registrate</Link>
						</div>

						<p className="login-footer">
							Al iniciar sesión aceptás nuestras condiciones de uso y
							políticas de privacidad.
						</p>
					</div>
				</div>
			</section>
		</main>
	);
}

export default Login;
