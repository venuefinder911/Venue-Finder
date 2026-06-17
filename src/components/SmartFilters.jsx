import { useState, useEffect, useMemo } from "react";
import {
  Search, MapPin, DollarSign, Users, Tag, X,
  SlidersHorizontal, ChevronDown, Sparkles,
} from "lucide-react";

const EVENT_TYPES    = ["Wedding", "Birthday", "Corporate", "Engagement", "Conference", "Party"];
const AMENITIES_LIST = ["AC", "Parking", "Stage", "Decoration", "Catering", "Sound System", "Projector", "WiFi", "Garden", "Swimming Pool"];

const SEL = "w-full appearance-none px-3 py-2 pr-8 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 transition";
const INP = "w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 transition";

// ── Module-level sub-components (avoids "create component during render" ──────

const Row = ({ icon: Icon, label, children }) => (
  <div className="space-y-1.5">
    <label className="flex items-center gap-1.5 text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
      <Icon className="w-3 h-3" /> {label}
    </label>
    {children}
  </div>
);

const SelectWrap = ({ children }) => (
  <div className="relative">
    {children}
    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
  </div>
);

const FilterPanel = ({
  activeCount, hasActive, onClear,
  searchText, onSearchText,
  city, onCity, cities,
  eventType, onEventType, onClearExternal,
  amenity, onAmenity,
  minPrice, onMinPrice, maxPrice, onMaxPrice,
  minCapacity, onMinCapacity,
  filteredCount, venueCount,
  onDone,
}) => (
  <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
    {/* Header */}
    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
      <div className="flex items-center gap-2">
        <SlidersHorizontal className="w-3.5 h-3.5 text-sky-500" />
        <span className="font-extrabold text-gray-800 dark:text-white text-sm">Filter Results</span>
        {activeCount > 0 && (
          <span className="bg-sky-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
            {activeCount}
          </span>
        )}
      </div>
      {hasActive && (
        <button onClick={onClear}
          className="text-xs font-semibold text-red-500 hover:text-red-600 flex items-center gap-1 transition">
          <X className="w-3 h-3" /> Clear
        </button>
      )}
    </div>

    <div className="p-4 space-y-4">

      {/* Search */}
      <Row icon={Search} label="Search">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            type="text" value={searchText} onChange={(e) => onSearchText(e.target.value)}
            placeholder="Venue name or location…"
            className={`${INP} pl-9`}
          />
          {searchText && (
            <button onClick={() => onSearchText("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </Row>

      {/* City */}
      <Row icon={MapPin} label="City">
        <SelectWrap>
          <select value={city} onChange={(e) => onCity(e.target.value)} className={SEL}>
            <option value="">All Cities</option>
            {cities.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </SelectWrap>
      </Row>

      {/* Event Type */}
      <Row icon={Tag} label="Event Type">
        <SelectWrap>
          <select value={eventType}
            onChange={(e) => {
              onEventType(e.target.value);
              if (!e.target.value && onClearExternal) onClearExternal();
            }}
            className={SEL}>
            <option value="">All Event Types</option>
            {EVENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </SelectWrap>
      </Row>

      {/* Amenity */}
      <Row icon={Sparkles} label="Amenity">
        <SelectWrap>
          <select value={amenity} onChange={(e) => onAmenity(e.target.value)} className={SEL}>
            <option value="">All Amenities</option>
            {AMENITIES_LIST.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </SelectWrap>
      </Row>

      {/* Price / Person */}
      <Row icon={DollarSign} label="Price / Person (PKR)">
        <div className="flex gap-2">
          <input type="number" value={minPrice} onChange={(e) => onMinPrice(e.target.value)}
            placeholder="Min" min={0} className={INP} />
          <input type="number" value={maxPrice} onChange={(e) => onMaxPrice(e.target.value)}
            placeholder="Max" min={0} className={INP} />
        </div>
      </Row>

      {/* Min Capacity */}
      <Row icon={Users} label="Min Capacity">
        <input type="number" value={minCapacity} onChange={(e) => onMinCapacity(e.target.value)}
          placeholder="e.g. 200" min={1} className={INP} />
      </Row>

      {/* Result count */}
      <div className="pt-3 border-t border-gray-100 dark:border-gray-800 text-center">
        <p className="text-xs text-gray-400 dark:text-gray-500">
          <span className="font-bold text-gray-700 dark:text-gray-200">{filteredCount}</span>
          {" "}of {venueCount} venues
        </p>
      </div>

      {/* Mobile done button */}
      {onDone && (
        <button onClick={onDone}
          className="w-full bg-sky-500 hover:bg-sky-600 text-white font-bold py-2.5 rounded-xl text-sm transition">
          Show {filteredCount} {filteredCount === 1 ? "Venue" : "Venues"}
        </button>
      )}
    </div>
  </div>
);

// ── Main component ─────────────────────────────────────────────────────────────

const SmartFilters = ({ venues = [], onFilter, externalEventType = "", onClearExternal }) => {
  const [showMobile,  setShowMobile]  = useState(false);
  const [searchText,  setSearchText]  = useState("");
  const [city,        setCity]        = useState("");
  const [eventType,   setEventType]   = useState("");
  const [amenity,     setAmenity]     = useState("");
  const [minPrice,    setMinPrice]    = useState("");
  const [maxPrice,    setMaxPrice]    = useState("");
  const [minCapacity, setMinCapacity] = useState("");

  // Sync external category (from Home page hero click)
  useEffect(() => {
    setEventType(externalEventType || "");
  }, [externalEventType]);

  const cities = useMemo(() => {
    const set = new Set();
    venues.forEach((v) => { if (v.city) set.add(v.city.trim()); });
    return Array.from(set).sort();
  }, [venues]);

  const lowestPkg = (v) =>
    v.packages?.length > 0 ? Math.min(...v.packages.map((p) => Number(p.pricePerPerson))) : null;

  const applyFilters = (list) => {
    let r = [...list];
    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      r = r.filter((v) =>
        v.name?.toLowerCase().includes(q) ||
        v.location?.toLowerCase().includes(q) ||
        v.city?.toLowerCase().includes(q)
      );
    }
    if (city)        r = r.filter((v) => v.city?.toLowerCase() === city.toLowerCase());
    if (eventType)   r = r.filter((v) => v.categories?.includes(eventType));
    if (amenity)     r = r.filter((v) => v.amenities?.includes(amenity));
    if (minPrice)    r = r.filter((v) => { const lp = lowestPkg(v); return lp !== null && lp >= Number(minPrice); });
    if (maxPrice)    r = r.filter((v) => { const lp = lowestPkg(v); return lp !== null && lp <= Number(maxPrice); });
    if (minCapacity) r = r.filter((v) => Number(v.capacity) >= Number(minCapacity));
    return r;
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { onFilter(applyFilters(venues)); }, [venues, searchText, city, eventType, amenity, minPrice, maxPrice, minCapacity]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const filteredCount = useMemo(() => applyFilters(venues).length, [venues, searchText, city, eventType, amenity, minPrice, maxPrice, minCapacity]);

  const hasActive = searchText || city || eventType || amenity || minPrice || maxPrice || minCapacity;
  const activeCount = [searchText, city, eventType, amenity, minPrice || maxPrice, minCapacity].filter(Boolean).length;

  const clearAll = () => {
    setSearchText(""); setCity(""); setEventType(""); setAmenity("");
    setMinPrice(""); setMaxPrice(""); setMinCapacity("");
    if (onClearExternal) onClearExternal();
  };

  const panelProps = {
    activeCount, hasActive, onClear: clearAll,
    searchText, onSearchText: setSearchText,
    city, onCity: setCity, cities,
    eventType, onEventType: setEventType, onClearExternal,
    amenity, onAmenity: setAmenity,
    minPrice, onMinPrice: setMinPrice, maxPrice, onMaxPrice: setMaxPrice,
    minCapacity, onMinCapacity: setMinCapacity,
    filteredCount, venueCount: venues.length,
  };

  return (
    <div className="lg:w-56 xl:w-64 lg:flex-shrink-0">
      {/* Mobile trigger */}
      <div className="lg:hidden mb-4">
        <button
          onClick={() => setShowMobile(true)}
          className="w-full flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-semibold text-gray-700 dark:text-gray-200 shadow-sm hover:border-sky-400 transition"
        >
          <SlidersHorizontal className="w-4 h-4 text-sky-500" />
          Filters
          {activeCount > 0 && (
            <span className="bg-sky-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
              {activeCount}
            </span>
          )}
          <span className="ml-auto text-gray-400 text-xs">{filteredCount} results</span>
        </button>
      </div>

      {/* Mobile overlay drawer */}
      {showMobile && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowMobile(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-72 max-w-[90vw] overflow-y-auto shadow-2xl">
            <FilterPanel {...panelProps} onDone={() => setShowMobile(false)} />
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <div className="hidden lg:block lg:sticky lg:top-20">
        <FilterPanel {...panelProps} />
      </div>
    </div>
  );
};

export default SmartFilters;
