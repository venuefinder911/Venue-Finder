import { useNavigate } from "react-router-dom";
import useFavorites from "../../hooks/useFavorites";
import VenueCard from "../../components/VenueCard";
import { Heart, Loader2, ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { db } from "../../services/firebase";
import { doc, getDoc } from "firebase/firestore";

const Favorites = () => {
  const navigate = useNavigate();
  
  const { favorites, loading } = useFavorites();
  const [venues, setVenues] = useState([]);
  const [venuesLoading, setVenuesLoading] = useState(true);

  // Fetch full venue data for each favorite
  useEffect(() => {
    if (loading) return;
    if (favorites.length === 0) {
      setVenues([]);
      setVenuesLoading(false);
      return;
    }

    const fetchVenues = async () => {
      try {
        const results = await Promise.all(
          favorites.map(async (fav) => {
            const venueId = fav.venueId || fav.id;
            const snap = await getDoc(doc(db, "venues", venueId));
            if (snap.exists()) {
              return { id: snap.id, ...snap.data() };
            }
            return null;
          })
        );
        setVenues(results.filter(Boolean));
      } catch (err) {
        console.error(err);
      }
      setVenuesLoading(false);
    };
    fetchVenues();
  }, [favorites, loading]);

  const isLoading = loading || venuesLoading;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 px-4 py-6 sm:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-10">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition mb-4"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white flex items-center gap-3">
            <Heart className="w-8 h-8 text-red-500 fill-red-500" />
            My <span className="text-sky-500">Favorites</span>
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2">
            Venues you've saved for later
          </p>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-sky-500 animate-spin" />
          </div>
        )}

        {/* Empty */}
        {!isLoading && venues.length === 0 && (
          <div className="text-center py-20 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800">
            <Heart className="w-14 h-14 text-gray-200 dark:text-gray-700 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400 font-semibold text-lg">
              No favorites yet
            </p>
            <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">
              Start exploring venues and tap the heart icon to save them!
            </p>
            <button
              onClick={() => navigate("/dashboard/customer")}
              className="mt-5 bg-sky-500 hover:bg-sky-600 text-white font-bold px-6 py-2.5 rounded-xl transition"
            >
              Explore Venues
            </button>
          </div>
        )}

        {/* Grid */}
        {!isLoading && venues.length > 0 && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {venues.map((v) => (
              <VenueCard key={v.id} venue={v} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Favorites;
