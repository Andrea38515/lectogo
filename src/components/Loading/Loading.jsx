// src/components/Loading/Loading.jsx

import "./Loading.css";

function Loading({
	message = "Cargando...",
	fullScreen = false,
	size = "medium",
}) {
	return (
		<div
			className={`
        loading
        ${fullScreen ? "loading--fullscreen" : ""}
      `}
			role="status"
			aria-live="polite"
		>
			<div
				className={`
          loading__spinner
          loading__spinner--${size}
        `}
			/>

			{message && <p className="loading__message">{message}</p>}

			<span className="loading__sr-only">Cargando contenido</span>
		</div>
	);
}

export default Loading;
