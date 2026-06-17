import { useEffect, useState } from "react";
import { db } from "../../services/firebase";
import { useSelector } from "react-redux";
import { createNotification } from "../../services/notifications";
import {
  collection, query, where, onSnapshot, doc, updateDoc, Timestamp,
} from "firebase/firestore";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, CalendarDays, Clock, CheckCircle2, XCircle, Users,
  Mail, MessageSquare, Loader2, Filter, Inbox, Phone, Ban, AlertCircle,
  X, Hash, Shield, DoorOpen,
} from "lucide-react";

const TABS = ["All", "Pending", "Approved", "Rejected", "Cancelled"];

const BookingRequests = () => {
  const navigate = useNavigate();
  const { user } = useSelector((s) => s.auth);

  const [bookings,     setBookings]     = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [activeTab,    setActiveTab]    = useState("All");
  const [processingId, setProcessingId] = useState(null);
  const [selected,     setSelected]     = useState(null); // detail modal

  // Reject modal
  const [rejectModal,  setRejectModal]  = useState(null);
  const [rejectReason, setRejectReason] = useState("");

  // Cancel-request modal
  const [cancelModal,  setCancelModal]  = useState(null);
  const [cancelReason, setCancelReason] = useState("");

  useEffect(() => {
    if (!user?.uid) return;
    const q = query(collection(db, "bookings"), where("ownerId", "==", user.uid));
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
    }, (err) => { console.error(err); setLoading(false); });
    return () => unsub();
  }, [user?.uid]);

  // Keep the detail modal in sync when live booking data changes.
  // Using functional setState so we only depend on `bookings`, not `selected`.
  useEffect(() => {
    setSelected((prev) => {
      if (!prev) return prev;
      const updated = bookings.find((b) => b.id === prev.id);
      return updated || prev;
    });
  }, [bookings]);

  const formatDate = (d) => {
    if (!d) return "N/A";
    if (d.toDate) return d.toDate().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
    return new Date(d + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", year: "numeric", month: "short", day: "numeric" });
  };

  const handleApprove = async (bookingId) => {
    setProcessingId(bookingId);
    try {
      const booking = bookings.find((b) => b.id === bookingId);
      await updateDoc(doc(db, "bookings", bookingId), { status: "approved", updatedAt: Timestamp.now() });
      await createNotification({
        userId: booking.customerId,
        title: "Booking Approved! 🎉",
        message: `Your booking for "${booking.venueName}" on ${formatDate(booking.eventDate)} has been approved.`,
        type: "booking_approved", bookingId, venueName: booking.venueName,
      });
      toast.success("Booking approved! ✅");
    } catch (err) { console.error(err); toast.error("Failed to approve."); }
    setProcessingId(null);
  };

  const handleReject = async () => {
    if (!rejectModal) return;
    setProcessingId(rejectModal);
    try {
      const booking = bookings.find((b) => b.id === rejectModal);
      const reason  = rejectReason.trim() || "No reason provided";
      await updateDoc(doc(db, "bookings", rejectModal), {
        status: "rejected", rejectionReason: reason, updatedAt: Timestamp.now(),
      });
      await createNotification({
        userId: booking.customerId,
        title: "Booking Rejected",
        message: `Your booking for "${booking.venueName}" on ${formatDate(booking.eventDate)} was rejected. Reason: ${reason}`,
        type: "booking_rejected", bookingId: rejectModal, venueName: booking.venueName,
      });
      toast.success("Booking rejected.");
      setRejectModal(null); setRejectReason("");
    } catch (err) { console.error(err); toast.error("Failed to reject."); }
    setProcessingId(null);
  };

  const handleCancelRequest = async () => {
    if (!cancelModal) return;
    const reason = cancelReason.trim();
    if (!reason) { toast.error("Please provide a reason for cancellation."); return; }
    setProcessingId(cancelModal);
    try {
      await updateDoc(doc(db, "bookings", cancelModal), {
        cancelRequested: true, cancelReason: reason,
        cancelRequestedAt: Timestamp.now(), updatedAt: Timestamp.now(),
      });
      toast.info("Cancellation request sent to admin for review.");
      setCancelModal(null); setCancelReason("");
      setSelected(null);
    } catch (err) { console.error(err); toast.error("Failed to send cancellation request."); }
    setProcessingId(null);
  };

  const filtered = bookings.filter((b) => {
    if (activeTab === "All")       return true;
    if (activeTab === "Cancelled") return b.status === "cancelled";
    return b.status?.toLowerCase() === activeTab.toLowerCase();
  });

  const pendingCount = bookings.filter((b) => b.status === "pending").length;

  const statusBadge = (b) => {
    if (b.cancelRequested) return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800">
        <AlertCircle className="w-3 h-3" /> Cancel Requested
      </span>
    );
    const map = {
      pending:   "bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800",
      approved:  "bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800",
      rejected:  "bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800",
      cancelled: "bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700",
    };
    const icon = {
      approved:  <CheckCircle2 className="w-3 h-3" />,
      rejected:  <XCircle className="w-3 h-3" />,
      pending:   <Clock className="w-3 h-3" />,
      cancelled: <Ban className="w-3 h-3" />,
    };
    const s = b.status;
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${map[s] || map.pending}`}>
        {icon[s] || icon.pending}
        {s?.charAt(0).toUpperCase() + s?.slice(1)}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-4">
          <button onClick={() => navigate("/dashboard/owner")} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white transition">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <div className="h-5 w-px bg-gray-200 dark:bg-gray-700" />
          <h1 className="text-lg font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
            <Inbox className="w-5 h-5 text-sky-500" />
            Booking Requests
            {pendingCount > 0 && (
              <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{pendingCount}</span>
            )}
          </h1>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Tabs */}
        <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2">
          {TABS.map((tab) => {
            const count = tab === "All" ? bookings.length : bookings.filter((b) => b.status?.toLowerCase() === tab.toLowerCase()).length;
            return (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${
                  activeTab === tab
                    ? "bg-sky-500 text-white shadow-md shadow-sky-200/50"
                    : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:border-sky-300"
                }`}
              >
                <Filter className="w-3.5 h-3.5" />
                {tab}
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${activeTab === tab ? "bg-white/20 text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {loading && <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-sky-500 animate-spin" /></div>}

        {!loading && filtered.length === 0 && (
          <div className="text-center py-20 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800">
            <Inbox className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400 font-semibold">No bookings found</p>
            <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">
              {activeTab === "All" ? "You haven't received any booking requests yet." : `No ${activeTab.toLowerCase()} bookings.`}
            </p>
          </div>
        )}

        {/* Booking Cards */}
        <div className="space-y-4">
          {filtered.map((b) => (
            <div
              key={b.id}
              onClick={() => setSelected(b)}
              className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden hover:shadow-md hover:border-sky-200 dark:hover:border-sky-800 transition-all cursor-pointer"
            >
              <div className="flex flex-col sm:flex-row">
                <div className="sm:w-40 h-32 sm:h-auto flex-shrink-0">
                  <img
                    src={b.venueImage || "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=300&q=60"}
                    alt={b.venueName} className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-bold text-gray-900 dark:text-white hover:text-sky-600 dark:hover:text-sky-400 transition-colors">
                        {b.venueName}
                      </h3>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Booked on {formatDate(b.createdAt)}</p>
                    </div>
                    {statusBadge(b)}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                    <span className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300">
                      <CalendarDays className="w-4 h-4 text-sky-400" />
                      <span className="font-semibold">{formatDate(b.eventDate)}</span>
                    </span>
                    {b.slot && (
                      <span className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300">
                        <Clock className="w-4 h-4 text-sky-400" />
                        <span className="font-semibold capitalize">{b.slot.replace("_", " ")}</span>
                      </span>
                    )}
                    <span className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300">
                      <Users className="w-4 h-4 text-sky-400" />
                      {b.guestCount || "N/A"} guests
                    </span>
                    <span className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300">
                      <Mail className="w-4 h-4 text-sky-400" />
                      <span className="text-xs">{b.customerEmail}</span>
                    </span>
                    {b.customerContact && (
                      <span className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300">
                        <Phone className="w-4 h-4 text-sky-400" />
                        <span className="text-xs font-semibold">{b.customerContact}</span>
                      </span>
                    )}
                  </div>
                  {b.eventType && (
                    <span className="mt-2 inline-block text-xs bg-sky-50 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400 font-medium px-2 py-0.5 rounded-full">
                      {b.eventType}
                    </span>
                  )}
                  {b.hallName && (
                    <span className="mt-2 inline-flex items-center gap-1 text-xs bg-sky-50 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400 font-medium px-2 py-0.5 rounded-full">
                      <DoorOpen className="w-3 h-3" /> {b.hallName}
                    </span>
                  )}
                  {b.cancelRequested && (
                    <div className="mt-2 text-xs text-orange-500 font-semibold flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" /> Cancellation pending admin review
                    </div>
                  )}
                  <p className="text-xs text-sky-500 mt-3 font-medium">Click to view details →</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ══════════ BOOKING DETAIL MODAL ══════════ */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto border border-gray-100 dark:border-gray-800">
            {/* Modal header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-800">
              <h3 className="text-lg font-extrabold text-gray-900 dark:text-white">Booking Details</h3>
              <button onClick={() => setSelected(null)} className="w-8 h-8 flex items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 transition">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Venue image */}
              <img
                src={selected.venueImage || "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=600&q=70"}
                alt={selected.venueName}
                className="w-full h-44 object-cover rounded-xl"
              />

              {/* Venue + status */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="text-xl font-extrabold text-gray-900 dark:text-white">{selected.venueName}</h4>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Booked on {formatDate(selected.createdAt)}</p>
                </div>
                {statusBadge(selected)}
              </div>

              {/* Cancel-requested notice */}
              {selected.cancelRequested && (
                <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl p-3">
                  <p className="text-xs font-bold text-orange-600 dark:text-orange-400 mb-1 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4" /> Cancellation Request Pending Admin Review
                  </p>
                  <p className="text-xs text-orange-600 dark:text-orange-400">Reason: {selected.cancelReason}</p>
                </div>
              )}

              {/* Rejection reason */}
              {selected.rejectionReason && selected.status === "rejected" && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3">
                  <p className="text-xs font-bold text-red-600 dark:text-red-400 mb-1">Rejection Reason</p>
                  <p className="text-xs text-red-600 dark:text-red-400">{selected.rejectionReason}</p>
                </div>
              )}

              {/* Info grid */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon: CalendarDays, label: "Event Date",    value: formatDate(selected.eventDate) },
                  { icon: Clock,        label: "Time Slot",     value: selected.slot ? selected.slot.replace("_", " ").replace(/\b\w/g, c => c.toUpperCase()) : "Not specified" },
                  ...(selected.hallName ? [{ icon: DoorOpen, label: "Hall / Space", value: selected.hallName }] : []),
                  { icon: Users,        label: "Guests",        value: selected.guestCount ? `${selected.guestCount} guests` : "N/A" },
                  { icon: Mail,         label: "Email",         value: selected.customerEmail || "N/A" },
                  { icon: Phone,        label: "Contact",       value: selected.customerContact || "N/A" },
                  { icon: Users,        label: "Customer",      value: selected.customerName || "N/A" },
                  { icon: CalendarDays, label: "Event Type",    value: selected.eventType || "Not specified" },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl px-4 py-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Icon className="w-3.5 h-3.5 text-gray-400" />
                      <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{label}</p>
                    </div>
                    <p className="text-sm text-gray-900 dark:text-white font-semibold truncate">{value}</p>
                  </div>
                ))}
              </div>

              {/* Message */}
              {selected.message && (
                <div className="bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl px-4 py-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <MessageSquare className="w-3.5 h-3.5 text-gray-400" />
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Message from Customer</p>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300">{selected.message}</p>
                </div>
              )}

              {/* Reference IDs */}
              <div className="bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl px-4 py-3">
                <div className="flex items-center gap-1.5 mb-2">
                  <Hash className="w-3.5 h-3.5 text-gray-400" />
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Reference</p>
                </div>
                <p className="text-xs text-gray-400 dark:text-gray-500 font-mono">Booking ID: {selected.id}</p>
              </div>

              {/* Action buttons inside modal */}
              <div className="flex flex-wrap gap-3 pt-2 border-t border-gray-100 dark:border-gray-800" onClick={(e) => e.stopPropagation()}>
                {selected.status === "pending" && (
                  <>
                    <button
                      onClick={() => handleApprove(selected.id)} disabled={processingId === selected.id}
                      className="flex-1 flex items-center justify-center gap-1.5 bg-green-500 hover:bg-green-600 text-white text-sm font-bold px-4 py-2.5 rounded-xl transition disabled:opacity-60"
                    >
                      {processingId === selected.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                      Approve
                    </button>
                    <button
                      onClick={() => { setRejectModal(selected.id); setSelected(null); }} disabled={processingId === selected.id}
                      className="flex-1 flex items-center justify-center gap-1.5 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 text-sm font-bold px-4 py-2.5 rounded-xl border border-red-200 dark:border-red-800 transition disabled:opacity-60"
                    >
                      <XCircle className="w-4 h-4" /> Reject
                    </button>
                  </>
                )}
                {selected.status === "approved" && !selected.cancelRequested && (
                  <button
                    onClick={() => { setCancelModal(selected.id); setSelected(null); }} disabled={processingId === selected.id}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-orange-50 dark:bg-orange-900/20 hover:bg-orange-100 text-orange-600 dark:text-orange-400 text-sm font-bold px-4 py-2.5 rounded-xl border border-orange-200 dark:border-orange-800 transition disabled:opacity-60"
                  >
                    <Ban className="w-4 h-4" /> Request Cancellation
                  </button>
                )}
                <button
                  onClick={() => navigate(`/chat/${selected.customerId}_${selected.venueId}`, {
                    state: {
                      venueId:       selected.venueId,
                      venueName:     selected.venueName,
                      venueImage:    selected.venueImage || "",
                      customerId:    selected.customerId,
                      customerName:  selected.customerName || selected.customerEmail || "Customer",
                      customerEmail: selected.customerEmail || "",
                      ownerId:       user.uid,
                      ownerName:     user.name || user.email?.split("@")[0] || "Owner",
                      ownerEmail:    user.email || "",
                    },
                  })}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-sky-50 dark:bg-sky-900/20 hover:bg-sky-100 dark:hover:bg-sky-900/40 text-sky-600 dark:text-sky-400 text-sm font-bold px-4 py-2.5 rounded-xl border border-sky-200 dark:border-sky-800 transition"
                >
                  <MessageSquare className="w-4 h-4" /> Chat
                </button>
                <button onClick={() => setSelected(null)}
                  className="flex-1 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 font-bold py-2.5 rounded-xl transition text-sm">
                  Close
                </button>
              </div>

              {/* Trust badge */}
              <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500 justify-center pt-1">
                <Shield className="w-3.5 h-3.5" /> All actions are logged and reviewed by admin
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Reject Modal ── */}
      {rejectModal && (
        <Modal title="Reject Booking" onClose={() => { setRejectModal(null); setRejectReason(""); }}>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Optionally provide a reason for rejecting this booking.</p>
          <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Reason for rejection (optional)…" rows={3}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
          />
          <div className="flex gap-3 mt-4">
            <button onClick={handleReject} disabled={processingId === rejectModal}
              className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-2.5 rounded-xl transition disabled:opacity-60">
              {processingId === rejectModal ? "Rejecting…" : "Confirm Reject"}
            </button>
            <button onClick={() => { setRejectModal(null); setRejectReason(""); }}
              className="flex-1 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 font-bold py-2.5 rounded-xl transition">
              Cancel
            </button>
          </div>
        </Modal>
      )}

      {/* ── Cancellation Request Modal ── */}
      {cancelModal && (
        <Modal title="Request Cancellation" onClose={() => { setCancelModal(null); setCancelReason(""); }}>
          <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl p-3 mb-4">
            <p className="text-xs text-orange-700 dark:text-orange-400 font-semibold">⚠️ This cancellation will be reviewed by an admin. Repeated or unjustified cancellations may lower your venue's rating.</p>
          </div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
            Reason <span className="text-red-400">*</span>
          </label>
          <textarea value={cancelReason} onChange={(e) => setCancelReason(e.target.value)}
            placeholder="Explain why you need to cancel this booking…" rows={3}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
          />
          <div className="flex gap-3 mt-4">
            <button onClick={handleCancelRequest} disabled={processingId === cancelModal}
              className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-bold py-2.5 rounded-xl transition disabled:opacity-60">
              {processingId === cancelModal ? "Sending…" : "Submit Request"}
            </button>
            <button onClick={() => { setCancelModal(null); setCancelReason(""); }}
              className="flex-1 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 font-bold py-2.5 rounded-xl transition">
              Go Back
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
};

const Modal = ({ title, children, onClose }) => (
  <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-md p-6 border border-gray-100 dark:border-gray-800">
      <h3 className="text-lg font-extrabold text-gray-900 dark:text-white mb-4">{title}</h3>
      <button onClick={onClose}
        className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition">
        <X className="w-4 h-4" />
      </button>
      {children}
    </div>
  </div>
);

export default BookingRequests;
