import React, { useState } from "react";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../../services/firebase";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "react-toastify";
import { Mail, ArrowLeft, MailCheck, ArrowRight } from "lucide-react";
import logo from "../../assets/vfl.jpeg";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const navigate = useNavigate();

  const handleReset = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setEmailSent(true);
      toast.success("Password reset email sent!");
    } catch (error) {
      if (error.code === "auth/user-not-found" || error.code === "auth/invalid-email") {
        toast.error("No account found with this email address.");
      } else {
        toast.error("Something went wrong. Please try again.");
      }
    }
    setLoading(false);
  };

  // SUCCESS SCREEN
  if (emailSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-50 via-white to-indigo-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 px-4">
        <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-800">
          <div className="bg-gradient-to-r from-sky-500 to-indigo-600 p-8 text-center">
            <img src={logo} className="w-14 h-14 mx-auto mb-4 rounded-2xl shadow-lg" alt="logo" />
            <h2 className="text-2xl font-extrabold text-white">Check Your Email</h2>
            <p className="text-sky-100 text-sm mt-1">Reset link sent</p>
          </div>
          <div className="p-8 space-y-5 text-center">
            <div className="flex justify-center">
              <div className="w-20 h-20 bg-sky-50 dark:bg-sky-900/30 rounded-full flex items-center justify-center">
                <MailCheck className="w-10 h-10 text-sky-500" />
              </div>
            </div>
            <div>
              <p className="text-gray-600 dark:text-gray-400 text-sm">We sent a password reset link to:</p>
              <p className="text-sky-600 dark:text-sky-400 font-bold text-base mt-1 break-all">{email}</p>
            </div>
            <p className="text-gray-400 dark:text-gray-500 text-sm leading-relaxed">
              Click the link in your email to reset your password. Check your spam folder if you don't see it.
            </p>
            <button
              onClick={() => navigate("/login")}
              className="w-full flex items-center justify-center gap-2 bg-sky-500 hover:bg-sky-600 text-white font-bold py-3.5 rounded-xl transition shadow-lg shadow-sky-200/50 dark:shadow-sky-900/30"
            >
              Back to Login <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-50 via-white to-indigo-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Link to="/" className="flex items-center gap-2">
            <img src={logo} className="w-10 h-10 rounded-xl shadow" alt="logo" />
            <span className="text-xl font-extrabold text-gray-900 dark:text-white">
              Venue<span className="text-sky-500">Finder</span>
            </span>
          </Link>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-sky-500 to-indigo-600 px-8 py-8 text-center">
            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Mail className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-2xl font-extrabold text-white">Forgot Password?</h1>
            <p className="text-sky-100 text-sm mt-1">No worries, we'll send you a reset link</p>
          </div>

          {/* Form */}
          <div className="px-8 py-8 space-y-6">
            <p className="text-gray-500 dark:text-gray-400 text-sm text-center leading-relaxed">
              Enter the email address linked to your account and we'll send you a link to reset your password.
            </p>

            <form onSubmit={handleReset} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Email address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:bg-white dark:focus:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-sky-500 hover:bg-sky-600 active:bg-sky-700 text-white font-bold py-3.5 rounded-xl transition-all duration-200 shadow-lg shadow-sky-200/50 dark:shadow-sky-900/30 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>Send Reset Link <ArrowRight className="w-4 h-4" /></>
                )}
              </button>
            </form>

            <button
              onClick={() => navigate("/login")}
              className="flex items-center justify-center gap-2 w-full text-gray-500 dark:text-gray-400 text-sm hover:text-sky-500 dark:hover:text-sky-400 transition font-medium"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
