import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import healthSyncLogo from "../assets/health-sync-logo.svg";
import "./patient-dashboard.css";
import "./patient_profile.css";

import { API } from "../config";

const NAV = [
  { label: "Appointments", icon: "📅", key: "appointments" },
  { label: "Medical Records", icon: "📄", key: "records" },
  { label: "My Profile", icon: "👤", key: "profile" },
];

const PatientProfile = () => {
  const navigate = useNavigate();
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editMsg, setEditMsg] = useState("");
  const [form, setForm] = useState({});

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

  const handleNavClick = (key) => {
    if (key === "appointments") navigate("/patient-appointment");
    else if (key === "records") navigate("/patient-dashboard");
    else if (key === "profile") navigate("/patient_profile");
  };

  const startEdit = () => {
    setForm({
      name: patient?.name || "",
      phone: patient?.phone || "",
      age: patient?.age || "",
      gender: patient?.gender || "",
      bloodGroup: patient?.bloodGroup || "",
      chronicConditions: patient?.chronicConditions || "",
    });
    setEditing(true);
    setEditMsg("");
  };

  const cancelEdit = () => { setEditing(false); setEditMsg(""); };

  const saveProfile = async () => {
    setSaving(true); setEditMsg("");
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API}/api/auth/me`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        setPatient(data.data);
        // Keep localStorage in sync
        const stored = JSON.parse(localStorage.getItem("user") || "{}");
        localStorage.setItem("user", JSON.stringify({ ...stored, ...data.data }));
        setEditing(false);
        setEditMsg("Profile updated successfully!");
        setTimeout(() => setEditMsg(""), 3000);
      } else { setEditMsg(data.message || "Update failed."); }
    } catch { setEditMsg("Server error. Please try again."); }
    finally { setSaving(false); }
  };

  const Field = ({ label, value }) => (
    <div className="pp-field">
      <span className="pp-field-label">{label}</span>
      <span className="pp-field-value">{value || "—"}</span>
    </div>
  );

  return (
    <div className="db-page">

      {/* ── Mobile header ── */}
      <div className="db-mobile-header">
        <button
          onClick={() => navigate("/patient-dashboard")}
          style={{ position: "absolute", top: 14, left: 14, width: 34, height: 34, borderRadius: "50%", background: "rgba(255,255,255,0.18)", border: "none", color: "#fff", fontSize: 15, cursor: "pointer" }}
        >←</button>
        <img src={healthSyncLogo} alt="HealthSync" className="db-mobile-logo" />
        <h1 className="db-mobile-brand">HEALTHSYNC</h1>
        <p className="db-mobile-greeting">My Profile</p>
        <p className="db-mobile-subtitle">Your personal information</p>
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
          {NAV.map(item => (
            <button key={item.key}
              className={`db-nav-btn${item.key === "profile" ? " db-nav-btn--active" : ""}`}
              onClick={() => handleNavClick(item.key)}>
              <span className="db-nav-icon">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
        <div className="db-sidebar-bottom">
          <button className="db-nav-btn" onClick={() => navigate("/patient-dashboard")}>
            <span className="db-nav-icon">🏠</span>
            Dashboard
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <div className="db-main">
        <div className="db-topbar">
          <div>
            <div className="db-topbar-title">My Profile</div>
            <div className="db-topbar-subtitle">View your personal information</div>
          </div>
          <div className="db-topbar-badge"><span>👤</span> Patient Portal</div>
        </div>

        <div className="db-content">
          {loading ? (
            <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#6b7280", fontSize: "0.88rem" }}>
              <span className="pp-spinner" /> Loading profile...
            </div>
          ) : (
            <div className="pp-wrap">
              {/* Avatar card */}
              <div className="pp-avatar-card">
                <div className="pp-avatar">
                  {patient?.photo
                    ? <img src={patient.photo} alt="Profile" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} />
                    : "👤"}
                </div>
                <div>
                  <p className="pp-name">{patient?.name || "—"}</p>
                  <p className="pp-sub">{patient?.email || "—"}</p>
                  {patient?.phone && <p className="pp-sub">{patient.phone}</p>}
                </div>
              </div>

              {/* Info card */}
              <div className="pp-info-card">
                <p className="pp-card-title">Personal Information</p>
                {editMsg && <p style={{ fontSize: "0.82rem", color: editMsg.includes("success") ? "#059669" : "#dc2626", marginBottom: 10 }}>{editMsg}</p>}
                {editing ? (
                  <>
                    <div className="pp-field"><span className="pp-field-label">Full Name</span><input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="pp-edit-input" /></div>
                    <div className="pp-field"><span className="pp-field-label">Phone</span><input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="pp-edit-input" /></div>
                    <div className="pp-field"><span className="pp-field-label">Age</span><input type="number" value={form.age} onChange={e => setForm(f => ({ ...f, age: e.target.value }))} className="pp-edit-input" /></div>
                    <div className="pp-field"><span className="pp-field-label">Gender</span>
                      <select value={form.gender} onChange={e => setForm(f => ({ ...f, gender: e.target.value }))} className="pp-edit-input">
                        <option value="Male">Male</option><option value="Female">Female</option><option value="Other">Other</option>
                      </select>
                    </div>
                    <div className="pp-field"><span className="pp-field-label">Blood Group</span>
                      <select value={form.bloodGroup} onChange={e => setForm(f => ({ ...f, bloodGroup: e.target.value }))} className="pp-edit-input">
                        {["A+","A-","B+","B-","AB+","AB-","O+","O-"].map(bg => <option key={bg} value={bg}>{bg}</option>)}
                      </select>
                    </div>
                    <div className="pp-field"><span className="pp-field-label">Chronic Conditions</span><input value={form.chronicConditions} onChange={e => setForm(f => ({ ...f, chronicConditions: e.target.value }))} className="pp-edit-input" /></div>
                    <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
                      <button className="pp-info-btn" onClick={saveProfile} disabled={saving} style={{ background: "#027346", color: "#fff", border: "none" }}>{saving ? "Saving..." : "Save Changes"}</button>
                      <button className="pp-info-btn" onClick={cancelEdit} style={{ background: "#f3f4f6", color: "#374151" }}>Cancel</button>
                    </div>
                  </>
                ) : (
                  <>
                    <Field label="Full Name" value={patient?.name} />
                    <Field label="Email" value={patient?.email} />
                    <Field label="Phone" value={patient?.phone} />
                    <Field label="Gender" value={patient?.gender} />
                    <Field label="Age" value={patient?.age ? `${patient.age} yrs` : null} />
                    <Field label="Blood Group" value={patient?.bloodGroup} />
                    {patient?.chronicConditions && <Field label="Chronic Conditions" value={patient.chronicConditions} />}
                    <Field label="Member Since" value={patient?.createdAt ? new Date(patient.createdAt).toLocaleDateString() : null} />
                    <button className="pp-info-btn" onClick={startEdit}>
                      ✏️ Edit Profile
                    </button>
                    <button className="pp-info-btn" onClick={() => navigate("/patient_info")} style={{ marginTop: 8 }}>
                      View Full Details →
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>


    </div>
  );
};

export default PatientProfile;
