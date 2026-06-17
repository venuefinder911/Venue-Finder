import { useSelector } from "react-redux";
import { Navigate } from "react-router-dom";

const ProtectedRoute = ({ children, roleRequired }) => {
  const { user, role } = useSelector((state) => state.auth);

  if (!user) {
    // Unauthenticated: send admin routes to admin login, others to regular login
    return roleRequired === "admin"
      ? <Navigate to="/login/Admin" replace />
      : <Navigate to="/login" replace />;
  }

  if (roleRequired && role !== roleRequired) {
    // Wrong role: send admin routes to admin login, others to home
    return roleRequired === "admin"
      ? <Navigate to="/login/Admin" replace />
      : <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;
