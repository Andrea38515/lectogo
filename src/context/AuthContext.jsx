import { useEffect, useState } from "react";

import { auth } from "../config/firebase";
import * as authRepository from "../repositories/authRepository";
import * as usuariosRepository from "../repositories/usuariosRepository";
import { AuthContext } from "./AuthContextBase";

export function AuthProvider({ children }) {
	const [perfil, setPerfil] = useState(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const unsubscribe = authRepository.subscribeToAuthChanges(
			async (firebaseUser) => {
				if (firebaseUser) {
					const datosUsuario = await usuariosRepository.getUserById(
						firebaseUser.uid,
					);

					setPerfil(datosUsuario);
				} else {
					setPerfil(null);
				}

				setLoading(false);
			},
		);

		return unsubscribe;
	}, []);

	const refreshUser = async () => {
		if (auth.currentUser) {
			const datosUsuario = await usuariosRepository.getUserById(
				auth.currentUser.uid,
			);

			setPerfil(datosUsuario);
		}
	};

	const value = { user: perfil, loading, refreshUser, setPerfilLocal: setPerfil };

	return (
		<AuthContext.Provider value={value}>{children}</AuthContext.Provider>
	);
}
