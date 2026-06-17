import { useEffect, useMemo, useState } from "react";
import { db, auth } from "../../services/firebase";
import {
  collection, getDocs, updateDoc, deleteDoc, doc,
} from "firebase/firestore";
import { createNotification } from "../../services/notifications";
import { signOut } from "firebase/auth";
import { useDispatch, useSelector } from "react-redux";
import { logout } from "../../features/auth/authSlice";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import {
  Shield, LogOut, RefreshCw, Search, CheckCircle2, XCircle,
  Trash2, Building2, Clock3, LayoutDashboard, MapPin, ChevronDown,
  Flag, Users, BookOpen, X, Phone, Banknote, Loader2, Menu,
} from "lucide-react";

const STATUS = {
  approved: { label: "Approved", cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20", dot: "bg-emerald-400" },
  rejected: { label: "Rejected", cls: "bg-red-500/15 text-red-400 border-red-500/20",            dot: "bg-red-400" },
  pending:  { label: "Pending",  cls: "bg-amber-500/15 text-amber-400 border-amber-500/20",       dot: "bg-amber-400" },
};

const StatCard = ({ label, value, icon: Icon, color, onClick, active, ring = "ring-white/20" }) => (
  <div
    onClick={onClick}
    className={`rounded-2xl p-5 flex items-center gap-4 transition-all duration-200 ${
      onClick ? "cursor-pointer select-none" : ""
    } ${
      active
        ? `bg-white/[0.08] ring-2 ${ring} shadow-lg`
        : "bg-white/[0.04] border border-white/[0.07] hover:bg-white/[0.07] hover:border-white/[0.12]"
    }`}
  >
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
      <Icon className="w-5 h-5" />
    </div>
    <div>
      <p className="text-slate-400 text-xs font-medium uppercase tracking-wide">{label}</p>
      <p className="text-white text-2xl font-extrabold mt-0.5">{value}</p>
      {onClick && (
        <p className={`text-[10px] font-semibold text-slate-400 mt-0.5 transition-opacity duration-200 ${active ? "opacity-100" : "opacity-0"}`}>
          Filtering ✓
        </p>
      )}
    </div>
  </div>
);

const AdminDashboard = () => {
  const [venues,        setVenues]        = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [filter,        setFilter]        = useState("all");
  const [search,        setSearch]        = useState("");
  const [actionLoading, setActionLoading] = useState(null);
  const [refreshing,    setRefreshing]    = useState(false);
  const [selectedVenue, setSelectedVenue] = useState(null);

  // Reject-with-reason modal
  const [rejectTarget,  setRejectTarget]  = useState(null);  // { id, name, ownerId }
  const [rejectReason,  setRejectReason]  = useState("");
  const [rejectLoading, setRejectLoading] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((s) => s.auth);
  const displayName = user?.displayName || user?.email?.split("@")[0] || "Admin";

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchVenues = async (silent = false) => {
    if (!silent) setLoading(true); else setRefreshing(true);
    try {
      const snap = await getDocs(collection(db, "venues"));
      setVenues(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch { toast.error("Failed to load venues"); }
    setLoading(false); setRefreshing(false);
  };

  useEffect(() => { fetchVenues(); }, []);

  const stats = useMemo(() => ({
    total:    venues.length,
    pending:  venues.filter((v) => !v.status || v.status === "pending").length,
    approved: venues.filter((v) => v.status === "approved").length,
    rejected: venues.filter((v) => v.status === "rejected").length,
  }), [venues]);

  const filtered = venues.filter((v) => {
    const s = v.status || "pending";
    const matchFilter = filter === "all" ? true : filter === "pending" ? s === "pending" : s === filter;
    const matchSearch = v.name?.toLowerCase().includes(search.toLowerCase()) || v.location?.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  // ── Actions ────────────────────────────────────────────────────────────────
  const approveVenue = async (id) => {
    setActionLoading(id + "_approve");
    try {
      await updateDoc(doc(db, "venues", id), { status: "approved", rejectionReason: null });
      toast.success("Venue approved ✅");
      fetchVenues(true);
    } catch { toast.error("Failed to approve"); }
    setActionLoading(null);
  };

  // Opens the reject modal
  const openRejectModal = (venue) => {
    setRejectTarget({ id: venue.id, name: venue.name, ownerId: venue.ownerId });
    setRejectReason("");
  };

  const confirmReject = async () => {
    if (!rejectTarget) return;
    const reason = rejectReason.trim();
    if (!reason) { toast.error("Please enter a rejection reason."); return; }
    setRejectLoading(true);
    try {
      await updateDoc(doc(db, "venues", rejectTarget.id), {
        status: "rejected",
        rejectionReason: reason,
      });
      // Notify the owner
      if (rejectTarget.ownerId) {
        await createNotification({
          userId: rejectTarget.ownerId,
          title: "Venue Rejected",
          message: `Your venue "${rejectTarget.name}" was rejected. Reason: ${reason}`,
          type: "venue_rejected",
          bookingId: "",
          venueName: rejectTarget.name,
        });
      }
      toast.warning("Venue rejected and owner notified.");
      setRejectTarget(null); setRejectReason("");
      setSelectedVenue(null);
      fetchVenues(true);
    } catch (err) { console.error(err); toast.error("Failed to reject venue."); }
    setRejectLoading(false);
  };

  const deleteVenue = async (id) => {
    // Use window.confirm — acceptable in admin-only dashboard
    // eslint-disable-next-line no-restricted-globals
    if (!window.confirm("Permanently delete this venue? This cannot be undone.")) return;
    setActionLoading(id + "_delete");
    try {
      await deleteDoc(doc(db, "venues", id));
      toast.success("Venue deleted.");
      fetchVenues(true);
    } catch { toast.error("Failed to delete"); }
    setActionLoading(null);
  };

  const handleLogout = async () => {
    await signOut(auth);
    dispatch(logout());
    navigate("/login/Admin");
  };

  return (
    <div className="min-h-screen bg-[#07091a] text-white">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-64 -left-64 w-[600px] h-[600px] bg-indigo-700/15 rounded-full blur-3xl" />
        <div className="absolute -bottom-64 -right-64 w-[600px] h-[600px] bg-sky-700/10 rounded-full blur-3xl" />
        <div className="absolute inset-0 opacity-[0.025]" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
      </div>

      {/* Header */}
      <header className="relative z-20 border-b border-indigo-900/60 bg-[#0b0f2e] shadow-lg shadow-black/40 sticky top-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-sky-500 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-extrabold text-white leading-none">VenueFinder</p>
              <p className="text-[11px] text-indigo-400 font-semibold tracking-wide">ADMIN CONSOLE</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Desktop nav */}
            <div className="hidden sm:flex items-center gap-1.5">
              <button onClick={() => navigate("/admin/users")} className="flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-indigo-400 bg-white/[0.04] hover:bg-indigo-500/10 border border-white/[0.07] hover:border-indigo-500/20 px-3 py-2 rounded-xl transition">
                <Users className="w-3.5 h-3.5" /><span className="hidden md:inline">Users</span>
              </button>
              <button onClick={() => navigate("/admin/bookings")} className="flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-sky-400 bg-white/[0.04] hover:bg-sky-500/10 border border-white/[0.07] hover:border-sky-500/20 px-3 py-2 rounded-xl transition">
                <BookOpen className="w-3.5 h-3.5" /><span className="hidden md:inline">Bookings</span>
              </button>
              <button onClick={() => navigate("/admin/complaints")} className="flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-red-400 bg-white/[0.04] hover:bg-red-500/10 border border-white/[0.07] hover:border-red-500/20 px-3 py-2 rounded-xl transition">
                <Flag className="w-3.5 h-3.5" /><span className="hidden md:inline">Complaints</span>
              </button>
            </div>
            {/* Refresh — always visible */}
            <button onClick={() => fetchVenues(true)} disabled={refreshing} className="flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.07] px-3 py-2 rounded-xl transition">
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            {/* Admin pill */}
            <div className="flex items-center gap-2 bg-white/[0.05] border border-white/[0.08] rounded-xl px-2.5 py-2">
              <div className="w-6 h-6 bg-gradient-to-br from-indigo-500 to-sky-500 rounded-full flex items-center justify-center text-white text-xs font-extrabold flex-shrink-0">
                {displayName[0]?.toUpperCase()}
              </div>
              <div className="hidden sm:block">
                <p className="text-xs font-bold text-white leading-none">{displayName}</p>
                <p className="text-[10px] text-indigo-400 mt-0.5">Administrator</p>
              </div>
            </div>
            <button onClick={handleLogout} className="flex items-center gap-1.5 text-xs font-semibold text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 px-2.5 py-2 rounded-xl transition">
              <LogOut className="w-3.5 h-3.5" /><span className="hidden sm:inline">Logout</span>
            </button>
            {/* Hamburger — mobile only */}
            <button
              onClick={() => setMobileMenuOpen((o) => !o)}
              aria-label="Toggle navigation"
              className="sm:hidden flex items-center justify-center w-9 h-9 rounded-xl bg-white/[0.06] border border-white/[0.08] text-slate-300 hover:text-white transition"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>
        {/* Mobile dropdown */}
        {mobileMenuOpen && (
          <div className="sm:hidden border-t border-indigo-900/40 bg-[#0c1030] px-4 py-3 space-y-1">
            {[
              { label: "Users",      icon: Users,    path: "/admin/users" },
              { label: "Bookings",   icon: BookOpen, path: "/admin/bookings" },
              { label: "Complaints", icon: Flag,     path: "/admin/complaints" },
            ].map(({ label, icon: Icon, path }) => (
              <button
                key={label}
                onClick={() => { navigate(path); setMobileMenuOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-slate-300 hover:text-white hover:bg-white/[0.06] transition text-left"
              >
                <Icon className="w-4 h-4 text-slate-400" />
                {label}
              </button>
            ))}
          </div>
        )}
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold uppercase tracking-widest mb-2">
            <LayoutDashboard className="w-3.5 h-3.5" /> Overview
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Venue Management</h1>
          <p className="text-slate-400 mt-1">Review, approve, reject, and manage all submitted venues.</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard label="Total Venues" value={stats.total}    icon={Building2}    color="bg-indigo-500/20 text-indigo-400"   ring="ring-indigo-500/50"  onClick={() => setFilter("all")}      active={filter === "all"} />
          <StatCard label="Pending"      value={stats.pending}  icon={Clock3}       color="bg-amber-500/20 text-amber-400"     ring="ring-amber-500/50"   onClick={() => setFilter("pending")}  active={filter === "pending"} />
          <StatCard label="Approved"     value={stats.approved} icon={CheckCircle2} color="bg-emerald-500/20 text-emerald-400" ring="ring-emerald-500/50" onClick={() => setFilter("approved")} active={filter === "approved"} />
          <StatCard label="Rejected"     value={stats.rejected} icon={XCircle}      color="bg-red-500/20 text-red-400"         ring="ring-red-500/50"     onClick={() => setFilter("rejected")} active={filter === "rejected"} />
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
            <input placeholder="Search by name or location…" value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/[0.05] border border-white/[0.08] text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition text-sm" />
          </div>
          <div className="relative">
            <select value={filter} onChange={(e) => setFilter(e.target.value)}
              className="appearance-none pl-4 pr-9 py-3 rounded-xl bg-white/[0.05] border border-white/[0.08] text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition text-sm cursor-pointer">
              <option value="all"      className="bg-slate-900">All Statuses</option>
              <option value="pending"  className="bg-slate-900">Pending</option>
              <option value="approved" className="bg-slate-900">Approved</option>
              <option value="rejected" className="bg-slate-900">Rejected</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4 pointer-events-none" />
          </div>
        </div>

        <p className="text-slate-500 text-sm mb-4">Showing <span className="text-white font-semibold">{filtered.length}</span> venue{filtered.length !== 1 ? "s" : ""}</p>

        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white/[0.04] border border-white/[0.07] rounded-2xl overflow-hidden animate-pulse">
                <div className="h-44 bg-white/[0.05]" />
                <div className="p-5 space-y-3">
                  <div className="h-4 bg-white/[0.06] rounded-full w-3/4" />
                  <div className="h-3 bg-white/[0.04] rounded-full w-1/2" />
                  <div className="flex gap-2 pt-2">
                    <div className="h-9 bg-white/[0.04] rounded-xl flex-1" />
                    <div className="h-9 bg-white/[0.04] rounded-xl flex-1" />
                    <div className="h-9 bg-white/[0.04] rounded-xl w-9" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-600">
            <Building2 className="w-12 h-12 mb-3 opacity-30" />
            <p className="font-semibold text-lg text-slate-500">No venues found</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((v) => {
              const statusKey = v.status || "pending";
              const statusCfg = STATUS[statusKey] || STATUS.pending;
              const thumb = (Array.isArray(v.images) ? v.images[0] : null) || v.image || null;
              return (
                <div key={v.id} onClick={() => setSelectedVenue(v)}
                  className="group bg-white/[0.04] border border-white/[0.07] rounded-2xl overflow-hidden hover:bg-white/[0.06] hover:border-white/[0.12] transition-all duration-300 cursor-pointer">
                  <div className="relative h-44 bg-slate-800 overflow-hidden">
                    {thumb
                      ? <img src={thumb} alt={v.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      : <div className="w-full h-full flex items-center justify-center"><Building2 className="w-10 h-10 text-slate-600" /></div>}
                    <div className="absolute top-3 left-3">
                      <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full border ${statusCfg.cls}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
                        {statusCfg.label}
                      </span>
                    </div>
                  </div>
                  <div className="p-5">
                    <h3 className="font-bold text-white text-base leading-tight line-clamp-1">{v.name || "Unnamed Venue"}</h3>
                    <div className="flex items-center gap-1.5 mt-1 text-slate-400 text-xs">
                      <MapPin className="w-3 h-3 flex-shrink-0" />
                      <span className="line-clamp-1">{v.location || "No location"}</span>
                    </div>
                    <div className="flex gap-3 mt-3 text-xs">
                      {v.capacity && <span className="text-slate-500">👥 <span className="text-slate-300 font-medium">{v.capacity}</span> guests</span>}
                      {v.packages?.length > 0 && <span className="text-slate-500">💰 from <span className="text-slate-300 font-medium">PKR {Math.min(...v.packages.map((p) => Number(p.pricePerPerson))).toLocaleString()}</span>/person</span>}
                    </div>
                    <div className="flex gap-2 mt-4" onClick={(e) => e.stopPropagation()}>
                      {statusKey !== "approved" && (
                        <button onClick={(e) => { e.stopPropagation(); approveVenue(v.id); }} disabled={actionLoading !== null}
                          className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/20 text-emerald-400 text-xs font-bold py-2.5 rounded-xl transition disabled:opacity-50">
                          {actionLoading === v.id + "_approve" ? <span className="w-3 h-3 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                          Approve
                        </button>
                      )}
                      {statusKey !== "rejected" && (
                        <button onClick={(e) => { e.stopPropagation(); openRejectModal(v); }} disabled={actionLoading !== null}
                          className="flex-1 flex items-center justify-center gap-1.5 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/20 text-amber-400 text-xs font-bold py-2.5 rounded-xl transition disabled:opacity-50">
                          <XCircle className="w-3.5 h-3.5" /> Reject
                        </button>
                      )}
                      <button onClick={(e) => { e.stopPropagation(); deleteVenue(v.id); }} disabled={actionLoading !== null}
                        className="w-10 flex items-center justify-center bg-red-500/15 hover:bg-red-500/25 border border-red-500/20 text-red-400 rounded-xl transition disabled:opacity-50">
                        {actionLoading === v.id + "_delete" ? <span className="w-3 h-3 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* ── VENUE DETAIL MODAL ── */}
      {selectedVenue && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={() => setSelectedVenue(null)}>
          <div className="bg-[#0d1225] border border-white/[0.1] rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-white/[0.07]">
              <h3 className="text-lg font-extrabold text-white">Venue Details</h3>
              <button onClick={() => setSelectedVenue(null)} className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-slate-400 hover:text-white transition">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-5">
              {(Array.isArray(selectedVenue.images) ? selectedVenue.images[0] : selectedVenue.image) && (
                <img src={Array.isArray(selectedVenue.images) ? selectedVenue.images[0] : selectedVenue.image} alt={selectedVenue.name} className="w-full h-48 object-cover rounded-xl" />
              )}
              <div className="flex items-start justify-between gap-3">
                <h4 className="text-xl font-extrabold text-white">{selectedVenue.name || "Unnamed Venue"}</h4>
                {(() => { const s = selectedVenue.status || "pending"; const cfg = STATUS[s] || STATUS.pending; return (
                  <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border flex-shrink-0 ${cfg.cls}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />{cfg.label}
                  </span>
                ); })()}
              </div>

              {/* Show rejection reason if rejected */}
              {selectedVenue.status === "rejected" && selectedVenue.rejectionReason && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                  <p className="text-xs text-red-400 font-bold mb-1">Rejection Reason</p>
                  <p className="text-sm text-red-300">{selectedVenue.rejectionReason}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon: MapPin,    label: "Location", value: selectedVenue.location || selectedVenue.city || "N/A" },
                  { icon: Users,     label: "Capacity", value: selectedVenue.capacity ? `${selectedVenue.capacity} guests` : "N/A" },
                  { icon: Banknote,label: "Starting from", value: selectedVenue.packages?.length > 0 ? `PKR ${Math.min(...selectedVenue.packages.map((p) => Number(p.pricePerPerson))).toLocaleString()}/person` : "Contact for pricing" },
                  { icon: Phone,     label: "Contact",  value: selectedVenue.contact || "N/A" },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="bg-white/[0.04] border border-white/[0.07] rounded-xl px-4 py-3">
                    <div className="flex items-center gap-1.5 mb-1"><Icon className="w-3.5 h-3.5 text-slate-500" /><p className="text-xs text-slate-500 font-medium">{label}</p></div>
                    <p className="text-sm text-white font-semibold truncate">{value}</p>
                  </div>
                ))}
              </div>
              {selectedVenue.amenities?.length > 0 && (
                <div className="bg-white/[0.04] border border-white/[0.07] rounded-xl px-4 py-3">
                  <p className="text-xs text-slate-500 font-medium mb-2">Amenities</p>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedVenue.amenities.map((a) => (
                      <span key={a} className="text-xs bg-indigo-500/15 text-indigo-400 border border-indigo-500/20 px-2.5 py-0.5 rounded-full font-medium">{a}</span>
                    ))}
                  </div>
                </div>
              )}
              {selectedVenue.description && (
                <div className="bg-white/[0.04] border border-white/[0.07] rounded-xl px-4 py-3">
                  <p className="text-xs text-slate-500 font-medium mb-1">Description</p>
                  <p className="text-sm text-slate-300 leading-relaxed">{selectedVenue.description}</p>
                </div>
              )}
              <div className="bg-white/[0.04] border border-white/[0.07] rounded-xl px-4 py-3">
                <p className="text-xs text-slate-500 font-medium mb-1">Owner ID</p>
                <p className="text-xs text-slate-400 font-mono break-all">{selectedVenue.ownerId || "N/A"}</p>
              </div>

              <div className="flex gap-3">
                {(selectedVenue.status || "pending") !== "approved" && (
                  <button onClick={() => { approveVenue(selectedVenue.id); setSelectedVenue(null); }}
                    className="flex-1 flex items-center justify-center gap-2 bg-emerald-500/15 hover:bg-emerald-500 text-emerald-400 hover:text-white border border-emerald-500/30 font-bold py-2.5 rounded-xl transition">
                    <CheckCircle2 className="w-4 h-4" /> Approve
                  </button>
                )}
                {(selectedVenue.status || "pending") !== "rejected" && (
                  <button onClick={() => { openRejectModal(selectedVenue); setSelectedVenue(null); }}
                    className="flex-1 flex items-center justify-center gap-2 bg-amber-500/15 hover:bg-amber-500 text-amber-400 hover:text-white border border-amber-500/30 font-bold py-2.5 rounded-xl transition">
                    <XCircle className="w-4 h-4" /> Reject
                  </button>
                )}
                <button onClick={() => setSelectedVenue(null)} className="flex-1 bg-white/[0.06] hover:bg-white/[0.12] text-slate-300 font-bold py-2.5 rounded-xl transition">
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── REJECT WITH REASON MODAL ── */}
      {rejectTarget && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#0d1225] border border-white/[0.1] rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-lg font-extrabold text-white mb-1">Reject Venue</h3>
            <p className="text-slate-400 text-sm mb-4">
              Rejecting: <span className="text-white font-semibold">"{rejectTarget.name}"</span>
            </p>
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3 mb-4">
              <p className="text-xs text-amber-400 font-semibold">The owner will be notified with your reason. Be clear and constructive.</p>
            </div>
            <label className="block text-sm font-semibold text-slate-300 mb-1.5">
              Reason for Rejection <span className="text-red-400">*</span>
            </label>
            <textarea
              value={rejectReason} onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Images are low quality, contact info is missing, description is incomplete…"
              rows={4}
              className="w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/[0.08] text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/40 resize-none transition"
            />
            <div className="flex gap-3 mt-4">
              <button onClick={confirmReject} disabled={rejectLoading}
                className="flex-1 flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white font-bold py-2.5 rounded-xl transition disabled:opacity-60">
                {rejectLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                {rejectLoading ? "Rejecting…" : "Confirm Reject"}
              </button>
              <button onClick={() => { setRejectTarget(null); setRejectReason(""); }}
                className="flex-1 bg-white/[0.06] hover:bg-white/[0.12] text-slate-300 font-bold py-2.5 rounded-xl transition">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
