import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import healthSyncLogo from "../assets/health-sync-logo.svg";
import "./forgot-password.css";

import { API } from "../config";

function ForgotPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [role, setRole] = useState("patient");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [devResetUrl, setDevResetUrl] = useState("");

  useEffect(() => {
    const roleParam = searchParams.get("role");
    if (roleParam === "doctor" || roleParam === "patient") setRole(roleParam);
  }, [searchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");
    setDevResetUrl("");
    try {
      const endpoint =
        role === "patient"
          ? `${API}/api/auth/forgot-password`
          : `${API}/api/doctor-auth/forgot-password`;

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage(data.message);
        if (data.devResetUrl) setDevResetUrl(data.devResetUrl);
      } else {
        setError(data.message || "Something went wrong.");
      }
    } catch {
      setError("Server error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", background: "#f0f4f8" }}>

      {/* ── Left panel (desktop) ── */}
      <div className="fp-left">
        <div className="fp-deco-ring fp-ring-lg" />
        <div className="fp-deco-ring fp-ring-md" />
        <div className="fp-deco-blob fp-blob-tr" />
        <div className="fp-deco-blob fp-blob-bl" />
        <img src={healthSyncLogo} alt="HealthSync" className="fp-left-logo" />
        <h1 className="fp-left-brand">HEALTHSYNC</h1>
        <p className="fp-left-tagline">Don't worry, we'll get you back in.</p>
        <div className="fp-left-steps">
          {["Enter your registered email","Receive a secure reset link","Set your new password"].map((s, i) => (
            <div key={i} className="fp-step-row">
              <div className="fp-step-num">{i + 1}</div>
              <span>{s}</span>
            </div>
          ))}
        </div>
        <div className="fp-badge">
          <span>🔒</span>
          <span>Secure Password Reset</span>
        </div>
      </div>

      {/* ── Right panel ── */}
      <div className="fp-right">

        {/* Mobile header */}
        <div className="fp-mobile-header">
          <button type="button" onClick={() => navigate(-1)} className="fp-back-btn">←</button>
          <img src={healthSyncLogo} alt="HealthSync" style={{ width: 52, height: 52, marginBottom: 6 }} />
          <h1 style={{ color: "#fff", fontSize: "1.1rem", fontWeight: 900, letterSpacing: "0.1em", margin: 0 }}>HEALTHSYNC</h1>
        </div>

        <div className="fp-form-wrap">
          <button type="button" onClick={() => navigate(-1)} className="fp-desktop-back">← Back to Login</button>

          <h2 className="fp-title">Forgot Password</h2>
          <p className="fp-subtitle">Enter your email and we'll send you a reset link.</p>

          <form onSubmit={handleSubmit} className="fp-form">

            {/* Role selector */}
            <div className="fp-field">
              <label className="fp-label">I am a</label>
              <div className="fp-role-row">
                {["patient", "doctor"].map(r => (
                  <button
                    key={r}
                    type="button"
                    className={`fp-role-btn${role === r ? " fp-role-btn--active" : ""}`}
                    onClick={() => setRole(r)}
                  >
                    {r === "patient" ? "🧑‍⚕️" : "👨‍⚕️"} {r.charAt(0).toUpperCase() + r.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Email */}
            <div className="fp-field">
              <label className="fp-label">Email address</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Enter your registered email"
                required
                className="fp-input"
              />
            </div>

            {error && <div className="fp-error">{error}</div>}

            {message && (
              <div className="fp-success-box">
                <p className="fp-success-msg">{message}</p>
                {devResetUrl ? (
                  <a href={devResetUrl} className="fp-dev-link">→ Click here to reset your password</a>
                ) : (
                  <p className="fp-success-hint">Check your inbox (spam folder too).</p>
                )}
              </div>
            )}

            <button type="submit" disabled={loading} className="fp-submit">
              {loading ? <><span className="fp-spinner" /> Sending...</> : "Send Reset Link"}
            </button>

            <p className="fp-footer">
              Remembered your password?{" "}
              <button type="button" className="fp-link" onClick={() => navigate("/login-register")}>
                Back to Login
              </button>
            </p>
          </form>
        </div>
      </div>


    </div>
  );
}

export default ForgotPassword;
