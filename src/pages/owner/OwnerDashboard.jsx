import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { db, auth } from "../../services/firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection, query, where, deleteDoc, doc, updateDoc, onSnapshot,
} from "firebase/firestore";
import { toast } from "react-toastify";
import { ChevronLeft, ChevronRight, Inbox, RefreshCw, AlertCircle, Trash2, X, Loader2 } from "lucide-react";


// ── Venue card (with carousel) ────────────────────────────────────────────────
const DashboardCard = ({ v, onDeleteClick, handleResubmit, navigate, resubmitting }) => {
const images = v.images || [];
  const [current, setCurrent] = useState(0);
  const next = useCallback(() => setCurrent((c) => (c + 1) % images.length), [images.length]);

  useEffect(() => {
    if (images.length <= 1) return;
    const id = setInterval(next, 3000);
    return () => clearInterval(id);
  }, [next, images.length]);

  const prev  = (e) => { e.stopPropagation(); setCurrent((c) => (c - 1 + images.length) % images.length); };
  const goNext = (e) => { e.stopPropagation(); next(); };

  const isRejected = v.status === "rejected";
  const isPending  = !v.status || v.status === "pending";

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow hover:shadow-lg transition overflow-hidden flex flex-col">
      {/* Image carousel with blurred backdrop so portrait photos look great */}
      <div className="relative aspect-[16/9] overflow-hidden group bg-gray-900">
        {images.map((src, i) => (
          <div key={i} className={`absolute inset-0 transition-opacity duration-500 ${i === current ? "opacity-100" : "opacity-0"}`}>
            {/* Blurred background to fill letterbox gaps */}
            <img src={src} alt="" aria-hidden="true"
              className="absolute inset-0 w-full h-full object-cover scale-110 blur-xl opacity-50 pointer-events-none" />
            {/* Main image with object-contain so nothing is cropped */}
            <img src={src} alt={`${v.name} ${i + 1}`}
              className="absolute inset-0 w-full h-full object-contain" />
          </div>
        ))}
        {images.length > 1 && (
          <>
            <button onClick={prev} className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 bg-black/40 hover:bg-black/70 text-white rounded-full flex items-center justify-center transition opacity-0 group-hover:opacity-100">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={goNext} className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 bg-black/40 hover:bg-black/70 text-white rounded-full flex items-center justify-center transition opacity-0 group-hover:opacity-100">
              <ChevronRight className="w-4 h-4" />
            </button>
            <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1">
              {images.map((_, i) => (
                <button key={i} onClick={(e) => { e.stopPropagation(); setCurrent(i); }}
                  className={`rounded-full transition-all duration-300 ${i === current ? "w-4 h-1.5 bg-white" : "w-1.5 h-1.5 bg-white/50"}`} />
              ))}
            </div>
            <div className="absolute top-2 left-2 bg-black/50 text-white text-xs font-semibold px-2 py-0.5 rounded-full">
              {current + 1}/{images.length}
            </div>
          </>
        )}
      </div>

      <div className="p-4 flex-1 flex flex-col">
        <h3 className="font-bold text-lg text-gray-900 dark:text-white">{v.name}</h3>
        <p className="text-gray-500 dark:text-gray-400 text-sm">{v.location}</p>
        <p className="text-sm mt-2 text-gray-700 dark:text-gray-300">Capacity: {v.capacity}</p>
        {v.packages?.length > 0 && (
          <p className="text-sky-600 font-bold mt-1">
            From PKR {Math.min(...v.packages.map((p) => Number(p.pricePerPerson))).toLocaleString()} / person
          </p>
        )}

        <div className="mt-2">
          <span className={`px-3 py-1 text-xs rounded-full font-bold ${
            v.status === "approved" ? "bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400"
            : isRejected ? "bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400"
            : "bg-yellow-100 dark:bg-yellow-900/40 text-yellow-600 dark:text-yellow-400"
          }`}>
            {v.status || "pending"}
          </span>
        </div>

        {/* Rejection reason banner */}
        {isRejected && v.rejectionReason && (
          <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-red-600 dark:text-red-400 mb-0.5">Admin Rejection Reason:</p>
                <p className="text-xs text-red-600 dark:text-red-400">{v.rejectionReason}</p>
              </div>
            </div>
          </div>
        )}

        {/* Pending review notice */}
        {isPending && (
          <div className="mt-3 p-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
            <p className="text-xs text-amber-600 dark:text-amber-400 font-medium text-center">⏳ Under admin review</p>
          </div>
        )}

        <div className="flex gap-2 mt-auto pt-4">
          <button onClick={() => navigate(`/venue/${v.id}`)}
            className="flex-1 bg-sky-500 text-white py-2 rounded-xl text-sm font-semibold hover:bg-sky-600 transition">
            View
          </button>
          <button onClick={() => navigate(`/edit-venue/${v.id}`)}
            className="flex-1 bg-yellow-400 text-white py-2 rounded-xl text-sm font-semibold hover:bg-yellow-500 transition">
            Edit
          </button>
          {/* Opens inline confirmation instead of browser confirm() */}
          <button onClick={() => onDeleteClick(v.id)}
            className="flex-1 bg-red-500 text-white py-2 rounded-xl text-sm font-semibold hover:bg-red-600 transition flex items-center justify-center gap-1">
            <Trash2 className="w-3.5 h-3.5" /> Delete
          </button>
        </div>

        {/* Re-submit button for rejected venues */}
        {isRejected && (
          <button onClick={() => handleResubmit(v)} disabled={resubmitting === v.id}
            className="w-full mt-2 flex items-center justify-center gap-2 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-60 text-white py-2 rounded-xl text-sm font-bold transition">
            {resubmitting === v.id
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</>
              : <><RefreshCw className="w-4 h-4" /> Re-submit for Review</>}
          </button>
        )}
      </div>
    </div>
  );
};

