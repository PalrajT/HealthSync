import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./patient-appointment.css";
import logo from "../assets/health-sync-logo.svg";

import { API } from "../config";

const SPECIALTIES = [
  "All Specialties","Cardiology","Dermatology","Dentistry","Neurology",
  "Orthopedics","Pediatrics","Gynecology & Obstetrics","Ophthalmology",
  "Psychiatry","Gastroenterology","Pulmonology",
];

const GENDERS = ["All Genders","Male","Female","Other"];

const STATUS_FILTERS = ["All", "pending", "accepted", "completed", "cancelled", "rejected"];

const STATUS_CONFIG = {
  pending:   { label: "Pending",   color: "#f59e0b", bg: "#fffbeb", icon: "⏳" },
  accepted:  { label: "Confirmed", color: "#3b82f6", bg: "#eff6ff", icon: "✅" },
  completed: { label: "Completed", color: "#10b981", bg: "#f0fdf4", icon: "🏥" },
  rejected:  { label: "Rejected",  color: "#ef4444", bg: "#fef2f2", icon: "❌" },
  cancelled: { label: "Cancelled", color: "#6b7280", bg: "#f9fafb", icon: "🚫" },
  "no-show": { label: "No Show",   color: "#8b5cf6", bg: "#f5f3ff", icon: "👻" },
};

