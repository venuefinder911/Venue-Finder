import { useEffect, useState } from "react";
import { db } from "../../services/firebase";
import {
  collection,
  getDocs,
  doc,
  writeBatch,
} from "firebase/firestore";
import { toast } from "react-toastify";
import AdminHeader from "../../components/AdminHeader";
import {
  Users,
  Building2,
  Trash2,
  Search,
  Loader2,
  Mail,
  Calendar,
  Flag,
  AlertTriangle,
  UserX,
  ShieldOff,
  Inbox,
  ChevronDown,
  ChevronUp,
  X,
  MapPin,
  Phone,
  Banknote,
  CheckCircle2,
  XCircle,
  Clock,
  Star,
} from "lucide-react";

const formatDate = (ts) => {
  if (!ts) return "N/A";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

// ── Shared dark card ─────────────────────────────────────────────────────────
const DarkCard = ({ children, onClick, className = "" }) => (
  <div
    onClick={onClick}
    className={`bg-white/[0.04] border border-white/[0.07] rounded-2xl hover:bg-white/[0.07] transition-all ${
      onClick ? "cursor-pointer" : ""
    } ${className}`}
  >
    {children}
  </div>
);

const StatusDot = ({ status }) => {
  const map = {
    approved: "bg-emerald-400",
    rejected: "bg-red-400",
    pending: "bg-amber-400",
  };
  return (
    <span className={`w-2 h-2 rounded-full inline-block ${map[status] || map.pending}`} />
  );
};

const ManageUsers = () => {
  const [activeTab, setActiveTab] = useState("customers");

  const [customers, setCustomers] = useState([]);
  const [owners, setOwners] = useState([]);
  const [venues, setVenues] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expandedOwner, setExpandedOwner] = useState(null);

  // Modals
  const [selectedUser, setSelectedUser] = useState(null);   // user detail modal
  const [selectedVenue, setSelectedVenue] = useState(null); // venue detail modal
  const [removeTarget, setRemoveTarget] = useState(null);
  const [removing, setRemoving] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [usersSnap, venuesSnap, complaintsSnap] = await Promise.all([
          getDocs(collection(db, "users")),
          getDocs(collection(db, "venues")),
          getDocs(collection(db, "complaints")),
        ]);
        const allUsers = usersSnap.docs.map((d) => ({ uid: d.id, ...d.data() }));
        setCustomers(allUsers.filter((u) => u.role === "customer"));
        setOwners(allUsers.filter((u) => u.role === "owner"));
        setVenues(venuesSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setComplaints(complaintsSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error(err);
        toast.error("Failed to load users.");
      }
      setLoading(false);
    };
    load();
  }, []);

  const ownerVenues = (uid) => venues.filter((v) => v.ownerId === uid);
  const venueComplaintCount = (vid) => complaints.filter((c) => c.venueId === vid).length;
  const ownerComplaintCount = (uid) =>
    ownerVenues(uid).reduce((s, v) => s + venueComplaintCount(v.id), 0);

  const handleRemove = async () => {
    if (!removeTarget) return;
    setRemoving(true);
    try {
      const batch = writeBatch(db);
      batch.delete(doc(db, "users", removeTarget.uid));
      if (removeTarget.role === "owner") {
        ownerVenues(removeTarget.uid).forEach((v) =>
          batch.delete(doc(db, "venues", v.id))
        );
      }
      await batch.commit();
      if (removeTarget.role === "customer") {
        setCustomers((p) => p.filter((u) => u.uid !== removeTarget.uid));
      } else {
        setOwners((p) => p.filter((u) => u.uid !== removeTarget.uid));
        setVenues((p) => p.filter((v) => v.ownerId !== removeTarget.uid));
      }
      toast.success(`${removeTarget.name || "User"} removed.`);
      setRemoveTarget(null);
      setSelectedUser(null);
    } catch (err) {
      console.error(err);
      toast.error("Failed to remove user.");
    }
    setRemoving(false);
  };

  const filteredCustomers = customers.filter((u) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q);
  });

  const filteredOwners = owners.filter((u) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      u.name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      ownerVenues(u.uid).some((v) => v.name?.toLowerCase().includes(q))
    );
  });

  const list = activeTab === "customers" ? filteredCustomers : filteredOwners;

  return (
    <div className="min-h-screen bg-[#07091a] text-white">
      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-64 -left-64 w-[500px] h-[500px] bg-indigo-700/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-64 -right-64 w-[500px] h-[500px] bg-sky-700/8 rounded-full blur-3xl" />
      </div>

      <AdminHeader title="User Management" titleIcon={Users} />

      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Page heading */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold uppercase tracking-widest mb-2">
            <Users className="w-3.5 h-3.5" /> User Management
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Manage Users</h1>
          <p className="text-slate-400 mt-1">
            View, inspect, and remove customers and venue owners.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total Customers", value: customers.length, color: "bg-indigo-500/20 text-indigo-400" },
            { label: "Total Owners", value: owners.length, color: "bg-sky-500/20 text-sky-400" },
            { label: "Total Venues", value: venues.length, color: "bg-emerald-500/20 text-emerald-400" },
            { label: "Complaints", value: complaints.length, color: "bg-red-500/20 text-red-400" },
          ].map(({ label, value, color }) => (
            <div
              key={label}
              className="bg-white/[0.04] border border-white/[0.07] rounded-2xl p-5"
            >
              <p className="text-slate-400 text-xs font-medium uppercase tracking-wide mb-1">
                {label}
              </p>
              <p className={`text-2xl font-extrabold ${color.split(" ")[1]}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* Sticky search + tabs — stick below AdminHeader */}
        <div className="sticky top-14 sm:top-16 z-10 bg-[#07091a] -mx-4 sm:-mx-6 px-4 sm:px-6 pb-4 pt-2">
          {/* Search */}
          <div className="relative mb-3">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search by name, email, or venue..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/[0.05] border border-white/[0.08] text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition"
            />
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-3">
            {[
              { key: "customers", label: "Customers", icon: Users, count: customers.length },
              { key: "owners", label: "Venue Owners", icon: Building2, count: owners.length },
            ].map(({ key, label, icon: Icon, count }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition ${
                  activeTab === key
                    ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/25"
                    : "bg-white/[0.04] border border-white/[0.08] text-slate-400 hover:text-white hover:bg-white/[0.08]"
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
                <span
                  className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                    activeTab === key ? "bg-white/20" : "bg-white/[0.08] text-slate-400"
                  }`}
                >
                  {count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {loading && (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
          </div>
        )}

        {!loading && list.length === 0 && (
          <div className="text-center py-20 bg-white/[0.03] border border-white/[0.07] rounded-2xl">
            <Inbox className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400 font-semibold">No users found</p>
          </div>
        )}

        {/* ── CUSTOMER LIST ── */}
        {!loading && activeTab === "customers" && (
          <div className="space-y-3">
            {filteredCustomers.map((u) => (
              <DarkCard
                key={u.uid}
                onClick={() => setSelectedUser(u)}
                className="p-5 flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-extrabold text-sm flex-shrink-0">
                    {(u.name || u.email || "?")[0].toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-white truncate">{u.name || "Unnamed"}</p>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                      <Mail className="w-3 h-3" />
                      <span className="truncate">{u.email}</span>
                    </div>
                    {u.createdAt && (
                      <div className="flex items-center gap-1.5 text-xs text-slate-600 mt-0.5">
                        <Calendar className="w-3 h-3" />
                        Joined {formatDate(u.createdAt)}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-500/15 text-indigo-400 border border-indigo-500/20">
                    <Users className="w-3 h-3" /> Customer
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setRemoveTarget({ uid: u.uid, name: u.name || u.email, role: "customer" });
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-red-400 hover:text-white hover:bg-red-500 border border-red-500/30 rounded-xl transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Remove
                  </button>
                </div>
              </DarkCard>
            ))}
          </div>
        )}

        {/* ── OWNER LIST ── */}
        {!loading && activeTab === "owners" && (
          <div className="space-y-3">
            {filteredOwners.map((u) => {
              const ov = ownerVenues(u.uid);
              const totalComplaints = ownerComplaintCount(u.uid);
              const isExpanded = expandedOwner === u.uid;

              return (
                <div
                  key={u.uid}
                  className="bg-white/[0.04] border border-white/[0.07] rounded-2xl overflow-hidden hover:bg-white/[0.06] transition"
                >
                  <div
                    className="p-5 flex items-center justify-between gap-4 cursor-pointer"
                    onClick={() => setSelectedUser(u)}
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-sky-500/20 flex items-center justify-center text-sky-400 font-extrabold text-sm flex-shrink-0">
                        {(u.name || u.email || "?")[0].toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold text-white truncate">{u.name || "Unnamed"}</p>
                          {totalComplaints > 0 && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-red-500/15 text-red-400 border border-red-500/20">
                              <Flag className="w-3 h-3" />
                              {totalComplaints} complaint{totalComplaints > 1 ? "s" : ""}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                          <Mail className="w-3 h-3" />
                          <span className="truncate">{u.email}</span>
                        </div>
                        <p className="text-xs text-slate-600 mt-0.5">
                          {ov.length} venue{ov.length !== 1 ? "s" : ""}
                          {u.createdAt ? ` · Joined ${formatDate(u.createdAt)}` : ""}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {ov.length > 0 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedOwner(isExpanded ? null : u.uid);
                          }}
                          className="flex items-center gap-1 px-3 py-2 text-xs font-semibold text-slate-400 hover:text-white bg-white/[0.04] border border-white/[0.08] rounded-xl transition"
                        >
                          {isExpanded ? (
                            <ChevronUp className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5" />
                          )}
                          Venues
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setRemoveTarget({
                            uid: u.uid,
                            name: u.name || u.email,
                            role: "owner",
                            venueCount: ov.length,
                          });
                        }}
                        className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-red-400 hover:text-white hover:bg-red-500 border border-red-500/30 rounded-xl transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Remove
                      </button>
                    </div>
                  </div>

                  {/* Expanded venues */}
                  {isExpanded && ov.length > 0 && (
                    <div className="border-t border-white/[0.06] bg-white/[0.02] px-5 py-4">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">
                        Venues
                      </p>
                      <div className="space-y-2">
                        {ov.map((v) => {
                          const vc = venueComplaintCount(v.id);
                          return (
                            <div
                              key={v.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedVenue(v);
                              }}
                              className="flex items-center justify-between bg-white/[0.04] border border-white/[0.07] rounded-xl px-4 py-3 cursor-pointer hover:bg-white/[0.08] transition"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <img
                                  src={
                                    v.images?.[0] ||
                                    "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=80&q=50"
                                  }
                                  alt={v.name}
                                  className="w-9 h-9 rounded-lg object-cover flex-shrink-0"
                                />
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold text-white truncate">
                                    {v.name}
                                  </p>
                                  <p className="text-xs text-slate-500 truncate">
                                    {v.city || v.location}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <StatusDot status={v.status} />
                                <span className="text-xs text-slate-400 capitalize">
                                  {v.status || "Pending"}
                                </span>
                                {vc > 0 && (
                                  <span className="flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/20">
                                    <AlertTriangle className="w-3 h-3" />
                                    {vc}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* ══════════════════ USER DETAIL MODAL ══════════════════ */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#0d1225] border border-white/[0.1] rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            {/* Modal header */}
            <div className="flex items-center justify-between p-6 border-b border-white/[0.07]">
              <h3 className="text-lg font-extrabold text-white">User Details</h3>
              <button
                onClick={() => setSelectedUser(null)}
                className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-slate-400 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Avatar + basics */}
              <div className="flex items-center gap-4">
                <div
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center font-extrabold text-lg flex-shrink-0 ${
                    selectedUser.role === "owner"
                      ? "bg-sky-500/20 text-sky-400"
                      : "bg-indigo-500/20 text-indigo-400"
                  }`}
                >
                  {(selectedUser.name || selectedUser.email || "?")[0].toUpperCase()}
                </div>
                <div>
                  <p className="text-xl font-extrabold text-white">
                    {selectedUser.name || "Unnamed"}
                  </p>
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold mt-1 ${
                      selectedUser.role === "owner"
                        ? "bg-sky-500/15 text-sky-400 border border-sky-500/20"
                        : "bg-indigo-500/15 text-indigo-400 border border-indigo-500/20"
                    }`}
                  >
                    {selectedUser.role === "owner" ? (
                      <Building2 className="w-3 h-3" />
                    ) : (
                      <Users className="w-3 h-3" />
                    )}
                    {selectedUser.role === "owner" ? "Venue Owner" : "Customer"}
                  </span>
                </div>
              </div>

              {/* Info rows */}
              <div className="space-y-3">
                <div className="flex items-center gap-3 bg-white/[0.04] border border-white/[0.07] rounded-xl px-4 py-3">
                  <Mail className="w-4 h-4 text-slate-500 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-slate-500 font-medium">Email</p>
                    <p className="text-sm text-white font-semibold">{selectedUser.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-white/[0.04] border border-white/[0.07] rounded-xl px-4 py-3">
                  <Calendar className="w-4 h-4 text-slate-500 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-slate-500 font-medium">Joined</p>
                    <p className="text-sm text-white font-semibold">
                      {formatDate(selectedUser.createdAt)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-white/[0.04] border border-white/[0.07] rounded-xl px-4 py-3">
                  <Users className="w-4 h-4 text-slate-500 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-slate-500 font-medium">User ID</p>
                    <p className="text-xs text-slate-300 font-mono break-all">{selectedUser.uid}</p>
                  </div>
                </div>
              </div>

              {/* Owner: venue list */}
              {selectedUser.role === "owner" && (() => {
                const ov = ownerVenues(selectedUser.uid);
                const tc = ownerComplaintCount(selectedUser.uid);
                return (
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">
                      Venues ({ov.length})
                      {tc > 0 && (
                        <span className="ml-2 text-red-400">· {tc} complaint{tc > 1 ? "s" : ""}</span>
                      )}
                    </p>
                    {ov.length === 0 ? (
                      <p className="text-sm text-slate-600 italic">No venues listed.</p>
                    ) : (
                      <div className="space-y-2">
                        {ov.map((v) => (
                          <div
                            key={v.id}
                            onClick={() => { setSelectedUser(null); setSelectedVenue(v); }}
                            className="flex items-center gap-3 bg-white/[0.04] border border-white/[0.07] rounded-xl px-4 py-3 cursor-pointer hover:bg-white/[0.08] transition"
                          >
                            <img
                              src={v.images?.[0] || "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=80&q=50"}
                              alt={v.name}
                              className="w-9 h-9 rounded-lg object-cover flex-shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-white truncate">{v.name}</p>
                              <p className="text-xs text-slate-500">{v.city || v.location}</p>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <StatusDot status={v.status} />
                              <span className="text-xs text-slate-400 capitalize">{v.status || "pending"}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setRemoveTarget({
                      uid: selectedUser.uid,
                      name: selectedUser.name || selectedUser.email,
                      role: selectedUser.role,
                      venueCount: ownerVenues(selectedUser.uid).length,
                    });
                  }}
                  className="flex-1 flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/30 font-bold py-2.5 rounded-xl transition"
                >
                  <Trash2 className="w-4 h-4" />
                  Remove User
                </button>
                <button
                  onClick={() => setSelectedUser(null)}
                  className="flex-1 bg-white/[0.06] hover:bg-white/[0.12] text-slate-300 font-bold py-2.5 rounded-xl transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════ VENUE DETAIL MODAL ══════════════════ */}
      {selectedVenue && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#0d1225] border border-white/[0.1] rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-white/[0.07]">
              <h3 className="text-lg font-extrabold text-white">Venue Details</h3>
              <button
                onClick={() => setSelectedVenue(null)}
                className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-slate-400 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Image */}
              {selectedVenue.images?.[0] && (
                <img
                  src={selectedVenue.images[0]}
                  alt={selectedVenue.name}
                  className="w-full h-48 object-cover rounded-xl"
                />
              )}

              {/* Name + status */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="text-xl font-extrabold text-white">{selectedVenue.name}</h4>
                  <p className="text-slate-400 text-sm mt-0.5">{selectedVenue.category}</p>
                </div>
                <span
                  className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border flex-shrink-0 ${
                    selectedVenue.status === "approved"
                      ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/20"
                      : selectedVenue.status === "rejected"
                      ? "bg-red-500/15 text-red-400 border-red-500/20"
                      : "bg-amber-500/15 text-amber-400 border-amber-500/20"
                  }`}
                >
                  {selectedVenue.status === "approved" ? (
                    <CheckCircle2 className="w-3 h-3" />
                  ) : selectedVenue.status === "rejected" ? (
                    <XCircle className="w-3 h-3" />
                  ) : (
                    <Clock className="w-3 h-3" />
                  )}
                  {selectedVenue.status || "Pending"}
                </span>
              </div>

              {/* Details grid */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon: MapPin, label: "Location", value: selectedVenue.city || selectedVenue.location || "N/A" },
                  { icon: Users, label: "Capacity", value: selectedVenue.capacity ? `${selectedVenue.capacity} guests` : "N/A" },
                  { icon: Banknote, label: "Starting From", value: selectedVenue.packages?.length > 0 ? `PKR ${Math.min(...selectedVenue.packages.map((p) => Number(p.pricePerPerson))).toLocaleString()}/person` : "Contact for pricing" },
                  { icon: Phone, label: "Contact", value: selectedVenue.contact || "N/A" },
                ].map(({ icon: Icon, label, value }) => (
                  <div
                    key={label}
                    className="bg-white/[0.04] border border-white/[0.07] rounded-xl px-4 py-3"
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <Icon className="w-3.5 h-3.5 text-slate-500" />
                      <p className="text-xs text-slate-500 font-medium">{label}</p>
                    </div>
                    <p className="text-sm text-white font-semibold truncate">{value}</p>
                  </div>
                ))}
              </div>

              {/* Complaints for this venue */}
              {(() => {
                const vc = venueComplaintCount(selectedVenue.id);
                return vc > 0 ? (
                  <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                    <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
                    <p className="text-sm text-red-400 font-semibold">
                      {vc} complaint{vc > 1 ? "s" : ""} filed against this venue
                    </p>
                  </div>
                ) : null;
              })()}

              {selectedVenue.description && (
                <div className="bg-white/[0.04] border border-white/[0.07] rounded-xl px-4 py-3">
                  <p className="text-xs text-slate-500 font-medium mb-1">Description</p>
                  <p className="text-sm text-slate-300 line-clamp-4">
                    {selectedVenue.description}
                  </p>
                </div>
              )}

              <button
                onClick={() => setSelectedVenue(null)}
                className="w-full bg-white/[0.06] hover:bg-white/[0.12] text-slate-300 font-bold py-2.5 rounded-xl transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════ REMOVE CONFIRMATION ══════════════════ */}
      {removeTarget && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#0d1225] border border-white/[0.1] rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="w-12 h-12 bg-red-500/15 rounded-full flex items-center justify-center mx-auto mb-4">
              {removeTarget.role === "owner" ? (
                <ShieldOff className="w-6 h-6 text-red-400" />
              ) : (
                <UserX className="w-6 h-6 text-red-400" />
              )}
            </div>
            <h3 className="text-lg font-extrabold text-white text-center mb-2">
              Remove User
            </h3>
            <p className="text-sm text-slate-400 text-center mb-3">
              Remove{" "}
              <span className="font-bold text-white">{removeTarget.name}</span>?
            </p>
            {removeTarget.role === "owner" && removeTarget.venueCount > 0 && (
              <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 mb-4 text-xs text-amber-400">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                This will also delete their {removeTarget.venueCount} venue
                {removeTarget.venueCount > 1 ? "s" : ""}. Cannot be undone.
              </div>
            )}
            <p className="text-xs text-slate-600 text-center mb-5">
              App access is revoked immediately. Firebase Auth account must be deleted
              separately from the Firebase Console.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleRemove}
                disabled={removing}
                className="flex-1 flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white font-bold py-2.5 rounded-xl transition disabled:opacity-60"
              >
                {removing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                {removing ? "Removing..." : "Yes, Remove"}
              </button>
              <button
                onClick={() => setRemoveTarget(null)}
                className="flex-1 bg-white/[0.06] hover:bg-white/[0.12] text-slate-300 font-bold py-2.5 rounded-xl transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageUsers;
