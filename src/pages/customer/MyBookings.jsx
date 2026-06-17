import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { db } from "../../services/firebase";
import { createNotification } from "../../services/notifications";
import {
  collection,
  query,
  where,
  onSnapshot,
  updateDoc,
  doc,
  Timestamp,
} from "firebase/firestore";
import { toast } from "react-toastify";
import {
  CalendarDays,
  Users,
  Banknote,
  MessageSquare,
  Clock,
  CheckCircle2,
  XCircle,
  Ban,
  Loader2,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  Hash,
  AlertTriangle,
  X,
  BarChart3,
} from "lucide-react";

// ── Cancellation policy constants ─────────────────────────────────────────────
const CANCEL_HOURS_LIMIT = 48;

const CANCEL_REASONS = [
  "Changed my plans",
  "Found a better venue",
  "Budget constraints",
  "Date conflict",
  "Emergency",
  "Other",
];

// ── Helpers ───────────────────────────────────────────────────────────────────
const formatDate = (d) => {
  if (!d) return "N/A";
  if (d?.toDate) {
    return d.toDate().toLocaleDateString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const hoursUntilEvent = (eventDate) => {
  if (!eventDate) return Infinity;
  const date = eventDate?.toDate
    ? eventDate.toDate()
    : new Date(eventDate + "T00:00:00");
  return (date - Date.now()) / (1000 * 60 * 60);
};

const canCancel = (booking) => {
  if (booking.status === "pending") return true;
  if (booking.status === "approved") {
    return hoursUntilEvent(booking.eventDate) > CANCEL_HOURS_LIMIT;
  }
  return false;
};

const cancellationBlockedReason = (booking) => {
  if (booking.status === "approved") {
    const h = hoursUntilEvent(booking.eventDate);
    if (h <= CANCEL_HOURS_LIMIT && h > 0)
      return `Approved bookings cannot be cancelled within ${CANCEL_HOURS_LIMIT} hours of the event.`;
    if (h <= 0) return "The event date has already passed.";
  }
  return null;
};

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS_ICON = {
  pending: <Clock className="w-3.5 h-3.5" />,
  approved: <CheckCircle2 className="w-3.5 h-3.5" />,
  rejected: <XCircle className="w-3.5 h-3.5" />,
  cancelled: <Ban className="w-3.5 h-3.5" />,
};

const STATUS_COLOR = {
  pending:
    "bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800",
  approved:
    "bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800",
  rejected:
    "bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800",
  cancelled:
    "bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700",
};

// ─────────────────────────────────────────────────────────────────────────────
// CANCELLATION MODAL
// ─────────────────────────────────────────────────────────────────────────────
const CancelModal = ({ booking, onConfirm, onClose, loading }) => {
  const [reason, setReason] = useState("");
  const isPending = booking.status === "pending";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-md p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-xl flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-gray-900 dark:text-white">
                Cancel Booking
              </h3>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                {booking.venueName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Policy notice */}
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3 mb-4 text-xs text-amber-700 dark:text-amber-400">
          <p className="font-bold mb-1">Cancellation Policy</p>
          <ul className="space-y-0.5 list-disc list-inside">
            <li>Pending bookings can be cancelled at any time.</li>
            <li>
              Approved bookings can be cancelled up to{" "}
              <strong>{CANCEL_HOURS_LIMIT} hours</strong> before the event.
            </li>
          </ul>
        </div>

        {/* Booking summary */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 mb-4 text-sm space-y-1">
          <div className="flex justify-between">
            <span className="text-gray-500 dark:text-gray-400">Event Date</span>
            <span className="font-semibold text-gray-800 dark:text-gray-100">
              {formatDate(booking.eventDate)}
            </span>
          </div>
          {booking.slot && (
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Time Slot</span>
              <span className="font-semibold text-gray-800 dark:text-gray-100 capitalize">
                {booking.slot.replace("_", " ")}
              </span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-gray-500 dark:text-gray-400">Status</span>
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border ${STATUS_COLOR[booking.status]}`}
            >
              {STATUS_ICON[booking.status]}
              {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
            </span>
          </div>
          {isPending && (
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Policy</span>
              <span className="font-semibold text-green-600 dark:text-green-400 text-xs">
                Free cancellation ✓
              </span>
            </div>
          )}
          {!isPending && (
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Time until event</span>
              <span className="font-semibold text-gray-800 dark:text-gray-100 text-xs">
                ~{Math.round(hoursUntilEvent(booking.eventDate))}h remaining
              </span>
            </div>
          )}
        </div>

        {/* Reason */}
        <div className="mb-5">
          <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
            Reason for cancellation (optional)
          </label>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
          >
            <option value="">Select a reason...</option>
            {CANCEL_REASONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
          >
            Keep Booking
          </button>
          <button
            onClick={() => onConfirm(reason)}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-bold transition disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              "Yes, Cancel"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// BOOKING CARD
// ─────────────────────────────────────────────────────────────────────────────
const BookingCard = ({ booking, onCancelClick }) => {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const cancellable = canCancel(booking);
  const blockReason = cancellationBlockedReason(booking);

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
      {/* Main row */}
      <div className="flex items-center gap-4 p-4">
        <img
          src={
            booking.venueImage ||
            "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=120&q=60"
          }
          alt={booking.venueName}
          className="w-20 h-20 rounded-xl object-cover flex-shrink-0 cursor-pointer hover:opacity-90 transition"
          onClick={() => navigate(`/venue/${booking.venueId}`)}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="min-w-0 flex-1">
              <h3
                className="font-extrabold text-gray-900 dark:text-white truncate cursor-pointer hover:text-sky-600 dark:hover:text-sky-400 transition"
                onClick={() => navigate(`/venue/${booking.venueId}`)}
              >
                {booking.venueName}
              </h3>
              <p className="text-xs text-gray-400 mt-0.5 font-mono">
                #{booking.id.slice(0, 8).toUpperCase()}
              </p>
            </div>
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border flex-shrink-0 ${
                STATUS_COLOR[booking.status] || STATUS_COLOR.pending
              }`}
            >
              {STATUS_ICON[booking.status]}
              {booking.status?.charAt(0).toUpperCase() +
                booking.status?.slice(1)}
            </span>
          </div>
          {/* Key info row */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-400 dark:text-gray-500 mt-1">
            <span className="flex items-center gap-1">
              <CalendarDays className="w-3 h-3 text-sky-400" />
              {formatDate(booking.eventDate)}
            </span>
            {booking.eventType && booking.eventType !== "Not specified" && (
              <span className="bg-sky-50 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400 font-semibold px-2 py-0.5 rounded-full">
                {booking.eventType}
              </span>
            )}
            {booking.guestCount > 0 && (
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3 text-sky-400" />
                {booking.guestCount} guests
              </span>
            )}
            {booking.estimatedTotal > 0 && (
              <span className="flex items-center gap-1 font-semibold text-sky-600">
                <Banknote className="w-3 h-3" />
                Est. PKR {Number(booking.estimatedTotal).toLocaleString()}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="border-t border-gray-100 dark:border-gray-800 px-4 py-3 space-y-3">
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            <Detail
              icon={<Hash className="w-3.5 h-3.5 text-gray-400" />}
              label="Booking ID"
              value={booking.id}
              mono
            />
            <Detail
              icon={<Clock className="w-3.5 h-3.5 text-gray-400" />}
              label="Booked On"
              value={formatDate(booking.createdAt)}
            />
            <Detail
              icon={<CalendarDays className="w-3.5 h-3.5 text-sky-400" />}
              label="Event Date"
              value={formatDate(booking.eventDate)}
            />
            <Detail
              icon={<Clock className="w-3.5 h-3.5 text-sky-400" />}
              label="Time Slot"
              value={
                booking.slot
                  ? booking.slot
                      .replace("_", " ")
                      .replace(/\b\w/g, (c) => c.toUpperCase())
                  : "Not specified"
              }
            />
            <Detail
              icon={<Users className="w-3.5 h-3.5 text-sky-400" />}
              label="Guest Count"
              value={
                booking.guestCount > 0
                  ? `${booking.guestCount} guests`
                  : "Not specified"
              }
            />
            <Detail
              icon={<Banknote className="w-3.5 h-3.5 text-sky-400" />}
              label="Est. Total"
              value={
                booking.estimatedTotal > 0
                  ? `PKR ${Number(booking.estimatedTotal).toLocaleString()}`
                  : "N/A"
              }
            />
            <Detail
              icon={<CalendarDays className="w-3.5 h-3.5 text-gray-400" />}
              label="Event Type"
              value={booking.eventType || "Not specified"}
            />
          </div>

          {booking.message && (
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 flex items-center gap-1 mb-1">
                <MessageSquare className="w-3.5 h-3.5" /> Message to Owner
              </p>
              <p className="text-gray-700 dark:text-gray-300 text-xs leading-relaxed">
                {booking.message}
              </p>
            </div>
          )}

          {booking.cancellationReason && (
            <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-3">
              <p className="text-xs font-semibold text-red-500 mb-1">
                Cancellation Reason
              </p>
              <p className="text-red-700 dark:text-red-400 text-xs">
                {booking.cancellationReason}
              </p>
            </div>
          )}

          {/* Cancellation action */}
          {(cancellable || blockReason) &&
            booking.status !== "rejected" &&
            booking.status !== "cancelled" && (
              <div>
                {blockReason ? (
                  <div className="flex items-start gap-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3">
                    <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                    {blockReason}
                  </div>
                ) : (
                  <button
                    onClick={() => onCancelClick(booking)}
                    className="w-full py-2.5 rounded-xl border border-red-200 dark:border-red-800 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 text-sm font-semibold transition flex items-center justify-center gap-2"
                  >
                    <Ban className="w-4 h-4" />
                    Cancel Booking
                  </button>
                )}
              </div>
            )}
        </div>
      )}

      {/* Expand toggle */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-center gap-1 py-2 text-xs font-semibold text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition border-t border-gray-100 dark:border-gray-800"
      >
        {expanded ? (
          <>
            <ChevronUp className="w-3.5 h-3.5" /> Hide Details
          </>
        ) : (
          <>
            <ChevronDown className="w-3.5 h-3.5" /> View Full Details
          </>
        )}
      </button>
    </div>
  );
};

const Detail = ({ icon, label, value, mono }) => (
  <div className="flex items-start gap-2">
    <div className="flex-shrink-0 mt-0.5">{icon}</div>
    <div className="min-w-0">
      <p className="text-xs text-gray-400 dark:text-gray-500 font-semibold">{label}</p>
      <p
        className={`text-gray-800 dark:text-gray-100 text-xs font-medium truncate ${
          mono ? "font-mono" : ""
        }`}
      >
        {value}
      </p>
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────
const MyBookings = () => {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");

  // Cancel modal
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  // Fetch bookings real-time
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "bookings"),
      where("customerId", "==", user.uid)
    );
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => {
          const ta = a.createdAt?.toDate?.() || new Date(0);
          const tb = b.createdAt?.toDate?.() || new Date(0);
          return tb - ta;
        });
      setBookings(data);
      setLoading(false);
    });
    return () => unsub();
  }, [user]);

  const handleConfirmCancel = async (reason) => {
    if (!cancelTarget) return;

    if (!canCancel(cancelTarget)) {
      toast.error("This booking can no longer be cancelled per our policy.");
      setCancelTarget(null);
      return;
    }

    setCancelling(true);
    try {
      const finalReason = reason || "No reason provided";
      await updateDoc(doc(db, "bookings", cancelTarget.id), {
        status: "cancelled",
        cancellationReason: finalReason,
        cancelledAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
      if (cancelTarget.ownerId) {
        await createNotification({
          userId: cancelTarget.ownerId,
          title: "Booking Cancelled by Customer",
          message: `${cancelTarget.customerName || "A customer"} cancelled their booking for "${cancelTarget.venueName}" on ${cancelTarget.eventDate}. Reason: ${finalReason}`,
          type: "booking_cancelled_by_customer",
          bookingId: cancelTarget.id,
          venueName: cancelTarget.venueName,
        });
      }
      toast.success("Booking cancelled successfully.");
      setCancelTarget(null);
    } catch (err) {
      console.error(err);
      toast.error("Failed to cancel booking. Please try again.");
    }
    setCancelling(false);
  };

  const stats = {
    total: bookings.length,
    approved: bookings.filter((b) => b.status === "approved").length,
    pending: bookings.filter((b) => b.status === "pending").length,
    cancelled: bookings.filter((b) => b.status === "cancelled").length,
  };

  const TABS = ["all", "pending", "approved", "rejected", "cancelled"];
  const filtered =
    activeTab === "all"
      ? bookings
      : bookings.filter((b) => b.status === activeTab);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-4 sm:p-6">
      <div className="max-w-2xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition mb-1"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <h1 className="text-lg font-extrabold text-gray-900 dark:text-white">
              My Bookings
            </h1>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          <StatCard
            icon={<BarChart3 className="w-4 h-4 text-sky-500" />}
            label="Total"
            value={stats.total}
          />
          <StatCard
            icon={<CheckCircle2 className="w-4 h-4 text-green-500" />}
            label="Approved"
            value={stats.approved}
          />
          <StatCard
            icon={<Clock className="w-4 h-4 text-amber-500" />}
            label="Pending"
            value={stats.pending}
          />
          <StatCard
            icon={<Ban className="w-4 h-4 text-gray-400" />}
            label="Cancelled"
            value={stats.cancelled}
          />
        </div>

        {/* Cancellation policy notice */}
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3 text-xs text-amber-700 dark:text-amber-400">
          <p className="font-bold text-sm mb-1">Cancellation Policy</p>
          <p>
            <strong>Pending</strong> bookings can be cancelled at any time.{" "}
            <strong>Approved</strong> bookings can be cancelled up to{" "}
            <strong>{CANCEL_HOURS_LIMIT} hours</strong> before the event date.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition whitespace-nowrap ${
                activeTab === tab
                  ? "bg-sky-500 text-white"
                  : "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
              {tab !== "all" && (
                <span className="ml-1.5 opacity-70">
                  ({bookings.filter((b) => b.status === tab).length})
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Booking list */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-sky-500 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800">
            <CalendarDays className="w-12 h-12 text-gray-200 dark:text-gray-700 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400 font-medium">
              No bookings found
            </p>
            {activeTab === "all" && (
              <button
                onClick={() => navigate("/dashboard/customer")}
                className="mt-4 text-sm text-sky-500 font-semibold hover:underline"
              >
                Browse venues →
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((b) => (
              <BookingCard
                key={b.id}
                booking={b}
                onCancelClick={setCancelTarget}
              />
            ))}
          </div>
        )}
      </div>

      {/* Cancel modal */}
      {cancelTarget && (
        <CancelModal
          booking={cancelTarget}
          onConfirm={handleConfirmCancel}
          onClose={() => setCancelTarget(null)}
          loading={cancelling}
        />
      )}
    </div>
  );
};

const StatCard = ({ icon, label, value }) => (
  <div className="bg-white dark:bg-gray-900 p-3 sm:p-4 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex items-center gap-2 sm:gap-3">
    <div className="w-8 h-8 sm:w-9 sm:h-9 bg-gray-50 dark:bg-gray-800 rounded-xl flex items-center justify-center flex-shrink-0">
      {icon}
    </div>
    <div className="min-w-0">
      <p className="text-[9px] sm:text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider truncate">
        {label}
      </p>
      <p className="text-lg sm:text-xl font-extrabold text-gray-900 dark:text-white leading-none">
        {value}
      </p>
    </div>
  </div>
);

export default MyBookings;
