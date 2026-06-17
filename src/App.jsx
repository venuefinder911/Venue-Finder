import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
} from "react-router-dom";
import { useLayoutEffect } from "react";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import { useTheme } from "./context/ThemeContext";

const RouteThemeSync = () => {
  const { mode } = useTheme();
  const { pathname } = useLocation();
  useLayoutEffect(() => {
    if (mode !== "system") return;
    const root = document.documentElement;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    if (mq.matches) root.classList.add("dark");
    else root.classList.remove("dark");
  }, [pathname, mode]);
  return null;
};

import Home from "./pages/Home";

import Login from "./pages/auth/Login";
import Signup from "./pages/auth/Signup";
import ForgotPassword from "./pages/auth/ForgotPassword";
import AdminLogin from "./pages/auth/AdminLogin";

import OwnerDashboard from "./pages/owner/OwnerDashboard";
import AddVenue from "./pages/owner/AddVenue";
import EditVenue from "./pages/owner/EditVenue";
import BookingRequests from "./pages/owner/BookingRequests";
import OwnerProfile from "./pages/owner/OwnerProfile";

import CustomerDashboard from "./pages/customer/CustomerDashboard";
import VenueDetails from "./pages/customer/VenueDetails";
import Profile from "./pages/customer/Profile";
import Favorites from "./pages/customer/Favorites";
import MyBookings from "./pages/customer/MyBookings";

import AdminDashboard from "./pages/admin/AdminDashboard";
import ManageComplaints from "./pages/admin/ManageComplaints";
import ManageUsers from "./pages/admin/ManageUsers";
import MonitorBookings from "./pages/admin/MonitorBookings";

import SubmitComplaint from "./pages/customer/SubmitComplaint";

import Chat from "./pages/Chat";
import ChatList from "./pages/ChatList";
import NotFound from "./pages/NotFound";

function App() {
  return (
    <Router>
      <RouteThemeSync />
      <Navbar />

      <Routes>
        {/* PUBLIC */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/venue/:id" element={<VenueDetails />} />

        {/* ADMIN — only accessible via direct link */}
        <Route path="/login/Admin" element={<AdminLogin />} />
        <Route
          path="/dashboard/admin"
          element={
            <ProtectedRoute roleRequired="admin">
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/complaints"
          element={
            <ProtectedRoute roleRequired="admin">
              <ManageComplaints />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute roleRequired="admin">
              <ManageUsers />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/bookings"
          element={
            <ProtectedRoute roleRequired="admin">
              <MonitorBookings />
            </ProtectedRoute>
          }
        />

        {/* OWNER */}
        <Route
          path="/dashboard/owner"
          element={
            <ProtectedRoute roleRequired="owner">
              <OwnerDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/add-venue"
          element={
            <ProtectedRoute roleRequired="owner">
              <AddVenue />
            </ProtectedRoute>
          }
        />

        <Route
          path="/edit-venue/:id"
          element={
            <ProtectedRoute roleRequired="owner">
              <EditVenue />
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/owner/bookings"
          element={
            <ProtectedRoute roleRequired="owner">
              <BookingRequests />
            </ProtectedRoute>
          }
        />

        <Route
          path="/profile/owner"
          element={
            <ProtectedRoute roleRequired="owner">
              <OwnerProfile />
            </ProtectedRoute>
          }
        />

        {/* CUSTOMER */}
        <Route
          path="/dashboard/customer"
          element={
            <ProtectedRoute roleRequired="customer">
              <CustomerDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/profile"
          element={
            <ProtectedRoute roleRequired="customer">
              <Profile />
            </ProtectedRoute>
          }
        />

        <Route
          path="/favorites"
          element={
            <ProtectedRoute roleRequired="customer">
              <Favorites />
            </ProtectedRoute>
          }
        />

        <Route
          path="/bookings"
          element={
            <ProtectedRoute roleRequired="customer">
              <MyBookings />
            </ProtectedRoute>
          }
        />
        <Route
          path="/complaint/:venueId"
          element={
            <ProtectedRoute roleRequired="customer">
              <SubmitComplaint />
            </ProtectedRoute>
          }
        />

        {/* CHAT - accessible by both customer and owner */}
        <Route path="/chat/:chatId" element={<Chat />} />
        <Route path="/messages" element={<ChatList />} />

        {/* 404 — catch all unmatched routes */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
}

export default App;
