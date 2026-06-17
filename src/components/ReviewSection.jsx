import { useEffect, useState, useMemo } from "react";
import { db } from "../services/firebase";
import { collection, addDoc, query, where, getDocs, onSnapshot, doc, updateDoc, Timestamp, orderBy } from "firebase/firestore";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";
import StarRating from "./StarRating";
import { MessageSquare, Send, Loader2, User, Star, ThumbsUp } from "lucide-react";

const getLatestApprovedBooking = async (venueId, userId) => {
  const q = query(collection(db, "bookings"), where("venueId", "==", venueId), where("customerId", "==", userId), where("status", "==", "approved"));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const bookings = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  bookings.sort((a, b) => {
    const da = a.eventDate?.toDate ? a.eventDate.toDate() : new Date(a.eventDate + "T00:00:00");
    const db_ = b.eventDate?.toDate ? b.eventDate.toDate() : new Date(b.eventDate + "T00:00:00");
    return db_ - da;
  });
  return bookings[0];
};

const isEventPast = (eventDate) => {
  if (!eventDate) return false;
  const d = eventDate?.toDate ? eventDate.toDate() : new Date(eventDate + "T00:00:00");
  return d < new Date();
};

const formatDate = (ts) => {
  if (!ts) return "";
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
};

const RATING_LABELS = ["", "Poor", "Fair", "Good", "Very Good", "Excellent"];

