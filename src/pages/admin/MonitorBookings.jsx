import { useEffect, useState } from "react";
import { db } from "../../services/firebase";
import {
  collection, onSnapshot, query, orderBy, doc, updateDoc, Timestamp, getDoc,
} from "firebase/firestore";
import { createNotification } from "../../services/notifications";
import { toast } from "react-toastify";
import AdminHeader from "../../components/AdminHeader";
import {
  CalendarDays, Clock, CheckCircle2, XCircle, Users, Mail, MessageSquare,
  Loader2, Search, Inbox, BookOpen, Ban, X, Building2, User, Hash,
  AlertCircle, Phone, ShieldAlert,
} from "lucide-react";

const TABS = ["All", "Pending", "Approved", "Rejected", "Cancelled", "Cancel Requests"];

const STATUS_META = {
  pending:   { label: "Pending",   icon: Clock,         cls: "bg-amber-500/15 text-amber-400 border-amber-500/20" },
  approved:  { label: "Approved",  icon: CheckCircle2,  cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20" },
  rejected:  { label: "Rejected",  icon: XCircle,       cls: "bg-red-500/15 text-red-400 border-red-500/20" },
  cancelled: { label: "Cancelled", icon: Ban,            cls: "bg-white/[0.08] text-slate-400 border-white/[0.1]" },
};

const formatDate = (d) => {
  if (!d) return "N/A";
  if (d.toDate) return d.toDate().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", year: "numeric", month: "short", day: "numeric" });
};

const StatusBadge = ({ b }) => {
  if (b.cancelRequested) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border bg-orange-500/15 text-orange-400 border-orange-500/20">
        <AlertCircle className="w-3 h-3" /> Cancel Requested
      </span>
    );
  }
  const meta = STATUS_META[b.status] || STATUS_META.pending;
  const Icon = meta.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${meta.cls}`}>
      <Icon className="w-3 h-3" />{meta.label}
    </span>
  );
};

const MonitorBookings = () => {
  const [bookings,         setBookings]         = useState([]);
  const [loading,          setLoading]          = useState(true);
  const [activeTab,        setActiveTab]        = useState("All");
  const [search,           setSearch]           = useState("");
  const [selectedBooking,  setSelectedBooking]  = useState(null);
  const [processingId,     setProcessingId]     = useState(null);

  useEffect(() => {
    const q = query(collection(db, "bookings"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q,
      (snap) => { setBookings(snap.docs.map((d) => ({ id: d.id, ...d.data() }))); setLoading(false); },
      (err)  => { console.error(err); toast.error("Failed to load bookings."); setLoading(false); }
    );
    return () => unsub();
  }, []);

  // ── Approve owner cancellation ─────────────────────────────────────────────
  const approveCancelRequest = async (b, penalize = false) => {
    setProcessingId(b.id + "_approve_cancel");
    try {
      await updateDoc(doc(db, "bookings", b.id), {
        status: "cancelled",
        cancelRequested: false,
        cancelApproved: true,
        updatedAt: Timestamp.now(),
      });
      // Notify customer
      await createNotification({
        userId: b.customerId,
        title: "Booking Cancelled by Owner",
        message: `Your booking for "${b.venueName}" on ${formatDate(b.eventDate)} has been cancelled by the venue owner. Reason: ${b.cancelReason}`,
        type: "booking_cancelled_by_owner",
        bookingId: b.id,
        venueName: b.venueName,
      });
      // Notify owner
      await createNotification({
        userId: b.ownerId,
        title: "Cancellation Approved",
        message: `Your cancellation request for the booking at "${b.venueName}" on ${formatDate(b.eventDate)} has been approved by admin.`,
        type: "booking_cancelled_by_owner",
        bookingId: b.id,
        venueName: b.venueName,
      });

      // Penalize venue rating if admin marks as unjustified
      if (penalize && b.venueId) {
        const venueRef = doc(db, "venues", b.venueId);
        const venueSnap = await getDoc(venueRef);
        if (venueSnap.exists()) {
          const data = venueSnap.data();
          const currentRating = data.avgRating || 0;
          const penalized = Math.max(0, parseFloat((currentRating - 0.5).toFixed(1)));
          await updateDoc(venueRef, { avgRating: penalized });
          toast.warning(`Cancellation approved & venue rating reduced to ${penalized} ⭐`);
        }
      } else {
        toast.success("Cancellation approved. Customer notified.");
      }
      setSelectedBooking(null);
    } catch (err) { console.error(err); toast.error("Failed to process cancellation."); }
    setProcessingId(null);
  };

  // ── Reject owner cancellation ──────────────────────────────────────────────
  const rejectCancelRequest = async (b) => {
    setProcessingId(b.id + "_reject_cancel");
    try {
      await updateDoc(doc(db, "bookings", b.id), {
        cancelRequested: false,
        cancelRejected: true,
        updatedAt: Timestamp.now(),
      });
      await createNotification({
        userId: b.ownerId,
        title: "Cancellation Request Rejected",
        message: `Your request to cancel the booking at "${b.venueName}" on ${formatDate(b.eventDate)} was rejected by admin. The booking remains active.`,
        type: "booking_approved",
        bookingId: b.id,
        venueName: b.venueName,
      });
      toast.success("Cancellation request rejected. Booking remains approved.");
      setSelectedBooking(null);
    } catch (err) { console.error(err); toast.error("Failed to reject cancellation."); }
    setProcessingId(null);
  };

  // ── Filter ─────────────────────────────────────────────────────────────────
  const filtered = bookings
    .filter((b) => {
      if (activeTab === "All")             return true;
      if (activeTab === "Cancel Requests") return b.cancelRequested === true;
      return b.status?.toLowerCase() === activeTab.toLowerCase();
    })
    .filter((b) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        b.venueName?.toLowerCase().includes(q) ||
        b.customerEmail?.toLowerCase().includes(q) ||
        b.customerName?.toLowerCase().includes(q) ||
        b.eventType?.toLowerCase().includes(q)
      );
    });

  const tabCount = (tab) => {
    if (tab === "All")             return bookings.length;
    if (tab === "Cancel Requests") return bookings.filter((b) => b.cancelRequested).length;
    return bookings.filter((b) => b.status?.toLowerCase() === tab.toLowerCase()).length;
  };

  const stats = {
    total:     bookings.length,
    pending:   bookings.filter((b) => b.status === "pending").length,
    approved:  bookings.filter((b) => b.status === "approved").length,
    rejected:  bookings.filter((b) => b.status === "rejected").length,
    cancelled: bookings.filter((b) => b.status === "cancelled").length,
    cancelReq: bookings.filter((b) => b.cancelRequested).length,
  };

  return (
    <div className="min-h-screen bg-[#07091a] text-white">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-64 -left-64 w-[500px] h-[500px] bg-sky-700/8 rounded-full blur-3xl" />
        <div className="absolute -bottom-64 -right-64 w-[500px] h-[500px] bg-indigo-700/8 rounded-full blur-3xl" />
      </div>

      <AdminHeader title="Booking Monitor" titleIcon={BookOpen} />

      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sky-400 text-xs font-semibold uppercase tracking-widest mb-2">
            <BookOpen className="w-3.5 h-3.5" /> Booking Monitoring
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-3">
            Monitor Bookings
            {stats.cancelReq > 0 && (
              <span className="text-sm bg-orange-500 text-white font-bold px-2.5 py-0.5 rounded-full">
                {stats.cancelReq} cancel request{stats.cancelReq > 1 ? "s" : ""}
              </span>
            )}
          </h1>
          <p className="text-slate-400 mt-1">View all bookings and handle owner cancellation requests.</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          {[
            { label: "Total",       value: stats.total,     color: "text-white" },
            { label: "Pending",     value: stats.pending,   color: "text-amber-400" },
            { label: "Approved",    value: stats.approved,  color: "text-emerald-400" },
            { label: "Rejected",    value: stats.rejected,  color: "text-red-400" },
            { label: "Cancelled",   value: stats.cancelled, color: "text-slate-400" },
            { label: "Cancel Req.", value: stats.cancelReq, color: "text-orange-400" },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white/[0.04] border border-white/[0.07] rounded-2xl p-4">
              <p className="text-slate-400 text-xs font-medium uppercase tracking-wide mb-1">{label}</p>
              <p className={`text-2xl font-extrabold ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="relative mb-5">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input type="text" placeholder="Search by venue, customer, or event type…"
            value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/[0.05] border border-white/[0.08] text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/40 transition"
          />
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1">
          {TABS.map((tab) => {
            const isCancelTab = tab === "Cancel Requests";
            return (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition whitespace-nowrap ${
                  activeTab === tab
                    ? isCancelTab ? "bg-orange-500 text-white shadow-lg shadow-orange-500/25" : "bg-sky-500 text-white shadow-lg shadow-sky-500/25"
                    : "bg-white/[0.04] border border-white/[0.08] text-slate-400 hover:text-white hover:bg-white/[0.08]"
                }`}
              >
                {tab}
                <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full font-bold ${activeTab === tab ? "bg-white/20" : "bg-white/[0.08] text-slate-500"}`}>
                  {tabCount(tab)}
                </span>
              </button>
            );
          })}
        </div>

        {loading && <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-sky-400 animate-spin" /></div>}

        {!loading && filtered.length === 0 && (
          <div className="text-center py-20 bg-white/[0.03] border border-white/[0.07] rounded-2xl">
            <Inbox className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400 font-semibold">No bookings found</p>
          </div>
        )}

        <div className="space-y-3">
          {filtered.map((b) => (
            <div key={b.id} onClick={() => setSelectedBooking(b)}
              className={`border rounded-2xl overflow-hidden hover:bg-white/[0.07] transition cursor-pointer ${
                b.cancelRequested
                  ? "bg-orange-500/5 border-orange-500/20"
                  : "bg-white/[0.04] border-white/[0.07]"
              }`}>
              <div className="flex flex-col sm:flex-row">
                <div className="sm:w-32 h-24 sm:h-auto flex-shrink-0">
                  <img src={b.venueImage || "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=300&q=60"}
                    alt={b.venueName} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 p-5">
                  <div className="flex items-start justify-between mb-2 gap-2">
                    <div>
                      <h3 className="font-bold text-white">{b.venueName}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">Booked {formatDate(b.createdAt)}</p>
                    </div>
                    <StatusBadge b={b} />
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm mt-2">
                    <span className="flex items-center gap-1.5 text-slate-400">
                      <CalendarDays className="w-3.5 h-3.5 text-sky-400" />{formatDate(b.eventDate)}
                    </span>
                    <span className="flex items-center gap-1.5 text-slate-400">
                      <Users className="w-3.5 h-3.5 text-sky-400" />{b.guestCount || "N/A"} guests
                    </span>
                    <span className="flex items-center gap-1.5 text-slate-400 text-xs">
                      <Mail className="w-3.5 h-3.5 text-sky-400" />{b.customerEmail || "N/A"}
                    </span>
                    <span className="text-xs bg-sky-500/15 text-sky-400 font-medium px-2 py-0.5 rounded-full">
                      {b.eventType || "General"}
                    </span>
                  </div>
                  {b.cancelRequested && (
                    <div className="mt-2 text-xs text-orange-400 font-semibold flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" /> Cancel reason: {b.cancelReason}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* ── BOOKING DETAIL MODAL ── */}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#0d1225] border border-white/[0.1] rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-white/[0.07]">
              <h3 className="text-lg font-extrabold text-white">Booking Details</h3>
              <button onClick={() => setSelectedBooking(null)} className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-slate-400 hover:text-white transition">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <img src={selectedBooking.venueImage || "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=600&q=70"}
                alt={selectedBooking.venueName} className="w-full h-44 object-cover rounded-xl" />

              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="text-xl font-extrabold text-white">{selectedBooking.venueName}</h4>
                  <p className="text-xs text-slate-500 mt-0.5">Booked on {formatDate(selectedBooking.createdAt)}</p>
                </div>
                <StatusBadge b={selectedBooking} />
              </div>

              {/* Cancel request info */}
              {selectedBooking.cancelRequested && (
                <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl px-4 py-3">
                  <div className="flex items-center gap-2 mb-1">
                    <ShieldAlert className="w-4 h-4 text-orange-400" />
                    <p className="text-sm font-bold text-orange-400">Owner Cancellation Request</p>
                  </div>
                  <p className="text-sm text-orange-300 mb-3"><span className="font-semibold">Reason:</span> {selectedBooking.cancelReason}</p>
                  <p className="text-xs text-slate-400 mb-3">As admin, you can approve this cancellation (customer will be notified) or reject it (booking stays active). You may also penalize the venue rating by 0.5★ if the cancellation is unjustified.</p>
                  <div className="flex flex-col gap-2">
                    <div className="flex gap-2">
                      <button
                        onClick={() => approveCancelRequest(selectedBooking, false)}
                        disabled={processingId !== null}
                        className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold py-2 rounded-xl transition disabled:opacity-60"
                      >
                        {processingId === selectedBooking.id + "_approve_cancel" ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                        Approve Cancel
                      </button>
                      <button
                        onClick={() => rejectCancelRequest(selectedBooking)}
                        disabled={processingId !== null}
                        className="flex-1 flex items-center justify-center gap-1.5 bg-slate-700 hover:bg-slate-600 text-white text-sm font-bold py-2 rounded-xl transition disabled:opacity-60"
                      >
                        {processingId === selectedBooking.id + "_reject_cancel" ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                        Reject Cancel
                      </button>
                    </div>
                    <button
                      onClick={() => approveCancelRequest(selectedBooking, true)}
                      disabled={processingId !== null}
                      className="w-full flex items-center justify-center gap-1.5 bg-red-500/20 hover:bg-red-500/40 border border-red-500/30 text-red-400 text-sm font-bold py-2 rounded-xl transition disabled:opacity-60"
                    >
                      <ShieldAlert className="w-4 h-4" /> Approve + Penalize Venue (−0.5★)
                    </button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon: CalendarDays, label: "Event Date",     value: formatDate(selectedBooking.eventDate) },
                  { icon: Users,        label: "Guests",         value: selectedBooking.guestCount ? `${selectedBooking.guestCount} guests` : "N/A" },
                  { icon: BookOpen,     label: "Event Type",     value: selectedBooking.eventType || "General" },
                  { icon: Mail,         label: "Customer Email", value: selectedBooking.customerEmail || "N/A" },
                  { icon: User,         label: "Customer Name",  value: selectedBooking.customerName || "N/A" },
                  { icon: Phone,        label: "Contact",        value: selectedBooking.customerContact || "N/A" },
                  { icon: Building2,    label: "Venue ID",       value: selectedBooking.venueId || "N/A" },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="bg-white/[0.04] border border-white/[0.07] rounded-xl px-4 py-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Icon className="w-3.5 h-3.5 text-slate-500" />
                      <p className="text-xs text-slate-500 font-medium">{label}</p>
                    </div>
                    <p className="text-sm text-white font-semibold truncate">{value}</p>
                  </div>
                ))}
              </div>

              {selectedBooking.message && (
                <div className="bg-white/[0.04] border border-white/[0.07] rounded-xl px-4 py-3">
                  <div className="flex items-center gap-1.5 mb-1"><MessageSquare className="w-3.5 h-3.5 text-slate-500" /><p className="text-xs text-slate-500 font-medium">Customer Message</p></div>
                  <p className="text-sm text-slate-300">{selectedBooking.message}</p>
                </div>
              )}

              {selectedBooking.rejectionReason && selectedBooking.status === "rejected" && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                  <p className="text-xs text-red-400 font-medium mb-1">Rejection Reason</p>
                  <p className="text-sm text-red-300">{selectedBooking.rejectionReason}</p>
                </div>
              )}

              <div className="bg-white/[0.04] border border-white/[0.07] rounded-xl px-4 py-3">
                <div className="flex items-center gap-1.5 mb-2"><Hash className="w-3.5 h-3.5 text-slate-500" /><p className="text-xs text-slate-500 font-medium">Reference IDs</p></div>
                <div className="space-y-1 font-mono text-xs text-slate-500">
                  <p><span className="text-slate-400">Booking:</span> {selectedBooking.id}</p>
                  <p><span className="text-slate-400">Customer:</span> {selectedBooking.customerId}</p>
                  <p><span className="text-slate-400">Owner:</span> {selectedBooking.ownerId}</p>
                </div>
              </div>

              <button onClick={() => setSelectedBooking(null)} className="w-full bg-white/[0.06] hover:bg-white/[0.12] text-slate-300 font-bold py-2.5 rounded-xl transition">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MonitorBookings;
