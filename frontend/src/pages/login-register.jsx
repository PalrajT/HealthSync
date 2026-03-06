import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import healthSyncLogo from "../assets/health-sync-logo.svg";
import "./login-register.css";

const roles = [
  {
    key: "doctor",
    label: "Doctor",
    subtitle: "Manage patients & appointments",
    icon: "👨‍⚕️",
    route: "/doctor-login",
  },
  {
    key: "patient",
    label: "Patient",
    subtitle: "Book appointments & records",
    icon: "🧑‍💼",
    route: "/patient-login",
  },
  {
    key: "admin",
    label: "Admin",
    subtitle: "Platform management & monitoring",
    icon: "🛡️",
    route: "/admin-login",
  },
];

export default function LoginRegister() {
  const navigate = useNavigate();
  const [hovered, setHovered] = useState(null);

  return (
    <div style={{ minHeight: "100vh", display: "flex", background: "#f0f4f8" }}>

      {/* ── Left panel — desktop only ── */}
      <div className="lr-left-panel">
        <div className="lr-deco-ring lr-deco-ring-lg" />
        <div className="lr-deco-ring lr-deco-ring-md" />
        <div className="lr-deco-blob lr-deco-blob-tr" />
        <div className="lr-deco-blob lr-deco-blob-bl" />

        <img src={healthSyncLogo} alt="HealthSync" className="lr-left-logo" />
        <h1 className="lr-left-brand">HEALTHSYNC</h1>
        <p className="lr-left-tagline">
          Your all-in-one platform for managing health appointments and medical records.
        </p>

        <div className="lr-features">
          {["Book doctor appointments instantly", "Store & access medical records", "Manage your health history"].map((f, i) => (
            <div key={i} className="lr-feature-row">
              <div className="lr-feature-check">✓</div>
              <span>{f}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right panel ── */}
      <div className="lr-right-panel">

        {/* Mobile header */}
        <div className="lr-mobile-header">
          <img src={healthSyncLogo} alt="HealthSync" style={{ width:68, height:68, marginBottom:10 }} />
          <h1 style={{ color:"#fff", fontSize:"1.25rem", fontWeight:900, letterSpacing:"0.12em", margin:0 }}>HEALTHSYNC</h1>
          <p style={{ color:"rgba(255,255,255,0.65)", fontSize:"0.78rem", marginTop:4 }}>Click. Book. Heal.</p>
        </div>

        {/* Desktop greeting */}
        <div className="lr-desktop-greeting">
          <h2 style={{ fontSize:"1.8rem", fontWeight:800, color:"#111827", margin:"0 0 6px" }}>Welcome back 👋</h2>
          <p style={{ color:"#6b7280", fontSize:"0.95rem" }}>Select your role to continue</p>
        </div>

        <div className="lr-form-area">
          <p className="lr-who-label">Who are you?</p>

          {/* Role cards */}
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            {roles.map((role, i) => (
              <button
                key={role.key}
                onClick={() => navigate(role.route)}
                onMouseEnter={() => setHovered(role.key)}
                onMouseLeave={() => setHovered(null)}
                className={`lr-role-card${hovered === role.key ? " lr-role-card--hovered" : ""}`}
                style={{ animationDelay: `${0.1 + i * 0.1}s` }}
              >
                <div className={`lr-role-icon${hovered === role.key ? " lr-role-icon--hovered" : ""}`}>
                  {role.icon}
                </div>
                <div style={{ flex:1, textAlign:"left" }}>
                  <div style={{ fontSize:"1rem", fontWeight:700, color:"#111827" }}>{role.label}</div>
                  <div style={{ fontSize:"0.78rem", color:"#6b7280", marginTop:2 }}>{role.subtitle}</div>
                </div>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                  style={{ color: hovered === role.key ? "#027346" : "#d1d5db", transition:"color 0.2s", flexShrink:0 }}>
                  <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            ))}
          </div>

          {/* Register links */}
          <div className="lr-divider">
            <div style={{ flex:1, height:1, background:"#e5e7eb" }} />
            <span style={{ fontSize:"0.75rem", color:"#9ca3af", whiteSpace:"nowrap" }}>New to HealthSync?</span>
            <div style={{ flex:1, height:1, background:"#e5e7eb" }} />
          </div>

          <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
            {[
              { label:"Register as Patient", route:"/patient-register" },
              { label:"Register as Doctor", route:"/doctor-register" },
            ].map((r) => (
              <button
                key={r.route}
                onClick={() => navigate(r.route)}
                className="lr-register-btn"
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}
