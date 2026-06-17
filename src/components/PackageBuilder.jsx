import { useState, useRef } from "react";
import { uploadToCloudinary } from "../services/cloudinary";
import { Plus, X, CheckCircle2, Loader2, ImagePlus, Trash2, Package } from "lucide-react";
import { toast } from "react-toastify";

// ── Tier definitions ──────────────────────────────────────────────────────────
export const TIERS = [
  { id: "basic",    label: "Basic",    badge: "bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200",        ring: "border-gray-300 dark:border-gray-600" },
  { id: "silver",   label: "Silver",   badge: "bg-slate-300 text-slate-800",                                           ring: "border-slate-400" },
  { id: "standard", label: "Standard", badge: "bg-blue-500 text-white",                                                ring: "border-blue-400" },
  { id: "gold",     label: "Gold",     badge: "bg-amber-400 text-amber-900",                                           ring: "border-amber-400" },
  { id: "premium",  label: "Premium",  badge: "bg-indigo-500 text-white",                                              ring: "border-indigo-400" },
  { id: "platinum", label: "Platinum", badge: "bg-purple-600 text-white",                                              ring: "border-purple-500" },
];

export const TIER_MAP = Object.fromEntries(TIERS.map(t => [t.id, t]));

const EMPTY = {
  name: "", tier: "silver", description: "",
  pricePerPerson: "", features: [], isPopular: false, imageUrl: "",
};

