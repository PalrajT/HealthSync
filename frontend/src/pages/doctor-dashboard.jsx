import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "./patient-dashboard.css";
import logo from "../assets/health-sync-logo.svg";
import { API } from "../config";

const NAV = [
  { label: "Appointments", icon: "📅", key: "appointments" },
  { label: "Medical Records", icon: "📄", key: "records" },
  { label: "Patient Records", icon: "🗂️", key: "patient-records" },
  { label: "Medical History", icon: "📋", key: "history" },
  { label: "My Profile", icon: "👨‍⚕️", key: "profile" },
];

function DoctorDashboard() {
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [medicalHistory, setMedicalHistory] = useState([]);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showLoggedOutPopup, setShowLoggedOutPopup] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [apptStats, setApptStats] = useState({ total: 0, pending: 0, accepted: 0, completed: 0, rejected: 0, cancelled: 0, noShow: 0 });
  const [pendingAppts, setPendingAppts] = useState([]);
  const fileInputRef = useRef(null);

  const getToken = () => localStorage.getItem("token");
  const doctorName = (() => {
    try {
      const d = JSON.parse(localStorage.getItem("doctor"));
      return d ? `Dr. ${d.firstName || ""}`.trim() : "";
    } catch { return ""; }
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
        const res = await fetch(`${API}/api/appointments/doctor/stats`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        const data = await res.json();
        if (res.ok) setApptStats(data.data);
      } catch (err) { console.error("Failed to load appointment stats:", err); }
    };
    fetchStats();
  }, []);

  useEffect(() => {
    const fetchPending = async () => {
      try {
        const res = await fetch(`${API}/api/appointments/doctor`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        const data = await res.json();
        if (res.ok) {
          const pending = (data.data || [])
            .filter(a => a.status === "pending")
            .slice(0, 3);
          setPendingAppts(pending);
        }
      } catch (err) { console.error("Failed to load pending appts:", err); }
    };
    fetchPending();
  }, []);

  const handleLogoutClick = () => setShowLogoutConfirm(true);
  const confirmLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("doctor");
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

  const handleUploadClick = () => { if (fileInputRef.current) fileInputRef.current.click(); };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`${API}/api/records/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}` },
        body: formData,
      });
      const data = await res.json();
      if (res.ok) setMedicalHistory((prev) => [data.data, ...prev]);
    } catch (err) { console.error("Upload failed:", err); }
    finally { setUploading(false); e.target.value = ""; }
  };

  const handleDelete = async (recordId) => {
    try {
      const res = await fetch(`${API}/api/records/${recordId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.ok) setMedicalHistory((prev) => prev.filter((r) => r._id !== recordId));
    } catch (err) { console.error("Delete failed:", err); }
  };

  const handleNavClick = (key) => {
    if (key === "appointments") navigate("/doctor-appointment");
    else if (key === "records") setShowModal(true);
    else if (key === "patient-records") navigate("/doctor-patient-records");
    else if (key === "history") navigate("/medical-history");
    else if (key === "profile") navigate("/doctor-profile");
  };

  const tiles = [
    { label: "Manage Appointments", icon: "📅", onClick: () => navigate("/doctor-appointment") },
    { label: "Medical Records",     icon: "📄", onClick: () => setShowModal(true) },
    { label: "Patient Records",     icon: "🗂️", onClick: () => navigate("/doctor-patient-records") },
    { label: "My Profile",          icon: "👨‍⚕️", onClick: () => navigate("/doctor-profile") },
    { label: "Log Out",             icon: "🚪", onClick: handleLogoutClick, danger: true },
  ];

  const RecordsModal = () => (
    <div className="db-modal-overlay db-modal-overlay--bottom" onClick={() => setShowModal(false)}>
      <div className="db-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="db-sheet-handle" />
        <h2 className="db-sheet-title">Medical Records</h2>
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
                <span className="db-record-date">{new Date(record.createdAt).toLocaleDateString()}</span>
                <button className="db-record-del" onClick={() => handleDelete(record._id)}>✕</button>
              </div>
            ))
          )}
        </div>
        <input type="file" accept=".jpg,.jpeg,.png,.pdf" ref={fileInputRef}
          onChange={handleFileChange} style={{ display:"none" }} />
        <div className="db-modal-actions">
          <button className="db-modal-submit" onClick={handleUploadClick} disabled={uploading}>
            {uploading ? "Uploading..." : "Upload Record"}
          </button>
          <button className="db-modal-close" onClick={() => setShowModal(false)}>Close</button>
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
          <div className="db-sidebar-avatar">👨‍⚕️</div>
          <div>
            <div className="db-sidebar-name">{doctorName || "Doctor"}</div>
            <div className="db-sidebar-role">Doctor Account</div>
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

      {/* Main content */}
      <div className="db-main">

        {/* Mobile header */}
        <div className="db-mobile-header">
          <img src={logo} alt="HealthSync" className="db-mobile-logo" />
          <h1 className="db-mobile-brand">HEALTHSYNC</h1>
          {doctorName && <p className="db-mobile-greeting">Welcome, {doctorName}</p>}
          <p className="db-mobile-subtitle">Your patients are counting on you</p>
        </div>

        {/* Desktop top bar */}
        <div className="db-topbar">
          <div>
            <div className="db-topbar-title">
              {doctorName ? `Welcome back, ${doctorName} 👋` : "Dashboard"}
            </div>
            <div className="db-topbar-subtitle">Appointment management overview</div>
          </div>
          <div className="db-topbar-badge">
            <span>🏥</span> Doctor Portal
          </div>
        </div>

        <div className="db-content">

          {/* Stats Row */}
          <div className="db-stats-row">
            <div className="db-stat-card db-stat-card--pending" style={{ animationDelay:"0.05s" }}>
              <span className="db-stat-icon">⏳</span>
              <span className="db-stat-label">Pending</span>
              <span className="db-stat-value">{apptStats.pending}</span>
              <span className="db-stat-change">Awaiting review</span>
            </div>
            <div className="db-stat-card db-stat-card--accepted" style={{ animationDelay:"0.1s" }}>
              <span className="db-stat-icon">📋</span>
              <span className="db-stat-label">Confirmed</span>
              <span className="db-stat-value">{apptStats.accepted}</span>
              <span className="db-stat-change">Upcoming visits</span>
            </div>
            <div className="db-stat-card db-stat-card--completed" style={{ animationDelay:"0.15s" }}>
              <span className="db-stat-icon">✅</span>
              <span className="db-stat-label">Completed</span>
              <span className="db-stat-value">{apptStats.completed}</span>
              <span className="db-stat-change">Consultations done</span>
            </div>
            <div className="db-stat-card db-stat-card--records" style={{ animationDelay:"0.20s" }}>
              <span className="db-stat-icon">📊</span>
              <span className="db-stat-label">Total</span>
              <span className="db-stat-value">{apptStats.total}</span>
              <span className="db-stat-change">All appointments</span>
            </div>
          </div>

          {/* Status Breakdown */}
          {apptStats.total > 0 && (
            <div className="db-status-breakdown">
              <p className="db-section-heading">Appointment Status Overview</p>
              <div className="db-status-bars">
                {[
                  { label: "Pending",   count: apptStats.pending,   color: "#f59e0b" },
                  { label: "Confirmed", count: apptStats.accepted,  color: "#3b82f6" },
                  { label: "Completed", count: apptStats.completed, color: "#10b981" },
                  { label: "Rejected",  count: apptStats.rejected,  color: "#ef4444" },
                  { label: "Cancelled", count: apptStats.cancelled, color: "#6b7280" },
                  { label: "No-Show",   count: apptStats.noShow,    color: "#8b5cf6" },
                ]
                  .filter(s => s.count > 0)
                  .map(s => (
                    <div key={s.label} className="db-status-bar-row">
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

          {pendingAppts.length > 0 && (
            <div className="db-upcoming-section">
              <p className="db-section-heading">Pending Requests</p>
              {pendingAppts.map((appt, i) => (
                <div key={appt._id} className="db-upcoming-card" style={{ animationDelay: `${i * 0.07}s` }}>
                  <div className="db-upcoming-avatar">👤</div>
                  <div className="db-upcoming-info">
                    <p className="db-upcoming-name">{appt.patientId?.name || "Patient"}</p>
                    <p className="db-upcoming-meta">
                      {appt.date
                        ? new Date(appt.date + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                        : "Date TBD"}
                    </p>
                  </div>
                  <div className="db-upcoming-time">
                    <p className="db-upcoming-slot">{appt.slot}</p>
                    <span className="db-upcoming-badge">⏳ Pending</span>
                  </div>
                </div>
              ))}
              <button className="db-upcoming-view-all" onClick={() => navigate("/doctor-appointment")}>
                Review All Requests →
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

export default DoctorDashboard;