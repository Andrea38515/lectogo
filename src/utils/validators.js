const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

export const isEmailValido = (correo) => {
	return EMAIL_REGEX.test(correo);
};

export const esPasswordSegura = (password) => {
	return PASSWORD_REGEX.test(password);
};
