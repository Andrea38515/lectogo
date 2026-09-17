import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";

import { db } from "../config/firebase";

export const getUserById = async (uid) => {
	const ref = doc(db, "usuarios", uid);

	const snapshot = await getDoc(ref);

	if (!snapshot.exists()) {
		return null;
	}

	return {
		id: snapshot.id,
		...snapshot.data(),
	};
};

export const createUser = (uid, data) => {
	const ref = doc(db, "usuarios", uid);

	return setDoc(ref, data);
};

export const updateUser = (uid, data) => {
	const ref = doc(db, "usuarios", uid);

	return updateDoc(ref, data);
};
