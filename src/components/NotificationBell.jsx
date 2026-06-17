import { useEffect, useRef, useState } from "react";
import { db } from "../services/firebase";
import {
  collection, query, where, onSnapshot,
  updateDoc, doc, writeBatch, orderBy, limit,
} from "firebase/firestore";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { Bell, CheckCheck, X, CalendarDays, CheckCircle2, XCircle, Ban, MessageSquare } from "lucide-react";

const TYPE_META = {
  booking_approved: {
    icon: <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />,
    color: "border-l-green-400",
  },
  booking_rejected: {
    icon: <XCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />,
    color: "border-l-red-400",
  },
  booking_cancelled_by_customer: {
    icon: <Ban className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />,
    color: "border-l-amber-400",
  },
  booking_cancelled_by_owner: {
    icon: <Ban className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />,
    color: "border-l-orange-400",
  },
  new_message: {
    icon: <MessageSquare className="w-4 h-4 text-sky-500 flex-shrink-0 mt-0.5" />,
    color: "border-l-sky-400",
  },
};

const formatTime = (ts) => {
  if (!ts) return "";
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

const NotificationBell = () => {
  const { user } = useSelector((s) => s.auth);
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Real-time listener
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "notifications"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc"),
      limit(30),
    );
    const unsub = onSnapshot(q, (snap) => {
      setNotifications(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [user]);

  const unread = notifications.filter((n) => !n.read).length;

  const markRead = async (n) => {
    if (!n.read) {
      await updateDoc(doc(db, "notifications", n.id), { read: true });
    }
    if (n.type === "new_message" && n.chatId) {
      setOpen(false);
      navigate(`/chat/${n.chatId}`);
    }
  };

  const markAllRead = async () => {
    const unreadList = notifications.filter((n) => !n.read);
    if (!unreadList.length) return;
    const batch = writeBatch(db);
    unreadList.forEach((n) => batch.update(doc(db, "notifications", n.id), { read: true }));
    await batch.commit();
  };

  if (!user) return null;

  return (
    <div ref={ref} className="relative">
      {/* Bell button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative w-9 h-9 flex items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition"
        title="Notifications"
      >
        <Bell className="w-4 h-4" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-extrabold w-4 h-4 rounded-full flex items-center justify-center leading-none">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-11 w-80 sm:w-96 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-sky-500" />
              <span className="font-extrabold text-gray-800 dark:text-gray-100 text-sm">Notifications</span>
              {unread > 0 && (
                <span className="bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 text-xs font-bold px-1.5 py-0.5 rounded-full">
                  {unread} new
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {unread > 0 && (
                <button
                  onClick={markAllRead}
                  className="flex items-center gap-1 text-xs font-semibold text-sky-500 hover:text-sky-700 transition"
                  title="Mark all as read"
                >
                  <CheckCheck className="w-3.5 h-3.5" /> All read
                </button>
              )}
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-gray-50 dark:divide-gray-800">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                <Bell className="w-10 h-10 text-gray-200 dark:text-gray-700 mb-2" />
                <p className="text-sm font-semibold text-gray-400 dark:text-gray-500">No notifications yet</p>
                <p className="text-xs text-gray-300 dark:text-gray-600 mt-1">You'll be notified about bookings and messages here</p>
              </div>
            ) : (
              notifications.map((n) => {
                const meta = TYPE_META[n.type] || { icon: <CalendarDays className="w-4 h-4 text-sky-500 flex-shrink-0 mt-0.5" />, color: "border-l-sky-400" };
                return (
                  <button
                    key={n.id}
                    onClick={() => markRead(n)}
                    className={`w-full text-left px-4 py-3 border-l-4 ${meta.color} transition hover:bg-gray-50 dark:hover:bg-gray-800 ${!n.read ? "bg-sky-50/50 dark:bg-sky-900/10" : "bg-white dark:bg-gray-900"}`}
                  >
                    <div className="flex items-start gap-3">
                      {meta.icon}
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-bold leading-tight ${n.read ? "text-gray-600 dark:text-gray-300" : "text-gray-900 dark:text-white"}`}>
                          {n.title}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">{n.message}</p>
                        <p className="text-[11px] text-gray-300 dark:text-gray-600 mt-1">{formatTime(n.createdAt)}</p>
                      </div>
                      {!n.read && <span className="w-2 h-2 rounded-full bg-sky-500 flex-shrink-0 mt-1" />}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
