import {
  collection,
  getDocs,
  limit as limitQuery,
  orderBy,
  query,
} from "firebase/firestore";

import { db } from "../firebase/config";

const rankingCollection = collection(db, "ranking");

export const getRanking = async (limit = 10) => {
  const rankingQuery = query(
    rankingCollection,
    orderBy("xp", "desc"),
    limitQuery(limit)
  );

  const snapshot = await getDocs(rankingQuery);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
};