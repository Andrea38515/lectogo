// src/components/Modal/Modal.jsx

import { useEffect } from "react";
import { FiX } from "react-icons/fi";

import "./Modal.css";

function Modal({
	isOpen,
	title = "",
	children,
	onClose,
	showCloseButton = true,
	closeOnOverlay = true,
	size = "medium",
}) {
	useEffect(() => {
		if (!isOpen) return;

		const handleKeyDown = (event) => {
			if (event.key === "Escape") {
				onClose();
			}
		};

		document.addEventListener("keydown", handleKeyDown);

		// Evita scroll del fondo
		document.body.style.overflow = "hidden";

		return () => {
			document.removeEventListener("keydown", handleKeyDown);

			document.body.style.overflow = "";
		};
	}, [isOpen, onClose]);

	if (!isOpen) {
		return null;
	}

	const handleOverlayClick = (event) => {
		if (closeOnOverlay && event.target === event.currentTarget) {
			onClose();
		}
	};

	return (
		<div className="modal-overlay" onClick={handleOverlayClick}>
			<div
				className={`modal modal--${size}`}
				role="dialog"
				aria-modal="true"
				aria-labelledby="modal-title"
			>
				<div className="modal__header">
					{title && (
						<h2 id="modal-title" className="modal__title">
							{title}
						</h2>
					)}

					{showCloseButton && (
						<button
							type="button"
							className="modal__close"
							onClick={onClose}
							aria-label="Cerrar modal"
						>
							<FiX />
						</button>
					)}
				</div>

				<div className="modal__content">{children}</div>
			</div>
		</div>
	);
}

export default Modal;
