import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import healthSyncLogo from "../assets/health-sync-logo.svg";
import { API } from "../config";
import "./admin-login.css";

const AdminLogin = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (res.ok) {
        // Clear any stale sessions
        localStorage.removeItem("user");
        localStorage.removeItem("doctor");
        localStorage.setItem("token", data.data.token);
        localStorage.setItem("admin", JSON.stringify(data.data.admin));
        navigate("/admin-dashboard");
      } else {
        setError(data.message || "Login failed. Please check your credentials.");
      }
    } catch {
      setError("Server error. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", background: "#f0f4f8" }}>

      {/* ── Left panel (desktop) ── */}
      <div className="auth-left">
        <div className="auth-deco-ring auth-deco-ring-lg" />
        <div className="auth-deco-ring auth-deco-ring-md" />
        <div className="auth-deco-blob auth-blob-tr" />
        <div className="auth-deco-blob auth-blob-bl" />
        <img src={healthSyncLogo} alt="HealthSync" className="auth-left-logo" />
        <h1 className="auth-left-brand">HEALTHSYNC</h1>
        <p className="auth-left-tagline">Administration Portal</p>
        <div className="auth-left-features">
          {["Manage patients & doctors", "View platform statistics", "Full appointment oversight"].map((f, i) => (
            <div key={i} className="auth-left-feat-row">
              <span className="auth-left-feat-dot" />
              <span>{f}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right panel ── */}
      <div className="auth-right">

        {/* Mobile header */}
        <div className="auth-mobile-header">
          <button type="button" onClick={() => navigate("/login-register")} className="auth-back-btn">←</button>
          <img src={healthSyncLogo} alt="HealthSync" style={{ width: 58, height: 58, marginBottom: 8 }} />
          <h1 style={{ color: "#fff", fontSize: "1.2rem", fontWeight: 900, letterSpacing: "0.1em", margin: 0 }}>HEALTHSYNC</h1>
        </div>

        <div className="auth-form-wrap">

          {/* Desktop back link */}
          <button type="button" onClick={() => navigate("/login-register")} className="auth-desktop-back">
            ← Back
          </button>

          <h2 className="auth-form-title">Admin Login</h2>
          <p className="auth-form-subtitle">Sign in to the administration panel</p>

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="auth-field">
              <label className="auth-label">Email</label>
              <input
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter admin email"
                required
                className="auth-input"
              />
            </div>

            <div className="auth-field">
              <label className="auth-label">Password</label>
              <div style={{ position: "relative" }}>
                <input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                  required
                  className="auth-input"
                  style={{ paddingRight: 44 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#9ca3af", fontSize: 16, cursor: "pointer", padding: 0 }}
                >
                  {showPassword ? "🙈" : "👁"}
                </button>
              </div>
            </div>

            {error && <div className="auth-error">{error}</div>}

            <button type="submit" disabled={loading} className="auth-submit-btn">
              {loading ? <span className="auth-spinner" /> : null}
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>
        </div>
      </div>

    </div>
  );
};

export default AdminLogin;
