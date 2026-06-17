import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { db, auth } from "../services/firebase";
import {
  collection, doc, setDoc, deleteDoc, onSnapshot, Timestamp,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

const FavoritesContext = createContext({
  favorites: [],
  isFavorite: () => false,
  toggleFavorite: async () => false,
  loading: true,
});

export const FavoritesProvider = ({ children }) => {
  const [favorites, setFavorites] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [uid,       setUid]       = useState(null);

  // Use Firebase Auth directly (not Redux) so the token is guaranteed ready
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (fbUser) => {
      setUid(fbUser?.uid ?? null);
      if (!fbUser) {
        setFavorites([]);
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  // Single shared Firestore listener for the whole app
  useEffect(() => {
    if (!uid) return;
    const favsRef = collection(db, "users", uid, "favorites");
    const unsub = onSnapshot(
      favsRef,
      (snap) => {
        setFavorites(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      (err) => {
        console.error("Favorites listener:", err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [uid]);

  const isFavorite = useCallback(
    (venueId) => favorites.some((f) => f.venueId === venueId || f.id === venueId),
    [favorites]
  );

  const toggleFavorite = useCallback(
    async (venue) => {
      if (!uid) return false;
      const favRef = doc(db, "users", uid, "favorites", venue.id);
      if (isFavorite(venue.id)) {
        await deleteDoc(favRef);
        return false;
      }
      // Derive min price from packages (venues have no flat .price field)
      const minPrice = venue.packages?.length > 0
        ? Math.min(...venue.packages.map((p) => Number(p.pricePerPerson)))
        : null;

      await setDoc(favRef, {
        venueId:       venue.id,
        venueName:     venue.name,
        venueImage:    venue.images?.[0] || venue.image || "",
        venuePrice:    minPrice,          // null is safe; undefined is not
        venueLocation: venue.location || null,
        addedAt:       Timestamp.now(),
      });
      return true;
    },
    [uid, isFavorite]
  );

  return (
    <FavoritesContext.Provider value={{ favorites, isFavorite, toggleFavorite, loading }}>
      {children}
    </FavoritesContext.Provider>
  );
};

export const useFavorites = () => useContext(FavoritesContext);
export default FavoritesContext;
