import React, { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import healthSyncLogo from "../assets/health-sync-logo.svg";
import "./reset-password.css";

import { API } from "../config";

function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const role = searchParams.get("role") || "patient";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (!token) {
      setError("Reset token is missing. Use the link from your email.");
      return;
    }

    setLoading(true);
    try {
      const endpoint =
        role === "doctor"
          ? `${API}/api/doctor-auth/reset-password`
          : `${API}/api/auth/reset-password`;

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess(true);
        setTimeout(() => navigate("/login-register"), 2500);
      } else {
        setError(data.message || "Reset failed.");
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
      <div className="rp-left">
        <div className="rp-deco-ring rp-ring-lg" />
        <div className="rp-deco-ring rp-ring-md" />
        <div className="rp-deco-blob rp-blob-tr" />
        <div className="rp-deco-blob rp-blob-bl" />
        <img src={healthSyncLogo} alt="HealthSync" className="rp-left-logo" />
        <h1 className="rp-left-brand">HEALTHSYNC</h1>
        <p className="rp-left-tagline">Almost there — create a strong new password.</p>
        <div className="rp-left-steps">
          {["Use at least 6 characters","Mix letters and numbers","Don't reuse old passwords"].map((s, i) => (
            <div key={i} className="rp-step-row">
              <div className="rp-step-num">{i + 1}</div>
              <span>{s}</span>
            </div>
          ))}
        </div>
        <div className="rp-badge">
          <span>🔐</span>
          <span>{role === "doctor" ? "Doctor" : "Patient"} Account Reset</span>
        </div>
      </div>

      {/* ── Right panel ── */}
      <div className="rp-right">

        {/* Mobile header */}
        <div className="rp-mobile-header">
          <img src={healthSyncLogo} alt="HealthSync" style={{ width: 52, height: 52, marginBottom: 6 }} />
          <h1 style={{ color: "#fff", fontSize: "1.1rem", fontWeight: 900, letterSpacing: "0.1em", margin: 0 }}>HEALTHSYNC</h1>
        </div>

        <div className="rp-form-wrap">

          {success ? (
            <div className="rp-success-card" style={{ animation: "popIn 0.35s ease both" }}>
              <div className="rp-success-icon">✅</div>
              <p className="rp-success-title">Password Reset!</p>
              <p className="rp-success-sub">Your password has been updated successfully. Redirecting to login...</p>
            </div>
          ) : (
            <>
              <h2 className="rp-title">Reset Password</h2>
              <p className="rp-subtitle">
                {role === "doctor" ? "Doctor" : "Patient"} account — enter your new password below.
              </p>

              <form onSubmit={handleSubmit} className="rp-form">

                {/* New password */}
                <div className="rp-field">
                  <label className="rp-label">New Password</label>
                  <div className="rp-input-wrap">
                    <input
                      type={showNew ? "text" : "password"}
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      required
                      className="rp-input"
                    />
                    <button type="button" className="rp-eye" onClick={() => setShowNew(!showNew)}>
                      {showNew ? "🙈" : "👁"}
                    </button>
                  </div>
                </div>

                {/* Confirm password */}
                <div className="rp-field">
                  <label className="rp-label">Confirm Password</label>
                  <div className="rp-input-wrap">
                    <input
                      type={showConfirm ? "text" : "password"}
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="Repeat your new password"
                      required
                      className="rp-input"
                    />
                    <button type="button" className="rp-eye" onClick={() => setShowConfirm(!showConfirm)}>
                      {showConfirm ? "🙈" : "👁"}
                    </button>
                  </div>
                </div>

                {error && <div className="rp-error">{error}</div>}

                <button type="submit" disabled={loading} className="rp-submit">
                  {loading ? <><span className="rp-spinner" /> Resetting...</> : "Reset Password"}
                </button>

                <p className="rp-footer">
                  <button type="button" className="rp-link" onClick={() => navigate("/login-register")}>
                    ← Back to Login
                  </button>
                </p>
              </form>
            </>
          )}
        </div>
      </div>


    </div>
  );
}

export default ResetPassword;
