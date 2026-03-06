import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./patient-dashboard.css";
import logo from "../assets/health-sync-logo.svg";

import { API } from "../config";

const NAV = [
  { label: "Appointments", icon: "📅", key: "appointments" },
  { label: "Medical Records", icon: "📄", key: "records" },
  { label: "Medical History", icon: "📋", key: "history" },
  { label: "My Profile", icon: "👤", key: "profile" },
];

function PatientDashboard() {
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showLoggedOutPopup, setShowLoggedOutPopup] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [medicalHistory, setMedicalHistory] = useState([]);
  const [showDonePopup, setShowDonePopup] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [apptStats, setApptStats] = useState({ total: 0, pending: 0, accepted: 0, completed: 0, cancelled: 0, rejected: 0 });
  const [error, setError] = useState("");
  const [upcomingAppts, setUpcomingAppts] = useState([]);

  const getToken = () => localStorage.getItem("token");
  const userName = (() => {
    try { return JSON.parse(localStorage.getItem("user"))?.name || ""; } catch { return ""; }
  })();

  useEffect(() => {
    const fetchRecords = async () => {
      setLoadingRecords(true);
      try {
        const res = await fetch(`${API}/api/records`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        const data = await res.json();
        if (res.ok) setMedicalHistory(data.data);
      } catch (err) { console.error("Failed to load records:", err); }
      finally { setLoadingRecords(false); }
    };
    fetchRecords();
  }, []);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch(`${API}/api/appointments/patient/stats`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        const data = await res.json();
        if (res.ok) setApptStats(data.data);
      } catch (err) { console.error("Failed to load appointment stats:", err); }
    };
    fetchStats();
  }, []);

  useEffect(() => {
    const fetchUpcoming = async () => {
      try {
        const res = await fetch(`${API}/api/appointments/patient`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        const data = await res.json();
        if (res.ok) {
          const today = new Date().toISOString().split("T")[0];
          const upcoming = (data.data || [])
            .filter(a => a.status === "accepted" && a.date && a.date >= today)
            .sort((a, b) => a.date.localeCompare(b.date))
            .slice(0, 3);
          setUpcomingAppts(upcoming);
        }
      } catch (err) { console.error("Failed to load upcoming appts:", err); }
    };
    fetchUpcoming();
  }, []);

  const handleLogoutClick = () => setShowLogoutConfirm(true);
  const confirmLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setShowLogoutConfirm(false);
    setShowLoggedOutPopup(true);
  };

  useEffect(() => {
    if (showLoggedOutPopup) {
      const timer = setTimeout(() => {
        setShowLoggedOutPopup(false);
        navigate("/login-register");
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [showLoggedOutPopup, navigate]);

  const handleFileChange = (e) => { setSelectedFile(e.target.files[0]); setError(""); };

  const handleUpload = async () => {
    if (!selectedFile) { setError("Please select a file first."); return; }
    setUploading(true); setError("");
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("recordType", uploadRecordType);
      const res = await fetch(`${API}/api/records/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}` },
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        setMedicalHistory((prev) => [data.data, ...prev]);
        setSelectedFile(null); setShowModal(false); setShowDonePopup(true);
        setTimeout(() => setShowDonePopup(false), 1500);
      } else { setError(data.message || "Upload failed."); }
    } catch { setError("Server error. Please try again."); }
    finally { setUploading(false); }
  };

  const handleDeleteRecord = async (recordId) => {
    try {
      const res = await fetch(`${API}/api/records/${recordId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.ok) setMedicalHistory((prev) => prev.filter((r) => r._id !== recordId));
    } catch (err) { console.error("Delete failed:", err); }
  };

  const closeModal = () => { setShowModal(false); setSelectedFile(null); setError(""); };

  const handleNavClick = (key) => {
    if (key === "appointments") navigate("/patient-appointment");
    else if (key === "records") setShowModal(true);
    else if (key === "history") navigate("/medical-history");
    else if (key === "profile") navigate("/patient_profile");
  };

  const tiles = [
    { label: "Book Appointment", icon: "📅", onClick: () => navigate("/patient-appointment") },
    { label: "Medical History", icon: "📋", onClick: () => navigate("/medical-history") },
    { label: "Medical Records", icon: "📄", onClick: () => setShowModal(true) },
    { label: "My Profile", icon: "👤", onClick: () => navigate("/patient_profile") },
    { label: "Log Out", icon: "🚪", onClick: handleLogoutClick, danger: true },
  ];

  const RECORD_TYPES = ["Lab Report", "Prescription", "Scan / X-Ray", "Discharge Summary", "Insurance", "Other"];
  const [uploadRecordType, setUploadRecordType] = useState("Other");

  const RecordsModal = () => (
    <div className="db-modal-overlay db-modal-overlay--bottom" onClick={closeModal}>
      <div className="db-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="db-sheet-handle" />
        <h2 className="db-sheet-title">Medical Records</h2>
        <div style={{ textAlign: "right", marginBottom: 8 }}>
          <button onClick={() => navigate("/medical-history")} style={{ background:"none", border:"none", color:"#027346", fontWeight:700, fontSize:"0.82rem", cursor:"pointer" }}>View Full History →</button>
        </div>
        <div className="db-records-list">
          {loadingRecords ? (
            <p className="db-records-empty">Loading records...</p>
          ) : medicalHistory.length === 0 ? (
            <p className="db-records-empty">No records uploaded yet.</p>
          ) : (
            medicalHistory.map((record) => (
              <div key={record._id} className="db-record-item">
                <a href={record.fileUrl} target="_blank" rel="noopener noreferrer" className="db-record-link">
                  📄 {record.fileName}
                </a>
                {record.recordType && <span style={{ fontSize: "0.7rem", background: "#eff6ff", color: "#3b82f6", borderRadius: 6, padding: "2px 8px", fontWeight: 700 }}>{record.recordType}</span>}
                <span className="db-record-date">{new Date(record.createdAt).toLocaleDateString()}</span>
                <button className="db-record-del" onClick={() => handleDeleteRecord(record._id)}>✕</button>
              </div>
            ))
          )}
        </div>
        <div className="db-upload-row">
          <input type="file" accept=".jpg,.jpeg,.png,.pdf" onChange={handleFileChange}
            id="fileUploadInput" style={{ display:"none" }} />
          <button className="db-upload-btn" onClick={() => document.getElementById("fileUploadInput").click()}>
            Choose File
          </button>
          {selectedFile && <span className="db-upload-name">{selectedFile.name}</span>}
          <select value={uploadRecordType} onChange={e => setUploadRecordType(e.target.value)}
            style={{ fontSize: "0.8rem", padding: "6px 10px", borderRadius: 8, border: "1px solid #d1d5db" }}>
            {RECORD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        {error && <p className="db-upload-error">{error}</p>}
        <div className="db-modal-actions">
          {selectedFile && (
            <button className="db-modal-submit" onClick={handleUpload} disabled={uploading}>
              {uploading ? "Uploading..." : "Upload"}
            </button>
          )}
          <button className="db-modal-close" onClick={closeModal}>Close</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="db-page">

      {/* Sidebar (desktop only) */}
      <aside className="db-sidebar">
        <img src={logo} alt="HealthSync" className="db-sidebar-logo" />
        <p className="db-sidebar-brand">HEALTHSYNC</p>
        <p className="db-sidebar-tagline">Click. Book. Heal.</p>
        <div className="db-sidebar-divider" />
        <div className="db-sidebar-user">
          <div className="db-sidebar-avatar">👤</div>
          <div>
            <div className="db-sidebar-name">{userName || "Patient"}</div>
            <div className="db-sidebar-role">Patient Account</div>
          </div>
        </div>
        <nav className="db-nav">
          {NAV.map((item) => (
            <button key={item.key} className="db-nav-btn" onClick={() => handleNavClick(item.key)}>
              <span className="db-nav-icon">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
        <div className="db-sidebar-bottom">
          <button className="db-nav-btn db-nav-btn--danger" onClick={handleLogoutClick}>
            <span className="db-nav-icon">🚪</span>
            Log Out
          </button>
        </div>
      </aside>

      {/* Main content area */}
      <div className="db-main">

        {/* Mobile header */}
        <div className="db-mobile-header">
          <img src={logo} alt="HealthSync" className="db-mobile-logo" />
          <h1 className="db-mobile-brand">HEALTHSYNC</h1>
          {userName && <p className="db-mobile-greeting">Welcome, {userName}</p>}
          <p className="db-mobile-subtitle">Your health, all in one place</p>
        </div>

        {/* Desktop top bar */}
        <div className="db-topbar">
          <div>
            <div className="db-topbar-title">
              {userName ? `Welcome back, ${userName.split(" ")[0]} 👋` : "Dashboard"}
            </div>
            <div className="db-topbar-subtitle">Your appointment tracking dashboard</div>
          </div>
          <div className="db-topbar-badge">
            <span>🩺</span> Patient Portal
          </div>
        </div>

        <div className="db-content">

          {/* Appointment Status Stats Row */}
          <div className="db-stats-row">
            <div className="db-stat-card db-stat-card--pending" style={{ animationDelay:"0.05s" }}>
              <span className="db-stat-icon">⏳</span>
              <span className="db-stat-label">Pending</span>
              <span className="db-stat-value">{apptStats.pending}</span>
              <span className="db-stat-change">Awaiting confirmation</span>
            </div>
            <div className="db-stat-card db-stat-card--accepted" style={{ animationDelay:"0.1s" }}>
              <span className="db-stat-icon">✅</span>
              <span className="db-stat-label">Confirmed</span>
              <span className="db-stat-value">{apptStats.accepted}</span>
              <span className="db-stat-change">Upcoming appointments</span>
            </div>
            <div className="db-stat-card db-stat-card--completed" style={{ animationDelay:"0.15s" }}>
              <span className="db-stat-icon">🏥</span>
              <span className="db-stat-label">Completed</span>
              <span className="db-stat-value">{apptStats.completed}</span>
              <span className="db-stat-change">Consultations done</span>
            </div>
            <div className="db-stat-card db-stat-card--records" style={{ animationDelay:"0.20s" }}>
              <span className="db-stat-icon">📄</span>
              <span className="db-stat-label">Medical Records</span>
              <span className="db-stat-value">{medicalHistory.length}</span>
              <span className="db-stat-change">Uploaded files</span>
            </div>
          </div>

          {/* Status Breakdown */}
          {apptStats.total > 0 && (
            <div className="db-status-breakdown">
              <p className="db-section-heading">Appointment Status Overview</p>
              <div className="db-status-bars">
                {[
                  { label: "Pending",   count: apptStats.pending,   color: "#f59e0b", key: "pending" },
                  { label: "Confirmed", count: apptStats.accepted,  color: "#3b82f6", key: "accepted" },
                  { label: "Completed", count: apptStats.completed, color: "#10b981", key: "completed" },
                  { label: "Rejected",  count: apptStats.rejected,  color: "#ef4444", key: "rejected" },
                  { label: "Cancelled", count: apptStats.cancelled, color: "#6b7280", key: "cancelled" },
                ]
                  .filter(s => s.count > 0)
                  .map(s => (
                    <div key={s.key} className="db-status-bar-row">
                      <span className="db-status-bar-label">{s.label}</span>
                      <div className="db-status-bar-track">
                        <div className="db-status-bar-fill"
                          style={{ width: `${Math.round((s.count / apptStats.total) * 100)}%`, background: s.color }} />
                      </div>
                      <span className="db-status-bar-count">{s.count}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {upcomingAppts.length > 0 && (
            <div className="db-upcoming-section">
              <p className="db-section-heading">Upcoming Appointments & Reminders</p>
              {upcomingAppts.map((appt, i) => {
                const today = new Date(); today.setHours(0,0,0,0);
                const apptDate = new Date(appt.date + "T00:00:00");
                const diffDays = Math.round((apptDate - today) / (1000 * 60 * 60 * 24));
                let reminder = "";
                if (diffDays === 0) reminder = "🔴 Today";
                else if (diffDays === 1) reminder = "🟠 Tomorrow";
                else if (diffDays <= 3) reminder = `🟡 In ${diffDays} days`;
                else reminder = `🟢 In ${diffDays} days`;
                return (
                  <div key={appt._id} className="db-upcoming-card" style={{ animationDelay: `${i * 0.07}s` }}>
                    <div className="db-upcoming-avatar">👨‍⚕️</div>
                    <div className="db-upcoming-info">
                      <p className="db-upcoming-name">Dr. {appt.doctorId?.firstName} {appt.doctorId?.lastName}</p>
                      <p className="db-upcoming-meta">{appt.doctorId?.specialization}</p>
                    </div>
                    <div className="db-upcoming-time">
                      <p className="db-upcoming-date">
                        {new Date(appt.date + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                      <p className="db-upcoming-slot">{appt.slot}</p>
                      <p style={{ fontSize: "0.72rem", fontWeight: 700, marginTop: 3 }}>{reminder}</p>
                    </div>
                  </div>
                );
              })}
              <button className="db-upcoming-view-all" onClick={() => navigate("/patient-appointment?tab=appointments")}>
                View All Appointments →
              </button>
            </div>
          )}

          <p className="db-section-heading" style={{ marginTop: apptStats.total > 0 ? 0 : undefined }}>Quick Actions</p>

          <div className="db-grid">
            {tiles.map((tile, i) => (
              <button
                key={tile.label}
                className={`db-tile${tile.danger ? " db-tile--danger" : ""}`}
                onClick={tile.onClick}
                style={{ animationDelay:`${i * 0.07}s` }}>
                <span className="db-tile-icon">{tile.icon}</span>
                <span className="db-tile-label">{tile.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {showModal && <RecordsModal />}

      {showDonePopup && (
        <div className="db-modal-overlay">
          <div className="db-toast">✅ Record uploaded successfully!</div>
        </div>
      )}

      {showLogoutConfirm && (
        <div className="db-modal-overlay">
          <div className="db-confirm">
            <h3>Log Out?</h3>
            <p>Are you sure you want to log out?</p>
            <div className="db-confirm-actions">
              <button className="db-confirm-yes" onClick={confirmLogout}>Log Out</button>
              <button className="db-confirm-no" onClick={() => setShowLogoutConfirm(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {showLoggedOutPopup && (
        <div className="db-modal-overlay">
          <div className="db-toast">You have been logged out.</div>
        </div>
      )}
    </div>
  );
}

export default PatientDashboard;