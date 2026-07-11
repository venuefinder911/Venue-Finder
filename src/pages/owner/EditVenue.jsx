import { useEffect, useState } from "react";
import { db } from "../../services/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { uploadMultipleToCloudinary } from "../../services/cloudinary";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import {
  Building2, MapPin, Users, FileText,
  Tag, Phone, ImagePlus, X, Loader2, ArrowLeft, CheckCircle2, DoorOpen,
} from "lucide-react";
import PackageBuilder from "../../components/PackageBuilder";
import HallBuilder from "../../components/HallBuilder";
import { LocationPickerMap } from "../../components/LocationPickerMap";

const CATEGORIES = ["Wedding", "Birthday", "Corporate", "Engagement", "Conference", "Party"];
const AMENITIES_LIST = [
  "AC", "Parking", "Stage", "Decoration", "Catering",
  "Sound System", "Projector", "WiFi", "Garden",
];

const CONTACT_RE = /^0[0-9]{10}$/;

const validate = (form) => {
  const e = {};
  if (!form.name.trim())                        e.name        = "Venue name is required.";
  else if (form.name.trim().length < 3)         e.name        = "Name must be at least 3 characters.";
  if (!form.city.trim())                        e.city        = "City is required.";
  if (!form.area.trim())                        e.area        = "Area / Location is required.";
  if (form.contact.trim() && !CONTACT_RE.test(form.contact.trim()))
                                                e.contact     = "Must be 11 digits starting with 0 (e.g. 03001234567).";
  if (!form.capacity)                           e.capacity    = "Capacity is required.";
  else if (Number(form.capacity) < 10)          e.capacity    = "Capacity must be at least 10 guests.";
  if (!form.description.trim())                 e.description = "Description is required.";
  else if (form.description.trim().length < 30) e.description = "Description must be at least 30 characters.";
  return e;
};

