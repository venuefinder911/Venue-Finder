import { useEffect, useState } from "react";
import { db } from "../../services/firebase";
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  Timestamp,
  query,
  orderBy,
} from "firebase/firestore";
import { toast } from "react-toastify";
import AdminHeader from "../../components/AdminHeader";
import {
  Flag,
  AlertTriangle,
  Info,
  ThumbsDown,
  PenLine,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  Loader2,
  Search,
  Inbox,
  X,
} from "lucide-react";

const TABS = ["All", "Pending", "Under Review", "Resolved", "Dismissed"];

const TYPE_META = {
  fraudulent_venue: { label: "Fraudulent Venue", icon: AlertTriangle, cls: "bg-red-500/15 text-red-400 border-red-500/20" },
  misleading_info: { label: "Misleading Info", icon: Info, cls: "bg-amber-500/15 text-amber-400 border-amber-500/20" },
  poor_service: { label: "Poor Service", icon: ThumbsDown, cls: "bg-orange-500/15 text-orange-400 border-orange-500/20" },
  custom: { label: "Custom", icon: PenLine, cls: "bg-sky-500/15 text-sky-400 border-sky-500/20" },
};

const STATUS_META = {
  pending: { label: "Pending", icon: Clock, cls: "bg-amber-500/15 text-amber-400 border-amber-500/20" },
  under_review: { label: "Under Review", icon: Eye, cls: "bg-blue-500/15 text-blue-400 border-blue-500/20" },
  resolved: { label: "Resolved", icon: CheckCircle2, cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20" },
  dismissed: { label: "Dismissed", icon: XCircle, cls: "bg-white/[0.08] text-slate-400 border-white/[0.1]" },
};

const formatDate = (ts) => {
  if (!ts) return "N/A";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
};

const TypeBadge = ({ type }) => {
  const meta = TYPE_META[type] || TYPE_META.custom;
  const Icon = meta.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${meta.cls}`}>
      <Icon className="w-3 h-3" />
      {meta.label}
    </span>
  );
};

const StatusBadge = ({ status }) => {
  const meta = STATUS_META[status] || STATUS_META.pending;
  const Icon = meta.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${meta.cls}`}>
      <Icon className="w-3 h-3" />
      {meta.label}
    </span>
  );
};

