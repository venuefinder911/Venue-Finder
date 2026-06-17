import { useState } from "react";
import { db, auth } from "../../services/firebase";
import { collection, addDoc } from "firebase/firestore";
import { uploadMultipleToCloudinary } from "../../services/cloudinary";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import {
  Building2, MapPin, Users, FileText, Tag, Phone,
  ImagePlus, X, Loader2, ArrowLeft, CheckCircle2, Star, DoorOpen,
} from "lucide-react";
import { LocationPickerMap } from "../../components/LocationPickerMap";
import PackageBuilder from "../../components/PackageBuilder";
import HallBuilder from "../../components/HallBuilder";

const CATEGORIES = ["Wedding", "Birthday", "Corporate", "Engagement", "Conference", "Party"];
const AMENITIES_LIST = ["AC", "Parking", "Stage", "Decoration", "Catering", "Sound System", "Projector", "WiFi", "Garden"];

// ── Validation helpers ────────────────────────────────────────────────────────
const NAME_RE    = /^[a-zA-Z0-9 &',.\-()]+$/;
const CITY_RE    = /^[a-zA-Z ]+$/;
const CONTACT_RE = /^0[0-9]{10}$/;        // exactly 11 digits, starts with 0

const validate = (form) => {
  const errs = {};
  if (!form.name.trim())                           errs.name = "Venue name is required.";
  else if (form.name.trim().length < 3)            errs.name = "Name must be at least 3 characters.";
  else if (form.name.trim().length > 100)          errs.name = "Name cannot exceed 100 characters.";
  else if (!NAME_RE.test(form.name.trim()))        errs.name = "Only letters, numbers, spaces and basic punctuation allowed.";

  if (!form.city.trim())                           errs.city = "City is required.";
  else if (!CITY_RE.test(form.city.trim()))        errs.city = "City must contain letters only (no numbers or symbols).";
  else if (form.city.trim().length > 50)           errs.city = "City name cannot exceed 50 characters.";

  if (!form.location.trim())                       errs.location = "Area / Location is required.";
  else if (form.location.trim().length > 150)      errs.location = "Location cannot exceed 150 characters.";

  if (form.contact.trim() && !CONTACT_RE.test(form.contact.trim()))
                                                   errs.contact = "Contact must be exactly 11 digits starting with 0 (e.g. 03001234567).";

  if (!form.capacity)                              errs.capacity = "Capacity is required.";
  else if (Number(form.capacity) < 10)             errs.capacity = "Capacity must be at least 10 guests.";
  else if (Number(form.capacity) > 100000)         errs.capacity = "Capacity cannot exceed 100,000 guests.";

  if (!form.description.trim())                    errs.description = "Description is required.";
  else if (form.description.trim().length < 30)    errs.description = "Description must be at least 30 characters.";
  else if (form.description.trim().length > 1000)  errs.description = "Description cannot exceed 1,000 characters.";

  return errs;
};

// ── Main component ────────────────────────────────────────────────────────────
const AddVenue = () => {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "", location: "", city: "", capacity: "",
    description: "", categories: [], contact: "", amenities: [],
  });
  const [errors, setErrors]             = useState({});
  const [imageFiles, setImageFiles]     = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [coverIndex, setCoverIndex]     = useState(0);   // index of chosen cover photo
  const [loading, setLoading]           = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [pinLat, setPinLat]             = useState(null);
  const [pinLng, setPinLng]             = useState(null);
  const [showMap, setShowMap]           = useState(false);
  const [packages, setPackages]         = useState([]);
  const [halls,    setHalls]            = useState([]);

  // Reverse-geocode a lat/lng via Nominatim → auto-fill area field
  const reverseGeocode = async (lat, lng) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
        { headers: { "Accept-Language": "en" } }
      );
      const data = await res.json();
      const addr = data.address || {};
      const area = addr.suburb || addr.neighbourhood || addr.road || addr.village || addr.town || "";
      const city = addr.city || addr.state_district || addr.county || "";
      if (area) setForm((prev) => ({ ...prev, location: area }));
      if (city) setForm((prev) => ({ ...prev, city: prev.city || city }));
    } catch { /* silent — user can still type manually */ }
  };

  // ── Field handlers ──────────────────────────────────────────────────────────
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    // Clear error on change
    if (errors[name]) setErrors((prev) => { const n = { ...prev }; delete n[name]; return n; });
  };

  // Capacity: only allow digits
  const handleCapacity = (e) => {
    const digits = e.target.value.replace(/\D/g, "");
    setForm((prev) => ({ ...prev, capacity: digits }));
    if (errors.capacity) setErrors((prev) => { const n = { ...prev }; delete n.capacity; return n; });
  };

  // Contact: only allow digit input, max 11
  const handleContact = (e) => {
    const digits = e.target.value.replace(/\D/g, "").slice(0, 11);
    setForm((prev) => ({ ...prev, contact: digits }));
    if (errors.contact) setErrors((prev) => { const n = { ...prev }; delete n.contact; return n; });
  };

  const toggleAmenity = (amenity) =>
    setForm((prev) => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter((a) => a !== amenity)
        : [...prev.amenities, amenity],
    }));

  const toggleCategory = (cat) =>
    setForm((prev) => ({
      ...prev,
      categories: prev.categories.includes(cat)
        ? prev.categories.filter((c) => c !== cat)
        : [...prev.categories, cat],
    }));

  // ── Image handlers ──────────────────────────────────────────────────────────
  const handleImages = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    const MAX = 10 * 1024 * 1024; // 10 MB
    const oversized = files.filter((f) => f.size > MAX);
    if (oversized.length) { toast.error(`Some files exceed 10 MB: ${oversized.map(f => f.name).join(", ")}`); return; }
    setImageFiles((prev) => [...prev, ...files]);
    setImagePreviews((prev) => [...prev, ...files.map((f) => URL.createObjectURL(f))]);
  };

  const removeImage = (i) => {
    setImageFiles((prev) => prev.filter((_, idx) => idx !== i));
    setImagePreviews((prev) => prev.filter((_, idx) => idx !== i));
    setCoverIndex((prev) => {
      if (prev === i) return 0;
      return prev > i ? prev - 1 : prev;
    });
  };

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate(form);
    if (Object.keys(errs).length) { setErrors(errs); toast.error("Please fix the highlighted errors."); return; }
    if (imageFiles.length === 0) { toast.error("Please add at least one image."); return; }
    if (form.categories.length === 0) { toast.error("Please select at least one category."); return; }
    if (packages.length === 0) { toast.error("Please add at least one meal/event package with a price."); return; }

    setLoading(true);
    try {
      setUploadProgress("Uploading images…");
      const imageUrls = await uploadMultipleToCloudinary(imageFiles);
      // Move cover to index 0
      const ordered = [...imageUrls];
      if (coverIndex !== 0) {
        const [cover] = ordered.splice(coverIndex, 1);
        ordered.unshift(cover);
      }

      setUploadProgress("Saving venue…");
      await addDoc(collection(db, "venues"), {
        name:        form.name.trim(),
        location:    `${form.city.trim()}, ${form.location.trim()}`,
        city:        form.city.trim(),
        capacity:    Number(form.capacity),
        description: form.description.trim(),
        categories:  form.categories,
        amenities:   form.amenities,
        images:      ordered,
        ownerId:     auth.currentUser?.uid,
        ownerEmail:  auth.currentUser?.email,
        createdAt:   new Date(),
        status:      "pending",
        contact:     form.contact.trim(),
        lat:         pinLat,
        lng:         pinLng,
        rating: 0, reviews: [], availability: [],
        packages,
        halls,
      });
      toast.success("Venue submitted for approval! ✅");
      navigate("/dashboard/owner");
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Something went wrong.");
    }
    setLoading(false);
    setUploadProgress("");
  };

  const descLen = form.description.length;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-4">
          <button onClick={() => navigate("/dashboard/owner")} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <div className="h-5 w-px bg-gray-200 dark:bg-gray-700" />
          <h1 className="text-lg font-extrabold text-gray-900 dark:text-white">Add New Venue</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-4xl mx-auto px-4 py-10 space-y-8">

        {/* ── SECTION 1: BASIC INFO ── */}
        <Section title="Basic Info" icon={<Building2 className="w-5 h-5" />} required>
          <div className="grid md:grid-cols-2 gap-4">

            <Field label="Venue Name" required error={errors.name}>
              <input
                name="name" value={form.name} onChange={handleChange}
                placeholder="e.g. Pearl Continental Hall"
                maxLength={100} required
                className={inputCls(errors.name)}
              />
              <CharCount cur={form.name.length} max={100} />
            </Field>

            <Field label="City" required error={errors.city}>
              <input
                name="city" value={form.city} onChange={handleChange}
                placeholder="e.g. Lahore"
                maxLength={50} required
                className={inputCls(errors.city)}
              />
            </Field>

            <Field label="Area / Location" required error={errors.location}>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowMap((v) => !v)}
                  title={showMap ? "Close map" : "Pick location on map"}
                  className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded transition-colors ${showMap ? "text-sky-500" : "text-gray-400 hover:text-sky-500"}`}
                >
                  <MapPin className="w-4 h-4" />
                </button>
                <input
                  name="location" value={form.location} onChange={handleChange}
                  placeholder="e.g. Gulberg, Main Boulevard (or click 📍 to pin)"
                  maxLength={150} required
                  className={`${inputCls(errors.location)} pl-10`}
                />
                {pinLat && pinLng && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-green-500 font-bold">📍</span>
                )}
              </div>
              <CharCount cur={form.location.length} max={150} />
              {/* Inline map — shown when pin icon is clicked */}
              {showMap && (
                <div className="mt-3 rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700">
                  <div className="bg-gray-50 dark:bg-gray-800 px-3 py-2 flex items-center justify-between">
                    <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-sky-500" />
                      Click map to drop a pin — area field auto-fills
                    </p>
                    {pinLat && pinLng && (
                      <button type="button" onClick={() => { setPinLat(null); setPinLng(null); }}
                        className="text-xs text-red-400 hover:text-red-600 font-semibold">Clear pin</button>
                    )}
                  </div>
                  <LocationPickerMap
                    lat={pinLat} lng={pinLng}
                    onChange={(lat, lng) => { setPinLat(lat); setPinLng(lng); reverseGeocode(lat, lng); }}
                  />
                  {pinLat && pinLng && (
                    <div className="bg-green-50 dark:bg-green-900/20 px-3 py-2 flex items-center justify-between">
                      <span className="text-xs text-green-700 dark:text-green-400 font-semibold flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Pin set: {pinLat.toFixed(5)}, {pinLng.toFixed(5)}
                      </span>
                      <button type="button" onClick={() => setShowMap(false)}
                        className="text-xs text-sky-500 hover:text-sky-700 font-semibold">Done ✓</button>
                    </div>
                  )}
                </div>
              )}
            </Field>

            <Field label="Contact Number" error={errors.contact}
              hint="11 digits starting with 0 (e.g. 03001234567)">
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  value={form.contact} onChange={handleContact}
                  placeholder="03001234567"
                  inputMode="numeric"
                  className={`${inputCls(errors.contact)} pl-10`}
                />
              </div>
              {form.contact.length > 0 && (
                <p className={`text-xs mt-1 font-medium ${form.contact.length === 11 ? "text-green-500" : "text-amber-500"}`}>
                  {form.contact.length}/11 digits
                </p>
              )}
            </Field>

            <Field label="Capacity (guests)" required error={errors.capacity}>
              <div className="relative">
                <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text" inputMode="numeric" name="capacity" value={form.capacity}
                  onChange={handleCapacity}
                  placeholder="e.g. 500"
                  maxLength={6} required
                  className={`${inputCls(errors.capacity)} pl-10`}
                />
              </div>
            </Field>
          </div>
        </Section>

        {/* ── SECTION 3: DETAILS ── */}
        <Section title="Details" icon={<FileText className="w-5 h-5" />} required>
          <Field label="Description" required error={errors.description}>
            <textarea
              name="description" value={form.description} onChange={handleChange}
              placeholder="Describe your venue — ambiance, services, what makes it special… (min 30 characters)"
              rows={4} maxLength={1000} required
              className={`${inputCls(errors.description)} resize-none`}
            />
            <div className="flex justify-between items-center mt-1">
              {errors.description
                ? <p className="text-xs text-red-500">{errors.description}</p>
                : <p className="text-xs text-gray-400">Min 30 characters</p>}
              <p className={`text-xs font-medium ${descLen < 30 ? "text-amber-500" : descLen > 900 ? "text-red-500" : "text-gray-400"}`}>
                {descLen}/1000
              </p>
            </div>
          </Field>

          <Field label="Category (select all that apply)" required>
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">You can select multiple categories</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {CATEGORIES.map((cat) => {
                const selected = form.categories.includes(cat);
                return (
                  <button key={cat} type="button" onClick={() => toggleCategory(cat)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all duration-200 ${
                      selected
                        ? "border-sky-500 bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400"
                        : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:border-gray-300"
                    }`}
                  >
                    {selected ? <CheckCircle2 className="w-3.5 h-3.5 text-sky-500" /> : <Tag className="w-3.5 h-3.5" />}
                    {cat}
                  </button>
                );
              })}
            </div>
            {form.categories.length > 0 && (
              <p className="text-xs text-sky-600 font-semibold mt-2">✅ Selected: {form.categories.join(", ")}</p>
            )}
          </Field>

          <Field label="Amenities">
            <div className="flex flex-wrap gap-2 mt-1">
              {AMENITIES_LIST.map((amenity) => {
                const selected = form.amenities.includes(amenity);
                return (
                  <button key={amenity} type="button" onClick={() => toggleAmenity(amenity)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm font-medium transition-all duration-200 ${
                      selected
                        ? "bg-sky-500 border-sky-500 text-white"
                        : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-sky-300"
                    }`}
                  >
                    {selected && <CheckCircle2 className="w-3.5 h-3.5" />}
                    {amenity}
                  </button>
                );
              })}
            </div>
          </Field>
        </Section>

        {/* ── SECTION 3: IMAGES ── */}
        <Section title="Photos" icon={<ImagePlus className="w-5 h-5" />} required>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
            Upload at least 1 photo. <span className="font-semibold text-sky-600 dark:text-sky-400">Click any thumbnail to set it as the cover photo.</span>
          </p>
          <p className="text-xs text-gray-400 mb-4">Max 10 MB per image. JPG, PNG, WEBP accepted.</p>

          <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-sky-300 rounded-2xl bg-sky-50 dark:bg-sky-900/20 hover:bg-sky-100 dark:hover:bg-sky-900/30 cursor-pointer transition">
            <ImagePlus className="w-8 h-8 text-sky-400 mb-2" />
            <p className="text-sm font-semibold text-sky-600">Click to upload images</p>
            <p className="text-xs text-gray-400 mt-1">JPG, PNG, WEBP — max 10 MB each</p>
            <input type="file" accept="image/*" multiple onChange={handleImages} className="hidden" />
          </label>

          {imagePreviews.length > 0 && (
            <>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-4 mb-2">
                <Star className="w-3 h-3 inline text-amber-400 mr-1" />
                Click a photo to make it the cover. The cover appears first in your listing.
              </p>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                {imagePreviews.map((src, i) => (
                  <div
                    key={i}
                    onClick={() => setCoverIndex(i)}
                    className={`relative group aspect-square rounded-xl overflow-hidden cursor-pointer transition-all duration-200 ${
                      i === coverIndex
                        ? "ring-4 ring-sky-500 ring-offset-2"
                        : "border border-gray-200 dark:border-gray-700 opacity-80 hover:opacity-100"
                    }`}
                  >
                    <img src={src} alt={`preview-${i}`} className="w-full h-full object-cover" />
                    {/* Remove button */}
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); removeImage(i); }}
                      className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition z-10"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                    {/* Cover badge */}
                    {i === coverIndex && (
                      <div className="absolute bottom-0 left-0 right-0 bg-sky-600/90 text-white text-[10px] font-bold text-center py-0.5 flex items-center justify-center gap-1">
                        <Star className="w-2.5 h-2.5 fill-white" /> COVER
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </Section>

        {/* ── SECTION 5: HALLS ── */}
        <Section title="Halls & Spaces" icon={<DoorOpen className="w-5 h-5" />}>
          <HallBuilder halls={halls} onChange={setHalls} />
        </Section>

        {/* ── SECTION 6: PACKAGES ── */}
        <Section title="Menu & Packages" icon={<Tag className="w-5 h-5" />} required>
          <p className="text-sm text-gray-500 dark:text-gray-400 -mt-1 mb-1">
            Add at least one package with a price per person — this sets your venue's starting rate.
          </p>
          <PackageBuilder packages={packages} onChange={setPackages} />
        </Section>

        {/* Submit */}
        <button
          type="submit" disabled={loading}
          className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 text-white font-bold py-4 rounded-2xl transition-all duration-200 shadow-lg shadow-sky-200/50 disabled:opacity-60 disabled:cursor-not-allowed text-base"
        >
          {loading ? (
            <><Loader2 className="w-5 h-5 animate-spin" />{uploadProgress || "Processing…"}</>
          ) : (
            <><Building2 className="w-5 h-5" />Submit Venue for Approval</>
          )}
        </button>
        <p className="text-center text-xs text-gray-400 dark:text-gray-500">
          Your venue will be reviewed by our team before going live.
        </p>
      </form>
    </div>
  );
};

// ── Helper components ─────────────────────────────────────────────────────────
const inputCls = (hasError) =>
  `w-full px-4 py-3 rounded-xl border ${hasError ? "border-red-400 focus:ring-red-400" : "border-gray-200 dark:border-gray-700 focus:ring-sky-500"} bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:border-transparent transition text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 text-sm`;

const CharCount = ({ cur, max }) => (
  <p className={`text-xs mt-1 text-right ${cur > max * 0.9 ? "text-amber-500" : "text-gray-400"}`}>{cur}/{max}</p>
);

const Section = ({ title, icon, children, required }) => (
  <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
    <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
  
      <div className="w-8 h-8 bg-sky-100 dark:bg-sky-900/40 text-sky-600 dark:text-sky-400 rounded-xl flex items-center justify-center">
        {icon}
      </div>
      <h2 className="font-extrabold text-gray-800 dark:text-gray-100 text-base">{title}</h2>
      {required && <span className="text-xs text-red-400 font-medium ml-auto">* Required</span>}
    </div>
    <div className="p-6 space-y-5">{children}</div>
  </div>
);

const Field = ({ label, children, required, error, hint }) => (
  <div>
    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
      {label} {required && <span className="text-red-400">*</span>}
    </label>
    {children}
    {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    {!error && hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
  </div>
);

export default AddVenue;
