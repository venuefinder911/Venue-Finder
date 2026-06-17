import { useEffect, useState } from "react";
import { db } from "../../services/firebase";
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
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
  Building2,
  CheckCircle2,
  BarChart3,
  Inbox,
  DollarSign,
} from "lucide-react";

const OwnerProfile = () => {
  const { user } = useSelector((state) => state.auth);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Edit
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [saving, setSaving] = useState(false);

  // Stats
  const [stats, setStats] = useState({
    totalVenues: 0,
    approvedVenues: 0,
    totalBookings: 0,
    pendingBookings: 0,
    approvedBookings: 0,
  });

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

  // Fetch stats
  useEffect(() => {
    if (!user) return;
    const fetchStats = async () => {
      try {
        // Venues
        const venueSnap = await getDocs(
          query(
            collection(db, "venues"),
            where("ownerId", "==", user.uid)
          )
        );
        const venues = venueSnap.docs.map((d) => d.data());
        const approvedVenues = venues.filter(
          (v) => v.status === "approved"
        ).length;

        // Bookings
        const bookingSnap = await getDocs(
          query(
            collection(db, "bookings"),
            where("ownerId", "==", user.uid)
          )
        );
        const bookings = bookingSnap.docs.map((d) => d.data());

        setStats({
          totalVenues: venues.length,
          approvedVenues,
          totalBookings: bookings.length,
          pendingBookings: bookings.filter((b) => b.status === "pending")
            .length,
          approvedBookings: bookings.filter((b) => b.status === "approved")
            .length,
        });
      } catch (err) {
        console.error(err);
      }
    };
    fetchStats();
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <Loader2 className="w-10 h-10 text-sky-500 animate-spin" />
      </div>
    );
  }

  const displayName = profile?.name || user?.email?.split("@")[0] || "Owner";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 px-4 py-6 sm:p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* ── Profile Card ── */}
        <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-amber-500 to-orange-600 h-28" />
          <div className="px-4 sm:px-6 pb-6 -mt-12">
            <div className="flex items-end gap-4">
              <div className="w-20 h-20 bg-white dark:bg-gray-800 rounded-2xl shadow-lg flex items-center justify-center text-3xl font-extrabold text-amber-600 border-4 border-white dark:border-gray-700">
                {displayName[0]?.toUpperCase()}
              </div>
              <div className="pb-1">
                {editing ? (
                  <div className="flex items-center gap-2">
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="text-xl font-bold border-b-2 border-amber-500 focus:outline-none bg-transparent text-gray-900 dark:text-white"
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
                      className="text-gray-400 hover:text-amber-500 transition"
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
                  <span className="bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 text-xs font-bold px-2 py-0.5 rounded-full">
                    Venue Owner
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Stats ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <StatCard
            icon={<Building2 className="w-5 h-5 text-sky-500" />}
            label="Total Venues"
            value={stats.totalVenues}
          />
          <StatCard
            icon={<CheckCircle2 className="w-5 h-5 text-green-500" />}
            label="Live Venues"
            value={stats.approvedVenues}
          />
          <StatCard
            icon={<Inbox className="w-5 h-5 text-amber-500" />}
            label="Total Bookings"
            value={stats.totalBookings}
          />
          <StatCard
            icon={<BarChart3 className="w-5 h-5 text-indigo-500" />}
            label="Approved"
            value={stats.approvedBookings}
          />
          <StatCard
            icon={<DollarSign className="w-5 h-5 text-emerald-500" />}
            label="Pending"
            value={stats.pendingBookings}
          />
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ icon, label, value }) => (
  <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
    <div className="flex items-center gap-3">
      <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded-xl">{icon}</div>
      <div>
        <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase">{label}</p>
        <p className="text-xl font-extrabold text-gray-900 dark:text-white">{value}</p>
      </div>
    </div>
  </div>
);

export default OwnerProfile;
