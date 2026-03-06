import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import healthSyncLogo from "../assets/health-sync-logo.svg";
import "./patient-dashboard.css";
import "./doctor_profile.css";

import { API } from "../config";

const NAV = [
  { label: "Appointments", icon: "📅", key: "appointments" },
  { label: "My Profile", icon: "👤", key: "profile" },
];

const DoctorProfile = () => {
  const navigate = useNavigate();
  const [doctor, setDoctor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editMsg, setEditMsg] = useState("");
  const [form, setForm] = useState({});

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${API}/api/doctor-auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (res.ok) setDoctor(data.data);
      } catch (err) {
        console.error("Failed to load profile:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleNavClick = (key) => {
    if (key === "appointments") navigate("/doctor-appointment");
    else if (key === "profile") navigate("/doctor-profile");
  };

  const startEdit = () => {
    setForm({
      firstName: doctor?.firstName || "",
      lastName: doctor?.lastName || "",
      phone: doctor?.phone || "",
      specialization: doctor?.specialization || "",
      experience: doctor?.experience || "",
      consultationFee: doctor?.consultationFee || "",
      clinicAddress: doctor?.clinicAddress || "",
      gender: doctor?.gender || "",
    });
    setEditing(true);
    setEditMsg("");
  };

  const cancelEdit = () => { setEditing(false); setEditMsg(""); };

  const saveProfile = async () => {
    setSaving(true); setEditMsg("");
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API}/api/doctor-auth/me`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        setDoctor(data.data);
        const stored = JSON.parse(localStorage.getItem("doctor") || "{}");
        localStorage.setItem("doctor", JSON.stringify({ ...stored, ...data.data }));
        setEditing(false);
        setEditMsg("Profile updated successfully!");
        setTimeout(() => setEditMsg(""), 3000);
      } else { setEditMsg(data.message || "Update failed."); }
    } catch { setEditMsg("Server error. Please try again."); }
    finally { setSaving(false); }
  };

  const Field = ({ icon, label, value }) => {
    if (!value && value !== 0) return null;
    return (
      <div className="dp-field">
        <span className="dp-field-icon">{icon}</span>
        <div>
          <p className="dp-field-label">{label}</p>
          <p className="dp-field-value">{value}</p>
        </div>
      </div>
    );
  };

  const doctorFullName = doctor ? `Dr. ${doctor.firstName} ${doctor.lastName}` : "Doctor";

  return (
    <div className="db-page">

      {/* ── Mobile header ── */}
      <div className="db-mobile-header">
        <button
          onClick={() => navigate("/doctor-dashboard")}
          style={{ position: "absolute", top: 14, left: 14, width: 34, height: 34, borderRadius: "50%", background: "rgba(255,255,255,0.18)", border: "none", color: "#fff", fontSize: 15, cursor: "pointer" }}
        >←</button>
        <img src={healthSyncLogo} alt="HealthSync" className="db-mobile-logo" />
        <h1 className="db-mobile-brand">HEALTHSYNC</h1>
        <p className="db-mobile-greeting">My Profile</p>
        <p className="db-mobile-subtitle">Your professional details</p>
      </div>

      {/* ── Sidebar (desktop) ── */}
      <aside className="db-sidebar">
        <img src={healthSyncLogo} alt="HealthSync" className="db-sidebar-logo" />
        <p className="db-sidebar-brand">HEALTHSYNC</p>
        <p className="db-sidebar-tagline">Empowering better care.</p>
        <div className="db-sidebar-divider" />
        <div className="db-sidebar-user">
          <div className="db-sidebar-avatar">👨‍⚕️</div>
          <div>
            <div className="db-sidebar-name">{doctorFullName}</div>
            <div className="db-sidebar-role">{doctor?.specialization || "Doctor Account"}</div>
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
          <button className="db-nav-btn" onClick={() => navigate("/doctor-dashboard")}>
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
            <div className="db-topbar-subtitle">Your professional information</div>
          </div>
          <div className="db-topbar-badge"><span>🏥</span> Doctor Portal</div>
        </div>

        <div className="db-content">
          {loading ? (
            <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#6b7280", fontSize: "0.88rem" }}>
              <span className="dp-spinner" /> Loading profile...
            </div>
          ) : (
            <div className="dp-wrap">
              {/* Avatar card */}
              <div className="dp-avatar-card">
                <div className="dp-avatar">
                  {doctor?.profileImage
                    ? <img src={doctor.profileImage} alt="Profile" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} />
                    : "👨‍⚕️"}
                </div>
                <p className="dp-name">{doctorFullName}</p>
                {doctor?.specialization && (
                  <span className="dp-spec-badge">{doctor.specialization}</span>
                )}
                {doctor?.clinicAddress && (
                  <p className="dp-clinic">🏥 {doctor.clinicAddress}</p>
                )}
              </div>

              {/* Details card */}
              {doctor && (
                <div className="dp-info-card">
                  <p className="dp-card-title">Professional Details</p>
                  {editMsg && <p style={{ fontSize: "0.82rem", color: editMsg.includes("success") ? "#059669" : "#dc2626", marginBottom: 10 }}>{editMsg}</p>}
                  {editing ? (
                    <>
                      <div className="dp-field"><span className="dp-field-icon">👤</span><div style={{flex:1}}><p className="dp-field-label">First Name</p><input value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} className="dp-edit-input" /></div></div>
                      <div className="dp-field"><span className="dp-field-icon">👤</span><div style={{flex:1}}><p className="dp-field-label">Last Name</p><input value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} className="dp-edit-input" /></div></div>
                      <div className="dp-field"><span className="dp-field-icon">📞</span><div style={{flex:1}}><p className="dp-field-label">Phone</p><input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="dp-edit-input" /></div></div>
                      <div className="dp-field"><span className="dp-field-icon">🩺</span><div style={{flex:1}}><p className="dp-field-label">Specialization</p><input value={form.specialization} onChange={e => setForm(f => ({ ...f, specialization: e.target.value }))} className="dp-edit-input" /></div></div>
                      <div className="dp-field"><span className="dp-field-icon">⭐</span><div style={{flex:1}}><p className="dp-field-label">Experience (years)</p><input type="number" value={form.experience} onChange={e => setForm(f => ({ ...f, experience: e.target.value }))} className="dp-edit-input" /></div></div>
                      <div className="dp-field"><span className="dp-field-icon">💰</span><div style={{flex:1}}><p className="dp-field-label">Consultation Fee (₹)</p><input type="number" value={form.consultationFee} onChange={e => setForm(f => ({ ...f, consultationFee: e.target.value }))} className="dp-edit-input" /></div></div>
                      <div className="dp-field"><span className="dp-field-icon">🏥</span><div style={{flex:1}}><p className="dp-field-label">Clinic Address</p><input value={form.clinicAddress} onChange={e => setForm(f => ({ ...f, clinicAddress: e.target.value }))} className="dp-edit-input" /></div></div>
                      <div className="dp-field"><span className="dp-field-icon">⚧️</span><div style={{flex:1}}><p className="dp-field-label">Gender</p>
                        <select value={form.gender} onChange={e => setForm(f => ({ ...f, gender: e.target.value }))} className="dp-edit-input">
                          <option value="Male">Male</option><option value="Female">Female</option><option value="Other">Other</option>
                        </select>
                      </div></div>
                      <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
                        <button onClick={saveProfile} disabled={saving} style={{ padding:"10px 20px", borderRadius:10, border:"none", background:"#027346", color:"#fff", fontWeight:700, fontSize:"0.84rem", cursor:"pointer" }}>{saving ? "Saving..." : "Save Changes"}</button>
                        <button onClick={cancelEdit} style={{ padding:"10px 20px", borderRadius:10, border:"1px solid #d1d5db", background:"#f3f4f6", color:"#374151", fontWeight:700, fontSize:"0.84rem", cursor:"pointer" }}>Cancel</button>
                      </div>
                    </>
                  ) : (
                    <>
                      <Field icon="🪪" label="License / UID" value={doctor.licenseNumber} />
                      <Field icon="⚧️" label="Gender" value={doctor.gender} />
                      <Field icon="✉️" label="Email" value={doctor.email} />
                      <Field icon="📞" label="Phone" value={doctor.phone} />
                      <Field icon="⭐" label="Experience" value={doctor.experience > 0 ? `${doctor.experience} years` : null} />
                      <Field icon="💰" label="Consultation Fee" value={doctor.consultationFee > 0 ? `₹${doctor.consultationFee}` : null} />
                      <Field icon="🏥" label="Clinic Address" value={doctor.clinicAddress} />
                      <button onClick={startEdit} style={{ marginTop:14, width:"100%", padding:"11px", borderRadius:11, border:"1.5px solid #e8f5ee", background:"#f0fdf4", color:"#027346", fontWeight:700, fontSize:"0.85rem", cursor:"pointer", fontFamily:"inherit" }}>✏️ Edit Profile</button>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>


    </div>
  );
};

export default DoctorProfile;
