import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./doctor-appointment.css";
import logo from "../assets/health-sync-logo.svg";

import { API } from "../config";

const STATUS_FILTERS = ["All", "pending", "accepted", "completed", "rejected", "cancelled", "no-show"];

const STATUS_CONFIG = {
  pending:   { label: "Pending",   color: "#f59e0b", bg: "#fffbeb", icon: "⏳" },
  accepted:  { label: "Confirmed", color: "#3b82f6", bg: "#eff6ff", icon: "📋" },
  completed: { label: "Completed", color: "#10b981", bg: "#f0fdf4", icon: "✅" },
  rejected:  { label: "Rejected",  color: "#ef4444", bg: "#fef2f2", icon: "❌" },
  cancelled: { label: "Cancelled", color: "#6b7280", bg: "#f9fafb", icon: "🚫" },
  "no-show": { label: "No Show",   color: "#8b5cf6", bg: "#f5f3ff", icon: "👻" },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || { label: status, color: "#6b7280", bg: "#f9fafb", icon: "•" };
  return (
    <span className="da-status-badge" style={{ color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.color}33` }}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

function DoctorAppointment() {
  const navigate = useNavigate();

  const [popup, setPopup] = useState(null);
  const [actingId, setActingId] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("All");
  const [notesModal, setNotesModal] = useState(null);
  const [notesText, setNotesText] = useState("");
  const [completing, setCompleting] = useState(false);

  const getToken = () => localStorage.getItem("token");

  const doctorName = (() => {
    try {
      const d = JSON.parse(localStorage.getItem("doctor"));
      return d ? `Dr. ${d.firstName}` : "Doctor";
    } catch { return "Doctor"; }
  })();

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/appointments/doctor`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (res.ok) setAppointments(data.data);
    } catch (err) { console.error("Failed to fetch appointments:", err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAppointments(); }, []);

  const handleAccept = async (appt) => {
    setActingId(appt._id);
    try {
      const res = await fetch(`${API}/api/appointments/${appt._id}/accept`, {
        method: "PUT", headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.ok) {
        setPopup({ type: "success", msg: "Appointment Confirmed!" });
        setAppointments(prev => prev.map(a => a._id === appt._id ? { ...a, status: "accepted" } : a));
        setTimeout(() => setPopup(null), 1800);
      }
    } catch (err) { console.error("Accept failed:", err); }
    finally { setActingId(null); }
  };

  const handleReject = async (appt) => {
    setActingId(appt._id);
    try {
      const res = await fetch(`${API}/api/appointments/${appt._id}/reject`, {
        method: "PUT", headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.ok) {
        setPopup({ type: "reject", msg: "Appointment Rejected" });
        setAppointments(prev => prev.map(a => a._id === appt._id ? { ...a, status: "rejected" } : a));
        setTimeout(() => setPopup(null), 1800);
      }
    } catch (err) { console.error("Reject failed:", err); }
    finally { setActingId(null); }
  };

  const handleComplete = async () => {
    if (!notesModal) return;
    setCompleting(true);
    try {
      const res = await fetch(`${API}/api/appointments/${notesModal._id}/complete`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ notes: notesText }),
      });
      if (res.ok) {
        setAppointments(prev => prev.map(a => a._id === notesModal._id
          ? { ...a, status: "completed", notes: notesText, completedAt: new Date() } : a));
        setPopup({ type: "success", msg: "Marked as Completed!" });
        setNotesModal(null); setNotesText("");
        setTimeout(() => setPopup(null), 1800);
      }
    } catch (err) { console.error("Complete failed:", err); }
    finally { setCompleting(false); }
  };

  const handleNoShow = async (appt) => {
    setActingId(appt._id);
    try {
      const res = await fetch(`${API}/api/appointments/${appt._id}/noshow`, {
        method: "PUT", headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.ok) {
        setAppointments(prev => prev.map(a => a._id === appt._id ? { ...a, status: "no-show" } : a));
        setPopup({ type: "noshow", msg: "Marked as No-Show" });
        setTimeout(() => setPopup(null), 1800);
      }
    } catch (err) { console.error("No-show failed:", err); }
    finally { setActingId(null); }
  };

  const stats = {
    pending:   appointments.filter(a => a.status === "pending").length,
    accepted:  appointments.filter(a => a.status === "accepted").length,
    completed: appointments.filter(a => a.status === "completed").length,
    rejected:  appointments.filter(a => a.status === "rejected").length,
    total:     appointments.length,
  };

  const filtered = appointments.filter(a => statusFilter === "All" || a.status === statusFilter);
  const statusCounts = appointments.reduce((acc, a) => { acc[a.status] = (acc[a.status] || 0) + 1; return acc; }, {});

  return (
    <div className="da-page">

      {/* Mobile header */}
      <div className="da-mobile-header">
        <button className="da-mobile-back" onClick={() => navigate("/doctor-dashboard")}>&#8592;</button>
        <img src={logo} alt="HealthSync" className="da-mobile-logo" />
        <p className="da-mobile-brand">HEALTHSYNC</p>
        <p className="da-mobile-subtitle">Appointment Management</p>
      </div>

      {/* Mobile content */}
      <div className="da-content-wrap">
        <div className="da-status-tabs">
          {STATUS_FILTERS.map(sf => (
            <button key={sf}
              className={`da-status-tab${statusFilter === sf ? " da-status-tab--active" : ""}`}
              onClick={() => setStatusFilter(sf)}>
              {sf === "All" ? `All (${appointments.length})` : `${STATUS_CONFIG[sf]?.label || sf} (${statusCounts[sf] || 0})`}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="da-spinner-wrap"><span className="da-spinner" /> Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="da-empty">
            <span className="da-empty-icon">&#128269;</span>
            No {statusFilter !== "All" ? statusFilter : ""} appointments
          </div>
        ) : (
          filtered.map((appt, i) => (
            <AppointmentCard key={appt._id} appt={appt} i={i}
              onAccept={handleAccept} onReject={handleReject}
              onComplete={() => { setNotesModal(appt); setNotesText(""); }}
              onNoShow={handleNoShow} actingId={actingId} />
          ))
        )}
      </div>

      {/* Desktop sidebar */}
      <aside className="da-sidebar">
        <div className="da-sidebar-top">
          <img src={logo} alt="HealthSync" className="da-sidebar-logo" />
          <p className="da-sidebar-brand">HEALTHSYNC</p>
        </div>

        <div className="da-sidebar-stats">
          {[
            { icon: "⏳", label: "Pending",   value: loading ? "—" : stats.pending,   color: "#f59e0b" },
            { icon: "📋", label: "Confirmed", value: loading ? "—" : stats.accepted,  color: "#3b82f6" },
            { icon: "✅", label: "Completed", value: loading ? "—" : stats.completed, color: "#10b981" },
            { icon: "📊", label: "Total",     value: loading ? "—" : stats.total,     color: "#6366f1" },
          ].map(s => (
            <div key={s.label} className="da-stat-card" style={{ borderTop: `3px solid ${s.color}` }}>
              <span className="da-stat-icon">{s.icon}</span>
              <div>
                <p className="da-stat-label">{s.label}</p>
                <p className="da-stat-value" style={{ color: s.color }}>{s.value}</p>
              </div>
            </div>
          ))}
        </div>

        <nav className="da-sidebar-nav">
          <button className="da-sidebar-nav-btn da-sidebar-nav-btn--active">📅 Appointments</button>
          <button className="da-sidebar-nav-btn" onClick={() => navigate("/doctor-dashboard")}>🏠 Dashboard</button>
          <button className="da-sidebar-nav-btn" onClick={() => navigate("/doctor-profile")}>👤 My Profile</button>
        </nav>

        <button className="da-sidebar-back" onClick={() => navigate("/doctor-dashboard")}>&#8592; Back to Dashboard</button>
      </aside>

      {/* Desktop main */}
      <div className="da-main">
        <div className="da-topbar">
          <div>
            <div className="da-topbar-title">Appointment Management</div>
            <div className="da-topbar-count">
              {loading ? "Loading..." : `${stats.pending} pending · ${stats.accepted} confirmed · ${stats.completed} completed`}
            </div>
          </div>
          <div className="da-topbar-badge">🏥 Doctor Portal</div>
        </div>

        <div className="da-status-tabs da-status-tabs--desktop">
          {STATUS_FILTERS.map(sf => (
            <button key={sf}
              className={`da-status-tab${statusFilter === sf ? " da-status-tab--active" : ""}`}
              onClick={() => setStatusFilter(sf)}>
              {sf === "All" ? `All (${appointments.length})` : `${STATUS_CONFIG[sf]?.label || sf} (${statusCounts[sf] || 0})`}
            </button>
          ))}
        </div>

        <div className="da-desktop-content">
          {loading ? (
            <div className="da-spinner-wrap"><span className="da-spinner" /> Loading appointments...</div>
          ) : filtered.length === 0 ? (
            <div className="da-empty">
              <span className="da-empty-icon">📭</span>
              No {statusFilter !== "All" ? (STATUS_CONFIG[statusFilter]?.label || statusFilter).toLowerCase() : ""} appointment requests
            </div>
          ) : (
            <div className="da-cards-grid">
              {filtered.map((appt, i) => (
                <AppointmentCard key={appt._id} appt={appt} i={i} desktop
                  onAccept={handleAccept} onReject={handleReject}
                  onComplete={() => { setNotesModal(appt); setNotesText(""); }}
                  onNoShow={handleNoShow} actingId={actingId} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Complete with notes modal */}
      {notesModal && (
        <div className="da-popup-overlay" onClick={() => { setNotesModal(null); setNotesText(""); }}>
          <div className="da-notes-modal" onClick={e => e.stopPropagation()}>
            <h3 className="da-notes-title">Mark as Completed</h3>
            <p className="da-notes-patient">
              Patient: <strong>{notesModal.patientId?.name || "Patient"}</strong>
            </p>
            <p className="da-notes-patient">Slot: <strong>{notesModal.slot}</strong></p>
            <p className="da-notes-label">Doctor&apos;s Notes (optional)</p>
            <textarea className="da-notes-textarea" rows={4}
              placeholder="Enter consultation notes, diagnosis, prescriptions..."
              value={notesText} onChange={e => setNotesText(e.target.value)} />
            <div className="da-notes-actions">
              <button className="da-complete-confirm-btn" onClick={handleComplete} disabled={completing}>
                {completing ? "Saving..." : "✅ Mark Completed"}
              </button>
              <button className="da-notes-cancel-btn" onClick={() => { setNotesModal(null); setNotesText(""); }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status popup */}
      {popup && (
        <div className="da-popup-overlay">
          <div className="da-popup-box">
            <div className="da-popup-icon">
              {popup.type === "success" ? "✅" : popup.type === "reject" ? "❌" : "👻"}
            </div>
            <p className={`da-popup-msg da-popup-${popup.type}`}>{popup.msg}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// Appointment card component
function AppointmentCard({ appt, i, onAccept, onReject, onComplete, onNoShow, actingId, desktop }) {
  const cfg = STATUS_CONFIG[appt.status] || { label: appt.status, color: "#6b7280", bg: "#f9fafb", icon: "•" };
  const isActing = actingId === appt._id;

  return (
    <div className={`da-patient-card${desktop ? " da-patient-card--desktop" : ""}`}
      style={{ animationDelay: `${i * 0.05}s`, borderLeft: `4px solid ${cfg.color}` }}>

      <div className="da-card-header">
        <div className="da-patient-avatar">👤</div>
        <div className="da-patient-info">
          <p className="da-patient-name">{appt.patientId?.name || "Patient"}</p>
          <div className="da-patient-meta">
            {appt.patientId?.phone && <span className="da-patient-phone">📞 {appt.patientId.phone}</span>}
            <span className="da-patient-slot">🕐 {appt.slot}</span>
            {appt.date && (
              <span className="da-patient-slot">
                📅 {new Date(appt.date + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
              </span>
            )}
          </div>
        </div>
        <StatusBadge status={appt.status} />
      </div>

      {appt.notes && (
        <div className="da-appt-notes">
          <span className="da-appt-notes-label">Notes:</span> {appt.notes}
        </div>
      )}

      <div className="da-appt-footer">
        <span className="da-appt-booked-time">
          Booked {new Date(appt.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
        </span>
        <div className="da-patient-actions">
          {appt.status === "pending" && (
            <>
              <button className="da-accept-btn" disabled={isActing} onClick={() => onAccept(appt)}>Accept</button>
              <button className="da-reject-btn" disabled={isActing} onClick={() => onReject(appt)}>Reject</button>
            </>
          )}
          {appt.status === "accepted" && (
            <>
              <button className="da-complete-btn" disabled={isActing} onClick={() => onComplete(appt)}>
                ✅ Complete
              </button>
              <button className="da-noshow-btn" disabled={isActing} onClick={() => onNoShow(appt)}>
                👻 No-Show
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default DoctorAppointment;