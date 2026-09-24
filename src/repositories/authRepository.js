import {
	signInWithEmailAndPassword,
	createUserWithEmailAndPassword,
	signOut,
	sendPasswordResetEmail,
	sendEmailVerification,
	EmailAuthProvider,
	reauthenticateWithCredential,
	updatePassword,
	onAuthStateChanged,
	deleteUser,
} from "firebase/auth";

import { auth } from "../config/firebase";

export const signIn = (correo, password) => {
	return signInWithEmailAndPassword(auth, correo, password);
};

export const signUp = (correo, password) => {
	return createUserWithEmailAndPassword(auth, correo, password);
};

export const signOutUser = () => {
	return signOut(auth);
};

export const sendResetEmail = (correo) => {
	return sendPasswordResetEmail(auth, correo);
};

export const sendVerificationEmail = (user) => {
	return sendEmailVerification(user);
};

export const reauthenticate = (password) => {
	if (!auth.currentUser) {
		const sinSesionError = new Error("No hay una sesión activa.");
		sinSesionError.code = "auth/no-current-user";
		throw sinSesionError;
	}

	const credential = EmailAuthProvider.credential(
		auth.currentUser.email,
		password,
	);

	return reauthenticateWithCredential(auth.currentUser, credential);
};

export const changeAuthPassword = (newPassword) => {
	return updatePassword(auth.currentUser, newPassword);
};

export const subscribeToAuthChanges = (callback) => {
	return onAuthStateChanged(auth, callback);
};

export const deleteCurrentUser = () => {
	return deleteUser(auth.currentUser);
};
