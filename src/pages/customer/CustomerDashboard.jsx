import { useEffect, useState } from "react";
import { db } from "../../services/firebase";
import { collection, onSnapshot } from "firebase/firestore";
import VenueCard from "../../components/VenueCard";
import SmartFilters from "../../components/SmartFilters";
import { TrendingUp, Building2, Loader2, SearchX } from "lucide-react";

const CustomerDashboard = () => {
  const [venues, setVenues] = useState([]);
  const [filteredVenues, setFilteredVenues] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "venues"), (snapshot) => {
      const data = snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((v) => v.status === "approved");
      setVenues(data);
      setFilteredVenues(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-4 sm:p-6">

      {/* Header row: title left, stats right */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6 sm:mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
            Explore <span className="text-sky-500">Venues</span>
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm sm:text-base">
            Find and book your perfect event location
          </p>
        </div>

        {/* Compact stat cards — hidden on mobile, visible from sm */}
        <div className="hidden sm:flex items-stretch gap-3 self-start">
          <div className="flex items-center gap-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl px-4 py-3 shadow-sm">
            <div className="w-9 h-9 bg-sky-50 dark:bg-sky-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
              <Building2 className="w-4 h-4 text-sky-500" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider leading-none mb-1">
                Total Venues
              </p>
              <p className="text-2xl font-extrabold text-gray-900 dark:text-white leading-none">
                {venues.length}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl px-4 py-3 shadow-sm">
            <div className="w-9 h-9 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider leading-none mb-1">
                Showing
              </p>
              <p className="text-2xl font-extrabold text-gray-900 dark:text-white leading-none">
                {filteredVenues.length}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-6 xl:gap-8 items-stretch">
        <SmartFilters venues={venues} onFilter={setFilteredVenues} />

        <div className="flex-1 min-w-0">
          {loading && (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-sky-500 animate-spin" />
            </div>
          )}

          {!loading && filteredVenues.length === 0 && (
            <div className="text-center py-20 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800">
              <SearchX className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400 text-lg font-medium">
                {venues.length === 0 ? "No venues available" : "No venues match your filters"}
              </p>
              <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">
                {venues.length === 0 ? "Owners have not added any venues" : "Try adjusting your search criteria"}
              </p>
            </div>
          )}

          {!loading && filteredVenues.length > 0 && (
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredVenues.map((v) => <VenueCard key={v.id} venue={v} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomerDashboard;
