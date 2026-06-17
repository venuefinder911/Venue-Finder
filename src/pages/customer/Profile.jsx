import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../../services/firebase";
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  onSnapshot,
  Timestamp,
} from "firebase/firestore";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";
import {
  User,
  Mail,
  Calendar,
  Edit3,
  Save,
  X,
  Loader2,
  CalendarDays,
  CheckCircle2,
  Clock,
  XCircle,
  Ban,
  BarChart3,
} from "lucide-react";

const Profile = () => {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Edit
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [saving, setSaving] = useState(false);

  // Bookings
  const [bookings, setBookings] = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");

  // Fetch profile
  useEffect(() => {
    if (!user) return;
    const fetchProfile = async () => {
      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists()) {
          setProfile(snap.data());
          setEditName(snap.data().name || "");
        }
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    };
    fetchProfile();
  }, [user]);

  // Fetch bookings (real-time)
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
      setBookingsLoading(false);
    });
    return () => unsub();
  }, [user]);

  const handleSave = async () => {
    if (!editName.trim()) {
      toast.error("Name cannot be empty.");
      return;
    }
    setSaving(true);
    try {
      await updateDoc(doc(db, "users", user.uid), {
        name: editName.trim(),
      });
      setProfile((prev) => ({ ...prev, name: editName.trim() }));
      setEditing(false);
      toast.success("Profile updated! ✅");
    } catch (err) {
      console.error(err);
      toast.error("Failed to update profile.");
    }
    setSaving(false);
  };

  const handleCancelBooking = async (booking) => {
    // Enforce 48-hour cancellation policy
    const bookedAt = booking.createdAt?.toDate?.() || new Date(booking.createdAt);
    const hoursSince = (Date.now() - bookedAt.getTime()) / 36e5;
    if (hoursSince > 48) {
      toast.error("Cancellations are only allowed within 48 hours of booking.");
      return;
    }
    if (!confirm("Cancel this booking?")) return;
    try {
      await updateDoc(doc(db, "bookings", booking.id), {
        status:             "cancelled",
        cancellationReason: "Cancelled by customer",
        cancelledAt:        Timestamp.now(),
        updatedAt:          Timestamp.now(),
      });
      toast.success("Booking cancelled.");
    } catch (err) {
      console.error(err);
      toast.error("Failed to cancel booking.");
    }
  };

  const formatDate = (d) => {
    if (!d) return "N/A";
    if (d.toDate) {
      return d.toDate().toLocaleDateString("en-US", {
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

  const stats = {
    total: bookings.length,
    approved: bookings.filter((b) => b.status === "approved").length,
    pending: bookings.filter((b) => b.status === "pending").length,
    rejected: bookings.filter((b) => b.status === "rejected").length,
  };

  const filteredBookings =
    activeTab === "all"
      ? bookings
      : bookings.filter((b) => b.status === activeTab);

  const statusIcon = {
    pending: <Clock className="w-3.5 h-3.5" />,
    approved: <CheckCircle2 className="w-3.5 h-3.5" />,
    rejected: <XCircle className="w-3.5 h-3.5" />,
    cancelled: <Ban className="w-3.5 h-3.5" />,
  };

  const statusColor = {
    pending: "bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800",
    approved: "bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800",
    rejected: "bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800",
    cancelled: "bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700",
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <Loader2 className="w-10 h-10 text-sky-500 animate-spin" />
      </div>
    );
  }

  const displayName = profile?.name || user?.email?.split("@")[0] || "User";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 px-4 py-6 sm:p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* ── Profile Card ── */}
        <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-sky-500 to-indigo-600 h-28" />
          <div className="px-4 sm:px-6 pb-6 -mt-12">
            <div className="flex items-end gap-4">
              <div className="w-20 h-20 bg-white dark:bg-gray-800 rounded-2xl shadow-lg flex items-center justify-center text-3xl font-extrabold text-sky-600 border-4 border-white dark:border-gray-700">
                {displayName[0]?.toUpperCase()}
              </div>
              <div className="pb-1">
                {editing ? (
                  <div className="flex items-center gap-2">
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="text-xl font-bold border-b-2 border-sky-500 focus:outline-none bg-transparent text-gray-900 dark:text-white"
                    />
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="text-green-500 hover:text-green-600"
                    >
                      <Save className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => {
                        setEditing(false);
                        setEditName(profile?.name || "");
                      }}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl font-extrabold text-gray-900 dark:text-white">
                      {displayName}
                    </h1>
                    <button
                      onClick={() => setEditing(true)}
                      className="text-gray-400 hover:text-sky-500 transition"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                  </div>
                )}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-sm text-gray-500 dark:text-gray-400">
                  <span className="flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5" /> {user?.email}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" /> Joined{" "}
                    {profile?.createdAt?.toDate
                      ? profile.createdAt.toDate().toLocaleDateString("en-US", {
                          month: "short",
                          year: "numeric",
                        })
                      : "N/A"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Stats ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard
            icon={<BarChart3 className="w-5 h-5 text-sky-500" />}
            label="Total Bookings"
            value={stats.total}
          />
          <StatCard
            icon={<CheckCircle2 className="w-5 h-5 text-green-500" />}
            label="Approved"
            value={stats.approved}
          />
          <StatCard
            icon={<Clock className="w-5 h-5 text-amber-500" />}
            label="Pending"
            value={stats.pending}
          />
          <StatCard
            icon={<XCircle className="w-5 h-5 text-red-500" />}
            label="Rejected"
            value={stats.rejected}
          />
        </div>

        {/* ── My Bookings ── */}
        <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-extrabold text-gray-800 dark:text-gray-100 flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-sky-500" />
              My Bookings
            </h2>
            <button
              onClick={() => navigate("/bookings")}
              className="text-xs font-semibold text-sky-500 hover:text-sky-600 hover:underline transition"
            >
              View Full Details →
            </button>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1">
            {["all", "pending", "approved", "rejected", "cancelled"].map(
              (tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition whitespace-nowrap ${
                    activeTab === tab
                      ? "bg-sky-500 text-white"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              )
            )}
          </div>

          {bookingsLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-6 h-6 text-sky-500 animate-spin" />
            </div>
          ) : filteredBookings.length === 0 ? (
            <div className="text-center py-10">
              <CalendarDays className="w-10 h-10 text-gray-200 dark:text-gray-700 mx-auto mb-2" />
              <p className="text-gray-400 dark:text-gray-500 text-sm">No bookings found.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredBookings.map((b) => (
                <div
                  key={b.id}
                  className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                >
                  <img
                    src={
                      b.venueImage ||
                      "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=100&q=60"
                    }
                    alt={b.venueName}
                    className="w-16 h-16 rounded-xl object-cover flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-800 dark:text-gray-100 truncate">
                      {b.venueName}
                    </p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 dark:text-gray-400">
                      <span className="flex items-center gap-1">
                        <CalendarDays className="w-3 h-3" />
                        {formatDate(b.eventDate)}
                      </span>
                      <span>{b.eventType || "General"}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${
                        statusColor[b.status] || statusColor.pending
                      }`}
                    >
                      {statusIcon[b.status]}
                      {b.status?.charAt(0).toUpperCase() + b.status?.slice(1)}
                    </span>
                    {b.status === "pending" && (
                      <button
                        onClick={() => handleCancelBooking(b)}
                        className="text-xs text-red-500 hover:text-red-600 font-semibold hover:bg-red-50 dark:hover:bg-red-900/20 px-2 py-1 rounded-lg transition"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ icon, label, value }) => (
  <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex items-center gap-4">
    <div className="w-10 h-10 bg-sky-100 dark:bg-sky-900/30 rounded-xl flex items-center justify-center text-sky-500 flex-shrink-0">
      {icon}
    </div>
    <div>
      <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{label}</p>
      <p className="text-xl font-extrabold text-gray-900 dark:text-white">{value}</p>
    </div>
  </div>

);
export default Profile;
