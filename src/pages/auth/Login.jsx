import React, { useState } from "react";
import {
  loginUser,
  googleSignIn,
  completeGoogleSignup,
  cancelGoogleSignup,
} from "../../features/auth/authService";
import { useDispatch } from "react-redux";
import { setUser } from "../../features/auth/authSlice";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "react-toastify";
import logo from "../../assets/vfl.jpeg";
import { Eye, EyeOff, Lock, Mail, ArrowRight, Building2, Users, X, Loader2 } from "lucide-react";

const GoogleIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
    <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
    <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
    <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>
  </svg>
);

// Maps Firebase auth error codes to friendly messages (null = silent, user cancelled)
const googleErrorMessage = (error) => {
  switch (error?.code) {
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return null;
    case "auth/popup-blocked":
      return "Popup was blocked by your browser. Please allow popups and try again.";
    case "auth/account-exists-with-different-credential":
      return "This email is already registered with a password. Please sign in with email & password.";
    case "auth/network-request-failed":
      return "Network error. Please check your internet connection and try again.";
    case "auth/unauthorized-domain":
      return "This domain is not authorized for Google sign-in. Contact support.";
    default:
      return "Google sign-in failed. Please try again.";
  }
};

const dashboardPath = (role) =>
  role === "admin" ? "/dashboard/admin" : role === "owner" ? "/dashboard/owner" : "/dashboard/customer";

