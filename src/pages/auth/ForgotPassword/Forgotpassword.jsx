import React from "react";
import "./ForgotPassword.css";

function ForgotPassword() {
  return (
    <div className="forgot-container">
      <div className="forgot-card">
        <h1>¿Olvidaste tu contraseña?</h1>

        <p>
          Ingresa tu correo electrónico y te enviaremos instrucciones para
          recuperar tu contraseña.
        </p>

        <form>
          <label htmlFor="email">Correo electrónico</label>

          <input
            type="email"
            id="email"
            placeholder="Ingresa tu correo"
            required
          />

          <button type="submit">Enviar instrucciones</button>
        </form>

        <a href="/login" className="back-login">
          Volver al inicio de sesión
        </a>
      </div>
    </div>
  );
}

export default ForgotPassword;