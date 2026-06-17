import React, { useState, useEffect, useRef } from "react";
import { NavLink, Link, useNavigate, useLocation } from "react-router-dom";
import { Menu, X, LogOut, Heart, User, Sun, Moon, Monitor, CalendarDays, MessageSquare } from "lucide-react";
import { useSelector, useDispatch } from "react-redux";
import { logout } from "../features/auth/authSlice";
import { signOut } from "firebase/auth";
import { auth } from "../services/firebase";
import { useTheme } from "../context/ThemeContext";
import NotificationBell from "./NotificationBell";
import logo from "../assets/vfl.jpeg";

// ── Theme toggle ─────────────────────────────────────────────────────────────
const MODES = ["light", "dark", "system"];
const MODE_ICONS = { light: Sun, dark: Moon, system: Monitor };
const MODE_LABELS = { light: "Light", dark: "Dark", system: "System" };

const ThemeToggle = ({ mobile = false }) => {
  const { mode, setMode } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Track what the OS is currently reporting so we can display it
  const [sysDark, setSysDark] = useState(
    () => window.matchMedia("(prefers-color-scheme: dark)").matches
  );
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => setSysDark(mq.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (mobile) {
    return (
      <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl">
        {MODES.map((m) => {
          const MIcon = MODE_ICONS[m];
          return (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                mode === m
                  ? "bg-white dark:bg-gray-700 text-sky-600 dark:text-sky-400 shadow-sm"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
              }`}
            >
              <MIcon className="w-3.5 h-3.5" />
              {MODE_LABELS[m]}
            </button>
          );
        })}
      </div>
    );
  }

  const Icon = MODE_ICONS[mode];
  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        title={`Appearance: ${MODE_LABELS[mode]}`}
        className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition"
      >
        <Icon className="w-4 h-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-11 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl p-1 min-w-[160px] z-50">
          {MODES.map((m) => {
            const MIcon = MODE_ICONS[m];
            return (
              <button
                key={m}
                onClick={() => { setMode(m); setOpen(false); }}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  mode === m
                    ? "bg-sky-50 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400"
                    : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                }`}
              >
                <MIcon className="w-4 h-4" />
                {MODE_LABELS[m]}
                {m === "system" && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none ${
                    sysDark
                      ? "bg-gray-700 text-gray-200 dark:bg-gray-600 dark:text-gray-100"
                      : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-300"
                  }`}>
                    {sysDark ? "Dark" : "Light"}
                  </span>
                )}
                {mode === m && <span className="ml-auto w-2 h-2 bg-sky-500 rounded-full flex-shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ── Main Navbar ──────────────────────────────────────────────────────────────
const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const { user, role } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const isAdminRoute =
    location.pathname.startsWith("/dashboard/admin") ||
    location.pathname.startsWith("/admin/");
  if (isAdminRoute) return null;

  const handleLogout = async () => {
    try {
      await signOut(auth);
      dispatch(logout());
      setIsOpen(false);
      navigate("/");
    } catch (error) {
      console.error(error);
    }
  };

  const dashboardPath =
    role === "owner" ? "/dashboard/owner" : role === "admin" ? "/dashboard/admin" : "/dashboard/customer";
  const profilePath = role === "owner" ? "/profile/owner" : "/profile";
  const displayName = user?.name || user?.email?.split("@")[0] || "User";

  return (
    <nav className={`w-full bg-white dark:bg-gray-900 sticky top-0 z-50 transition-all duration-300 ${
      scrolled ? "shadow-md dark:shadow-black/30" : "border-b border-gray-100 dark:border-gray-800"
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex justify-between items-center">

        {/* LOGO */}
        <Link to="/" className="flex items-center gap-2.5 flex-shrink-0">
          <img src={logo} className="w-9 h-9 rounded-xl shadow-sm" alt="logo" />
          <span className="text-xl font-extrabold tracking-tight text-gray-900 dark:text-white">
            Venue<span className="text-sky-500">Finder</span>
          </span>
        </Link>

        {/* DESKTOP NAV LINKS */}
        <div className="hidden lg:flex items-center gap-1">
          <NavItem to="/" label="Home" />
          {user && <NavItem to={dashboardPath} label="Dashboard" />}
          {user && role === "customer" && (
            <>
              <NavItem to="/favorites" label="Favorites" icon={<Heart className="w-3.5 h-3.5" />} />
              <NavItem to="/bookings" label="My Bookings" icon={<CalendarDays className="w-3.5 h-3.5" />} />
              <NavItem to="/messages" label="Messages" icon={<MessageSquare className="w-3.5 h-3.5" />} />
            </>
          )}
          {user && role === "owner" && (
            <NavItem to="/messages" label="Messages" icon={<MessageSquare className="w-3.5 h-3.5" />} />
          )}
        </div>

        {/* DESKTOP RIGHT */}
        <div className="hidden lg:flex items-center gap-2">
          <ThemeToggle />
          <NotificationBell />
          {user ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate(profilePath)}
                className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-xl px-3 py-2 hover:bg-gray-200 dark:hover:bg-gray-700 transition"
              >
                <div className="w-7 h-7 bg-gradient-to-br from-sky-400 to-indigo-500 rounded-full flex items-center justify-center text-white text-xs font-extrabold">
                  {displayName[0]?.toUpperCase()}
                </div>
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">{displayName}</span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  role === "owner"
                    ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400"
                    : role === "admin"
                    ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400"
                    : "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-400"
                }`}>
                  {role}
                </span>
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 text-sm font-semibold text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 px-3 py-2 rounded-xl transition-all"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="text-sm font-semibold text-gray-600 dark:text-gray-300 hover:text-sky-500 px-3 py-2 rounded-xl hover:bg-sky-50 dark:hover:bg-sky-900/20 transition-all"
              >
                Sign In
              </Link>
              <Link
                to="/signup"
                className="text-sm font-bold bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 text-white px-5 py-2.5 rounded-xl shadow-md shadow-sky-200/50 transition-all"
              >
                Get Started
              </Link>
            </div>
          )}
        </div>

        {/* MOBILE: theme + bell + hamburger */}
        <div className="lg:hidden flex items-center gap-2">
          <ThemeToggle />
          <NotificationBell />
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 transition"
          >
            {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* MOBILE MENU */}
      {isOpen && (
        <div className="lg:hidden bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 px-5 py-5 space-y-2 shadow-xl">
          <MobileNavItem to="/" label="Home" onClick={() => setIsOpen(false)} />
          {user && <MobileNavItem to={dashboardPath} label="Dashboard" onClick={() => setIsOpen(false)} />}
          {user && role === "customer" && (
            <>
              <MobileNavItem to="/favorites" label="Favorites" onClick={() => setIsOpen(false)} />
              <MobileNavItem to="/bookings" label="My Bookings" onClick={() => setIsOpen(false)} />
              <MobileNavItem to="/messages" label="Messages" onClick={() => setIsOpen(false)} />
            </>
          )}
          {user && role === "owner" && (
            <MobileNavItem to="/messages" label="Messages" onClick={() => setIsOpen(false)} />
          )}

          {/* Appearance */}
          <div className="pt-3 border-t border-gray-100 dark:border-gray-800">
            <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 px-1">
              Appearance
            </p>
            <ThemeToggle mobile />
          </div>

          {/* Profile / Auth */}
          <div className="pt-3 border-t border-gray-100 dark:border-gray-800 mt-1">
            {user ? (
              <>
                <button
                  onClick={() => { navigate(profilePath); setIsOpen(false); }}
                  className="w-full flex items-center gap-3 mb-3 px-3 py-2.5 bg-gray-50 dark:bg-gray-800 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                >
                  <div className="w-8 h-8 bg-gradient-to-br from-sky-400 to-indigo-500 rounded-full flex items-center justify-center text-white text-sm font-extrabold">
                    {displayName[0]?.toUpperCase()}
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold text-gray-800 dark:text-gray-100">{displayName}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 capitalize">{role}</p>
                  </div>
                  <User className="w-4 h-4 text-gray-400 dark:text-gray-500 ml-auto" />
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 text-sm font-semibold text-red-500 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 py-2.5 rounded-xl transition"
                >
                  <LogOut className="w-4 h-4" /> Logout
                </button>
              </>
            ) : (
              <div className="flex flex-col gap-2">
                <Link
                  to="/login"
                  onClick={() => setIsOpen(false)}
                  className="w-full text-center text-sm font-semibold text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                >
                  Sign In
                </Link>
                <Link
                  to="/signup"
                  onClick={() => setIsOpen(false)}
                  className="w-full text-center text-sm font-bold bg-gradient-to-r from-sky-500 to-indigo-600 text-white py-2.5 rounded-xl shadow-md"
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

const NavItem = ({ to, label, icon }) => (
  <NavLink
    to={to}
    className={({ isActive }) =>
      isActive
        ? "px-4 py-2 bg-sky-50 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400 font-semibold rounded-xl text-sm flex items-center gap-1.5"
        : "px-4 py-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl text-sm font-medium transition-all flex items-center gap-1.5"
    }
  >
    {icon}
    {label}
  </NavLink>
);

const MobileNavItem = ({ to, label, onClick }) => (
  <NavLink
    to={to}
    onClick={onClick}
    className={({ isActive }) =>
      `block px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
        isActive
          ? "bg-sky-50 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400"
          : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
      }`
    }
  >
    {label}
  </NavLink>
);

export default Navbar;
