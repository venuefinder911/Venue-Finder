import { Heart, PartyPopper, Cake, Building2, Briefcase, Music } from "lucide-react";

const categories = [
  { name: "Wedding",    icon: Heart,       color: "bg-pink-50 dark:bg-pink-900/20 text-pink-500",       ring: "group-hover:ring-pink-300 dark:group-hover:ring-pink-700",       activeRing: "ring-pink-400 dark:ring-pink-500" },
  { name: "Engagement", icon: PartyPopper, color: "bg-amber-50 dark:bg-amber-900/20 text-amber-500",     ring: "group-hover:ring-amber-300 dark:group-hover:ring-amber-700",     activeRing: "ring-amber-400 dark:ring-amber-500" },
  { name: "Birthday",   icon: Cake,        color: "bg-purple-50 dark:bg-purple-900/20 text-purple-500",  ring: "group-hover:ring-purple-300 dark:group-hover:ring-purple-700",  activeRing: "ring-purple-400 dark:ring-purple-500" },
  { name: "Corporate",  icon: Building2,   color: "bg-blue-50 dark:bg-blue-900/20 text-blue-500",        ring: "group-hover:ring-blue-300 dark:group-hover:ring-blue-700",        activeRing: "ring-blue-400 dark:ring-blue-500" },
  { name: "Conference", icon: Briefcase,   color: "bg-green-50 dark:bg-green-900/20 text-green-500",     ring: "group-hover:ring-green-300 dark:group-hover:ring-green-700",     activeRing: "ring-green-400 dark:ring-green-500" },
  { name: "Party",      icon: Music,       color: "bg-rose-50 dark:bg-rose-900/20 text-rose-500",        ring: "group-hover:ring-rose-300 dark:group-hover:ring-rose-700",        activeRing: "ring-rose-400 dark:ring-rose-500" },
];

const Categories = ({ onSelect, selected }) => (
  <section className="py-12 sm:py-20 bg-white dark:bg-gray-900">
    <div className="max-w-6xl mx-auto px-4">
      <div className="text-center mb-8 sm:mb-12">
        <span className="inline-block bg-sky-50 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400 text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full mb-4">
          Event Types
        </span>
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-white">
          Browse by{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-500 to-indigo-600">
            Event Type
          </span>
        </h2>
        <p className="text-gray-500 dark:text-gray-400 mt-3 max-w-lg mx-auto text-sm sm:text-base">
          Whatever the occasion, we have the perfect venue waiting for you.
        </p>
      </div>

      {/* Grid: 3-col on mobile → 3-col on md → 6-col on lg */}
      <div className="grid grid-cols-3 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {categories.map((cat) => {
          const isActive = selected === cat.name;
          return (
            <button
              key={cat.name}
              onClick={() => onSelect && onSelect(isActive ? "" : cat.name)}
              className={`group p-3 sm:p-5 rounded-2xl border-2 text-center transition-all duration-300 hover:-translate-y-1 w-full active:scale-95
                ${isActive
                  ? "border-sky-500 bg-sky-50 dark:bg-sky-900/20 shadow-xl shadow-sky-500/10"
                  : "border-transparent bg-gray-50 dark:bg-gray-800 hover:bg-white dark:hover:bg-gray-700 hover:border-gray-100 dark:hover:border-gray-600 hover:shadow-xl"
                }`}
            >
              <div className={`w-10 h-10 sm:w-14 sm:h-14 mx-auto rounded-xl sm:rounded-2xl flex items-center justify-center mb-2 sm:mb-3 ring-4 transition-all duration-300 ${cat.color} ${isActive ? cat.activeRing : `ring-transparent ${cat.ring}`}`}>
                <cat.icon className="w-4 h-4 sm:w-6 sm:h-6" />
              </div>
              <p className={`font-bold text-xs sm:text-sm transition-colors leading-tight ${isActive ? "text-sky-600 dark:text-sky-400" : "text-gray-700 dark:text-gray-200 group-hover:text-sky-600 dark:group-hover:text-sky-400"}`}>
                {cat.name}
              </p>
              {isActive && (
                <p className="text-[10px] sm:text-xs text-sky-500 font-semibold mt-0.5">✓ Active</p>
              )}
            </button>
          );
        })}
      </div>

      {selected && (
        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-5 sm:mt-6">
          Showing venues for <span className="font-bold text-sky-600 dark:text-sky-400">{selected}</span> —{" "}
          <button
            onClick={() => onSelect && onSelect("")}
            className="font-semibold text-sky-600 dark:text-sky-400 underline hover:text-sky-700 dark:hover:text-sky-300 transition">
            Clear filter
          </button>
        </p>
      )}
    </div>
  </section>
);

export default Categories;
