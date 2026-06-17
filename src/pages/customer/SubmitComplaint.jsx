import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { db } from "../../services/firebase";
import { doc, getDoc } from "firebase/firestore";
import { createComplaint } from "../../services/complaints";
import { toast } from "react-toastify";
import {
  ArrowLeft,
  Flag,
  AlertTriangle,
  Info,
  ThumbsDown,
  PenLine,
  Loader2,
  CheckCircle2,
} from "lucide-react";

const COMPLAINT_TYPES = [
  {
    value: "fraudulent_venue",
    label: "Fraudulent Venue",
    description: "Fake listing, scam, or does not exist",
    icon: AlertTriangle,
    color: "text-red-500",
    bg: "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800",
    activeBg:
      "bg-red-500 border-red-500 text-white",
  },
  {
    value: "misleading_info",
    label: "Misleading Information",
    description: "Photos, price, or capacity are inaccurate",
    icon: Info,
    color: "text-amber-500",
    bg: "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800",
    activeBg:
      "bg-amber-500 border-amber-500 text-white",
  },
  {
    value: "poor_service",
    label: "Poor Service",
    description: "Unprofessional behavior or bad experience",
    icon: ThumbsDown,
    color: "text-orange-500",
    bg: "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800",
    activeBg:
      "bg-orange-500 border-orange-500 text-white",
  },
  {
    value: "custom",
    label: "Other / Custom",
    description: "Something else not listed above",
    icon: PenLine,
    color: "text-sky-500",
    bg: "bg-sky-50 dark:bg-sky-900/20 border-sky-200 dark:border-sky-800",
    activeBg:
      "bg-sky-500 border-sky-500 text-white",
  },
];

const SubmitComplaint = () => {
  const { venueId } = useParams();
  const navigate = useNavigate();
  const { user } = useSelector((s) => s.auth);

  const [venue, setVenue] = useState(null);
  const [loadingVenue, setLoadingVenue] = useState(true);

  const [selectedType, setSelectedType] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!venueId) return;
    getDoc(doc(db, "venues", venueId))
      .then((snap) => {
        if (snap.exists()) setVenue({ id: snap.id, ...snap.data() });
      })
      .finally(() => setLoadingVenue(false));
  }, [venueId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedType) {
      toast.error("Please select a complaint type.");
      return;
    }
    if (description.trim().length < 20) {
      toast.error("Please describe the issue in at least 20 characters.");
      return;
    }
    if (!user) {
      toast.error("You must be logged in to submit a complaint.");
      return;
    }

    setSubmitting(true);
    try {
      await createComplaint({
        customerId: user.uid,
        customerEmail: user.email,
        customerName: user.name || "",
        venueId: venueId || "",
        venueName: venue?.name || "Unknown Venue",
        type: selectedType,
        description: description.trim(),
      });
      setSubmitted(true);
    } catch (err) {
      console.error(err);
      toast.error("Failed to submit complaint. Please try again.");
    }
    setSubmitting(false);
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-lg p-10 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-green-500" />
          </div>
          <h2 className="text-xl font-extrabold text-gray-900 dark:text-white mb-2">
            Complaint Submitted
          </h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
            Our admin team will review your complaint and take appropriate action. Thank you for helping keep VenueFinder safe.
          </p>
          <button
            onClick={() => navigate(-1)}
            className="w-full bg-sky-500 hover:bg-sky-600 text-white font-bold py-3 rounded-xl transition"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <div className="h-5 w-px bg-gray-200 dark:bg-gray-700" />
          <h1 className="text-lg font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
            <Flag className="w-5 h-5 text-red-500" />
            Report a Venue
          </h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Venue info pill */}
        {!loadingVenue && venue && (
          <div className="flex items-center gap-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 mb-6">
            <img
              src={
                venue.images?.[0] ||
                "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=120&q=60"
              }
              alt={venue.name}
              className="w-12 h-12 rounded-xl object-cover flex-shrink-0"
            />
            <div>
              <p className="text-xs text-gray-400 dark:text-gray-500 font-medium uppercase tracking-wide">
                Reporting
              </p>
              <p className="font-bold text-gray-900 dark:text-white">
                {venue.name}
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Type selector */}
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">
              What is your complaint about? <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {COMPLAINT_TYPES.map(({ value, label, description: desc, icon: Icon, color, bg, activeBg }) => {
                const active = selectedType === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setSelectedType(value)}
                    className={`text-left p-4 rounded-2xl border-2 transition-all ${
                      active
                        ? activeBg
                        : `${bg} hover:border-gray-300 dark:hover:border-gray-600`
                    }`}
                  >
                    <Icon
                      className={`w-5 h-5 mb-2 ${active ? "text-white" : color}`}
                    />
                    <p
                      className={`font-bold text-sm ${
                        active ? "text-white" : "text-gray-900 dark:text-white"
                      }`}
                    >
                      {label}
                    </p>
                    <p
                      className={`text-xs mt-0.5 ${
                        active ? "text-white/80" : "text-gray-500 dark:text-gray-400"
                      }`}
                    >
                      {desc}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
              Describe the issue <span className="text-red-500">*</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Please provide as much detail as possible so our team can investigate effectively..."
              rows={5}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 resize-none transition"
            />
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 text-right">
              {description.length} / 1000
            </p>
          </div>

          {/* Notice */}
          <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
            <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-amber-700 dark:text-amber-400">
              False or malicious complaints may result in action against your account. Please ensure your report is accurate and in good faith.
            </p>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white font-bold py-3.5 rounded-xl transition disabled:opacity-60"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Flag className="w-4 h-4" />
            )}
            {submitting ? "Submitting..." : "Submit Complaint"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default SubmitComplaint;