// ── PackageBuilder ────────────────────────────────────────────────────────────
const PackageBuilder = ({ packages = [], onChange }) => {
  const [showForm,      setShowForm]      = useState(false);
  const [pkg,           setPkg]           = useState(EMPTY);
  const [featureInput,  setFeatureInput]  = useState("");
  const [uploading,     setUploading]     = useState(false);
  const fileRef = useRef();

  // ── Image upload ──────────────────────────────────────────────────────────
  const handleImage = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadToCloudinary(file, "packages");
      setPkg(p => ({ ...p, imageUrl: url }));
    } catch (err) {
      toast.error(err.message || "Image upload failed. Please try again.");
    }
    setUploading(false);
    e.target.value = "";
  };

  // ── Feature helpers ───────────────────────────────────────────────────────
  const addFeature = () => {
    const val = featureInput.trim();
    if (!val) return;
    if (pkg.features.length >= 12) { toast.error("Max 12 items per package."); return; }
    setPkg(p => ({ ...p, features: [...p.features, val] }));
    setFeatureInput("");
  };
  const removeFeature = (i) => setPkg(p => ({ ...p, features: p.features.filter((_, idx) => idx !== i) }));

  // ── Save / cancel ─────────────────────────────────────────────────────────
  const save = () => {
    if (!pkg.name.trim())                { toast.error("Package name is required.");         return; }
    if (!pkg.pricePerPerson || Number(pkg.pricePerPerson) < 1) {
      toast.error("Price per person is required."); return;
    }
    onChange([...packages, { ...pkg, id: Date.now().toString(), pricePerPerson: Number(pkg.pricePerPerson) }]);
    setPkg(EMPTY); setFeatureInput(""); setShowForm(false);
  };

  const cancel = () => { setPkg(EMPTY); setFeatureInput(""); setShowForm(false); };

  const remove = (id) => onChange(packages.filter(p => p.id !== id));

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-3">

      {/* Existing packages list */}
      {packages.length === 0 && !showForm && (
        <div className="flex flex-col items-center justify-center py-8 bg-gray-50 dark:bg-gray-800/40 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
          <Package className="w-8 h-8 text-gray-300 dark:text-gray-600 mb-2" />
          <p className="text-sm text-gray-400 dark:text-gray-500 font-medium">No packages yet</p>
          <p className="text-xs text-gray-300 dark:text-gray-600 mt-0.5">Add packages to attract more customers</p>
        </div>
      )}

      {packages.map((p) => {
        const tier = TIER_MAP[p.tier] || TIER_MAP.silver;
        return (
          <div key={p.id} className={`flex items-start gap-3 bg-white dark:bg-gray-800 rounded-xl border-l-4 ${tier.ring} border border-gray-100 dark:border-gray-700 p-4 shadow-sm`}>
            {p.imageUrl && (
              <img src={p.imageUrl} alt={p.name} className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-0.5">
                <span className={`text-[10px] font-extrabold uppercase tracking-wide px-2 py-0.5 rounded-full ${tier.badge}`}>
                  {tier.label}
                </span>
                <span className="font-bold text-gray-900 dark:text-white text-sm">{p.name}</span>
                {p.isPopular && (
                  <span className="text-[10px] bg-sky-500 text-white px-2 py-0.5 rounded-full font-bold uppercase tracking-wide">
                    Most Popular
                  </span>
                )}
              </div>
              <p className="text-xs text-sky-600 dark:text-sky-400 font-semibold">
                PKR {Number(p.pricePerPerson).toLocaleString()} / person
              </p>
              {p.features.length > 0 && (
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{p.features.length} item{p.features.length !== 1 ? "s" : ""} included</p>
              )}
            </div>
            <button type="button" onClick={() => remove(p.id)}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition flex-shrink-0">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        );
      })}

      {/* ── Add form ── */}
      {showForm ? (
        <div className="border-2 border-sky-200 dark:border-sky-800 rounded-2xl p-5 space-y-4 bg-sky-50/30 dark:bg-sky-900/10">
          <h4 className="font-extrabold text-gray-800 dark:text-white text-sm flex items-center gap-2">
            <Package className="w-4 h-4 text-sky-500" /> New Package
          </h4>

          {/* Name + Tier */}
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Package Name <span className="text-red-400">*</span></label>
              <input
                value={pkg.name}
                onChange={e => setPkg(p => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Gold Royal Feast"
                maxLength={80}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Sub-Category (Tier) <span className="text-red-400">*</span></label>
              <div className="grid grid-cols-3 gap-1.5">
                {TIERS.map(t => (
                  <button key={t.id} type="button" onClick={() => setPkg(p => ({ ...p, tier: t.id }))}
                    className={`py-1.5 rounded-lg text-xs font-bold border-2 transition-all ${
                      pkg.tier === t.id
                        ? "border-sky-500 bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300"
                        : "border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300"
                    }`}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Description</label>
            <textarea
              value={pkg.description}
              onChange={e => setPkg(p => ({ ...p, description: e.target.value }))}
              placeholder="Briefly describe what this package offers…"
              rows={2} maxLength={300}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-400 resize-none"
            />
          </div>

          {/* Price + Image */}
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Price Per Person (PKR) <span className="text-red-400">*</span></label>
              <input
                type="number" min={1} step={100}
                value={pkg.pricePerPerson}
                onChange={e => setPkg(p => ({ ...p, pricePerPerson: e.target.value }))}
                placeholder="e.g. 2500"
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Package Image (optional)</label>
              {pkg.imageUrl ? (
                <div className="relative h-11 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
                  <img src={pkg.imageUrl} alt="pkg" className="w-full h-full object-cover" />
                  <button type="button" onClick={() => setPkg(p => ({ ...p, imageUrl: "" }))}
                    className="absolute top-1 right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                    <X className="w-3 h-3 text-white" />
                  </button>
                </div>
              ) : (
                <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
                  className="w-full h-11 flex items-center justify-center gap-1.5 border border-dashed border-gray-300 dark:border-gray-600 rounded-xl text-xs text-gray-500 hover:border-sky-400 hover:text-sky-500 transition disabled:opacity-50">
                  {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImagePlus className="w-3.5 h-3.5" />}
                  {uploading ? "Uploading…" : "Upload Image"}
                </button>
              )}
              <input ref={fileRef} type="file" accept="image/*" onChange={handleImage} className="hidden" />
            </div>
          </div>

          {/* Features */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
              Included Items / Features ({pkg.features.length}/12)
            </label>
            <div className="flex gap-2 mb-2">
              <input
                value={featureInput}
                onChange={e => setFeatureInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addFeature(); } }}
                placeholder="e.g. 2 Main Courses (Mutton & Chicken)"
                className="flex-1 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-400"
              />
              <button type="button" onClick={addFeature}
                className="px-3 bg-sky-500 hover:bg-sky-600 text-white rounded-xl transition">
                <Plus className="w-4 h-4" />
              </button>
            </div>
            {pkg.features.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {pkg.features.map((f, i) => (
                  <span key={i} className="flex items-center gap-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1 text-xs text-gray-700 dark:text-gray-300">
                    <CheckCircle2 className="w-3 h-3 text-sky-500 flex-shrink-0" />
                    {f}
                    <button type="button" onClick={() => removeFeature(i)} className="ml-0.5 text-gray-400 hover:text-red-500 transition">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Popular toggle */}
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" checked={pkg.isPopular}
              onChange={e => setPkg(p => ({ ...p, isPopular: e.target.checked }))}
              className="w-4 h-4 rounded accent-sky-500" />
            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Mark as "Most Popular"</span>
          </label>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={save}
              className="flex-1 py-2.5 bg-sky-500 hover:bg-sky-600 text-white font-bold rounded-xl text-sm transition">
              Add Package
            </button>
            <button type="button" onClick={cancel}
              className="px-4 py-2.5 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 font-semibold rounded-xl text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setShowForm(true)}
          className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-2xl text-sm font-semibold text-gray-500 dark:text-gray-400 hover:border-sky-400 hover:text-sky-500 dark:hover:text-sky-400 transition">
          <Plus className="w-4 h-4" /> Add Package
        </button>
      )}
    </div>
  );
};

export default PackageBuilder;