// ── Delete confirmation modal ─────────────────────────────────────────────────
const DeleteModal = ({ venueName, onConfirm, onCancel, loading }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-xl flex items-center justify-center">
            <Trash2 className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <h3 className="font-extrabold text-gray-900 dark:text-white">Delete Venue</h3>
            <p className="text-xs text-gray-400 mt-0.5">This cannot be undone</p>
          </div>
        </div>
        <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
          <X className="w-5 h-5" />
        </button>
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-300 mb-5">
        Are you sure you want to delete <strong className="text-gray-900 dark:text-white">"{venueName}"</strong>? All bookings and reviews for this venue will no longer be accessible.
      </p>
      <div className="flex gap-3">
        <button onClick={onCancel}
          className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition">
          Cancel
        </button>
        <button onClick={onConfirm} disabled={loading}
          className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-bold transition disabled:opacity-60 flex items-center justify-center gap-2">
          {loading ? "Deleting…" : "Yes, Delete"}
        </button>
      </div>
    </div>
  </div>
);

// ── Main dashboard ────────────────────────────────────────────────────────────
const OwnerDashboard = () => {
  const navigate = useNavigate();
  const [authUid,      setAuthUid]      = useState(null);
  const [venues,       setVenues]       = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [resubmitting, setResubmitting] = useState(null);

  // Delete confirmation state — stores the venue id to delete
  const [deleteTargetId,   setDeleteTargetId]   = useState(null);
  const [deleting,         setDeleting]          = useState(false);

  // The venue name for the modal
  const deleteTargetVenue = venues.find((v) => v.id === deleteTargetId);

  // Wait for Firebase Auth to initialise (avoids race condition on page refresh)
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (fbUser) => {
      setAuthUid(fbUser?.uid ?? null);
    });
    return () => unsub();
  }, []);

  // Real-time listener for owner's venues
  useEffect(() => {
    if (!authUid) return;
    const q = query(collection(db, "venues"), where("ownerId", "==", authUid));
    const unsub = onSnapshot(q, (snap) => {
      setVenues(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, (err) => {
      console.error("Failed to load venues:", err);
      toast.error("Failed to load your venues.");
      setLoading(false);
    });
    return () => unsub();
  }, [authUid]);

  // Real-time count of pending booking requests
  useEffect(() => {
    if (!authUid) return;
    const q = query(
      collection(db, "bookings"),
      where("ownerId", "==", authUid),
      where("status", "==", "pending")
    );
    const unsub = onSnapshot(q, (snap) => setPendingCount(snap.size));
    return () => unsub();
  }, [authUid]);

  const handleConfirmDelete = async () => {
    if (!deleteTargetId) return;
    setDeleting(true);
    try {
      await deleteDoc(doc(db, "venues", deleteTargetId));
      toast.success("Venue deleted.");
    } catch (err) {
      console.error("Delete failed:", err);
      toast.error("Failed to delete venue. Please try again.");
    }
    setDeleting(false);
    setDeleteTargetId(null);
  };

  const handleResubmit = async (venue) => {
    setResubmitting(venue.id);
    try {
      await updateDoc(doc(db, "venues", venue.id), {
        status: "pending",
        rejectionReason: null,
      });
      toast.success(`"${venue.name}" re-submitted for review.`);
    } catch (err) {
      console.error("Re-submit failed:", err);
      toast.error("Failed to re-submit. Please try again.");
    }
    setResubmitting(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-4 sm:p-6">
      <div className="flex flex-wrap justify-between items-start gap-4 mb-8 sm:mb-10">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
            Owner <span className="text-sky-500">Dashboard</span>
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base">Manage your venues</p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <button onClick={() => navigate("/dashboard/owner/bookings")}
            className="relative bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-sky-300 dark:hover:border-sky-600 text-gray-700 dark:text-gray-200 px-3 sm:px-5 py-2.5 sm:py-3 rounded-xl font-bold flex items-center gap-1.5 sm:gap-2 transition text-sm sm:text-base">
            <Inbox className="w-4 h-4 sm:w-5 sm:h-5 text-sky-500" />
            Bookings
            {pendingCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                {pendingCount}
              </span>
            )}
          </button>
          <button onClick={() => navigate("/add-venue")}
            className="bg-sky-500 hover:bg-sky-600 active:bg-sky-700 text-white px-3 sm:px-6 py-2.5 sm:py-3 rounded-xl font-bold text-sm sm:text-base transition">
            + Add Venue
          </button>
        </div>
      </div>

      {loading && <p className="text-center text-gray-400 dark:text-gray-500">Loading…</p>}
      {!loading && venues.length === 0 && (
        <div className="text-center py-20 bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 rounded-xl">
          No venues added yet
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {venues.map((v) => (
          <DashboardCard
            key={v.id} v={v}
            onDeleteClick={setDeleteTargetId}
            handleResubmit={handleResubmit}
            resubmitting={resubmitting}
            navigate={navigate}
          />
        ))}
      </div>

      {deleteTargetId && (
        <DeleteModal
          venueName={deleteTargetVenue?.name || "this venue"}
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeleteTargetId(null)}
          loading={deleting}
        />
      )}
    </div>
  );
};

export default OwnerDashboard;
