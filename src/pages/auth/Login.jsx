import React, { useState } from "react";
import { loginUser } from "../../features/auth/authService";
import { useDispatch } from "react-redux";
import { setUser } from "../../features/auth/authSlice";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "react-toastify";
import logo from "../../assets/vfl.jpeg";
import { Eye, EyeOff, Lock, Mail, ArrowRight } from "lucide-react";

const Login = () => {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

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
          <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
            Don't have an account?{" "}
            <Link to="/signup" className="text-sky-500 font-semibold hover:text-sky-700 transition">Create one</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
