import { useState } from "react";
import { Plus, X, CheckCircle2, Trash2, Users, DoorOpen } from "lucide-react";

const HALL_AMENITIES = [
  "AC", "Parking", "Stage", "Decoration", "Catering",
  "Sound System", "Projector", "WiFi", "Garden",
];

const FLOOR_OPTIONS = [
  "Ground Floor", "First Floor", "Second Floor",
  "Basement", "Rooftop", "Mezzanine",
];

const EMPTY = { name: "", capacity: "", floor: "", description: "", amenities: [] };

// ── HallBuilder ───────────────────────────────────────────────────────────────
const HallBuilder = ({ halls = [], onChange }) => {
  const [showForm, setShowForm] = useState(false);
  const [hall,     setHall]     = useState(EMPTY);
  const [errors,   setErrors]   = useState({});

  // ── Helpers ───────────────────────────────────────────────────────────────
  const toggleAmenity = (a) =>
    setHall((prev) => ({
      ...prev,
      amenities: prev.amenities.includes(a)
        ? prev.amenities.filter((x) => x !== a)
        : [...prev.amenities, a],
    }));

  const clearErr = (field) =>
    setErrors((prev) => { const n = { ...prev }; delete n[field]; return n; });

  // ── Save / cancel / remove ─────────────────────────────────────────────────
  const save = () => {
    const errs = {};
    if (!hall.name.trim())                      errs.name     = "Hall name is required.";
    else if (hall.name.trim().length < 2)       errs.name     = "Name must be at least 2 characters.";
    if (!hall.capacity)                         errs.capacity = "Capacity is required.";
    else if (Number(hall.capacity) < 10)        errs.capacity = "Capacity must be at least 10.";
    else if (Number(hall.capacity) > 100000)    errs.capacity = "Capacity cannot exceed 100,000.";
    if (Object.keys(errs).length) { setErrors(errs); return; }

    onChange([
      ...halls,
      {
        ...hall,
        id:          `hall_${Date.now()}`,
        name:        hall.name.trim(),
        capacity:    Number(hall.capacity),
        description: hall.description.trim(),
        floor:       hall.floor,
      },
    ]);
    setHall(EMPTY);
    setErrors({});
    setShowForm(false);
  };

  const cancel = () => { setHall(EMPTY); setErrors({}); setShowForm(false); };
  const remove = (id) => onChange(halls.filter((h) => h.id !== id));

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-3">

      {/* Info note */}
      <p className="text-xs text-gray-400 dark:text-gray-500 -mt-1">
        If your venue has separate halls or spaces that can be booked independently, add them here.
        Customers will choose a hall when making a booking, and availability will be tracked per hall.
      </p>

      {/* Empty state */}
      {halls.length === 0 && !showForm && (
        <div className="flex flex-col items-center justify-center py-8 bg-gray-50 dark:bg-gray-800/40 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
          <DoorOpen className="w-8 h-8 text-gray-300 dark:text-gray-600 mb-2" />
          <p className="text-sm text-gray-400 dark:text-gray-500 font-medium">No halls added</p>
          <p className="text-xs text-gray-300 dark:text-gray-600 mt-0.5">
            Leave empty if your venue is one open space
          </p>
        </div>
      )}

      {/* Hall cards */}
      {halls.map((h) => (
        <div
          key={h.id}
          className="flex items-start gap-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 shadow-sm"
        >
          <div className="w-9 h-9 rounded-xl bg-sky-50 dark:bg-sky-900/30 text-sky-500 flex items-center justify-center flex-shrink-0">
            <DoorOpen className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-0.5">
              <span className="font-bold text-gray-900 dark:text-white text-sm">{h.name}</span>
              {h.floor && (
                <span className="text-[10px] bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded-full font-medium">
                  {h.floor}
                </span>
              )}
            </div>
            <p className="text-xs text-sky-600 dark:text-sky-400 font-semibold flex items-center gap-1">
              <Users className="w-3 h-3" /> {Number(h.capacity).toLocaleString()} guests
            </p>
            {h.description && (
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 line-clamp-2">{h.description}</p>
            )}
            {h.amenities?.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {h.amenities.map((a) => (
                  <span
                    key={a}
                    className="text-[10px] bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 px-1.5 py-0.5 rounded-full font-medium flex items-center gap-0.5"
                  >
                    <CheckCircle2 className="w-2.5 h-2.5" /> {a}
                  </span>
                ))}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => remove(h.id)}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition flex-shrink-0"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ))}

      {/* ── Add form ── */}
      {showForm ? (
        <div className="border-2 border-sky-200 dark:border-sky-800 rounded-2xl p-5 space-y-4 bg-sky-50/30 dark:bg-sky-900/10">
          <h4 className="font-extrabold text-gray-800 dark:text-white text-sm flex items-center gap-2">
            <DoorOpen className="w-4 h-4 text-sky-500" /> Add Hall / Space
          </h4>

          {/* Name + Floor */}
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                Hall Name <span className="text-red-400">*</span>
              </label>
              <input
                value={hall.name}
                onChange={(e) => { setHall((p) => ({ ...p, name: e.target.value })); clearErr("name"); }}
                placeholder="e.g. Crystal Hall, Garden Pavilion"
                maxLength={80}
                className={`w-full px-3 py-2.5 rounded-xl border ${errors.name ? "border-red-400 focus:ring-red-400" : "border-gray-200 dark:border-gray-700 focus:ring-sky-400"} bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:border-transparent transition`}
              />
              {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                Floor / Level
              </label>
              <select
                value={hall.floor}
                onChange={(e) => setHall((p) => ({ ...p, floor: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-400 transition"
              >
                <option value="">Not specified</option>
                {FLOOR_OPTIONS.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
          </div>

          {/* Capacity */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
              Capacity (guests) <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text" inputMode="numeric"
                value={hall.capacity}
                onChange={(e) => { setHall((p) => ({ ...p, capacity: e.target.value.replace(/\D/g, "") })); clearErr("capacity"); }}
                placeholder="e.g. 300"
                maxLength={6}
                className={`w-full pl-10 pr-3 py-2.5 rounded-xl border ${errors.capacity ? "border-red-400 focus:ring-red-400" : "border-gray-200 dark:border-gray-700 focus:ring-sky-400"} bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:border-transparent transition`}
              />
            </div>
            {errors.capacity && <p className="text-xs text-red-500 mt-1">{errors.capacity}</p>}
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
              Description <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={hall.description}
              onChange={(e) => setHall((p) => ({ ...p, description: e.target.value }))}
              placeholder="Describe this hall — ambiance, size, special features…"
              rows={2} maxLength={300}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-400 resize-none transition"
            />
          </div>

          {/* Amenities */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">
              Amenities in this Hall
            </label>
            <div className="flex flex-wrap gap-2">
              {HALL_AMENITIES.map((a) => {
                const selected = hall.amenities.includes(a);
                return (
                  <button
                    key={a} type="button" onClick={() => toggleAmenity(a)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-all duration-200 ${
                      selected
                        ? "bg-sky-500 border-sky-500 text-white"
                        : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-sky-300 dark:hover:border-sky-600"
                    }`}
                  >
                    {selected && <CheckCircle2 className="w-3 h-3" />}
                    {a}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button
              type="button" onClick={save}
              className="flex-1 py-2.5 bg-sky-500 hover:bg-sky-600 text-white font-bold rounded-xl text-sm transition"
            >
              Add Hall
            </button>
            <button
              type="button" onClick={cancel}
              className="px-4 py-2.5 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 font-semibold rounded-xl text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button" onClick={() => setShowForm(true)}
          className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-2xl text-sm font-semibold text-gray-500 dark:text-gray-400 hover:border-sky-400 hover:text-sky-500 dark:hover:text-sky-400 transition"
        >
          <Plus className="w-4 h-4" /> Add Hall / Space
        </button>
      )}
    </div>
  );
};

export default HallBuilder;
