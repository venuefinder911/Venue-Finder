import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { MapPin, Users, Star, ChevronLeft, ChevronRight, Heart } from "lucide-react";
import useFavorites from "../hooks/useFavorites";
import { toast } from "react-toastify";

const FALLBACK = "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=600&q=80";

const VenueCard = ({ venue }) => {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const { isFavorite, toggleFavorite } = useFavorites();

  const images = venue?.images?.length > 0 ? venue.images : [FALLBACK];
  const [current, setCurrent] = useState(0);

  const next = useCallback(() => setCurrent((c) => (c + 1) % images.length), [images.length]);

  useEffect(() => {
    if (images.length <= 1) return;
    const id = setInterval(next, 3000);
    return () => clearInterval(id);
  }, [next, images.length]);

  const prev = (e) => { e.stopPropagation(); setCurrent((c) => (c - 1 + images.length) % images.length); };
  const goNext = (e) => { e.stopPropagation(); next(); };

  const handleFavorite = async (e) => {
    e.stopPropagation(); e.preventDefault();
    if (!user) { toast.info("Please login to save favorites."); return; }
    try {
      const added = await toggleFavorite(venue);
      toast(added ? "Added to favorites ❤️" : "Removed from favorites", { type: added ? "success" : "info" });
    } catch (err) { console.error(err); }
  };

  if (!venue) return null;
  const fav = user ? isFavorite(venue.id) : false;
  const avgRating = venue.avgRating || 0;
  const totalReviews = venue.totalReviews || 0;

  return (
    <div
      onClick={() => navigate(`/venue/${venue.id}`)}
      className="group bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm hover:shadow-2xl dark:hover:shadow-black/40 hover:-translate-y-1 transition-all duration-300 cursor-pointer"
    >
      {/* IMAGE SLIDER */}
      <div className="relative aspect-[16/9] overflow-hidden bg-gray-900">
        {images.map((src, i) => (
          <div key={i} className={`absolute inset-0 transition-opacity duration-500 ${i === current ? "opacity-100" : "opacity-0"}`}>
            <img src={src} alt="" aria-hidden="true"
              className="absolute inset-0 w-full h-full object-cover scale-110 blur-xl opacity-60 pointer-events-none" />
            <img src={src} alt={`${venue.name} ${i + 1}`}
              className="absolute inset-0 w-full h-full object-contain" />
          </div>
        ))}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        {images.length > 1 && (
          <>
            <button onClick={prev}
              className="carousel-arrow absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/40 hover:bg-black/70 text-white rounded-full flex items-center justify-center transition opacity-0 group-hover:opacity-100">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={goNext}
              className="carousel-arrow absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/40 hover:bg-black/70 text-white rounded-full flex items-center justify-center transition opacity-0 group-hover:opacity-100">
              <ChevronRight className="w-4 h-4" />
            </button>
            <div className="absolute bottom-10 left-0 right-0 flex justify-center gap-1">
              {images.map((_, i) => (
                <button key={i} onClick={(e) => { e.stopPropagation(); setCurrent(i); }}
                  className={`rounded-full transition-all duration-300 ${i === current ? "w-4 h-1.5 bg-white" : "w-1.5 h-1.5 bg-white/50"}`} />
              ))}
            </div>
          </>
        )}

        {/* Favorite button */}
        <button onClick={handleFavorite}
          className="absolute top-3 left-3 w-9 h-9 bg-white/90 dark:bg-gray-900/80 backdrop-blur-sm rounded-full flex items-center justify-center transition hover:scale-110 active:scale-95 z-10">
          <Heart className={`w-4 h-4 transition-colors ${fav ? "fill-red-500 text-red-500" : "text-gray-500 dark:text-gray-400"}`} />
        </button>

        {/* Price badge */}
        <div className="absolute bottom-3 left-4">
          <div className="bg-white/90 dark:bg-gray-900/80 backdrop-blur-sm rounded-xl px-3 py-1.5">
            {(() => {
              const pkgs = venue.packages;
              const minPrice = pkgs?.length > 0
                ? Math.min(...pkgs.map((p) => Number(p.pricePerPerson)))
                : null;
              return minPrice !== null ? (
                <>
                  <p className="text-xs text-gray-500 dark:text-gray-400 leading-none">Starting from</p>
                  <p className="text-base font-extrabold text-sky-600 leading-tight">
                    PKR {minPrice.toLocaleString()} <span className="text-xs font-semibold">/ person</span>
                  </p>
                </>
              ) : (
                <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 leading-tight">
                  Contact for pricing
                </p>
              );
            })()}
          </div>
        </div>

        {/* Rating badge */}
        <div className="absolute top-3 right-3">
          <div className="flex items-center gap-1 bg-white/90 dark:bg-gray-900/80 backdrop-blur-sm rounded-full px-2.5 py-1 text-xs font-bold text-amber-500">
            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
            {avgRating > 0 ? avgRating.toFixed(1) : "New"}
            {totalReviews > 0 && <span className="text-gray-400 font-medium">({totalReviews})</span>}
          </div>
        </div>

        {images.length > 1 && (
          <div className="absolute top-12 right-3 bg-black/50 text-white text-xs font-semibold px-2 py-0.5 rounded-full">
            {current + 1}/{images.length}
          </div>
        )}
      </div>

      {/* CONTENT */}
      <div className="p-4 sm:p-5">
        <h3 className="text-base sm:text-lg font-extrabold text-gray-900 dark:text-white group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors truncate">
          {venue.name || "Venue Name"}
        </h3>
        {venue.categories?.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {venue.categories.slice(0, 3).map((cat) => (
              <span key={cat} className="text-xs bg-sky-50 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400 font-semibold px-2 py-0.5 rounded-full">{cat}</span>
            ))}
          </div>
        )}
        <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 text-sm mt-2">
          <MapPin className="w-3.5 h-3.5 text-sky-400 flex-shrink-0" />
          <span className="truncate">{venue.location || "Unknown Location"}</span>
        </div>
        <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 text-sm mt-1.5">
          <Users className="w-3.5 h-3.5 text-sky-400 flex-shrink-0" />
          <span>Up to <span className="font-semibold text-gray-700 dark:text-gray-200">{venue.capacity || "N/A"}</span> guests</span>
        </div>
        <div className="mt-4 h-px bg-gray-100 dark:bg-gray-800" />
        <button
          onClick={(e) => { e.stopPropagation(); navigate(`/venue/${venue.id}`); }}
          className="mt-4 w-full bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 active:from-sky-700 active:to-indigo-800 text-white font-bold py-2.5 rounded-xl transition-all duration-200 shadow-md shadow-sky-200/50 dark:shadow-sky-900/30 text-sm"
        >
          View & Book
        </button>
      </div>
    </div>
  );
};

export default VenueCard;
