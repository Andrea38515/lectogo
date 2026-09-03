// src/components/Button/Button.jsx

import "./Button.css";

function Button({
	children,
	type = "button",
	variant = "primary",
	size = "medium",
	disabled = false,
	fullWidth = false,
	onClick,
	className = "",
}) {
	const buttonClasses = `
    button
    button--${variant}
    button--${size}
    ${fullWidth ? "button--full-width" : ""}
    ${className}
  `;

	return (
		<button
			type={type}
			className={buttonClasses}
			disabled={disabled}
			onClick={onClick}
		>
			{children}
		</button>
	);
}

export default Button;
