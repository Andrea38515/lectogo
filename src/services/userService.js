import * as authRepository from "../repositories/authRepository";
import * as usuariosRepository from "../repositories/usuariosRepository";
import { mapAuthError } from "./authServices";

export const updateProfile = (uid, { nombre, institucion, fotoUrl }) => {
	return usuariosRepository.updateUser(uid, { nombre, institucion, fotoUrl });
};

export const changePassword = async (currentPassword, newPassword) => {
	try {
		await authRepository.reauthenticate(currentPassword);
		await authRepository.changeAuthPassword(newPassword);
	} catch (error) {
		throw new Error(mapAuthError(error.code), { cause: error });
	}
};