const ManageComplaints = () => {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("All");
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(null);
  const [newStatus, setNewStatus] = useState("");
  const [adminNote, setAdminNote] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const q = query(collection(db, "complaints"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setComplaints(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      (err) => {
        console.error(err);
        toast.error("Failed to load complaints.");
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  const tabStatus = (tab) => (tab === "Under Review" ? "under_review" : tab.toLowerCase());

  const filtered = complaints
    .filter((c) => (activeTab === "All" ? true : c.status === tabStatus(activeTab)))
    .filter((c) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        c.venueName?.toLowerCase().includes(q) ||
        c.customerEmail?.toLowerCase().includes(q) ||
        c.customerName?.toLowerCase().includes(q) ||
        c.description?.toLowerCase().includes(q)
      );
    });

  const openModal = (c) => {
    setModal(c);
    setNewStatus(c.status);
    setAdminNote(c.adminNote || "");
  };

  const handleUpdate = async () => {
    if (!modal) return;
    setProcessing(true);
    try {
      await updateDoc(doc(db, "complaints", modal.id), {
        status: newStatus,
        adminNote: adminNote.trim(),
        updatedAt: Timestamp.now(),
      });
      toast.success("Complaint updated.");
      setModal(null);
    } catch (err) {
      console.error(err);
      toast.error("Failed to update complaint.");
    }
    setProcessing(false);
  };

  const pendingCount = complaints.filter((c) => c.status === "pending").length;

  return (
    <div className="min-h-screen bg-[#07091a] text-white">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-64 -left-64 w-[500px] h-[500px] bg-red-700/8 rounded-full blur-3xl" />
        <div className="absolute -bottom-64 -right-64 w-[500px] h-[500px] bg-indigo-700/8 rounded-full blur-3xl" />
      </div>

      <AdminHeader title="Manage Complaints" titleIcon={Flag} />

      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-2 text-red-400 text-xs font-semibold uppercase tracking-widest mb-2">
            <Flag className="w-3.5 h-3.5" /> Complaint Management
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-3">
            Manage Complaints
            {pendingCount > 0 && (
              <span className="text-sm bg-red-500 text-white font-bold px-2.5 py-0.5 rounded-full">
                {pendingCount} new
              </span>
            )}
          </h1>
          <p className="text-slate-400 mt-1">Review and resolve user-submitted venue complaints.</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total", value: complaints.length, color: "text-white" },
            { label: "Pending", value: complaints.filter((c) => c.status === "pending").length, color: "text-amber-400" },
            { label: "Under Review", value: complaints.filter((c) => c.status === "under_review").length, color: "text-blue-400" },
            { label: "Resolved", value: complaints.filter((c) => c.status === "resolved").length, color: "text-emerald-400" },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white/[0.04] border border-white/[0.07] rounded-2xl p-5">
              <p className="text-slate-400 text-xs font-medium uppercase tracking-wide mb-1">{label}</p>
              <p className={`text-2xl font-extrabold ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="relative mb-5">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search by venue, customer, or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/[0.05] border border-white/[0.08] text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/40 transition"
          />
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1">
          {TABS.map((tab) => {
            const count = tab === "All" ? complaints.length : complaints.filter((c) => c.status === tabStatus(tab)).length;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition whitespace-nowrap ${
                  activeTab === tab
                    ? "bg-red-500 text-white shadow-lg shadow-red-500/25"
                    : "bg-white/[0.04] border border-white/[0.08] text-slate-400 hover:text-white hover:bg-white/[0.08]"
                }`}
              >
                {tab}
                <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full font-bold ${activeTab === tab ? "bg-white/20" : "bg-white/[0.08] text-slate-500"}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {loading && (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 text-red-400 animate-spin" />
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="text-center py-20 bg-white/[0.03] border border-white/[0.07] rounded-2xl">
            <Inbox className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400 font-semibold">No complaints found</p>
          </div>
        )}

        <div className="space-y-4">
          {filtered.map((c) => (
            <div
              key={c.id}
              className="bg-white/[0.04] border border-white/[0.07] rounded-2xl p-5 hover:bg-white/[0.07] transition cursor-pointer"
              onClick={() => openModal(c)}
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <TypeBadge type={c.type} />
                    <StatusBadge status={c.status} />
                    <span className="text-xs text-slate-500">{formatDate(c.createdAt)}</span>
                  </div>
                  <h3 className="font-bold text-white">{c.venueName}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Reported by{" "}
                    <span className="font-medium text-slate-300">
                      {c.customerName || "Unknown"} ({c.customerEmail})
                    </span>
                  </p>
                  <p className="mt-2 text-sm text-slate-400 line-clamp-2">{c.description}</p>
                  {c.adminNote && (
                    <div className="mt-2 px-3 py-2 bg-blue-500/10 border border-blue-500/20 rounded-xl text-xs text-blue-400">
                      <span className="font-bold">Admin note:</span> {c.adminNote}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1.5 px-4 py-2 bg-white/[0.06] hover:bg-white/[0.12] text-slate-300 text-sm font-semibold rounded-xl transition flex-shrink-0 self-start">
                  <Eye className="w-4 h-4" />
                  Review
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* ══════════════════ REVIEW MODAL ══════════════════ */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#0d1225] border border-white/[0.1] rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-white/[0.07]">
              <h3 className="text-lg font-extrabold text-white">Review Complaint</h3>
              <button
                onClick={() => setModal(null)}
                className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-slate-400 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div className="flex flex-wrap gap-2">
                <TypeBadge type={modal.type} />
                <StatusBadge status={modal.status} />
                <span className="text-xs text-slate-500 self-center">{formatDate(modal.createdAt)}</span>
              </div>

              <div className="bg-white/[0.04] border border-white/[0.07] rounded-xl px-4 py-3">
                <p className="text-xs text-slate-500 font-medium mb-1">Venue</p>
                <p className="text-white font-bold">{modal.venueName}</p>
              </div>

              <div className="bg-white/[0.04] border border-white/[0.07] rounded-xl px-4 py-3">
                <p className="text-xs text-slate-500 font-medium mb-1">Reporter</p>
                <p className="text-white font-semibold">
                  {modal.customerName || "Unknown"}{" "}
                  <span className="text-slate-400 font-normal">({modal.customerEmail})</span>
                </p>
              </div>

              <div className="bg-white/[0.04] border border-white/[0.07] rounded-xl px-4 py-3">
                <p className="text-xs text-slate-500 font-medium mb-1">Description</p>
                <p className="text-sm text-slate-300">{modal.description}</p>
              </div>

              {/* Status selector */}
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
                  Update Status
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {["pending", "under_review", "resolved", "dismissed"].map((s) => {
                    const meta = STATUS_META[s];
                    const active = newStatus === s;
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setNewStatus(s)}
                        className={`px-3 py-2.5 rounded-xl text-xs font-bold border transition ${
                          active
                            ? `${meta.cls} ring-2 ring-offset-1 ring-offset-[#0d1225] ring-current`
                            : "bg-white/[0.04] border-white/[0.08] text-slate-400 hover:text-white"
                        }`}
                      >
                        {meta.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Admin note */}
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
                  Admin Note (optional)
                </p>
                <textarea
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  placeholder="Add a resolution note or internal comment..."
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/[0.08] text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/40 resize-none transition"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleUpdate}
                  disabled={processing}
                  className="flex-1 flex items-center justify-center gap-2 bg-sky-500 hover:bg-sky-600 text-white font-bold py-2.5 rounded-xl transition disabled:opacity-60"
                >
                  {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  {processing ? "Saving..." : "Save Changes"}
                </button>
                <button
                  onClick={() => setModal(null)}
                  className="flex-1 bg-white/[0.06] hover:bg-white/[0.12] text-slate-300 font-bold py-2.5 rounded-xl transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageComplaints;
