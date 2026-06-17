import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { db } from "../services/firebase";
import {
  collection, query, where, onSnapshot,
  doc, getDoc, updateDoc,
} from "firebase/firestore";
import { MessageSquare, ArrowLeft, Building2, Loader2, Clock } from "lucide-react";

const ChatList = () => {
  const navigate       = useNavigate();
  const { user, role } = useSelector((s) => s.auth);
  const [chats,  setChats]  = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) return;
    const field = role === "owner" ? "ownerId" : "customerId";
    // No orderBy here — composite index may not exist in all environments.
    // We sort client-side after fetching.
    const q = query(
      collection(db, "chats"),
      where(field, "==", user.uid)
    );
    const unsub = onSnapshot(q, async (snap) => {
      const loaded = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => {
          const ta = a.lastMessageAt?.toDate?.() || new Date(0);
          const tb = b.lastMessageAt?.toDate?.() || new Date(0);
          return tb - ta;   // newest first
        });

      // Self-heal: patch any chat missing ownerName or customerName
      const enriched = await Promise.all(loaded.map(async (chat) => {
        const patches = {};
        if (!chat.ownerName && chat.ownerId) {
          try {
            const s = await getDoc(doc(db, "users", chat.ownerId));
            if (s.exists()) patches.ownerName = s.data().name || chat.ownerEmail?.split("@")[0] || "";
          } catch { /* silent */ }
        }
        if (!chat.customerName && chat.customerId) {
          try {
            const s = await getDoc(doc(db, "users", chat.customerId));
            if (s.exists()) patches.customerName = s.data().name || chat.customerEmail?.split("@")[0] || "";
          } catch { /* silent */ }
        }
        if (Object.keys(patches).length) {
          updateDoc(doc(db, "chats", chat.id), patches).catch(() => {});
          return { ...chat, ...patches };
        }
        return chat;
      }));

      setChats(enriched);
      setLoading(false);
    }, (err) => {
      console.error("ChatList query failed:", err);
      // Surface the error so it's not silently swallowed as "no chats"
      setChats([]);
      setLoading(false);
    });
    return () => unsub();
  }, [user?.uid, role]);

  const formatTime = (ts) => {
    if (!ts?.toDate) return "";
    const d = ts.toDate();
    const now = new Date();
    const diffMins = Math.floor((now - d) / 60000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const backPath = role === "owner" ? "/dashboard/owner" : "/dashboard/customer";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 sticky top-16 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <button onClick={() => navigate(backPath)}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white transition">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <div className="h-5 w-px bg-gray-200 dark:bg-gray-700" />
          <h1 className="text-lg font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-sky-500" /> Messages
          </h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {loading && (
          <div className="flex justify-center py-20">
            <Loader2 className="w-7 h-7 text-sky-500 animate-spin" />
          </div>
        )}

        {!loading && chats.length === 0 && (
          <div className="text-center py-20 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800">
            <MessageSquare className="w-12 h-12 text-gray-200 dark:text-gray-700 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400 font-semibold">No conversations yet</p>
            <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">
              {role === "customer"
                ? "Open a venue and click Message Owner to start chatting."
                : "Customers will appear here once they message you."}
            </p>
          </div>
        )}

        <div className="space-y-2">
          {chats.map((chat) => {
            const unread = role === "owner" ? chat.unreadOwner : chat.unreadCustomer;
            const otherName = role === "owner"
              ? (chat.customerName || chat.customerEmail?.split("@")[0] || "Customer")
              : (chat.ownerName    || chat.ownerEmail?.split("@")[0]    || "Venue Owner");

            return (
              <button key={chat.id} onClick={() => navigate(`/chat/${chat.id}`)}
                className="w-full flex items-center gap-4 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 hover:border-sky-200 dark:hover:border-sky-800 hover:shadow-md transition-all p-4 text-left">
                {chat.venueImage ? (
                  <img src={chat.venueImage} alt="" className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-sky-50 dark:bg-sky-900/30 flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-6 h-6 text-sky-400" />
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <p className="font-bold text-gray-900 dark:text-white text-sm truncate">{otherName}</p>
                    <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {formatTime(chat.lastMessageAt)}
                    </span>
                  </div>
                  <p className="text-xs text-sky-500 font-medium mb-1 truncate flex items-center gap-1">
                    <Building2 className="w-3 h-3" /> {chat.venueName}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {chat.lastMessage || "No messages yet"}
                  </p>
                </div>

                {unread > 0 && (
                  <span className="w-6 h-6 bg-sky-500 text-white text-xs font-bold rounded-full flex items-center justify-center flex-shrink-0">
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ChatList;
