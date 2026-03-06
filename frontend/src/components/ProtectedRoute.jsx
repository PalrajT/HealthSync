import React from "react";
import { Navigate } from "react-router-dom";

/**
 * Wraps a route so only authenticated users with an allowed role can access it.
 *
 * Role detection:
 *  - "patient" → localStorage contains "user"
 *  - "doctor"  → localStorage contains "doctor"
 *  - "admin"   → localStorage contains "admin"
 */
function getRole() {
  try {
    if (localStorage.getItem("admin")) return "admin";
    if (localStorage.getItem("doctor")) return "doctor";
    if (localStorage.getItem("user")) return "patient";
  } catch {
    /* storage unavailable */
  }
  return null;
}

export default function ProtectedRoute({ allowedRoles, children }) {
  const token = localStorage.getItem("token");
  const role = getRole();

  if (!token || !role) {
    return <Navigate to="/login-register" replace />;
  }

  if (!allowedRoles.includes(role)) {
    // Redirect to the user's own dashboard if they have the wrong role
    const dashboards = {
      patient: "/patient-dashboard",
      doctor: "/doctor-dashboard",
      admin: "/admin-dashboard",
    };
    return <Navigate to={dashboards[role] || "/login-register"} replace />;
  }

  return children;
}