const EditVenue = () => {
  const { id }   = useParams();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "", city: "", area: "", capacity: "",
    description: "", categories: [], contact: "", amenities: [],
    images: [],
  });

  const [errors,           setErrors]          = useState({});
  const [newImageFiles,    setNewImageFiles]   = useState([]);
  const [newImagePreviews, setNewImagePreviews]= useState([]);
  const [packages,         setPackages]        = useState([]);
  const [halls,            setHalls]           = useState([]);
  const [loading,          setLoading]         = useState(false);
  const [uploadProgress,   setUploadProgress]  = useState("");
  const [fetching,         setFetching]        = useState(true);
  const [pinLat,           setPinLat]          = useState(null);
  const [pinLng,           setPinLng]          = useState(null);
  const [showMap,          setShowMap]         = useState(false);

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
      if (area) setForm((prev) => ({ ...prev, area }));
      if (city) setForm((prev) => ({ ...prev, city: prev.city || city }));
    } catch { /* silent */ }
  };

  useEffect(() => {
    const load = async () => {
      try {
        const snap = await getDoc(doc(db, "venues", id));
        if (!snap.exists()) {
          toast.error("Venue not found.");
          navigate("/dashboard/owner");
          return;
        }
        const d = snap.data();
        const storedCity = d.city?.trim() || "";
        const storedLoc  = d.location?.trim() || "";
        // location is saved as "City, Area" — split it back for separate fields
        const areaOnly = storedLoc.startsWith(`${storedCity}, `)
          ? storedLoc.slice(storedCity.length + 2)
          : storedLoc;

        setForm({
          name:        d.name        || "",
          city:        storedCity,
          area:        areaOnly,
          capacity:    d.capacity    || "",
          description: d.description || "",
          categories:  d.categories?.length > 0
            ? d.categories
            : (d.category ? [d.category] : []),
          contact:     d.contact  || "",
          amenities:   d.amenities || [],
          images:      d.images    || [],
        });
        setPackages(d.packages || []);
        setHalls(d.halls || []);
        if (d.lat)  setPinLat(d.lat);
        if (d.lng)  setPinLng(d.lng);
      } catch (err) {
        console.error("Failed to load venue:", err);
        toast.error("Could not load venue. Please try again.");
        navigate("/dashboard/owner");
      }
      setFetching(false);
    };
    load();
  }, [id, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => { const n = { ...prev }; delete n[name]; return n; });
  };

  const handleCapacity = (e) => {
    const digits = e.target.value.replace(/\D/g, "");
    setForm((prev) => ({ ...prev, capacity: digits }));
    if (errors.capacity) setErrors((prev) => { const n = { ...prev }; delete n.capacity; return n; });
  };

  const handleContact = (e) => {
    const digits = e.target.value.replace(/\D/g, "").slice(0, 11);
    setForm((prev) => ({ ...prev, contact: digits }));
    if (errors.contact) setErrors((prev) => { const n = { ...prev }; delete n.contact; return n; });
  };

  const toggleCategory = (cat) =>
    setForm((prev) => ({
      ...prev,
      categories: prev.categories.includes(cat)
        ? prev.categories.filter((c) => c !== cat)
        : [...prev.categories, cat],
    }));

  const toggleAmenity = (a) =>
    setForm((prev) => ({
      ...prev,
      amenities: prev.amenities.includes(a)
        ? prev.amenities.filter((x) => x !== a)
        : [...prev.amenities, a],
    }));

  // Append new files instead of replacing
  const handleNewImages = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    const tooBig = files.filter((f) => f.size > 10 * 1024 * 1024);
    if (tooBig.length) {
      toast.error(`Files exceed 10 MB: ${tooBig.map((f) => f.name).join(", ")}`);
      return;
    }
    setNewImageFiles((prev)    => [...prev, ...files]);
    setNewImagePreviews((prev) => [...prev, ...files.map((f) => URL.createObjectURL(f))]);
    e.target.value = "";
  };

  const removeExistingImage = (i) =>
    setForm((prev) => ({ ...prev, images: prev.images.filter((_, idx) => idx !== i) }));

  const removeNewImage = (i) => {
    setNewImageFiles((prev)    => prev.filter((_, idx) => idx !== i));
    setNewImagePreviews((prev) => prev.filter((_, idx) => idx !== i));
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    const errs = validate(form);
    if (form.categories.length === 0) errs.categories = "Please select at least one category.";
    if (form.images.length + newImageFiles.length === 0) errs.images = "At least one image is required.";

    if (packages.length === 0) errs.packages = "Please add at least one meal/event package.";
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      toast.error("Please fix the highlighted errors.");
      return;
    }

    setLoading(true);
    try {
      let uploadedUrls = [];
      if (newImageFiles.length > 0) {
        setUploadProgress(`Uploading ${newImageFiles.length} image(s) to Cloudinary…`);
        uploadedUrls = await uploadMultipleToCloudinary(newImageFiles, "venues");
      }

      setUploadProgress("Saving changes…");
      await updateDoc(doc(db, "venues", id), {
        name:        form.name.trim(),
        city:        form.city.trim(),
        location:    `${form.city.trim()}, ${form.area.trim()}`,
        capacity:    Number(form.capacity),
        description: form.description.trim(),
        categories:  form.categories,
        amenities:   form.amenities,
        contact:     form.contact.trim(),
        images:      [...form.images, ...uploadedUrls],
        packages,
        halls,
        lat:         pinLat,
        lng:         pinLng,
        updatedAt:   new Date(),
      });

      toast.success("Venue updated successfully!");
      navigate("/dashboard/owner");
    } catch (err) {
      console.error("Update failed:", err);
      toast.error(err.message || "Something went wrong. Please try again.");
    }
    setLoading(false);
    setUploadProgress("");
  };

  if (fetching) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 text-sky-500 animate-spin" />
          <p className="text-gray-400 dark:text-gray-500 font-medium">Loading venue…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">

      <div className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 sticky top-16 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-4">
          <button onClick={() => navigate("/dashboard/owner")}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white transition">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <div className="h-5 w-px bg-gray-200 dark:bg-gray-700" />
          <h1 className="text-lg font-extrabold text-gray-900 dark:text-white">Edit Venue</h1>
        </div>
      </div>

      <form onSubmit={handleUpdate} className="max-w-4xl mx-auto px-4 py-10 space-y-8">

        <Section title="Basic Info" icon={<Building2 className="w-5 h-5" />}>
          <div className="grid md:grid-cols-2 gap-4">
            <Field label="Venue Name" required error={errors.name}>
              <input name="name" value={form.name} onChange={handleChange}
                placeholder="e.g. Pearl Continental Hall"
                className={inputCls(errors.name)} />
            </Field>

            <Field label="City" required error={errors.city}>
              <input name="city" value={form.city} onChange={handleChange}
                placeholder="e.g. Lahore"
                className={inputCls(errors.city)} />
            </Field>

            <Field label="Area / Location" required error={errors.area}>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowMap((v) => !v)}
                  title={showMap ? "Close map" : "Pick location on map"}
                  className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded transition-colors ${showMap ? "text-sky-500" : "text-gray-400 hover:text-sky-500"}`}
                >
                  <MapPin className="w-4 h-4" />
                </button>
                <input name="area" value={form.area} onChange={handleChange}
                  placeholder="e.g. Gulberg, Main Boulevard (or click 📍 to pin)"
                  className={`${inputCls(errors.area)} pl-10`} />
                {pinLat && pinLng && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-green-500 font-bold">📍</span>
                )}
              </div>
              {/* Inline map picker */}
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

            <Field label="Contact Number" error={errors.contact}>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input value={form.contact} onChange={handleContact}
                  placeholder="03001234567" inputMode="numeric" maxLength={11}
                  className={`${inputCls(errors.contact)} pl-10`} />
              </div>
            </Field>

            <Field label="Capacity (guests)" required error={errors.capacity}>
              <div className="relative">
                <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input type="text" inputMode="numeric" value={form.capacity} onChange={handleCapacity}
                  placeholder="e.g. 500" maxLength={6}
                  className={`${inputCls(errors.capacity)} pl-10`} />
              </div>
            </Field>
          </div>
        </Section>

        <Section title="Details" icon={<FileText className="w-5 h-5" />}>
          <Field label="Description" required error={errors.description}>
            <textarea name="description" value={form.description} onChange={handleChange}
              placeholder="Describe your venue — ambiance, services, what makes it special… (min 30 characters)"
              rows={4} maxLength={1000}
              className={`${inputCls(errors.description)} resize-none`} />
            <p className={`text-xs mt-1 text-right ${form.description.length > 900 ? "text-red-500" : "text-gray-400"}`}>
              {form.description.length}/1000
            </p>
          </Field>

          <Field label="Category" required error={errors.categories}>
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">Select one or more event types</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {CATEGORIES.map((cat) => {
                const active = form.categories.includes(cat);
                return (
                  <button key={cat} type="button" onClick={() => toggleCategory(cat)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all duration-200 ${
                      active
                        ? "border-sky-500 bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400"
                        : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600"
                    }`}>
                    {active ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Tag className="w-3.5 h-3.5" />}
                    {cat}
                  </button>
                );
              })}
            </div>
            {form.categories.length > 0 && (
              <p className="text-xs text-sky-600 font-semibold mt-2">Selected: {form.categories.join(", ")}</p>
            )}
          </Field>

          <Field label="Amenities">
            <div className="flex flex-wrap gap-2 mt-1">
              {AMENITIES_LIST.map((a) => {
                const active = form.amenities.includes(a);
                return (
                  <button key={a} type="button" onClick={() => toggleAmenity(a)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm font-medium transition-all duration-200 ${
                      active
                        ? "bg-sky-500 border-sky-500 text-white"
                        : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-sky-300 dark:hover:border-sky-600"
                    }`}>
                    {active && <CheckCircle2 className="w-3.5 h-3.5" />}
                    {a}
                  </button>
                );
              })}
            </div>
          </Field>
        </Section>

        <Section title="Photos" icon={<ImagePlus className="w-5 h-5" />}>
          {form.images.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-2">
                Current Images <span className="text-xs font-normal text-gray-400">(hover to remove)</span>
              </p>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                {form.images.map((src, i) => (
                  <div key={i} className="relative group aspect-square rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
                    <img src={src} alt="" className="w-full h-full object-cover" />
                    <button type="button" onClick={() => removeExistingImage(i)}
                      className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                      <X className="w-3.5 h-3.5" />
                    </button>
                    {i === 0 && (
                      <div className="absolute bottom-0 left-0 right-0 bg-sky-600/80 text-white text-[10px] font-bold text-center py-0.5">
                        COVER
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-2">Add More Images</p>
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-sky-300 rounded-2xl bg-sky-50 dark:bg-sky-900/20 hover:bg-sky-100 dark:hover:bg-sky-900/30 cursor-pointer transition">
              <ImagePlus className="w-6 h-6 text-sky-400 mb-1" />
              <p className="text-sm font-semibold text-sky-600">Click to upload</p>
              <p className="text-xs text-gray-400 mt-0.5">JPG, PNG, WEBP — max 10 MB each</p>
              <input type="file" accept="image/*" multiple onChange={handleNewImages} className="hidden" />
            </label>
            {errors.images && <p className="text-xs text-red-500 mt-1">{errors.images}</p>}

            {newImagePreviews.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 mt-3">
                {newImagePreviews.map((src, i) => (
                  <div key={i} className="relative group aspect-square rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
                                      <img src={src} alt="" className="w-full h-full object-cover" />
                    <button type="button" onClick={() => removeNewImage(i)}
                      className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                      <X className="w-3.5 h-3.5" />
                    </button>
                    <div className="absolute bottom-0 left-0 right-0 bg-green-600/80 text-white text-[10px] font-bold text-center py-0.5">
                      NEW
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Section>

        <Section title="Halls & Spaces" icon={<DoorOpen className="w-5 h-5" />}>
          <HallBuilder halls={halls} onChange={setHalls} />
        </Section>

        <Section title="Menu & Packages" icon={<Tag className="w-5 h-5" />}>
          <p className="text-sm text-gray-500 dark:text-gray-400 -mt-1 mb-1">
            At least one package is required — the lowest price sets your venue's starting rate per person.
          </p>
          {errors.packages && <p className="text-xs text-red-500 -mt-3">{errors.packages}</p>}
          <PackageBuilder packages={packages} onChange={setPackages} />
        </Section>

        <button type="submit" disabled={loading}
          className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 text-white font-bold py-4 rounded-2xl transition-all duration-200 shadow-lg shadow-sky-200/50 disabled:opacity-60 disabled:cursor-not-allowed text-base">
          {loading
            ? <><Loader2 className="w-5 h-5 animate-spin" />{uploadProgress || "Saving…"}</>
            : "Save Changes"}
        </button>

      </form>
    </div>
  );
};

const inputCls = (hasError) =>
  `w-full px-4 py-3 rounded-xl border ${
    hasError
      ? "border-red-400 focus:ring-red-400"
      : "border-gray-200 dark:border-gray-700 focus:ring-sky-500"
  } bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:border-transparent transition text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 text-sm`;

const Section = ({ title, icon, children }) => (
  <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
    <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
      <div className="w-8 h-8 bg-sky-100 dark:bg-sky-900/40 text-sky-600 dark:text-sky-400 rounded-xl flex items-center justify-center">
        {icon}
      </div>
      <h2 className="font-extrabold text-gray-800 dark:text-gray-100 text-base">{title}</h2>
    </div>
    <div className="p-6 space-y-5">{children}</div>
  </div>
);

const Field = ({ label, children, required, error }) => (
  <div>
    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
      {label} {required && <span className="text-red-400">*</span>}
    </label>
    {children}
    {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
  </div>
);

export default EditVenue;
