// Re-export from the shared FavoritesContext so the whole app
// shares one Firestore listener and waits for Firebase Auth to be ready.
export { useFavorites as default } from "../context/FavoritesContext";
