import React, { useState } from "react";
import { signupUser } from "../../features/auth/authService";
import { useNavigate, Link } from "react-router-dom";
import { Building2, Users, MailCheck, Mail, Lock, User, Eye, EyeOff, ArrowRight } from "lucide-react";
import { toast } from "react-toastify";
import logo from "../../assets/vfl.jpeg";

const inp = "w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition";

const Signup = () => {
  const [formData, setFormData] = useState({ name: "", email: "", password: "", role: "customer" });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const navigate = useNavigate();
  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signupUser(formData.email, formData.password, formData.role, formData.name);
      setVerificationSent(true);
      toast.success("Account created! Please verify your email.");
    } catch (error) {
      toast.error(error.message);
    }
    setLoading(false);
  };

  if (verificationSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-50 via-white to-indigo-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 px-4">
        <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-800">
          <div className="bg-gradient-to-r from-sky-500 to-indigo-600 p-8 text-center">
            <img src={logo} className="w-14 h-14 mx-auto mb-4 rounded-2xl shadow-lg" alt="logo" />
            <h2 className="text-2xl font-extrabold text-white">Check Your Email</h2>
            <p className="text-sky-100 text-sm mt-1">Almost there!</p>
          </div>
          <div className="p-8 space-y-5 text-center">
            <div className="flex justify-center">
              <div className="w-20 h-20 bg-sky-50 dark:bg-sky-900/30 rounded-full flex items-center justify-center">
                <MailCheck className="w-10 h-10 text-sky-500" />
              </div>
            </div>
            <div>
              <p className="text-gray-600 dark:text-gray-400 text-sm">We sent a verification link to:</p>
              <p className="text-sky-600 dark:text-sky-400 font-bold text-base mt-1 break-all">{formData.email}</p>
            </div>
            <p className="text-gray-400 dark:text-gray-500 text-sm leading-relaxed">Click the link in your email to verify your account. Once verified, you can log in.</p>
            <button onClick={() => navigate("/login")} className="w-full flex items-center justify-center gap-2 bg-sky-500 hover:bg-sky-600 text-white font-bold py-3.5 rounded-xl transition shadow-lg shadow-sky-200/50">
              Go to Login <ArrowRight className="w-4 h-4" />
            </button>
            <p className="text-xs text-gray-400 dark:text-gray-500">Didn't receive it? Check your spam folder.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* LEFT PANEL */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-indigo-600 via-sky-600 to-sky-500 flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-80 h-80 bg-white/10 rounded-full" />
        <div className="absolute bottom-10 -left-20 w-96 h-96 bg-white/10 rounded-full" />
        <Link to="/" className="flex items-center gap-3 relative z-10">
          <img src={logo} className="w-10 h-10 rounded-xl shadow-lg" alt="logo" />
          <span className="text-white text-2xl font-extrabold tracking-tight">VenueFinder</span>
        </Link>
        <div className="relative z-10">
          <h2 className="text-4xl font-extrabold text-white leading-tight mb-4">Join thousands of<br />venue owners & bookers</h2>
          <p className="text-sky-100 text-lg">List your venue or discover the perfect space — all in one platform.</p>
          <div className="mt-10 space-y-4">
            {["✅ Free account creation","✅ Verified venues only","✅ Instant booking confirmation","✅ 24/7 customer support"].map((item) => (
              <p key={item} className="text-sky-100 font-medium">{item}</p>
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
            <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">Create account 🎉</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Join VenueFinder for free today</p>
          </div>
          <form onSubmit={handleSignup} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">I want to:</label>
              <div className="grid grid-cols-2 gap-3">
                {[["customer", Users, "Book Venues"], ["owner", Building2, "List Venues"]].map(([r, Icon, label]) => (
                  <button key={r} type="button" onClick={() => setFormData({ ...formData, role: r })}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200 ${formData.role === r ? "border-sky-500 bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400" : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600"}`}>
                    <Icon className="w-6 h-6" />
                    <span className="text-sm font-bold">{label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Full Name</label>
              <div className="relative"><User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input type="text" name="name" placeholder="Your Name" onChange={handleChange} required className={inp} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Email address</label>
              <div className="relative"><Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input type="email" name="email" placeholder="yourmail@gmail.com" onChange={handleChange} required className={inp} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Password</label>
              <div className="relative"><Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input type={showPassword ? "text" : "password"} name="password" placeholder="••••••••" onChange={handleChange} required className={`${inp} pr-12`} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading} className="w-full flex items-center justify-center gap-2 bg-sky-500 hover:bg-sky-600 active:bg-sky-700 text-white font-bold py-3.5 rounded-xl transition-all duration-200 shadow-lg shadow-sky-200/50 disabled:opacity-60 disabled:cursor-not-allowed">
              {loading ? (<><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Creating account...</>) : (<>Create Account <ArrowRight className="w-4 h-4" /></>)}
            </button>
          </form>
          <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
            Already have an account?{" "}
            <Link to="/login" className="text-sky-500 font-semibold hover:text-sky-700 transition">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Signup;
