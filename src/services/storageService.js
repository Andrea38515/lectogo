import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

import { storage } from "../config/firebase";

export const uploadProfilePhoto = async (uid, file) => {
	const fileRef = ref(storage, `avatars/${uid}/${file.name}`);

	await uploadBytes(fileRef, file);

	return getDownloadURL(fileRef);
};
