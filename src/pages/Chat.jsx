import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { db } from "../services/firebase";
import {
  doc, getDoc, setDoc, addDoc, collection, query,
  orderBy, onSnapshot, updateDoc, serverTimestamp,
} from "firebase/firestore";
import { toast } from "react-toastify";
import { ArrowLeft, Send, Loader2, MessageSquare, Building2 } from "lucide-react";
import { createNotification } from "../services/notifications";

const Chat = () => {
  const { chatId }     = useParams();
  const navigate       = useNavigate();
  const location       = useLocation();
  const initData       = location.state || null;
  const { user, role } = useSelector((s) => s.auth);

  const [chatMeta, setChatMeta] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text,     setText]     = useState("");
  const [loading,  setLoading]  = useState(true);
  const [sending,  setSending]  = useState(false);
  const bottomRef = useRef(null);

  // Listen to chat doc — create it if missing and we have initData
  useEffect(() => {
    if (!chatId || !user) return;
    const chatRef = doc(db, "chats", chatId);
    const unsub = onSnapshot(chatRef, async (snap) => {
      if (snap.exists()) {
        setChatMeta({ id: snap.id, ...snap.data() });
        setLoading(false);
      } else if (initData) {
        try {
          await setDoc(chatRef, {
            venueId:        initData.venueId       || "",
            venueName:      initData.venueName     || "",
            venueImage:     initData.venueImage    || "",
            customerId:     initData.customerId    || "",
            customerName:   initData.customerName  || "",
            customerEmail:  initData.customerEmail || "",
            ownerId:        initData.ownerId       || "",
            ownerName:      initData.ownerName     || "",
            ownerEmail:     initData.ownerEmail    || "",
            lastMessage:    "",
            lastMessageAt:  serverTimestamp(),
            unreadOwner:    0,
            unreadCustomer: 0,
            createdAt:      serverTimestamp(),
          });
        } catch (err) {
          console.error("Failed to create chat:", err);
          toast.error("Could not open chat.");
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    });
    return () => unsub();
  }, [chatId, user]);

  // Listen to messages
  useEffect(() => {
    if (!chatId) return;
    const q = query(
      collection(db, "chats", chatId, "messages"),
      orderBy("createdAt", "asc")
    );
    const unsub = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [chatId]);

  // Self-heal: if ownerName or customerName is missing, fetch from users collection and patch chat doc
  useEffect(() => {
    if (!chatMeta || !chatId) return;
    const patches = {};
    const run = async () => {
      if (!chatMeta.ownerName && chatMeta.ownerId) {
        try {
          const snap = await getDoc(doc(db, "users", chatMeta.ownerId));
          if (snap.exists()) {
            const n = snap.data().name || chatMeta.ownerEmail?.split("@")[0] || "";
            if (n) patches.ownerName = n;
          }
        } catch { /* silent */ }
      }
      if (!chatMeta.customerName && chatMeta.customerId) {
        try {
          const snap = await getDoc(doc(db, "users", chatMeta.customerId));
          if (snap.exists()) {
            const n = snap.data().name || chatMeta.customerEmail?.split("@")[0] || "";
            if (n) patches.customerName = n;
          }
        } catch { /* silent */ }
      }
      if (Object.keys(patches).length) {
        updateDoc(doc(db, "chats", chatId), patches).catch(() => {});
        setChatMeta((prev) => ({ ...prev, ...patches }));
      }
    };
    run();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatMeta?.ownerId, chatMeta?.customerId, chatId]);

  // Mark as read + scroll to bottom
  useEffect(() => {
    if (!chatId || !user || !chatMeta) return;
    const field = role === "owner" ? "unreadOwner" : "unreadCustomer";
    if (chatMeta[field] > 0) {
      updateDoc(doc(db, "chats", chatId), { [field]: 0 }).catch(() => {});
    }
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, chatId, user, chatMeta, role]);

  const handleSend = async (e) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || !user || !chatMeta) return;
    setSending(true);
    try {
      const senderName = user.name || user.email?.split("@")[0] || "User";
      await addDoc(collection(db, "chats", chatId, "messages"), {
        senderId:   user.uid,
        senderName,
        text:       trimmed,
        createdAt:  serverTimestamp(),
      });
      const otherUnread = role === "owner" ? "unreadCustomer" : "unreadOwner";
      await updateDoc(doc(db, "chats", chatId), {
        lastMessage:   trimmed,
        lastMessageAt: serverTimestamp(),
        [otherUnread]: (chatMeta[otherUnread] || 0) + 1,
      });

      const recipientId = role === "owner" ? chatMeta.customerId : chatMeta.ownerId;
      const preview = trimmed.length > 60 ? trimmed.slice(0, 60) + "…" : trimmed;
      await createNotification({
        userId:    recipientId,
        title:     `New message from ${senderName}`,
        message:   `${chatMeta.venueName ? `[${chatMeta.venueName}] ` : ""}${preview}`,
        type:      "new_message",
        chatId,
        venueName: chatMeta.venueName || "",
      });

      setText("");
    } catch (err) {
      console.error(err);
      toast.error("Failed to send message.");
    }
    setSending(false);
  };

  const formatTime = (ts) => {
    if (!ts?.toDate) return "";
    return ts.toDate().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  };

  const formatDate = (ts) => {
    if (!ts?.toDate) return "";
    return ts.toDate().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  // Group messages by date
  const grouped = [];
  let lastDate = null;
  for (const m of messages) {
    const d = m.createdAt ? formatDate(m.createdAt) : "";
    if (d && d !== lastDate) { grouped.push({ type: "date", label: d }); lastDate = d; }
    grouped.push({ type: "msg", ...m });
  }

  // Name (big) and email (small) for the header
  const otherDisplayName = chatMeta
    ? (role === "owner"
        ? (chatMeta.customerName  || chatMeta.customerEmail?.split("@")[0]  || "Customer")
        : (chatMeta.ownerName     || chatMeta.ownerEmail?.split("@")[0]     || "Venue Owner"))
    : (initData
        ? (role === "owner"
            ? (initData.customerName || initData.customerEmail?.split("@")[0] || "Customer")
            : (initData.ownerName    || initData.ownerEmail?.split("@")[0]    || "Venue Owner"))
        : "...");

  const otherEmail = chatMeta
    ? (role === "owner" ? chatMeta.customerEmail || "" : chatMeta.ownerEmail || "")
    : (initData
        ? (role === "owner" ? initData.customerEmail || "" : initData.ownerEmail || "")
        : "");

  const venueName  = chatMeta?.venueName  || initData?.venueName  || "";
  const venueImage = chatMeta?.venueImage || initData?.venueImage || "";

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <Loader2 className="w-8 h-8 text-sky-500 animate-spin" />
      </div>
    );
  }

  if (!chatMeta && !initData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950 gap-3">
        <MessageSquare className="w-12 h-12 text-gray-300" />
        <p className="text-gray-500 font-semibold">Chat not found.</p>
        <button onClick={() => navigate(-1)} className="text-sky-500 hover:underline text-sm">Go back</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col">

      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white transition">
            <ArrowLeft className="w-4 h-4" />
          </button>
          {venueImage ? (
            <img src={venueImage} alt="" className="w-10 h-10 rounded-xl object-cover flex-shrink-0" />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-sky-100 dark:bg-sky-900/30 flex items-center justify-center flex-shrink-0">
              <Building2 className="w-5 h-5 text-sky-400" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-extrabold text-gray-900 dark:text-white text-sm truncate">{otherDisplayName}</p>
            {otherEmail && (
              <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{otherEmail}</p>
            )}
            {venueName && (
              <p className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1 truncate">
                <Building2 className="w-3 h-3 flex-shrink-0" /> {venueName}
              </p>
            )}
          </div>
          <div className="w-2.5 h-2.5 bg-green-400 rounded-full flex-shrink-0" />
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto max-w-3xl w-full mx-auto px-4 py-6 space-y-1">
        {grouped.length === 0 && (
          <div className="text-center py-16">
            <MessageSquare className="w-12 h-12 text-gray-200 dark:text-gray-700 mx-auto mb-3" />
            <p className="text-gray-400 dark:text-gray-500 font-semibold text-sm">No messages yet</p>
            <p className="text-gray-400 dark:text-gray-600 text-xs mt-1">Send the first message below!</p>
          </div>
        )}

        {grouped.map((item, idx) => {
          if (item.type === "date") {
            return (
              <div key={idx} className="flex items-center gap-3 py-3">
                <div className="flex-1 h-px bg-gray-100 dark:bg-gray-800" />
                <span className="text-xs text-gray-400 dark:text-gray-500 font-medium px-2">{item.label}</span>
                <div className="flex-1 h-px bg-gray-100 dark:bg-gray-800" />
              </div>
            );
          }
          const isMe = item.senderId === user?.uid;
          return (
            <div key={item.id} className={`flex ${isMe ? "justify-end" : "justify-start"} mb-1`}>
              <div className={`max-w-[88%] sm:max-w-[75%] flex flex-col gap-0.5 ${isMe ? "items-end" : "items-start"}`}>
                {!isMe && (
                  <span className="text-xs text-gray-400 dark:text-gray-500 px-1 font-medium">{item.senderName}</span>
                )}
                <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed break-words ${
                  isMe
                    ? "bg-sky-500 text-white rounded-br-sm"
                    : "bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-100 dark:border-gray-700 rounded-bl-sm"
                }`}>
                  {item.text}
                </div>
                <span className="text-xs text-gray-300 dark:text-gray-600 px-1">{formatTime(item.createdAt)}</span>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 sticky bottom-0">
        <form onSubmit={handleSend} className="max-w-3xl mx-auto px-4 py-3 flex items-end gap-3">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(e); } }}
            placeholder="Type a message... (Enter to send)"
            rows={1}
            className="flex-1 px-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 resize-none"
            style={{ minHeight: 44, maxHeight: 120 }}
          />
          <button type="submit" disabled={!text.trim() || sending}
            className="w-11 h-11 flex-shrink-0 flex items-center justify-center bg-sky-500 hover:bg-sky-600 disabled:opacity-50 text-white rounded-2xl transition shadow-md">
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Chat;