const NAV = [
  { label: "Find Doctors", icon: "🔍", key: "doctors" },
  { label: "My Appointments", icon: "📅", key: "appointments" },
];

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || { label: status, color: "#6b7280", bg: "#f9fafb", icon: "•" };
  return (
    <span className="pa-status-badge" style={{ color: cfg.color, background: cfg.bg, borderColor: cfg.color + "33" }}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

function PatientAppointment() {
  const navigate = useNavigate();

  const [doctors, setDoctors] = useState([]);
  const [myAppointments, setMyAppointments] = useState([]);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [loadingAppts, setLoadingAppts] = useState(false);
  const [selectedSpecialty, setSelectedSpecialty] = useState("");
  const [selectedGender, setSelectedGender] = useState("");
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [bookingError, setBookingError] = useState("");
  const [booking, setBooking] = useState(false);
  const [activeNav, setActiveNav] = useState("doctors");
  const [statusFilter, setStatusFilter] = useState("All");
  const [searchDoctor, setSearchDoctor] = useState("");

  const getToken = () => localStorage.getItem("token");

  // Decode role from JWT token (most reliable — not affected by stale localStorage)
  const getTokenRole = () => {
    const token = localStorage.getItem("token");
    if (!token) return null;
    try {
      return JSON.parse(atob(token.split(".")[1]))?.role || null;
    } catch { return null; }
  };

  const tokenRole = getTokenRole();
  const isPatient = tokenRole === "patient";
  const isDoctor  = tokenRole === "doctor";

  // Redirect doctors to their own page; unauthenticated users to login
  useEffect(() => {
    if (isDoctor) {
      navigate("/doctor-appointment", { replace: true });
    } else if (!isPatient) {
      navigate("/login-register", { replace: true });
    }
  }, []);

  const userName = (() => {
    try { return JSON.parse(localStorage.getItem("user"))?.name || ""; } catch { return ""; }
  })();

  // Fetch doctors
  useEffect(() => {
    const fetchDoctors = async () => {
      setLoadingDoctors(true);
      try {
        const params = new URLSearchParams();
        if (selectedSpecialty && selectedSpecialty !== "All Specialties") params.set("specialty", selectedSpecialty);
        if (selectedGender && selectedGender !== "All Genders") params.set("gender", selectedGender);
        const url = `${API}/api/doctors${params.toString() ? `?${params.toString()}` : ""}`;
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        const data = await res.json();
        if (res.ok) setDoctors(data.data);
      } catch (err) {
        console.error("Failed to fetch doctors:", err);
      } finally {
        setLoadingDoctors(false);
      }
    };
    fetchDoctors();
  }, [selectedSpecialty, selectedGender]);

  // Fetch patient's own appointments
  const fetchMyAppointments = async () => {
    setLoadingAppts(true);
    try {
      const res = await fetch(`${API}/api/appointments/patient`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (res.ok) setMyAppointments(data.data);
    } catch (err) { console.error("Failed to fetch appointments:", err); }
    finally { setLoadingAppts(false); }
  };

  useEffect(() => { fetchMyAppointments(); }, []);

  const generateSlots = () => {
    const slots = [];
    for (let hour = 9; hour < 17; hour++) {
      const period = hour < 12 ? "AM" : "PM";
      const displayHour = hour <= 12 ? hour : hour - 12;
      slots.push(`${displayHour}:00 ${period}`);
      slots.push(`${displayHour}:30 ${period}`);
    }
    return slots;
  };

  // Min date = today
  const today = new Date().toISOString().split("T")[0];

  const handleConfirm = async () => {
    if (!selectedSlot || !selectedDoctor) return;
    if (!isPatient) { setBookingError("Only patients can book appointments."); return; }
    if (!selectedDate) { setBookingError("Please select an appointment date."); return; }
    setBooking(true); setBookingError("");
    try {
      const res = await fetch(`${API}/api/appointments`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ doctorId: selectedDoctor._id, slot: selectedSlot, date: selectedDate }),
      });
      const data = await res.json();
      if (res.ok) {
        await fetchMyAppointments();
        setIsPopupOpen(false); setSelectedSlot(null); setSelectedDate(""); setShowSuccessPopup(true);
        setTimeout(() => setShowSuccessPopup(false), 2500);
      } else { setBookingError(data.message || "Booking failed."); }
    } catch { setBookingError("Server error. Please try again."); }
    finally {
      setBooking(false);
    }
  };

  const handleCancel = async (apptId) => {
    try {
      const res = await fetch(`${API}/api/appointments/${apptId}/cancel`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.ok) {
        setMyAppointments(prev =>
          prev.map(a => a._id === apptId ? { ...a, status: "cancelled" } : a)
        );
      }
    } catch (err) {
      console.error("Cancel failed:", err);
    }
  };

  const openBooking = (doc) => {
    if (!isPatient) return;
    setSelectedDoctor(doc); setBookingError(""); setSelectedSlot(null); setSelectedDate(""); setIsPopupOpen(true);
  };

  const filteredDoctors = doctors.filter(d => {
    if (!searchDoctor) return true;
    const q = searchDoctor.toLowerCase();
    return (`${d.firstName} ${d.lastName}`).toLowerCase().includes(q) ||
           (d.specialization || "").toLowerCase().includes(q);
  });

  const filteredAppointments = myAppointments.filter(a =>
    statusFilter === "All" || a.status === statusFilter
  );

  const statusCounts = myAppointments.reduce((acc, a) => {
    acc[a.status] = (acc[a.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="pa-page">

      {/* ── Mobile header ── */}
      <div className="pa-mobile-header">
        <button className="pa-mobile-back" onClick={() => navigate("/patient-dashboard")}>←</button>
        <img src={logo} alt="HealthSync" className="pa-mobile-logo" />
        <p className="pa-mobile-brand">HEALTHSYNC</p>
        <p className="pa-mobile-subtitle">Appointment Tracking</p>
      </div>

      {/* ── Mobile nav tabs ── */}
      <div className="pa-mobile-nav">
        {NAV.map(n => (
          <button key={n.key}
            className={`pa-mobile-nav-btn${activeNav === n.key ? " pa-mobile-nav-btn--active" : ""}`}
            onClick={() => setActiveNav(n.key)}>
            {n.icon} {n.label}
          </button>
        ))}
      </div>

      {/* ── Mobile content ── */}
      <div className="pa-content-wrap">

        {/* ── Find Doctors tab ── */}
        {activeNav === "doctors" && (
          <>
            <div>
              <p className="pa-section-title">Search Doctors</p>
              <input className="pa-search-input" placeholder="Search by name or specialty..."
                value={searchDoctor} onChange={e => setSearchDoctor(e.target.value)} />
              <div className="pa-filters">
                <select className="pa-filter-select" value={selectedSpecialty}
                  onChange={e => setSelectedSpecialty(e.target.value)}>
                  {SPECIALTIES.map(s => <option key={s} value={s === "All Specialties" ? "" : s}>{s}</option>)}
                </select>
                <select className="pa-filter-select" value={selectedGender}
                  onChange={e => setSelectedGender(e.target.value)}>
                  {GENDERS.map(g => <option key={g} value={g === "All Genders" ? "" : g}>{g}</option>)}
                </select>
              </div>
            </div>
            <div>
              <p className="pa-section-title">Available Doctors {!loadingDoctors && `(${filteredDoctors.length})`}</p>
              {loadingDoctors ? (
                <div className="pa-spinner-wrap"><span className="pa-spinner" /> Loading doctors...</div>
              ) : filteredDoctors.length === 0 ? (
                <div className="pa-empty"><span className="pa-empty-icon">🔍</span>No doctors found.</div>
              ) : (
                filteredDoctors.map((doc, i) => (
                  <div key={doc._id} className="pa-doctor-card" style={{ animationDelay: `${i * 0.05}s` }}>
                    <div className="pa-doctor-avatar">
                      {doc.profileImage ? <img src={doc.profileImage} alt={doc.firstName} /> : <span className="pa-doctor-avatar-placeholder">👨‍⚕️</span>}
                    </div>
                    <div className="pa-doctor-info">
                      <p className="pa-doctor-name">Dr. {doc.firstName} {doc.lastName}</p>
                      <p className="pa-doctor-spec">{doc.specialization}</p>
                      <p className="pa-doctor-meta">
                        {doc.experience > 0 ? `${doc.experience} yrs exp` : ""}
                        {doc.experience > 0 && doc.consultationFee > 0 ? " · " : ""}
                        {doc.consultationFee > 0 ? `₹${doc.consultationFee} / visit` : ""}
                      </p>
                    </div>
                    <button className="pa-book-btn" onClick={() => openBooking(doc)} disabled={!isPatient}>Book</button>
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {/* ── My Appointments tab (mobile) ── */}
        {activeNav === "appointments" && (
          <>
            <div>
              <p className="pa-section-title">My Appointments ({myAppointments.length})</p>
              <div className="pa-status-tabs">
                {STATUS_FILTERS.map(sf => (
                  <button key={sf}
                    className={`pa-status-tab${statusFilter === sf ? " pa-status-tab--active" : ""}`}
                    onClick={() => setStatusFilter(sf)}>
                    {sf === "All" ? `All (${myAppointments.length})` : `${STATUS_CONFIG[sf]?.label || sf} (${statusCounts[sf] || 0})`}
                  </button>
                ))}
              </div>
            </div>
            {loadingAppts ? (
              <div className="pa-spinner-wrap"><span className="pa-spinner" /> Loading...</div>
            ) : filteredAppointments.length === 0 ? (
              <div className="pa-empty">
                <span className="pa-empty-icon">📭</span>
                No {statusFilter !== "All" ? statusFilter : ""} appointments found.
              </div>
            ) : (
              filteredAppointments.map((appt, i) => (
                <AppointmentCard key={appt._id} appt={appt} i={i} onCancel={handleCancel} />
              ))
            )}
          </>
        )}
      </div>

      {/* ── Desktop sidebar ── */}
      <aside className="pa-sidebar">
        <div className="pa-sidebar-top">
          <img src={logo} alt="HealthSync" className="pa-sidebar-logo" />
          <p className="pa-sidebar-brand">HEALTHSYNC</p>
        </div>

        {/* Dashboard back button */}
        <button className="pa-sidebar-back" onClick={() => navigate("/patient-dashboard")}>← Dashboard</button>

        {/* Search */}
        <div style={{ padding: "0 16px 12px" }}>
          <input className="pa-sidebar-search" placeholder="Search doctors..." value={searchDoctor}
            onChange={e => setSearchDoctor(e.target.value)} />
        </div>

        {/* Filters */}
        <div className="pa-sidebar-filters">
          <p className="pa-sidebar-filter-label">Specialty</p>
          <select className="pa-sidebar-select" value={selectedSpecialty}
            onChange={e => setSelectedSpecialty(e.target.value)}>
            {SPECIALTIES.map(s => <option key={s} value={s === "All Specialties" ? "" : s}>{s}</option>)}
          </select>
          <p className="pa-sidebar-filter-label">Gender</p>
          <select className="pa-sidebar-select" value={selectedGender}
            onChange={e => setSelectedGender(e.target.value)}>
            {GENDERS.map(g => <option key={g} value={g === "All Genders" ? "" : g}>{g}</option>)}
          </select>
        </div>

        {/* Status summary */}
        {myAppointments.length > 0 && (
          <div className="pa-sidebar-stats">
            <p className="pa-sidebar-filter-label">Appointment Status</p>
            {Object.entries(statusCounts).map(([status, count]) => {
              const cfg = STATUS_CONFIG[status];
              if (!cfg) return null;
              return (
                <div key={status} className="pa-sidebar-stat-row">
                  <span style={{ color: cfg.color }}>{cfg.icon}</span>
                  <span className="pa-sidebar-stat-label">{cfg.label}</span>
                  <span className="pa-sidebar-stat-count">{count}</span>
                </div>
              );
            })}
          </div>
        )}

      </aside>

      {/* ── Desktop main ── */}
      <div className="pa-main">
        <div className="pa-topbar">
          <div>
            <div className="pa-topbar-title">Appointment Tracking</div>
            <div className="pa-topbar-count">
              {loadingDoctors ? "Loading..." : `${filteredDoctors.length} doctor${filteredDoctors.length !== 1 ? "s" : ""} available`}
            </div>
          </div>
          <div className="pa-topbar-badge">🩺 Patient Portal</div>
        </div>

        {/* Desktop nav tabs */}
        <div className="pa-desktop-tabs">
          {NAV.map(n => (
            <button key={n.key}
              className={`pa-desktop-tab${activeNav === n.key ? " pa-desktop-tab--active" : ""}`}
              onClick={() => setActiveNav(n.key)}>
              {n.icon} {n.label}
              {n.key === "appointments" && myAppointments.length > 0 && (
                <span className="pa-desktop-tab-badge">{myAppointments.length}</span>
              )}
            </button>
          ))}
        </div>

        {/* Find Doctors content */}
        {activeNav === "doctors" && (
          <div className="pa-doctor-grid">
            {loadingDoctors ? (
              <div className="pa-spinner-wrap" style={{ gridColumn: "1/-1" }}>
                <span className="pa-spinner" /> Loading doctors...
              </div>
            ) : filteredDoctors.length === 0 ? (
              <div className="pa-empty" style={{ gridColumn: "1/-1" }}>
                <span className="pa-empty-icon">🔍</span>No doctors found.
              </div>
            ) : (
              filteredDoctors.map((doc, i) => (
                <div key={doc._id} className="pa-doctor-card" style={{ animationDelay: `${i * 0.05}s` }}>
                  <div className="pa-doctor-avatar">
                    {doc.profileImage ? <img src={doc.profileImage} alt={doc.firstName} /> : <span className="pa-doctor-avatar-placeholder">👨‍⚕️</span>}
                  </div>
                  <div className="pa-doctor-info">
                    <p className="pa-doctor-name">Dr. {doc.firstName} {doc.lastName}</p>
                    <p className="pa-doctor-spec">{doc.specialization}</p>
                    <p className="pa-doctor-meta">
                      {doc.experience > 0 ? `${doc.experience} yrs exp` : ""}
                      {doc.experience > 0 && doc.consultationFee > 0 ? " · " : ""}
                      {doc.consultationFee > 0 ? `₹${doc.consultationFee} / visit` : ""}
                    </p>
                    {doc.clinicAddress && <p className="pa-doctor-addr">📍 {doc.clinicAddress}</p>}
                  </div>
                  <button className="pa-book-btn" onClick={() => openBooking(doc)} disabled={!isPatient}>
                    Book Now
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {/* My Appointments content (desktop) */}
        {activeNav === "appointments" && (
          <div className="pa-appts-section">
            <div className="pa-status-tabs pa-status-tabs--desktop">
              {STATUS_FILTERS.map(sf => (
                <button key={sf}
                  className={`pa-status-tab${statusFilter === sf ? " pa-status-tab--active" : ""}`}
                  onClick={() => setStatusFilter(sf)}>
                  {sf === "All" ? `All (${myAppointments.length})` : `${STATUS_CONFIG[sf]?.label || sf} (${statusCounts[sf] || 0})`}
                </button>
              ))}
            </div>
            {loadingAppts ? (
              <div className="pa-spinner-wrap"><span className="pa-spinner" /> Loading appointments...</div>
            ) : filteredAppointments.length === 0 ? (
              <div className="pa-empty">
                <span className="pa-empty-icon">📭</span>
                No {statusFilter !== "All" ? (STATUS_CONFIG[statusFilter]?.label || statusFilter).toLowerCase() : ""} appointments.
                {statusFilter === "All" && (
                  <button className="pa-empty-book-btn" onClick={() => setActiveNav("doctors")}>
                    Book Your First Appointment
                  </button>
                )}
              </div>
            ) : (
              <div className="pa-appts-grid">
                {filteredAppointments.map((appt, i) => (
                  <AppointmentCard key={appt._id} appt={appt} i={i} onCancel={handleCancel} desktop />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Booking modal ── */}
      {isPopupOpen && (
        <div className="pa-overlay" onClick={() => { setIsPopupOpen(false); setSelectedSlot(null); setSelectedDate(""); setBookingError(""); }}>
          <div className="pa-sheet" onClick={e => e.stopPropagation()}>
            <div className="pa-sheet-handle" />
            <div className="pa-sheet-header">
              <div>
                <p className="pa-sheet-title">Book Appointment</p>
                {selectedDoctor && (
                  <p className="pa-sheet-doc">
                    Dr. {selectedDoctor.firstName} {selectedDoctor.lastName} — {selectedDoctor.specialization}
                  </p>
                )}
                {selectedDoctor?.consultationFee > 0 && (
                  <p className="pa-sheet-fee">Fee: ₹{selectedDoctor.consultationFee} / visit</p>
                )}
              </div>
              <button className="pa-sheet-close"
                onClick={() => { setIsPopupOpen(false); setSelectedSlot(null); setSelectedDate(""); setBookingError(""); }}>
                ✕
              </button>
            </div>

            <div className="pa-date-section">
              <p className="pa-slots-label">Select Date <span style={{ color: "#ef4444" }}>*</span></p>
              <input type="date" className="pa-date-input" value={selectedDate} min={today}
                onChange={e => setSelectedDate(e.target.value)} />
            </div>

            <p className="pa-slots-label">Select Time Slot <span style={{ color: "#ef4444" }}>*</span></p>
            <div className="pa-slots-grid">
              {generateSlots().map(slot => (
                <button key={slot}
                  className={`pa-slot-btn${selectedSlot === slot ? " pa-slot-btn--selected" : ""}`}
                  onClick={() => setSelectedSlot(slot)}>
                  {slot}
                </button>
              ))}
            </div>

            {bookingError && <p className="pa-booking-error">{bookingError}</p>}

            <button className="pa-confirm-btn" disabled={!selectedSlot || !selectedDate || booking} onClick={handleConfirm}>
              {booking ? <><span className="pa-spinner" style={{ borderTopColor: "#fff" }} /> Booking...</> : "Confirm Appointment"}
            </button>
          </div>
        </div>
      )}

      {/* ── Success card ── */}
      {showSuccessPopup && (
        <div className="pa-success-overlay">
          <div className="pa-success-card">
            <div className="pa-success-icon">✅</div>
            <p className="pa-success-msg">Appointment Booked!</p>
            <p className="pa-success-sub">Your request has been submitted. Waiting for doctor confirmation.</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Appointment card component ──
function AppointmentCard({ appt, i, onCancel, desktop }) {
  const cfg = STATUS_CONFIG[appt.status] || { label: appt.status, color: "#6b7280", bg: "#f9fafb", icon: "•" };

  const timelineSteps = [{ key: "pending", label: "Requested" }];
  if (appt.status === "rejected") {
    timelineSteps.push({ key: "rejected", label: "Rejected" });
  } else if (appt.status === "cancelled") {
    timelineSteps.push({ key: "cancelled", label: "Cancelled" });
  } else if (appt.status === "no-show") {
    timelineSteps.push({ key: "accepted", label: "Confirmed" });
    timelineSteps.push({ key: "no-show", label: "No Show" });
  } else {
    timelineSteps.push({ key: "accepted", label: "Confirmed" });
    timelineSteps.push({ key: "completed", label: "Completed" });
  }

  const statusOrder = timelineSteps.map(s => s.key);
  const currentIdx = statusOrder.indexOf(appt.status);

  return (
    <div className={`pa-appt-card${desktop ? " pa-appt-card--desktop" : ""}`}
      style={{ animationDelay: `${i * 0.05}s`, borderLeft: `4px solid ${cfg.color}` }}>

      <div className="pa-appt-card-header">
        <div className="pa-appt-doc-avatar">
          {appt.doctorId?.profileImage ? <img src={appt.doctorId.profileImage} alt="" /> : "👨‍⚕️"}
        </div>
        <div className="pa-appt-info">
          <p className="pa-appt-doc">Dr. {appt.doctorId?.firstName} {appt.doctorId?.lastName}</p>
          <p className="pa-appt-spec">{appt.doctorId?.specialization}</p>
        </div>
        <StatusBadge status={appt.status} />
      </div>

      <div className="pa-appt-details">
        <span className="pa-appt-detail-item"><span className="pa-appt-detail-icon">🕐</span>{appt.slot}</span>
        {appt.date && (
          <span className="pa-appt-detail-item">
            <span className="pa-appt-detail-icon">📅</span>
            {new Date(appt.date + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
          </span>
        )}
        <span className="pa-appt-detail-item">
          <span className="pa-appt-detail-icon">📌</span>
          Booked {new Date(appt.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
        </span>
        {appt.completedAt && (
          <span className="pa-appt-detail-item">
            <span className="pa-appt-detail-icon">✅</span>
            Done {new Date(appt.completedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
          </span>
        )}
      </div>

      {appt.notes && (
        <div className="pa-appt-notes">
          <span className="pa-appt-notes-label">Doctor's Notes:</span> {appt.notes}
        </div>
      )}

      {/* Status progress timeline */}
      <div className="pa-appt-timeline">
        {timelineSteps.map((step, idx) => {
          const stepIdx = statusOrder.indexOf(step.key);
          let state = stepIdx < currentIdx ? "done" : stepIdx === currentIdx ? "current" : "upcoming";
          const stepCfg = STATUS_CONFIG[step.key] || {};
          return (
            <div key={step.key} className={`pa-timeline-step pa-timeline-step--${state}`}>
              <div className="pa-timeline-dot" style={{ background: state === "current" ? cfg.color : state === "done" ? "#10b981" : "#e5e7eb" }} />
              {idx < timelineSteps.length - 1 && (
                <div className="pa-timeline-line" style={{ background: stepIdx < currentIdx ? "#10b981" : "#e5e7eb" }} />
              )}
              <span className="pa-timeline-label" style={{ color: state === "current" ? cfg.color : state === "done" ? "#374151" : "#9ca3af" }}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>

      {appt.status === "pending" && (
        <div className="pa-appt-actions">
          <button className="pa-cancel-btn" onClick={() => onCancel(appt._id)}>Cancel Request</button>
        </div>
      )}
    </div>
  );
}

export default PatientAppointment;
