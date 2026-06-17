import { useState, useEffect, useCallback } from "react";
import { db } from "../services/firebase";
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  Timestamp,
} from "firebase/firestore";
import { useSelector } from "react-redux";

/**
 * Custom hook for managing user favorites
 * @returns {{ favorites, isFavorite, toggleFavorite, loading }}
 */
const useFavorites = () => {
  const { user } = useSelector((state) => state.auth);
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);

  // Real-time listener for favorites subcollection
  useEffect(() => {
    if (!user?.uid) {
      setFavorites([]);
      setLoading(false);
      return;
    }

    const favsRef = collection(db, "users", user.uid, "favorites");
    const unsub = onSnapshot(favsRef, (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setFavorites(data);
      setLoading(false);
    });

    return () => unsub();
  }, [user?.uid]);

  const isFavorite = useCallback(
    (venueId) => favorites.some((f) => f.venueId === venueId || f.id === venueId),
    [favorites]
  );

  const toggleFavorite = useCallback(
    async (venue) => {
      if (!user?.uid) return false;

      const favRef = doc(db, "users", user.uid, "favorites", venue.id);

      if (isFavorite(venue.id)) {
        await deleteDoc(favRef);
        return false; // removed
      } else {
        await setDoc(favRef, {
          venueId: venue.id,
          venueName: venue.name,
          venueImage: venue.images?.[0] || venue.image || "",
          venuePrice: venue.price,
          venueLocation: venue.location,
          addedAt: Timestamp.now(),
        });
        return true; // added
      }
    },
    [user?.uid, isFavorite]
  );

  return { favorites, isFavorite, toggleFavorite, loading };
};

export default useFavorites;
