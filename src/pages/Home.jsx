import { useEffect, useRef, useState } from "react";
import { db } from "../services/firebase";
import { collection, onSnapshot } from "firebase/firestore";
import { Loader2, SearchX, Building2, TrendingUp } from "lucide-react";
import Hero from "../components/Hero";
import Categories from "../components/Categories";
import VenueCard from "../components/VenueCard";
import SmartFilters from "../components/SmartFilters";
import Footer from "../components/Footer";

const Home = () => {
  const [venues, setVenues] = useState([]);
  const [filteredVenues, setFilteredVenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("");
  const venuesRef = useRef(null);

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

  const handleCategorySelect = (cat) => {
    setSelectedCategory(cat);
    if (cat && venuesRef.current) {
      setTimeout(() => {
        venuesRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 50);
    }
  };

  return (
    <div className="bg-gray-50 dark:bg-gray-950 min-h-screen">
      <Hero />
      <Categories onSelect={handleCategorySelect} selected={selectedCategory} />

      <section id="venues-section" ref={venuesRef} className="py-12 sm:py-20 px-4">
        <div className="max-w-7xl mx-auto">

          {/* Header row: title left, stats right */}
          <div className="flex flex-wrap items-start justify-between gap-6 mb-8 sm:mb-10">
            <div>
              <span className="inline-block bg-sky-50 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400 text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full mb-3">
                Available Now
              </span>
              <h2 className="text-2xl sm:text-3xl md:text-5xl font-extrabold text-gray-900 dark:text-white">
                Explore
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-500 to-indigo-600">
                  Venues
                </span>
              </h2>
              <p className="text-gray-500 dark:text-gray-400 mt-2 text-base sm:text-lg max-w-xl">
                Hand-picked, verified venues ready to make your event unforgettable.
              </p>
            </div>

            {/* Stat cards — hidden on mobile, visible from sm */}
            <div className="hidden sm:flex items-stretch gap-3 self-start mt-1">
              <div className="flex items-center gap-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl px-4 py-3 shadow-sm">
                <div className="w-10 h-10 bg-sky-50 dark:bg-sky-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-5 h-5 text-sky-500" />
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
                <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="w-5 h-5 text-emerald-500" />
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
            <SmartFilters
              venues={venues}
              onFilter={setFilteredVenues}
              externalEventType={selectedCategory}
              onClearExternal={() => setSelectedCategory("")}
            />

            <div className="flex-1 min-w-0">
              {loading && (
                <div className="flex flex-col items-center justify-center py-24 gap-4">
                  <Loader2 className="w-10 h-10 text-sky-500 animate-spin" />
                  <p className="text-gray-400 dark:text-gray-500 font-medium">Loading venues...</p>
                </div>
              )}

              {!loading && filteredVenues.length === 0 && (
                <div className="flex flex-col items-center justify-center py-24 gap-4">
                  <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                    <SearchX className="w-9 h-9 text-gray-400 dark:text-gray-500" />
                  </div>
                  <p className="text-gray-700 dark:text-gray-200 font-bold text-xl">
                    {venues.length === 0 ? "No venues yet" : "No venues match"}
                  </p>
                  <p className="text-gray-400 dark:text-gray-500 text-sm">
                    {venues.length === 0
                      ? "Venue owners haven't added any venues yet."
                      : "Try adjusting your filters."}
                  </p>
                </div>
              )}

              {!loading && filteredVenues.length > 0 && (
                <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-6">
                  {filteredVenues.map((v) => (
                    <VenueCard key={v.id} venue={v} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Home;