const Login = () => {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showRolePicker, setShowRolePicker] = useState(false);
  const [pendingRole, setPendingRole] = useState("customer");
  const [creatingProfile, setCreatingProfile] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleGoogle = async () => {
    if (googleLoading) return;
    setGoogleLoading(true);
    try {
      const result = await googleSignIn();
      if (result.isNew) {
        // New Google user — ask whether they want to book or list venues
        setPendingRole("customer");
        setShowRolePicker(true);
      } else {
        dispatch(setUser({ user: result.user, role: result.role }));
        toast.success("Welcome back!");
        navigate(dashboardPath(result.role));
      }
    } catch (error) {
      const msg = googleErrorMessage(error);
      if (msg) toast.error(msg);
    }
    setGoogleLoading(false);
  };

  const handleRoleConfirm = async () => {
    if (creatingProfile) return;
    setCreatingProfile(true);
    try {
      const { user, role } = await completeGoogleSignup(pendingRole);
      dispatch(setUser({ user, role }));
      setShowRolePicker(false);
      toast.success("Account created! Welcome to VenueFinder 🎉");
      navigate(dashboardPath(role));
    } catch {
      toast.error("Could not create your account. Please try again.");
    }
    setCreatingProfile(false);
  };

  const handleRoleCancel = async () => {
    if (creatingProfile) return;
    setShowRolePicker(false);
    try {
      await cancelGoogleSignup();
    } catch {
      /* already signed out */
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { user, role } = await loginUser(formData.email, formData.password);
      dispatch(setUser({ user, role }));
      toast.success("Welcome back!");
      navigate(role === "owner" ? "/dashboard/owner" : "/dashboard/customer");
    } catch (error) {
      if (error.message === "EMAIL_NOT_VERIFIED") {
        toast.error("Please verify your email before logging in. Check your inbox.", { autoClose: 5000 });
      } else {
        toast.error("Invalid email or password");
      }
    }
    setLoading(false);
  };

  const inp = "w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition";

  return (
    <div className="min-h-screen flex">
      {/* LEFT PANEL */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-sky-500 via-sky-600 to-indigo-700 flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute -top-20 -left-20 w-80 h-80 bg-white/10 rounded-full" />
        <div className="absolute bottom-10 -right-20 w-96 h-96 bg-white/10 rounded-full" />
        <div className="absolute top-1/2 left-1/4 w-32 h-32 bg-white/5 rounded-full" />
        <Link to="/" className="flex items-center gap-3 relative z-10">
          <img src={logo} className="w-10 h-10 rounded-xl shadow-lg" alt="logo" />
          <span className="text-white text-2xl font-extrabold tracking-tight">VenueFinder</span>
        </Link>
        <div className="relative z-10">
          <h2 className="text-4xl font-extrabold text-white leading-tight mb-4">Find & Book<br />Perfect Venues</h2>
          <p className="text-sky-100 text-lg">Thousands of verified venues for weddings, birthdays, and corporate events.</p>
          <div className="mt-10 grid grid-cols-3 gap-4">
            {[["500+", "Venues"], ["10k+", "Bookings"], ["4.9★", "Rating"]].map(([num, label]) => (
              <div key={label} className="bg-white/15 backdrop-blur-sm rounded-2xl p-4 text-center">
                <p className="text-white text-xl font-extrabold">{num}</p>
                <p className="text-sky-100 text-xs mt-1">{label}</p>
              </div>
            ))}
          </div>
        </div>
        <p className="text-sky-200 text-sm relative z-10">© 2026 VenueFinder. All rights reserved.</p>
      </div>

      {/* RIGHT PANEL */}
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4 sm:px-6 py-8 sm:py-12">
        <div className="w-full max-w-md">
          <div className="flex lg:hidden justify-center mb-8">
            <Link to="/" className="flex items-center gap-2">
              <img src={logo} className="w-10 h-10 rounded-xl" alt="logo" />
              <span className="text-xl font-extrabold text-gray-900 dark:text-white">Venue<span className="text-sky-500">Finder</span></span>
            </Link>
          </div>
          <div className="mb-8">
            <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">Welcome back 👋</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Sign in to your account to continue</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Email address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input type="email" name="email" placeholder="yourmail@gmail.com" onChange={handleChange} required className={inp} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input type={showPassword ? "text" : "password"} name="password" placeholder="••••••••" onChange={handleChange} required className={`${inp} pr-12`} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="flex justify-end">
              <Link to="/forgot-password" className="text-sm text-sky-500 hover:text-sky-700 font-medium transition">Forgot password?</Link>
            </div>
            <button type="submit" disabled={loading} className="w-full flex items-center justify-center gap-2 bg-sky-500 hover:bg-sky-600 active:bg-sky-700 text-white font-bold py-3.5 rounded-xl transition-all duration-200 shadow-lg shadow-sky-200/50 dark:shadow-sky-900/30 disabled:opacity-60 disabled:cursor-not-allowed">
              {loading ? (<><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Signing in...</>) : (<>Sign In <ArrowRight className="w-4 h-4" /></>)}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <span className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
            <span className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">or</span>
            <span className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
          </div>

          {/* Continue with Google */}
          <button
            type="button"
            onClick={handleGoogle}
            disabled={googleLoading || loading}
            className="w-full flex items-center justify-center gap-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 active:bg-gray-100 text-gray-700 dark:text-gray-200 font-semibold py-3.5 rounded-xl transition-all duration-200 shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {googleLoading ? (
              <><Loader2 className="w-5 h-5 animate-spin" /><span>Connecting to Google...</span></>
            ) : (
              <><GoogleIcon /><span>Continue with Google</span></>
            )}
          </button>

          <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
            Don't have an account?{" "}
            <Link to="/signup" className="text-sky-500 font-semibold hover:text-sky-700 transition">Create one</Link>
          </p>
        </div>
      </div>

      {/* Role picker modal — shown when a new Google user needs to choose a role */}
      {showRolePicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 py-6 overflow-y-auto">
          <div className="w-full max-w-sm bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-800 p-6 sm:p-8 relative">
            <button
              type="button"
              onClick={handleRoleCancel}
              disabled={creatingProfile}
              aria-label="Cancel"
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition disabled:opacity-50"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl sm:text-2xl font-extrabold text-gray-900 dark:text-white">One last step 🎉</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 mb-6">Tell us what you want to do on VenueFinder</p>
            <div className="grid grid-cols-2 gap-3 mb-6">
              {[["customer", Users, "Book Venues"], ["owner", Building2, "List Venues"]].map((opt) => {
                const [r, Icon, label] = opt;
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setPendingRole(r)}
                    disabled={creatingProfile}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200 ${pendingRole === r ? "border-sky-500 bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400" : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600"}`}
                  >
                    <Icon className="w-6 h-6" />
                    <span className="text-sm font-bold">{label}</span>
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={handleRoleConfirm}
              disabled={creatingProfile}
              className="w-full flex items-center justify-center gap-2 bg-sky-500 hover:bg-sky-600 active:bg-sky-700 text-white font-bold py-3.5 rounded-xl transition-all duration-200 shadow-lg shadow-sky-200/50 dark:shadow-sky-900/30 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {creatingProfile ? (
                <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Setting up...</>
              ) : (
                <>Continue <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
