import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { db, auth } from "../../services/firebase";
import {
  doc, getDoc, setDoc, deleteDoc, addDoc,
  collection, query, where, getDocs, Timestamp, serverTimestamp,
} from "firebase/firestore";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";
import Calendar from "../../components/Calendar";
import StarRating from "../../components/StarRating";
import ReviewSection from "../../components/ReviewSection";
import {
  MapPin, Users, Phone, ChevronLeft, ChevronRight,
  ArrowLeft, CalendarDays, Send, Loader2, Heart, CheckCircle2,
  Shield, Sparkles, Flag, Navigation, MessageSquare, DoorOpen,
} from "lucide-react";
import { VenueMapView } from "../../components/LocationPickerMap";
import { TIER_MAP } from "../../components/PackageBuilder";

const FALLBACK =
  "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=600&q=80";

const TIME_OPTIONS = [
  "6:00 AM","7:00 AM","8:00 AM","9:00 AM","10:00 AM","11:00 AM",
  "12:00 PM","1:00 PM","2:00 PM","3:00 PM","4:00 PM","5:00 PM",
  "6:00 PM","7:00 PM","8:00 PM","9:00 PM","10:00 PM","11:00 PM",
];

const VenueDetails = () => {
  const { id }      = useParams();
  const navigate    = useNavigate();
  const { user, role } = useSelector((state) => state.auth);

  const [venue,            setVenue]            = useState(null);
  const [loading,         setLoading]         = useState(true);
  const [currentImg,      setCurrentImg]      = useState(0);
  const [allBookings,     setAllBookings]     = useState([]);   // raw booking data for this venue
  const [selectedDate,    setSelectedDate]    = useState(null);
  const [selectedSlot,    setSelectedSlot]    = useState(null);
  const [eventType,       setEventType]       = useState("");
  const [guestCount,      setGuestCount]      = useState("");
  const [message,         setMessage]         = useState("");
  const [customerContact, setCustomerContact] = useState("");
  const [booking,         setBooking]         = useState(false);
  const [isFav,           setIsFav]           = useState(false);
  const [favLoading,      setFavLoading]      = useState(false);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [selectedHall,    setSelectedHall]    = useState(null);
  const [fullDayStart,    setFullDayStart]    = useState("9:00 AM");
  const [fullDayEnd,      setFullDayEnd]      = useState("8:00 PM");
  const bookingPanelRef = useRef(null);

  // Fetch venue
  useEffect(() => {
    const fetchVenue = async () => {
      try {
        const snap = await getDoc(doc(db, "venues", id));
        if (snap.exists()) setVenue({ id: snap.id, ...snap.data() });
      } catch (err) {
        console.error(err);
        toast.error("Failed to load venue.");
      }
      setLoading(false);
    };
    fetchVenue();
  }, [id]);

  // Fetch all active bookings for this venue once (hall-aware derivation happens below)
  useEffect(() => {
    if (!user) return;
    const fetchBookings = async () => {
      try {
        const q = query(
          collection(db, "bookings"),
          where("venueId", "==", id),
          where("status", "in", ["pending", "approved"])
        );
        const snap = await getDocs(q);
        setAllBookings(snap.docs.map((d) => d.data()));
      } catch (err) { console.error(err); }
    };
    fetchBookings();
  }, [id, user]);

  // Derive bookedSlots from allBookings, filtered by selectedHall when halls exist
  const bookedSlots = useMemo(() => {
    const hasHalls = venue?.halls?.length > 0;
    // If venue has halls but no hall is selected yet, show empty calendar (nothing blocked)
    const relevant = hasHalls
      ? (selectedHall ? allBookings.filter((b) => b.hallId === selectedHall.id) : [])
      : allBookings;

    const slots = {};
    relevant.forEach((data) => {
      let dateStr;
      if (data.eventDate?.toDate) {
        const dt = data.eventDate.toDate();
        dateStr = `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,"0")}-${String(dt.getDate()).padStart(2,"0")}`;
      } else {
        dateStr = data.eventDate;
      }
      if (dateStr) {
        const slot = data.slot || "full_day";
        if (!slots[dateStr]) slots[dateStr] = [];
        if (!slots[dateStr].includes(slot)) slots[dateStr].push(slot);
      }
    });
    return slots;
  }, [allBookings, selectedHall, venue?.halls]);

  // Fetch favorite status — use auth.currentUser so token is guaranteed ready
  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    const checkFav = async () => {
      try {
        const favDoc = await getDoc(doc(db, "users", uid, "favorites", id));
        setIsFav(favDoc.exists());
      } catch (err) { console.error(err); }
    };
    checkFav();
  }, [user, id]);

  // Image slider
  const images = venue?.images?.length > 0 ? venue.images : [venue?.image || FALLBACK];
  const nextImg = useCallback(() => setCurrentImg((c) => (c + 1) % images.length), [images.length]);
  const prevImg = () => setCurrentImg((c) => (c - 1 + images.length) % images.length);
  useEffect(() => {
    if (images.length <= 1) return;
    const timer = setInterval(nextImg, 4000);
    return () => clearInterval(timer);
  }, [nextImg, images.length]);

  // Toggle favorite — use auth.currentUser so token is guaranteed ready
  const toggleFavorite = async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) { toast.info("Please login to save favorites."); return; }
    setFavLoading(true);
    try {
      const favRef = doc(db, "users", uid, "favorites", id);
      if (isFav) {
        await deleteDoc(favRef);
        setIsFav(false);
        toast.success("Removed from favorites");
      } else {
        await setDoc(favRef, {
          venueId: id, venueName: venue.name, venueImage: images[0],
          venueLocation: venue.location,
          addedAt: Timestamp.now(),
        });
        setIsFav(true);
        toast.success("Added to favorites!");
      }
    } catch (err) { console.error(err); toast.error("Failed to update favorites."); }
    setFavLoading(false);
  };

  // Handle date select — reset slot when date changes
  const handleDateSelect = (date) => {
    setSelectedDate(date);
    setSelectedSlot(null);
  };

  // If a previously-selected slot becomes expired (clock ticked past its end hour), clear it
  const SLOT_END_HOUR = { morning: 13, evening: 20, full_day: 20 };
  const nowForCheck = new Date();
  const todayForCheck = `${nowForCheck.getFullYear()}-${String(nowForCheck.getMonth()+1).padStart(2,"0")}-${String(nowForCheck.getDate()).padStart(2,"0")}`;
  if (selectedSlot && selectedDate === todayForCheck && nowForCheck.getHours() >= (SLOT_END_HOUR[selectedSlot] ?? 20)) {
    setSelectedSlot(null);
  }

  // Handle booking
  const handleBooking = async (e) => {
    e.preventDefault();
    if (!user) { toast.info("Please login to book a venue."); navigate("/login"); return; }
    const hasHalls = venue.halls?.length > 0;
    if (hasHalls && !selectedHall) { toast.error("Please select a hall for your event."); return; }
    if (!selectedDate) { toast.error("Please select a date for your event."); return; }
    if (!selectedSlot) { toast.error("Please select a time slot."); return; }
    // Reject if the selected slot's time window has already ended today
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;
    const SLOT_END_HOUR = { morning: 13, evening: 20, full_day: 20 };
    if (selectedDate === todayStr && now.getHours() >= (SLOT_END_HOUR[selectedSlot] ?? 20)) {
      toast.error("This time slot has already passed for today. Please choose a future date or a later slot.");
      return;
    }

    const maxCapacity = selectedHall ? selectedHall.capacity : venue.capacity;
    if (guestCount && Number(guestCount) > maxCapacity) {
      toast.error(`${selectedHall ? `"${selectedHall.name}"` : "This venue"} can only hold ${maxCapacity.toLocaleString()} guests.`);
      return;
    }
    if (!customerContact.trim() || !/^0[0-9]{10}$/.test(customerContact.trim())) {
      toast.error("Please enter a valid 11-digit contact number (e.g. 03001234567).");
      return;
    }
    if (selectedSlot === "full_day") {
      const si = TIME_OPTIONS.indexOf(fullDayStart);
      const ei = TIME_OPTIONS.indexOf(fullDayEnd);
      if (si >= ei) { toast.error("Full Day end time must be after start time."); return; }
    }
    setBooking(true);
    try {
      // Server-side conflict check: fetch all bookings on this date
      const q = query(
        collection(db, "bookings"),
        where("venueId", "==", id),
        where("eventDate", "==", selectedDate),
        where("status", "in", ["pending", "approved"])
      );
      const existingSnap = await getDocs(q);
      // If halls are present, only check conflicts within the same hall
      const bookedOnDate = existingSnap.docs
        .filter((d) => {
          if (hasHalls && selectedHall) return d.data().hallId === selectedHall.id;
          return true;
        })
        .map((d) => d.data().slot || "full_day");
      const hasConflict  = bookedOnDate.includes("full_day") ||
                           (selectedSlot === "full_day" ? bookedOnDate.length > 0 : bookedOnDate.includes(selectedSlot));
      if (hasConflict) {
        toast.error("This slot is already taken! Please select a different slot or date.");
        setBooking(false);
        // Refresh allBookings so the calendar re-derives the blocked slots
        setAllBookings((prev) => {
          const newEntries = existingSnap.docs
            .map((d) => d.data())
            .filter((d) => !prev.some((p) => p.eventDate === d.eventDate && p.slot === d.slot && p.hallId === d.hallId));
          return [...prev, ...newEntries];
        });
        setSelectedSlot(null);
        return;
      }
      await addDoc(collection(db, "bookings"), {
        venueId:         venue.id,
        venueName:       venue.name,
        venueImage:      images[0],
        customerId:      user.uid,
        customerName:    user.name || user.email?.split("@")[0] || "Customer",
        customerEmail:   user.email,
        ownerId:         venue.ownerId,
        eventDate:       selectedDate,
        slot:            selectedSlot,
        slotStartTime:   selectedSlot === "full_day" ? fullDayStart : null,
        slotEndTime:     selectedSlot === "full_day" ? fullDayEnd : null,
        eventType:            eventType || "Not specified",
        guestCount:           guestCount ? Number(guestCount) : 0,
        message:              message.trim(),
        customerContact:      customerContact.trim(),
        hallId:               selectedHall?.id   || null,
        hallName:             selectedHall?.name || null,
        packageId:            selectedPackage?.id || null,
        packageName:          selectedPackage?.name || null,
        packageTier:          selectedPackage?.tier || null,
        packagePricePerPerson: selectedPackage ? Number(selectedPackage.pricePerPerson) : null,
        estimatedTotal:       selectedPackage && guestCount
          ? Number(guestCount) * Number(selectedPackage.pricePerPerson)
          : null,
        status:          "pending",
        createdAt:       Timestamp.now(),
        updatedAt:       Timestamp.now(),
      });
      toast.success("Booking request sent! The owner will review it.");
      // Add to allBookings so calendar re-derives and reflects the new slot immediately
      setAllBookings((prev) => [
        ...prev,
        {
          hallId:    selectedHall?.id || null,
          eventDate: selectedDate,
          slot:      selectedSlot,
          status:    "pending",
        },
      ]);
      setSelectedDate(null); setSelectedSlot(null); setEventType(""); setGuestCount("");
      setMessage(""); setCustomerContact(""); setSelectedPackage(null);
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Booking failed. Try again.");
    }
    setBooking(false);
  };

  // Open or create chat with owner
  const openChat = async () => {
    if (!user) { toast.info("Please login to message the owner."); navigate("/login"); return; }
    try {
      const chatId  = `${user.uid}_${id}`;
      const chatRef = doc(db, "chats", chatId);
      const chatSnap = await getDoc(chatRef);
      if (!chatSnap.exists()) {
        // Fetch owner's display name from their user profile
        let ownerName = venue.ownerEmail?.split("@")[0] || "Venue Owner";
        try {
          const ownerDoc = await getDoc(doc(db, "users", venue.ownerId));
          if (ownerDoc.exists()) ownerName = ownerDoc.data().name || ownerName;
        } catch { /* silent fallback */ }

        // First time — create the doc fresh (don't overwrite unread counts on repeat visits)
        await setDoc(chatRef, {
          venueId:        id,
          venueName:      venue.name,
          venueImage:     images[0] || "",
          customerId:     user.uid,
          customerName:   user.name || user.email?.split("@")[0] || "Customer",
          customerEmail:  user.email,
          ownerId:        venue.ownerId,
          ownerName,
          ownerEmail:     venue.ownerEmail || "",
          lastMessage:    "",
          lastMessageAt:  serverTimestamp(),
          unreadOwner:    0,
          unreadCustomer: 0,
          createdAt:      serverTimestamp(),
        });
      }
      navigate(`/chat/${chatId}`);
    } catch (err) {
      console.error(err);
      toast.error("Could not open chat. Please try again.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <Loader2 className="w-10 h-10 text-sky-500 animate-spin" />
      </div>
    );
  }

  if (!venue) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950 gap-4">
        <p className="text-xl font-bold text-gray-700 dark:text-gray-200">Venue not found</p>
        <button onClick={() => navigate("/")} className="text-sky-500 font-semibold hover:underline">
          Go Home
        </button>
      </div>
    );
  }

  const scrollToBooking = () => {
    bookingPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 overflow-x-hidden">

      {/* Top bar — sticky below the main Navbar (Navbar is sticky top-0 z-50, ~64px tall) */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 sticky top-16 z-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <button onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white transition">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <div className="flex items-center gap-3">
            {role === "customer" && (
              <button onClick={() => navigate(`/complaint/${id}`)}
                className="flex items-center gap-1.5 text-sm font-semibold text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition"
                title="Report this venue">
                <Flag className="w-4 h-4" />
                <span className="hidden sm:inline">Report</span>
              </button>
            )}
            <button onClick={toggleFavorite} disabled={favLoading}
              className="flex items-center gap-1.5 text-sm font-semibold transition">
              <Heart className={`w-5 h-5 transition-colors ${isFav ? "fill-red-500 text-red-500" : "text-gray-400 hover:text-red-400"}`} />
              {isFav ? "Saved" : "Save"}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile sticky Book CTA — visible only on < lg, hidden once user scrolls to booking panel */}
      {role === "customer" && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-t border-gray-100 dark:border-gray-800 px-4 py-3 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            {(() => {
              const pkgs = venue.packages;
              const minPrice = pkgs?.length > 0 ? Math.min(...pkgs.map((p) => Number(p.pricePerPerson))) : null;
              return minPrice !== null ? (
                <>
                  <p className="text-xs text-gray-500 dark:text-gray-400 leading-none">Starting from</p>
                  <p className="text-base font-extrabold text-sky-600 leading-tight">
                    PKR {minPrice.toLocaleString()} <span className="text-xs font-semibold">/ person</span>
                  </p>
                </>
              ) : (
                <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Contact for pricing</p>
              );
            })()}
          </div>
          <button
            onClick={scrollToBooking}
            className="flex-shrink-0 bg-gradient-to-r from-sky-500 to-indigo-600 text-white font-bold px-6 py-2.5 rounded-xl shadow-lg shadow-sky-200/50 dark:shadow-sky-900/30 text-sm active:from-sky-700 active:to-indigo-800 transition-all"
          >
            Book Now
          </button>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4 py-6 sm:py-8 pb-24 lg:pb-8">

        {/* Image gallery — blurred backdrop + contain so portrait AND landscape images both look perfect */}
        <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden aspect-[4/3] sm:aspect-[16/9] group mb-6 sm:mb-8 bg-gray-900">
          {images.map((src, i) => (
            <div key={i} className={`absolute inset-0 transition-opacity duration-700 ${i === currentImg ? "opacity-100" : "opacity-0"}`}>
              {/* Blurred fill — prevents black bars on portrait images */}
              <img src={src} alt="" aria-hidden="true"
                className="absolute inset-0 w-full h-full object-cover scale-110 blur-2xl opacity-50 pointer-events-none" />
              {/* Main image — always fully visible, never cropped */}
              <img src={src} alt={`${venue.name} ${i + 1}`}
                className="absolute inset-0 w-full h-full object-contain" />
            </div>
          ))}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
          {images.length > 1 && (
            <>
              {/* carousel-arrow class makes these always visible on touch screens */}
              <button onClick={prevImg}
                className="carousel-arrow absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/40 hover:bg-black/70 text-white rounded-full flex items-center justify-center transition opacity-0 group-hover:opacity-100">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button onClick={nextImg}
                className="carousel-arrow absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/40 hover:bg-black/70 text-white rounded-full flex items-center justify-center transition opacity-0 group-hover:opacity-100">
                <ChevronRight className="w-5 h-5" />
              </button>
              <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-1.5">
                {images.map((_, i) => (
                  <button key={i} onClick={() => setCurrentImg(i)}
                    className={`rounded-full transition-all duration-300 ${i === currentImg ? "w-5 h-2 bg-white" : "w-2 h-2 bg-white/50"}`} />
                ))}
              </div>
              <div className="absolute top-3 left-3 bg-black/50 text-white text-xs font-semibold px-2.5 py-1 rounded-full">
                {currentImg + 1}/{images.length}
              </div>
            </>
          )}
        </div>

        {/* Main grid */}
        <div className="grid lg:grid-cols-3 gap-6 sm:gap-8">

          {/* LEFT: Venue Info */}
          <div className="lg:col-span-2 space-y-5 sm:space-y-6">

            {/* Title & Meta */}
            <div>
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-3">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white leading-tight">{venue.name}</h1>
                <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 px-3 py-1.5 rounded-full text-sm font-bold self-start flex-shrink-0">
                  <StarRating rating={venue.avgRating || 0} readonly size="sm" />
                  <span className="ml-1">{venue.avgRating ? venue.avgRating.toFixed(1) : "New"}</span>
                  {venue.totalReviews > 0 && (
                    <span className="text-amber-400 font-medium">({venue.totalReviews})</span>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3 mt-3">
                <span className="flex items-center gap-1 text-gray-500 dark:text-gray-400 text-sm">
                  <MapPin className="w-4 h-4 text-sky-400" /> {venue.location}
                </span>
                <span className="flex items-center gap-1 text-gray-500 dark:text-gray-400 text-sm">
                  <Users className="w-4 h-4 text-sky-400" /> Up to {venue.capacity} guests
                </span>
                {venue.contact && (
                  <span className="flex items-center gap-1 text-gray-500 dark:text-gray-400 text-sm">
                    <Phone className="w-4 h-4 text-sky-400" /> {venue.contact}
                  </span>
                )}
              </div>
            </div>

            {/* Categories */}
            {venue.categories?.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {venue.categories.map((cat) => (
                  <span key={cat} className="text-xs bg-sky-50 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400 font-semibold px-3 py-1.5 rounded-full">
                    {cat}
                  </span>
                ))}
              </div>
            )}

            {/* Description */}
            {venue.description && (
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6">
                <h2 className="text-lg font-extrabold text-gray-800 dark:text-gray-100 mb-3 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-sky-500" /> About This Venue
                </h2>
                <p className="text-gray-600 dark:text-gray-300 leading-relaxed text-sm">{venue.description}</p>
              </div>
            )}

            {/* Amenities */}
            {venue.amenities?.length > 0 && (
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6">
                <h2 className="text-lg font-extrabold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-500" /> Amenities
                </h2>
                <div className="flex flex-wrap gap-2">
                  {venue.amenities.map((a) => (
                    <span key={a}
                      className="flex items-center gap-1.5 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-sm font-medium px-3 py-1.5 rounded-full">
                      <CheckCircle2 className="w-3.5 h-3.5" /> {a}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Halls */}
            {venue.halls?.length > 0 && (
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6">
                <h2 className="text-lg font-extrabold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
                  <DoorOpen className="w-5 h-5 text-sky-500" /> Halls &amp; Spaces
                </h2>
                <div className="grid sm:grid-cols-2 gap-3">
                  {venue.halls.map((hall) => (
                    <div key={hall.id} className="bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <span className="font-bold text-gray-900 dark:text-white text-sm">{hall.name}</span>
                        {hall.floor && (
                          <span className="text-[10px] bg-sky-50 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400 px-2 py-0.5 rounded-full font-semibold flex-shrink-0">
                            {hall.floor}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mb-2">
                        <Users className="w-3 h-3" /> Up to {Number(hall.capacity).toLocaleString()} guests
                      </p>
                      {hall.description && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 leading-relaxed">{hall.description}</p>
                      )}
                      {hall.amenities?.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {hall.amenities.map((a) => (
                            <span key={a} className="flex items-center gap-0.5 text-[10px] bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 px-1.5 py-0.5 rounded-full font-medium">
                              <CheckCircle2 className="w-2.5 h-2.5" /> {a}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Packages */}
            {venue.packages?.length > 0 && (
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-lg font-extrabold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-amber-400" /> Menu &amp; Packages
                  </h2>
                </div>
                <div className="space-y-3">
                  {venue.packages.map((pkg) => {
                    const tier = TIER_MAP[pkg.tier] || TIER_MAP.silver;
                    return (
                      <div key={pkg.id}
                        className="relative flex flex-col sm:flex-row gap-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 overflow-hidden">
                        {/* Popular badge */}
                        {pkg.isPopular && (
                          <div className="absolute top-3 right-3 sm:left-3 sm:right-auto bg-sky-500 text-white text-[10px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded-full">
                            Most Popular
                          </div>
                        )}

                        {/* Image + price row on mobile */}
                        <div className="flex gap-3 sm:gap-0 sm:contents">
                          {/* Image */}
                          {pkg.imageUrl ? (
                            <img src={pkg.imageUrl} alt={pkg.name}
                              className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl object-cover flex-shrink-0 self-start" />
                          ) : (
                            <div className="w-16 h-16 rounded-xl bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0 self-start">
                              <Sparkles className="w-6 h-6 text-gray-400" />
                            </div>
                          )}

                          {/* Price — shown inline with image on mobile */}
                          <div className="sm:hidden ml-auto text-right self-start flex-shrink-0">
                            <p className="text-lg font-extrabold text-sky-600 dark:text-sky-400">
                              PKR {Number(pkg.pricePerPerson).toLocaleString()}
                            </p>
                            <p className="text-[11px] text-gray-400 dark:text-gray-500">per person</p>
                          </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span className={`text-[10px] font-extrabold uppercase tracking-wide px-2 py-0.5 rounded-full ${tier.badge}`}>
                              {tier.label}
                            </span>
                            <span className="font-extrabold text-gray-900 dark:text-white text-sm">{pkg.name}</span>
                          </div>
                          {pkg.description && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 leading-relaxed">{pkg.description}</p>
                          )}
                          {pkg.features?.length > 0 && (
                            <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
                              {pkg.features.map((f, i) => (
                                <span key={i} className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-300">
                                  <CheckCircle2 className="w-3 h-3 text-sky-500 flex-shrink-0" /> {f}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Price — desktop only (right-aligned column) */}
                        <div className="hidden sm:block flex-shrink-0 text-right self-start">
                          <p className="text-xl font-extrabold text-sky-600 dark:text-sky-400">
                            PKR {Number(pkg.pricePerPerson).toLocaleString()}
                          </p>
                          <p className="text-[11px] text-gray-400 dark:text-gray-500">per person</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Location Map */}
            {venue.lat && venue.lng && (
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6">
                <h2 className="text-lg font-extrabold text-gray-800 dark:text-gray-100 mb-3 flex items-center gap-2">
                  <Navigation className="w-5 h-5 text-sky-500" /> Venue Location
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-sky-400" /> {venue.location}
                </p>
                <VenueMapView lat={venue.lat} lng={venue.lng} label={venue.name} />
                <a
                  href={`https://www.google.com/maps?q=${venue.lat},${venue.lng}`}
                  target="_blank" rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-sky-600 dark:text-sky-400 hover:underline"
                >
                  <Navigation className="w-3.5 h-3.5" /> Open in Google Maps
                </a>
              </div>
            )}

            {/* Reviews */}
            <ReviewSection venueId={id} venue={venue} />
          </div>

          {/* RIGHT: Booking panel */}
          <div className="lg:col-span-1" ref={bookingPanelRef}>
            <div className="lg:sticky lg:top-[7rem] space-y-4">
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 sm:p-6 shadow-sm">
                <h2 className="text-lg font-extrabold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <CalendarDays className="w-5 h-5 text-sky-500" /> Book This Venue
                </h2>
                {role === "customer" && (
                  <button type="button" onClick={openChat}
                    className="w-full flex items-center justify-center gap-2 mb-5 bg-gray-50 dark:bg-gray-800 hover:bg-sky-50 dark:hover:bg-sky-900/20 border border-gray-200 dark:border-gray-700 hover:border-sky-300 dark:hover:border-sky-700 text-gray-700 dark:text-gray-200 hover:text-sky-600 dark:hover:text-sky-400 font-semibold text-sm py-2.5 rounded-xl transition-all">
                    <MessageSquare className="w-4 h-4" /> Message Owner
                  </button>
                )}
                <form onSubmit={handleBooking} className="space-y-4">

                  {/* Hall selector — only shown when venue has multiple halls */}
                  {venue.halls?.length > 0 && (
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                        Select Hall <span className="text-red-400">*</span>
                      </label>
                      <select
                        value={selectedHall?.id || ""}
                        onChange={(e) => {
                          const hall = venue.halls.find((h) => h.id === e.target.value) || null;
                          setSelectedHall(hall);
                          // Reset date & slot so calendar rebuilds for this hall
                          setSelectedDate(null);
                          setSelectedSlot(null);
                        }}
                        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                      >
                        <option value="">Choose a hall…</option>
                        {venue.halls.map((h) => (
                          <option key={h.id} value={h.id}>
                            {h.name}{h.floor ? ` (${h.floor})` : ""} — {Number(h.capacity).toLocaleString()} guests
                          </option>
                        ))}
                      </select>
                      {selectedHall && (
                        <p className="text-xs text-sky-600 dark:text-sky-400 font-semibold mt-1 flex items-center gap-1">
                          <DoorOpen className="w-3 h-3" /> {selectedHall.name} selected
                        </p>
                      )}
                    </div>
                  )}

                  {/* Calendar — if venue has halls, only show after a hall is picked */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">
                      Select Date <span className="text-red-400">*</span>
                    </label>
                    {venue.halls?.length > 0 && !selectedHall ? (
                      <div className="flex items-center justify-center h-28 rounded-xl border border-dashed border-gray-200 dark:border-gray-700 text-xs text-gray-400 dark:text-gray-500 gap-2">
                        <DoorOpen className="w-4 h-4" /> Select a hall first to see availability
                      </div>
                    ) : (
                      <Calendar
                        selectedDate={selectedDate}
                        onSelect={handleDateSelect}
                        bookedSlots={bookedSlots}
                      />
                    )}
                    {selectedDate && (
                      <p className="mt-2 text-xs text-sky-600 dark:text-sky-400 font-semibold text-center">
                        Selected: {new Date(selectedDate + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
                      </p>
                    )}
                  </div>

                  {/* Time Slot picker */}
                  {selectedDate && (() => {
                    const SLOTS = [
                      { id: "morning",  label: "Morning",  time: "9 AM – 1 PM",   endHour: 13 },
                      { id: "evening",  label: "Evening",  time: "4 PM – 8 PM",   endHour: 20 },
                      { id: "full_day", label: "Full Day", time: selectedSlot === "full_day" ? `${fullDayStart} – ${fullDayEnd}` : "Choose times", endHour: 20 },
                    ];
                    const bookedOnDate  = bookedSlots[selectedDate] || [];
                    const isSlotBooked  = (slotId) =>
                      bookedOnDate.includes("full_day") ||
                      (slotId === "full_day" ? bookedOnDate.length > 0 : bookedOnDate.includes(slotId));

                    // Check if a slot's time window has already ended today
                    const nowDate = new Date();
                    const todayStr = `${nowDate.getFullYear()}-${String(nowDate.getMonth()+1).padStart(2,"0")}-${String(nowDate.getDate()).padStart(2,"0")}`;
                    const isSlotPastToday = (endHour) =>
                      selectedDate === todayStr && nowDate.getHours() >= endHour;

                    return (
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">
                          Select Time Slot <span className="text-red-400">*</span>
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          {SLOTS.map(({ id, label, time, endHour }) => {
                            const booked   = isSlotBooked(id);
                            const expired  = !booked && isSlotPastToday(endHour);
                            const disabled = booked || expired;
                            const selected = selectedSlot === id;
                            return (
                              <button
                                key={id}
                                type="button"
                                disabled={disabled}
                                onClick={() => !disabled && setSelectedSlot(id)}
                                className={`flex flex-col items-center justify-center px-2 py-2.5 rounded-xl border text-xs font-semibold transition-all
                                  ${selected
                                    ? "bg-sky-500 border-sky-500 text-white shadow-md shadow-sky-200/50 dark:shadow-sky-900/50"
                                    : booked
                                      ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-400 cursor-not-allowed line-through"
                                      : expired
                                        ? "bg-gray-50 dark:bg-gray-800/60 border-gray-200 dark:border-gray-700 text-gray-300 dark:text-gray-600 cursor-not-allowed"
                                        : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-sky-400 hover:text-sky-600 dark:hover:text-sky-400 cursor-pointer"
                                  }`}
                              >
                                <span>{label}</span>
                                <span className={`text-[10px] mt-0.5 font-normal ${selected ? "text-sky-100" : booked ? "text-red-300" : expired ? "text-gray-300 dark:text-gray-600" : "text-gray-400 dark:text-gray-500"}`}>{time}</span>
                                {booked   && <span className="text-[9px] text-red-400 mt-0.5">Booked</span>}
                                {expired  && <span className="text-[9px] text-gray-400 dark:text-gray-500 mt-0.5">Passed</span>}
                              </button>
                            );
                          })}
                        </div>
                        {selectedSlot === "full_day" && (
                          <div className="mt-2 grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[10px] font-semibold text-gray-500 dark:text-gray-400 mb-1">From</label>
                              <select
                                value={fullDayStart}
                                onChange={(e) => setFullDayStart(e.target.value)}
                                className="w-full px-2 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                              >
                                {TIME_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                              </select>
                            </div>
                            <div>
                              <label className="block text-[10px] font-semibold text-gray-500 dark:text-gray-400 mb-1">To</label>
                              <select
                                value={fullDayEnd}
                                onChange={(e) => setFullDayEnd(e.target.value)}
                                className="w-full px-2 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                              >
                                {TIME_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                              </select>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Event type */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Event Type</label>
                    <select value={eventType} onChange={(e) => setEventType(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500">
                      <option value="">Select event type</option>
                      {["Wedding", "Birthday", "Corporate", "Engagement", "Conference", "Party"].map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>

                  {/* Guest count */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                      Number of Guests
                    </label>
                    <div className="relative">
                      <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text" inputMode="numeric" value={guestCount}
                        onChange={(e) => setGuestCount(e.target.value.replace(/\D/g, ""))}
                        placeholder={`Max: ${(selectedHall ? selectedHall.capacity : venue.capacity).toLocaleString()} guests`}
                        maxLength={6}
                        className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 transition"
                      />
                    </div>
                  </div>

                  {/* Package selector */}
                  {venue.packages?.length > 0 && (
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                        Package <span className="text-red-400">*</span>
                      </label>
                      <select
                        value={selectedPackage?.id || ""}
                        onChange={(e) => {
                          const pkg = venue.packages.find((p) => p.id === e.target.value);
                          setSelectedPackage(pkg || null);
                        }}
                        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                      >
                        <option value="">Select a package</option>
                        {venue.packages.map((pkg) => (
                          <option key={pkg.id} value={pkg.id}>
                            {pkg.name} — PKR {Number(pkg.pricePerPerson).toLocaleString()}/person
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Contact number */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                      Your Contact Number <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text" inputMode="numeric" value={customerContact}
                        onChange={(e) => setCustomerContact(e.target.value.replace(/\D/g, "").slice(0, 11))}
                        placeholder="03001234567" maxLength={11}
                        className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                      />
                    </div>
                  </div>

                  {/* Message */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                      Message to Owner <span className="text-gray-400">(optional)</span>
                    </label>
                    <textarea
                      value={message} onChange={(e) => setMessage(e.target.value)}
                      placeholder="Any special requirements or questions?"
                      rows={3}
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none"
                    />
                  </div>

                  {/* Cost estimate */}
                  {Number(guestCount) > 0 && selectedPackage && (() => {
                    const total = Number(guestCount) * Number(selectedPackage.pricePerPerson);
                    return (
                      <div className="bg-sky-50 dark:bg-sky-900/20 border border-sky-200 dark:border-sky-800 rounded-xl p-4">
                        <p className="text-xs font-bold text-sky-700 dark:text-sky-400 uppercase mb-3">Cost Estimate</p>
                        <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
                          <span>{selectedPackage.name} × {guestCount} guests</span>
                          <span className="font-semibold text-gray-900 dark:text-white">PKR {total.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between pt-2 border-t border-sky-200 dark:border-sky-700">
                          <span className="font-bold text-sky-700 dark:text-sky-300 text-sm">Estimated Total</span>
                          <span className="font-extrabold text-sky-600 dark:text-sky-400">PKR {total.toLocaleString()}</span>
                        </div>
                      </div>
                    );
                  })()}

                  <button type="submit" disabled={booking}
                    className="w-full bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 active:from-sky-700 active:to-indigo-800 text-white font-extrabold py-3 rounded-xl transition-all shadow-md shadow-sky-200/50 dark:shadow-sky-900/30 disabled:opacity-60 flex items-center justify-center gap-2 text-sm">
                    {booking ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</>
                    ) : (
                      <><Send className="w-4 h-4" /> Confirm Booking</>
                    )}
                  </button>
                </form>
              </div>

              {/* Security note */}
              <div className="flex items-start gap-2 text-xs text-gray-400 dark:text-gray-500 px-1">
                <Shield className="w-4 h-4 text-gray-300 dark:text-gray-600 flex-shrink-0 mt-0.5" />
                <p>Your booking is safe. The owner reviews all requests before confirming.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VenueDetails;
