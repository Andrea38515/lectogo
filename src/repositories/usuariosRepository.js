import { doc, getDoc } from "firebase/firestore";

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
