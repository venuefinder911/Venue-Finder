import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { signOut } from "firebase/auth";
import { auth } from "../services/firebase";
import { logout } from "../features/auth/authSlice";
import {
  Shield,
  Users,
  BookOpen,
  Flag,
  LogOut,
  LayoutDashboard,
  Menu,
  X,
} from "lucide-react";

const NAV = [
  {
    label: "Dashboard",
    icon: LayoutDashboard,
    path: "/dashboard/admin",
    hoverCls: "hover:text-white hover:bg-white/[0.08]",
  },
  {
    label: "Users",
    icon: Users,
    path: "/admin/users",
    hoverCls: "hover:text-indigo-400 hover:bg-indigo-500/10 hover:border-indigo-500/20",
  },
  {
    label: "Bookings",
    icon: BookOpen,
    path: "/admin/bookings",
    hoverCls: "hover:text-sky-400 hover:bg-sky-500/10 hover:border-sky-500/20",
  },
  {
    label: "Complaints",
    icon: Flag,
    path: "/admin/complaints",
    hoverCls: "hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/20",
  },
];

/**
 * Shared dark header for all admin sub-pages.
 * Responsive: hamburger menu on mobile, full nav on sm+.
 */
const AdminHeader = ({ title, titleIcon: TitleIcon }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((s) => s.auth);
  const displayName = user?.name || user?.email?.split("@")[0] || "Admin";
  const [open, setOpen] = useState(false);

  const handleLogout = async () => {
    await signOut(auth);
    dispatch(logout());
    navigate("/login/Admin");
  };

  const go = (path) => {
    navigate(path);
    setOpen(false);
  };

  return (
    <header className="relative z-20 border-b border-indigo-900/60 bg-[#0b0f2e] shadow-lg shadow-black/40 sticky top-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-3">

        {/* Left: logo + breadcrumb */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => go("/dashboard/admin")}
            className="flex items-center gap-2 flex-shrink-0 hover:opacity-80 transition"
          >
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-sky-500 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <div className="hidden sm:block">
              <p className="text-xs font-extrabold text-white leading-none">VenueFinder</p>
              <p className="text-[10px] text-indigo-400 font-semibold tracking-wide">ADMIN CONSOLE</p>
            </div>
          </button>

          <span className="text-white/20 text-lg hidden sm:block">/</span>

          {(title || TitleIcon) && (
            <div className="flex items-center gap-1.5 min-w-0">
              {TitleIcon && <TitleIcon className="w-4 h-4 text-slate-400 flex-shrink-0" />}
              <span className="text-sm font-bold text-white truncate">{title}</span>
            </div>
          )}
        </div>

        {/* Right: nav + pill + logout + hamburger */}
        <div className="flex items-center gap-2 flex-shrink-0">

          {/* Desktop nav — hidden below sm */}
          <div className="hidden sm:flex items-center gap-1.5">
            {NAV.map(({ label, icon: Icon, path, hoverCls }) => (
              <button
                key={label}
                onClick={() => go(path)}
                className={`flex items-center gap-1.5 text-xs font-medium text-slate-400 bg-white/[0.04] border border-white/[0.07] px-3 py-2 rounded-xl transition ${hoverCls}`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden md:inline">{label}</span>
              </button>
            ))}
          </div>

          {/* Admin pill */}
          <div className="flex items-center gap-2 bg-white/[0.05] border border-white/[0.08] rounded-xl px-2.5 py-2">
            <div className="w-6 h-6 bg-gradient-to-br from-indigo-500 to-sky-500 rounded-full flex items-center justify-center text-white text-xs font-extrabold flex-shrink-0">
              {displayName[0]?.toUpperCase()}
            </div>
            <span className="text-xs font-bold text-white hidden lg:block">{displayName}</span>
          </div>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-xs font-semibold text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 px-2.5 py-2 rounded-xl transition"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Logout</span>
          </button>

          {/* Hamburger — mobile only */}
          <button
            onClick={() => setOpen((o) => !o)}
            aria-label="Toggle navigation"
            className="sm:hidden flex items-center justify-center w-9 h-9 rounded-xl bg-white/[0.06] border border-white/[0.08] text-slate-300 hover:text-white transition"
          >
            {open ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {open && (
        <div className="sm:hidden border-t border-indigo-900/40 bg-[#0c1030] px-4 py-3 space-y-1">
          {NAV.map(({ label, icon: Icon, path }) => (
            <button
              key={label}
              onClick={() => go(path)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-slate-300 hover:text-white hover:bg-white/[0.06] transition text-left"
            >
              <Icon className="w-4 h-4 text-slate-400" />
              {label}
            </button>
          ))}
        </div>
      )}
    </header>
  );
};

export default AdminHeader;
