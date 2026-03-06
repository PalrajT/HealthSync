import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import healthSyncLogo from "../assets/health-sync-logo.svg";
import "./admin-login.css";
import { API } from "../config";

const DoctorLogin = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ emailOrPhone: "", password: "", licenseNumber: "" });
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
      const res = await fetch(`${API}/api/doctor-auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.removeItem("user");  // clear any stale patient session
        localStorage.removeItem("admin"); // clear any stale admin session
        localStorage.setItem("token", data.data.token);
        localStorage.setItem("doctor", JSON.stringify(data.data.doctor));
        navigate("/doctor-dashboard");
      } else {
        setError(data.message || "Login failed. Check credentials and license UID.");
      }
    } catch {
      setError("Server error. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight:"100vh", display:"flex", background:"#f0f4f8" }}>

      {/* ── Left panel (desktop) ── */}
      <div className="auth-left">
        <div className="auth-deco-ring auth-deco-ring-lg" />
        <div className="auth-deco-ring auth-deco-ring-md" />
        <div className="auth-deco-blob auth-blob-tr" />
        <div className="auth-deco-blob auth-blob-bl" />
        <img src={healthSyncLogo} alt="HealthSync" className="auth-left-logo" />
        <h1 className="auth-left-brand">HEALTHSYNC</h1>
        <p className="auth-left-tagline">Empowering doctors to deliver better care.</p>
        <div className="auth-left-features">
          {["Manage patient appointments","Access patient records","Track your daily schedule"].map((f,i) => (
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
          <img src={healthSyncLogo} alt="HealthSync" style={{ width:58, height:58, marginBottom:8 }} />
          <h1 style={{ color:"#fff", fontSize:"1.2rem", fontWeight:900, letterSpacing:"0.1em", margin:0 }}>HEALTHSYNC</h1>
        </div>

        <div className="auth-form-wrap">

          {/* Desktop back link */}
          <button type="button" onClick={() => navigate("/login-register")} className="auth-desktop-back">
            ← Back
          </button>

          <h2 className="auth-form-title">Doctor Login</h2>
          <p className="auth-form-subtitle">Sign in with your credentials and license UID</p>

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="auth-field">
              <label className="auth-label">Email / Phone</label>
              <input
                name="emailOrPhone"
                type="text"
                value={formData.emailOrPhone}
                onChange={handleChange}
                placeholder="Enter email or phone"
                required
                className="auth-input"
              />
            </div>

            <div className="auth-field">
              <label className="auth-label">Password</label>
              <div style={{ position:"relative" }}>
                <input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                  required
                  className="auth-input"
                  style={{ paddingRight:44 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position:"absolute", right:14, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", color:"#9ca3af", fontSize:16, cursor:"pointer", padding:0 }}
                >
                  {showPassword ? "🙈" : "👁"}
                </button>
              </div>
            </div>

            <div className="auth-field">
              <label className="auth-label">License / UID Number</label>
              <input
                name="licenseNumber"
                type="text"
                value={formData.licenseNumber}
                onChange={handleChange}
                placeholder="Enter your license UID"
                required
                className="auth-input"
              />
            </div>

            <div style={{ display:"flex", justifyContent:"flex-end", marginTop:-4 }}>
              <button type="button" onClick={() => navigate("/forgot-password?role=doctor")} className="auth-link-btn">
                Forgot password?
              </button>
            </div>

            {error && <div className="auth-error">{error}</div>}

            <button type="submit" disabled={loading} className="auth-submit-btn">
              {loading ? <span className="auth-spinner" /> : null}
              {loading ? "Signing in..." : "Sign In"}
            </button>

            <p className="auth-footer-text">
              Don't have an account?{" "}
              <Link to="/doctor-register" className="auth-link">Register here</Link>
            </p>
          </form>
        </div>
      </div>


    </div>
  );
};

export default DoctorLogin;