const RatingSummary = ({ reviews }) => {
  const total = reviews.length;
  const avg = useMemo(() => total === 0 ? 0 : reviews.reduce((s, r) => s + r.rating, 0) / total, [reviews, total]);
  const counts = useMemo(() => {
    const c = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach((r) => { const k = Math.round(r.rating); if (c[k] !== undefined) c[k]++; });
    return c;
  }, [reviews]);
  if (total === 0) return null;
  return (
    <div className="flex flex-col sm:flex-row gap-6 p-5 bg-gradient-to-br from-sky-50 to-indigo-50 dark:from-sky-900/20 dark:to-indigo-900/20 rounded-2xl border border-sky-100 dark:border-sky-800 mb-6">
      <div className="flex flex-col items-center justify-center sm:border-r border-sky-200 dark:border-sky-700 sm:pr-6 min-w-[110px]">
        <p className="text-5xl font-black text-gray-900 dark:text-white">{avg.toFixed(1)}</p>
        <StarRating rating={avg} readonly size="md" />
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-medium">{total} {total === 1 ? "review" : "reviews"}</p>
        {avg >= 4.5 && (
          <span className="mt-2 text-xs font-bold bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-full flex items-center gap-1">
            <ThumbsUp className="w-3 h-3" /> Top Rated
          </span>
        )}
      </div>
      <div className="flex-1 space-y-1.5">
        {[5, 4, 3, 2, 1].map((star) => {
          const count = counts[star] || 0;
          const pct = total > 0 ? Math.round((count / total) * 100) : 0;
          return (
            <div key={star} className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 w-4 text-right">{star}</span>
              <Star className="w-3 h-3 text-amber-400 fill-amber-400 flex-shrink-0" />
              <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                <div className="h-2 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 transition-all duration-500" style={{ width: `${pct}%` }} />
              </div>
              <span className="text-xs text-gray-400 dark:text-gray-500 w-6 text-right">{count > 0 ? count : ""}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const ReviewCard = ({ review }) => (
  <div className="flex gap-3 p-4 bg-gray-50 dark:bg-gray-800/60 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition">
    <div className="w-9 h-9 bg-gradient-to-br from-sky-400 to-indigo-500 rounded-full flex items-center justify-center text-white text-sm font-extrabold flex-shrink-0">
      {review.userName?.[0]?.toUpperCase() ?? <User className="w-4 h-4" />}
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-sm font-bold text-gray-800 dark:text-gray-100">{review.userName}</p>
        <span className="text-xs text-gray-400 dark:text-gray-500">{formatDate(review.createdAt)}</span>
      </div>
      <div className="flex items-center gap-2 mt-0.5">
        <StarRating rating={review.rating} readonly size="sm" />
        <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">{RATING_LABELS[Math.round(review.rating)] || ""}</span>
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 leading-relaxed">{review.comment}</p>
    </div>
  </div>
);

const ReviewSection = ({ venueId }) => {
  const { user, role } = useSelector((state) => state.auth);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [hasReviewed, setHasReviewed] = useState(false);
  const [latestBooking, setLatestBooking] = useState(undefined);
  const [eligibilityChecked, setEligibilityChecked] = useState(false);

  useEffect(() => {
    const q = query(collection(db, "venues", venueId, "reviews"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setReviews(data);
      setLoading(false);
      if (user) setHasReviewed(data.some((r) => r.userId === user.uid));
    });
    return () => unsub();
  }, [venueId, user]);

  useEffect(() => {
    if (!user || role !== "customer") { setLatestBooking(null); setEligibilityChecked(true); return; }
    getLatestApprovedBooking(venueId, user.uid).then((b) => { setLatestBooking(b); setEligibilityChecked(true); });
  }, [user, venueId, role]);

  const hasApprovedBooking = !!latestBooking;
  const eventHasPassed = latestBooking ? isEventPast(latestBooking.eventDate) : false;
  const canReview = hasApprovedBooking && eventHasPassed && !hasReviewed;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) { toast.info("Please login to write a review."); return; }
    if (!canReview) { toast.error("You can only review after your event has taken place."); return; }
    if (rating === 0) { toast.error("Please select a star rating."); return; }
    if (!comment.trim()) { toast.error("Please write a comment."); return; }
    setSubmitting(true);
    try {
      await addDoc(collection(db, "venues", venueId, "reviews"), { userId: user.uid, userName: user.name || user.email?.split("@")[0] || "User", rating, comment: comment.trim(), createdAt: Timestamp.now() });
      const allSnap = await getDocs(collection(db, "venues", venueId, "reviews"));
      const allRatings = allSnap.docs.map((d) => d.data().rating);
      const avg = allRatings.reduce((s, r) => s + r, 0) / allRatings.length;
      await updateDoc(doc(db, "venues", venueId), { avgRating: Math.round(avg * 10) / 10, totalReviews: allRatings.length });
      toast.success("Review submitted! ⭐");
      setRating(0); setComment(""); setHasReviewed(true);
    } catch (err) { console.error(err); toast.error("Failed to submit review."); }
    setSubmitting(false);
  };

  const renderEligibilityBanner = () => {
    if (!user || role !== "customer" || !eligibilityChecked) return null;
    if (hasReviewed) return (
      <div className="flex items-center gap-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 text-sm font-medium rounded-xl px-4 py-2.5 mb-5">
        ✅ You have already reviewed this venue.
      </div>
    );
    if (!hasApprovedBooking) return <p className="text-xs text-gray-400 dark:text-gray-500 mb-4 italic">You can review this venue once your booking is approved.</p>;
    if (!eventHasPassed) {
      const eventDate = latestBooking?.eventDate;
      const d = eventDate?.toDate ? eventDate.toDate() : new Date(eventDate + "T00:00:00");
      return (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 text-xs rounded-xl px-4 py-3 mb-5">
          <p className="font-bold text-sm">Review available after your event</p>
          <p className="mt-1">Your event is scheduled for <strong>{d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}</strong>. You can submit a review once it has taken place.</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6">
      <h2 className="text-lg font-extrabold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
        <MessageSquare className="w-5 h-5 text-sky-500" />
        Reviews & Ratings
        {reviews.length > 0 && <span className="text-sm font-medium text-gray-400 dark:text-gray-500">({reviews.length})</span>}
      </h2>

      {!loading && <RatingSummary reviews={reviews} />}
      {renderEligibilityBanner()}

      {canReview && (
        <form onSubmit={handleSubmit} className="mb-6 p-5 bg-sky-50 dark:bg-sky-900/20 rounded-2xl border border-sky-100 dark:border-sky-800 space-y-4">
          <p className="text-sm font-extrabold text-sky-700 dark:text-sky-400 flex items-center gap-2">
            <Star className="w-4 h-4 fill-sky-500 text-sky-500" />
            Share Your Experience
          </p>
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">Your Rating</label>
            <div className="flex items-center gap-3">
              <StarRating rating={rating} onRate={setRating} size="lg" />
              {rating > 0 && <span className="text-sm font-bold text-amber-500">{rating}/5 — {RATING_LABELS[rating]}</span>}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Your Review</label>
            <textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="How was the venue? Describe the ambiance, service, facilities..." rows={4} maxLength={500}
              className="w-full px-4 py-3 rounded-xl border border-sky-200 dark:border-sky-800 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none transition" />
            <p className="text-xs text-gray-400 mt-1 text-right">{comment.length}/500</p>
          </div>
          <button type="submit" disabled={submitting || rating === 0 || !comment.trim()}
            className="flex items-center gap-2 bg-sky-500 hover:bg-sky-600 text-white text-sm font-bold px-6 py-2.5 rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Submit Review
          </button>
        </form>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-10"><Loader2 className="w-6 h-6 text-sky-500 animate-spin" /></div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-10">
          <MessageSquare className="w-10 h-10 text-gray-200 dark:text-gray-700 mx-auto mb-2" />
          <p className="text-gray-400 dark:text-gray-500 text-sm">No reviews yet. Be the first!</p>
        </div>
      ) : (
        <div className="space-y-3">{reviews.map((r) => <ReviewCard key={r.id} review={r} />)}</div>
      )}
    </div>
  );
};

export default ReviewSection;
