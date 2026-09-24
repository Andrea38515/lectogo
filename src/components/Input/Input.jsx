// src/components/Input/Input.jsx

import "./Input.css";

function Input({
	label,
	type = "text",
	name,
	value,
	placeholder = "",
	onChange,
	onBlur,
	error = "",
	helperText = "",
	disabled = false,
	required = false,
	fullWidth = true,
	icon,
	rightSlot,
	className = "",
}) {
	const inputGroupClasses = `
    input-group
    ${fullWidth ? "input-group--full-width" : ""}
    ${error ? "input-group--error" : ""}
    ${className}
  `;

	return (
		<div className={inputGroupClasses}>
			{label && (
				<label className="input-label" htmlFor={name}>
					{label}

					{required && <span className="input-required">*</span>}
				</label>
			)}

			<div className="input-container">
				{icon && <span className="input-icon">{icon}</span>}

				<input
					id={name}
					name={name}
					type={type}
					value={value}
					placeholder={placeholder}
					onChange={onChange}
					onBlur={onBlur}
					disabled={disabled}
					required={required}
					className={`
            input
            ${icon ? "input--with-icon" : ""}
            ${rightSlot ? "input--with-right-slot" : ""}
          `}
				/>

				{rightSlot && <span className="input-right-slot">{rightSlot}</span>}
			</div>

			{error ? (
				<span className="input-error-message">{error}</span>
			) : (
				helperText && <span className="input-helper-text">{helperText}</span>
			)}
		</div>
	);
}

export default Input;
