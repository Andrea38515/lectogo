import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { login } from "../../../repositories/authRepository";
import "./Login.css";

const Login = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    correo: "",
    contrasena: "",
  });

  const [mostrarContrasena, setMostrarContrasena] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (error) {
      setError("");
    }
  };

  const validarFormulario = () => {
    const correo = formData.correo.trim();
    const contrasena = formData.contrasena;

    if (!correo || !contrasena) {
      setError("Por favor, completa todos los campos.");
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(correo)) {
      setError("Ingresa un correo electrónico válido.");
      return false;
    }

    return true;
  };

  const obtenerRutaPorRol = (rol) => {
    switch (rol) {
      case "administrador":
        return "/admin";

      case "docente":
        return "/docente";

      case "estudiante":
        return "/estudiante";

      case "invitado":
        return "/biblioteca";

      default:
        return "/inicio";
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validarFormulario()) {
      return;
    }

    try {
      setCargando(true);
      setError("");

      /*
       * authRepository se encarga de:
       * 1. Autenticar al usuario con Firebase Authentication.
       * 2. Obtener la información del usuario.
       * 3. Consultar su rol.
       *
       * Esto sigue la arquitectura MVC + Repository definida
       * para LectoGo.
       */
      const resultado = await login(
        formData.correo.trim(),
        formData.contrasena,
      );

      const rol = resultado?.rol;

      if (!rol) {
        setError(
          "No se pudo determinar el rol de tu cuenta. Contacta al administrador.",
        );
        return;
      }

      const ruta = obtenerRutaPorRol(rol);

      navigate(ruta, {
        replace: true,
      });
    } catch (err) {
      console.error("Error al iniciar sesión:", err);

      let mensaje =
        "No se pudo iniciar sesión. Verifica tus datos e inténtalo nuevamente.";

      switch (err?.code) {
        case "auth/invalid-credential":
        case "auth/wrong-password":
        case "auth/user-not-found":
          mensaje = "El correo o la contraseña son incorrectos.";
          break;

        case "auth/invalid-email":
          mensaje = "El correo electrónico no es válido.";
          break;

        case "auth/user-disabled":
          mensaje = "Esta cuenta se encuentra deshabilitada.";
          break;

        case "auth/too-many-requests":
          mensaje =
            "Demasiados intentos. Espera unos minutos y vuelve a intentarlo.";
          break;

        case "auth/network-request-failed":
          mensaje =
            "No hay conexión con el servidor. Comprueba tu conexión a Internet.";
          break;

        default:
          break;
      }

      setError(mensaje);
    } finally {
      setCargando(false);
    }
  };

  return (
    <main className="login-page">
      <section className="login-container">
        {/* Panel izquierdo */}
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
              Fortalece tu comprensión lectora mientras aprendes de una forma
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

        {/* Panel derecho */}
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
              <p>Ingresa a tu cuenta para continuar</p>
            </div>

            {error && (
              <div className="login-error" role="alert" aria-live="polite">
                <span className="error-icon">!</span>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="login-form">
              {/* Correo */}
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
                    value={formData.correo}
                    onChange={handleChange}
                    placeholder="ejemplo@correo.com"
                    autoComplete="email"
                    disabled={cargando}
                    required
                  />
                </div>
              </div>

              {/* Contraseña */}
              <div className="form-group">
                <label htmlFor="contrasena">Contraseña</label>

                <div className="input-wrapper">
                  <span className="input-icon" aria-hidden="true">
                    🔒
                  </span>

                  <input
                    id="contrasena"
                    name="contrasena"
                    type={mostrarContrasena ? "text" : "password"}
                    value={formData.contrasena}
                    onChange={handleChange}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    disabled={cargando}
                    required
                  />

                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setMostrarContrasena((prev) => !prev)}
                    aria-label={
                      mostrarContrasena
                        ? "Ocultar contraseña"
                        : "Mostrar contraseña"
                    }
                    disabled={cargando}
                  >
                    {mostrarContrasena ? "◉" : "◌"}
                  </button>
                </div>
              </div>

              {/* Recuperar contraseña */}
              <div className="forgot-password">
                <Link to="/recuperar-contrasena">
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>

              {/* Botón */}
              <button
                type="submit"
                className="login-button"
                disabled={cargando}
              >
                {cargando ? (
                  <>
                    <span className="spinner"></span>
                    Iniciando sesión...
                  </>
                ) : (
                  "Iniciar sesión"
                )}
              </button>
            </form>

            {/* Registro */}
            <div className="register-section">
              <span>¿No tienes una cuenta?</span>

              <Link to="/registro">Regístrate</Link>
            </div>

            <p className="login-footer">
              Al iniciar sesión aceptas nuestras condiciones de uso y políticas
              de privacidad.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
};

export default Login;
