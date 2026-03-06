import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import healthSyncLogo from "../assets/health-sync-logo.svg";
import "./patient-dashboard.css";
import "./patient_info.css";

import { API } from "../config";

const PatientInformation = () => {
  const navigate = useNavigate();
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${API}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (res.ok) setPatient(data.data);
      } catch (err) {
        console.error("Failed to load profile:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const Field = ({ label, value }) => (
    <div className="pi-field">
      <span className="pi-field-label">{label}</span>
      <span className="pi-field-value">{value || "—"}</span>
    </div>
  );

  return (
    <div className="db-page">

      {/* ── Mobile header ── */}
      <div className="db-mobile-header">
        <button
          onClick={() => navigate("/patient_profile")}
          style={{ position: "absolute", top: 14, left: 14, width: 34, height: 34, borderRadius: "50%", background: "rgba(255,255,255,0.18)", border: "none", color: "#fff", fontSize: 15, cursor: "pointer" }}
        >←</button>
        <img src={healthSyncLogo} alt="HealthSync" className="db-mobile-logo" />
        <h1 className="db-mobile-brand">HEALTHSYNC</h1>
        <p className="db-mobile-greeting">Personal Information</p>
        <p className="db-mobile-subtitle">Your full details</p>
      </div>

      {/* ── Sidebar (desktop) ── */}
      <aside className="db-sidebar">
        <img src={healthSyncLogo} alt="HealthSync" className="db-sidebar-logo" />
        <p className="db-sidebar-brand">HEALTHSYNC</p>
        <p className="db-sidebar-tagline">Click. Book. Heal.</p>
        <div className="db-sidebar-divider" />
        <div className="db-sidebar-user">
          <div className="db-sidebar-avatar">👤</div>
          <div>
            <div className="db-sidebar-name">{patient?.name || "Patient"}</div>
            <div className="db-sidebar-role">Patient Account</div>
          </div>
        </div>
        <nav className="db-nav">
          <button className="db-nav-btn" onClick={() => navigate("/patient-appointment")}>
            <span className="db-nav-icon">📅</span> Appointments
          </button>
          <button className="db-nav-btn" onClick={() => navigate("/patient-dashboard")}>
            <span className="db-nav-icon">📄</span> Medical Records
          </button>
          <button className="db-nav-btn db-nav-btn--active" onClick={() => navigate("/patient_profile")}>
            <span className="db-nav-icon">👤</span> My Profile
          </button>
        </nav>
        <div className="db-sidebar-bottom">
          <button className="db-nav-btn" onClick={() => navigate("/patient-dashboard")}>
            <span className="db-nav-icon">🏠</span> Dashboard
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <div className="db-main">
        <div className="db-topbar">
          <div>
            <div className="db-topbar-title">Personal Information</div>
            <div className="db-topbar-subtitle">All your registered details</div>
          </div>
          <div className="db-topbar-badge"><span>👤</span> Patient Portal</div>
        </div>

        <div className="db-content">
          {loading ? (
            <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#6b7280", fontSize: "0.88rem" }}>
              <span className="pi-spinner" /> Loading information...
            </div>
          ) : patient ? (
            <div className="pi-card" style={{ animation: "slideUp 0.4s ease both" }}>
              <p className="pi-card-title">Patient Record</p>
              <Field label="Full Name" value={patient.name} />
              <Field label="Patient ID" value={patient._id} />
              <Field label="Gender" value={patient.gender} />
              <Field label="Age" value={patient.age ? `${patient.age} yrs` : null} />
              <Field label="Blood Group" value={patient.bloodGroup} />
              <Field label="Contact Number" value={patient.phone} />
              <Field label="Email" value={patient.email} />
              {patient.chronicConditions && <Field label="Chronic Conditions" value={patient.chronicConditions} />}
              <Field label="Member Since" value={new Date(patient.createdAt).toLocaleDateString()} />
            </div>
          ) : (
            <p style={{ color: "#9ca3af", fontSize: "0.88rem" }}>Could not load information.</p>
          )}
        </div>
      </div>


    </div>
  );
};

export default PatientInformation;
