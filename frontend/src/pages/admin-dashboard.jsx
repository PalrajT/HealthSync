import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import "./admin-dashboard.css";
import logo from "../assets/health-sync-logo.svg";
import { API } from "../config";

/* ── Helpers ── */
const getToken = () => localStorage.getItem("token");
const authHeaders = () => ({
  Authorization: `Bearer ${getToken()}`,
  "Content-Type": "application/json",
});
const timeAgo = (date) => {
  if (!date) return "";
  const diff = (Date.now() - new Date(date).getTime()) / 1000;
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(date).toLocaleDateString();
};

const TABS = [
  { label: "Overview", icon: "📊", key: "overview" },
  { label: "Patients", icon: "🧑‍🤝‍🧑", key: "patients" },
  { label: "Doctors", icon: "👨‍⚕️", key: "doctors" },
  { label: "Appointments", icon: "📅", key: "appointments" },
  { label: "Medical Records", icon: "📋", key: "records" },
];

const RECORD_TYPES = ["All", "Lab Report", "Prescription", "Scan / X-Ray", "Discharge Summary", "Insurance", "Other"];

const APPT_STATUSES = ["pending", "accepted", "rejected", "cancelled", "completed", "no-show"];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("overview");
  const [stats, setStats] = useState(null);
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Search & filters
  const [searchQuery, setSearchQuery] = useState("");
  const [patientFilter, setPatientFilter] = useState("all");
  const [doctorFilter, setDoctorFilter] = useState("all");
  const [apptFilter, setApptFilter] = useState("all");
  const [recordFilter, setRecordFilter] = useState("All");

  // Modals
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [detailModal, setDetailModal] = useState(null);

  // Toast
  const [toast, setToast] = useState(null);

  const adminName = (() => {
    try { return JSON.parse(localStorage.getItem("admin"))?.name || "Admin"; }
    catch { return "Admin"; }
  })();

  const showToast = useCallback((type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  }, []);

  /* ── API Fetchers ── */
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/admin/stats`, { headers: authHeaders() });
      const data = await res.json();
      if (data.success) setStats(data.data);
    } catch { showToast("error", "Failed to load dashboard stats"); }
  }, [showToast]);

  const fetchPatients = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/admin/patients`, { headers: authHeaders() });
      const data = await res.json();
      if (data.success) setPatients(data.data);
    } catch { showToast("error", "Failed to load patients"); }
  }, [showToast]);

  const fetchDoctors = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/admin/doctors`, { headers: authHeaders() });
      const data = await res.json();
      if (data.success) setDoctors(data.data);
    } catch { showToast("error", "Failed to load doctors"); }
  }, [showToast]);

  const fetchAppointments = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/admin/appointments`, { headers: authHeaders() });
      const data = await res.json();
      if (data.success) setAppointments(data.data);
    } catch { showToast("error", "Failed to load appointments"); }
  }, [showToast]);

  const fetchRecords = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/admin/records`, { headers: authHeaders() });
      const data = await res.json();
      if (data.success) setRecords(data.data);
    } catch { showToast("error", "Failed to load medical records"); }
  }, [showToast]);

  /* ── Initial Load ── */
  useEffect(() => {
    (async () => {
      setLoading(true);
      await fetchStats();
      setLoading(false);
    })();
  }, [fetchStats]);

  /* ── Tab Switching ── */
  const handleTab = async (key) => {
    setTab(key);
    setSearchQuery("");
    if (key === "patients" && patients.length === 0) { setLoading(true); await fetchPatients(); setLoading(false); }
    if (key === "doctors" && doctors.length === 0) { setLoading(true); await fetchDoctors(); setLoading(false); }
    if (key === "appointments" && appointments.length === 0) { setLoading(true); await fetchAppointments(); setLoading(false); }
    if (key === "records" && records.length === 0) { setLoading(true); await fetchRecords(); setLoading(false); }
  };

  /* ── Refresh All ── */
  const handleRefresh = async () => {
    setRefreshing(true);
    const loaders = [fetchStats()];
    if (tab === "patients" || patients.length) loaders.push(fetchPatients());
    if (tab === "doctors" || doctors.length) loaders.push(fetchDoctors());
    if (tab === "appointments" || appointments.length) loaders.push(fetchAppointments());
    if (tab === "records" || records.length) loaders.push(fetchRecords());
    await Promise.all(loaders);
    setRefreshing(false);
    showToast("success", "Data refreshed successfully");
  };

  /* ── Actions ── */
  const togglePatientStatus = async (id, currentlyActive) => {
    const endpoint = currentlyActive ? "deactivate" : "activate";
    try {
      const res = await fetch(`${API}/api/admin/patients/${id}/${endpoint}`, {
        method: "PUT", headers: authHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        setPatients(prev => prev.map(p => p._id === id ? { ...p, isActive: !currentlyActive } : p));
        showToast("success", `Patient ${currentlyActive ? "deactivated" : "activated"}`);
      }
    } catch { showToast("error", "Action failed"); }
    setConfirmAction(null);
  };

  const toggleDoctorStatus = async (id, currentlyActive) => {
    const endpoint = currentlyActive ? "deactivate" : "activate";
    try {
      const res = await fetch(`${API}/api/admin/doctors/${id}/${endpoint}`, {
        method: "PUT", headers: authHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        setDoctors(prev => prev.map(d => d._id === id ? { ...d, isActive: !currentlyActive } : d));
        showToast("success", `Doctor ${currentlyActive ? "deactivated" : "activated"}`);
      }
    } catch { showToast("error", "Action failed"); }
    setConfirmAction(null);
  };

  const deletePatient = async (id) => {
    try {
      const res = await fetch(`${API}/api/admin/patients/${id}`, {
        method: "DELETE", headers: authHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        setPatients(prev => prev.filter(p => p._id !== id));
        showToast("success", "Patient deleted permanently");
      }
    } catch { showToast("error", "Delete failed"); }
    setConfirmAction(null);
  };

  const deleteDoctor = async (id) => {
    try {
      const res = await fetch(`${API}/api/admin/doctors/${id}`, {
        method: "DELETE", headers: authHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        setDoctors(prev => prev.filter(d => d._id !== id));
        showToast("success", "Doctor deleted permanently");
      }
    } catch { showToast("error", "Delete failed"); }
    setConfirmAction(null);
  };

  const updateApptStatus = async (id, newStatus) => {
    try {
      const res = await fetch(`${API}/api/admin/appointments/${id}/status`, {
        method: "PUT", headers: authHeaders(),
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setAppointments(prev => prev.map(a => a._id === id ? data.data : a));
        showToast("success", `Status changed to ${newStatus}`);
      }
    } catch { showToast("error", "Status update failed"); }
  };

  const deleteRecord = async (id) => {
    try {
      const res = await fetch(`${API}/api/admin/records/${id}`, {
        method: "DELETE", headers: authHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        setRecords(prev => prev.filter(r => r._id !== id));
        showToast("success", "Medical record deleted");
      }
    } catch { showToast("error", "Delete failed"); }
    setConfirmAction(null);
  };

  const deleteAppointment = async (id) => {
    try {
      const res = await fetch(`${API}/api/admin/appointments/${id}`, {
        method: "DELETE", headers: authHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        setAppointments(prev => prev.filter(a => a._id !== id));
        showToast("success", "Appointment deleted");
      }
    } catch { showToast("error", "Delete failed"); }
    setConfirmAction(null);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("admin");
    navigate("/login-register");
  };

  /* ── Execute confirm action ── */
  const executeConfirm = () => {
    if (!confirmAction) return;
    const { type, id, currentlyActive } = confirmAction;
    switch (type) {
      case "togglePatient": togglePatientStatus(id, currentlyActive); break;
      case "toggleDoctor": toggleDoctorStatus(id, currentlyActive); break;
      case "deletePatient": deletePatient(id); break;
      case "deleteDoctor": deleteDoctor(id); break;
      case "deleteAppointment": deleteAppointment(id); break;
      case "deleteRecord": deleteRecord(id); break;
      default: setConfirmAction(null);
    }
  };

  /* ── Filtered + Searched data ── */
  const filteredPatients = useMemo(() => {
    let list = patients;
    if (patientFilter === "active") list = list.filter(p => p.isActive !== false);
    if (patientFilter === "inactive") list = list.filter(p => p.isActive === false);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(p =>
        p.name?.toLowerCase().includes(q) ||
        p.email?.toLowerCase().includes(q) ||
        p.phone?.includes(q)
      );
    }
    return list;
  }, [patients, patientFilter, searchQuery]);

  const filteredDoctors = useMemo(() => {
    let list = doctors;
    if (doctorFilter === "active") list = list.filter(d => d.isActive !== false);
    if (doctorFilter === "inactive") list = list.filter(d => d.isActive === false);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(d =>
        `${d.firstName} ${d.lastName}`.toLowerCase().includes(q) ||
        d.email?.toLowerCase().includes(q) ||
        d.specialization?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [doctors, doctorFilter, searchQuery]);

  const filteredAppointments = useMemo(() => {
    let list = appointments;
    if (apptFilter !== "all") list = list.filter(a => a.status === apptFilter);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(a =>
        a.patientId?.name?.toLowerCase().includes(q) ||
        `${a.doctorId?.firstName || ""} ${a.doctorId?.lastName || ""}`.toLowerCase().includes(q) ||
        a.date?.includes(q)
      );
    }
    return list;
  }, [appointments, apptFilter, searchQuery]);

  const filteredRecords = useMemo(() => {
    let list = records;
    if (recordFilter !== "All") list = list.filter(r => r.recordType === recordFilter);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(r =>
        r.fileName?.toLowerCase().includes(q) ||
        r.ownerName?.toLowerCase().includes(q) ||
        r.ownerEmail?.toLowerCase().includes(q) ||
        r.recordType?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [records, recordFilter, searchQuery]);

  /* ── Count helpers ── */
  const activePatients = patients.filter(p => p.isActive !== false).length;
  const inactivePatients = patients.filter(p => p.isActive === false).length;
  const activeDoctors = doctors.filter(d => d.isActive !== false).length;
  const inactiveDoctors = doctors.filter(d => d.isActive === false).length;

  const tabTitles = {
    overview: "Dashboard Overview",
    patients: `Patients (${filteredPatients.length})`,
    doctors: `Doctors (${filteredDoctors.length})`,
    appointments: `Appointments (${filteredAppointments.length})`,
    records: `Medical Records (${filteredRecords.length})`,
  };

  const statusColors = {
    pending: "#f39c12", accepted: "#27ae60", rejected: "#e74c3c",
    cancelled: "#95a5a6", completed: "#3498db", "no-show": "#c0392b",
  };

  /* ── Loading skeleton ── */
  const Skeleton = () => (
    <div className="admin-skeleton-row">
      {[1, 2, 3].map(i => <div key={i} className="admin-skeleton card" />)}
    </div>
  );

  /* ── Overview ── */
  const renderOverview = () => {
    if (!stats) return loading ? <Skeleton /> : null;
    const maxApptCount = Math.max(...Object.values(stats.appointmentsByStatus || {}), 1);

    return (
      <>
        <div className="admin-stats-row">
          {[
            { label: "Total Patients", value: stats.totalPatients, icon: "🧑‍🤝‍🧑", cls: "patients" },
            { label: "Total Doctors", value: stats.totalDoctors, icon: "👨‍⚕️", cls: "doctors" },
            { label: "Appointments", value: stats.totalAppointments, icon: "📅", cls: "appointments" },
            { label: "Medical Records", value: stats.totalRecords, icon: "📄", cls: "records" },
          ].map(s => (
            <div className="admin-stat-card" key={s.label}>
              <div className={`admin-stat-icon ${s.cls}`}>{s.icon}</div>
              <div className="admin-stat-info">
                <div className="admin-stat-value">{s.value ?? "—"}</div>
                <div className="admin-stat-label">{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {stats.appointmentsByStatus && Object.keys(stats.appointmentsByStatus).length > 0 && (
          <div style={{ background: "#fff", borderRadius: 14, padding: "22px 24px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", marginBottom: 24 }}>
            <div className="admin-section-header">
              <h3 className="admin-section-title">Appointments by Status</h3>
            </div>
            <div className="admin-bar-chart">
              {Object.entries(stats.appointmentsByStatus).map(([status, count]) => (
                <div className="admin-bar-item" key={status}>
                  <div className="admin-bar-value">{count}</div>
                  <div
                    className="admin-bar"
                    style={{
                      height: `${(count / maxApptCount) * 120}px`,
                      background: statusColors[status] || "#bbb",
                    }}
                    title={`${status}: ${count}`}
                  />
                  <div className="admin-bar-label">{status}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          <div style={{ background: "#fff", borderRadius: 14, padding: "22px 24px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
            <div className="admin-section-header">
              <h3 className="admin-section-title">Recent Patients</h3>
              <button className="admin-btn admin-btn-ghost" onClick={() => handleTab("patients")} style={{ fontSize: "0.75rem" }}>View All →</button>
            </div>
            <div className="admin-activity-list">
              {stats.recentPatients?.length > 0 ? stats.recentPatients.map(p => (
                <div className="admin-activity-item" key={p._id}>
                  <div className="admin-activity-dot patient" />
                  <div className="admin-activity-text">
                    <strong>{p.name}</strong> — {p.email}
                  </div>
                  <div className="admin-activity-time">{timeAgo(p.createdAt)}</div>
                </div>
              )) : (
                <div style={{ color: "#9ca3af", fontSize: "0.85rem", padding: 12 }}>No recent patients</div>
              )}
            </div>
          </div>

          <div style={{ background: "#fff", borderRadius: 14, padding: "22px 24px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
            <div className="admin-section-header">
              <h3 className="admin-section-title">Recent Doctors</h3>
              <button className="admin-btn admin-btn-ghost" onClick={() => handleTab("doctors")} style={{ fontSize: "0.75rem" }}>View All →</button>
            </div>
            <div className="admin-activity-list">
              {stats.recentDoctors?.length > 0 ? stats.recentDoctors.map(d => (
                <div className="admin-activity-item" key={d._id}>
                  <div className="admin-activity-dot doctor" />
                  <div className="admin-activity-text">
                    <strong>Dr. {d.firstName} {d.lastName}</strong> — {d.specialization}
                  </div>
                  <div className="admin-activity-time">{timeAgo(d.createdAt)}</div>
                </div>
              )) : (
                <div style={{ color: "#9ca3af", fontSize: "0.85rem", padding: 12 }}>No recent doctors</div>
              )}
            </div>
          </div>
        </div>

        {stats.recentAppointments?.length > 0 && (
          <div style={{ background: "#fff", borderRadius: 14, padding: "22px 24px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", marginTop: 20 }}>
            <div className="admin-section-header">
              <h3 className="admin-section-title">Recent Appointments</h3>
              <button className="admin-btn admin-btn-ghost" onClick={() => handleTab("appointments")} style={{ fontSize: "0.75rem" }}>View All →</button>
            </div>
            <div className="admin-activity-list">
              {stats.recentAppointments.map(a => (
                <div className="admin-activity-item" key={a._id}>
                  <div className="admin-activity-dot appointment" />
                  <div className="admin-activity-text">
                    <strong>{a.patientId?.name || "Patient"}</strong> with{" "}
                    <strong>{a.doctorId ? `Dr. ${a.doctorId.firstName} ${a.doctorId.lastName}` : "Doctor"}</strong>
                    {a.date && ` — ${a.date}`}
                  </div>
                  <span className={`admin-status ${a.status}`}>{a.status}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </>
    );
  };

  /* ── Patients Tab ── */
  const renderPatients = () => (
    <>
      <div className="admin-toolbar">
        {[
          { label: "All", value: "all", count: patients.length },
          { label: "Active", value: "active", count: activePatients },
          { label: "Inactive", value: "inactive", count: inactivePatients },
        ].map(f => (
          <button
            key={f.value}
            className={`admin-filter-btn${patientFilter === f.value ? " active" : ""}`}
            onClick={() => setPatientFilter(f.value)}
          >
            {f.label}
            <span className="admin-filter-count">{f.count}</span>
          </button>
        ))}
      </div>

      {loading ? <Skeleton /> : filteredPatients.length === 0 ? (
        <div className="admin-empty">
          <div className="admin-empty-icon">🔍</div>
          <div className="admin-empty-text">No patients found</div>
          <div className="admin-empty-sub">{searchQuery ? "Try adjusting your search" : "No patients registered yet"}</div>
        </div>
      ) : (
        <div className="admin-data-grid">
          {filteredPatients.map((p, i) => (
            <div
              className={`admin-data-card ${p.isActive === false ? "inactive" : "active-card"}`}
              key={p._id}
              style={{ animationDelay: `${i * 0.05}s` }}
            >
              <div className="admin-card-header">
                <div className="admin-card-name">{p.name}</div>
                <span className={`admin-card-badge ${p.isActive === false ? "inactive" : "active"}`}>
                  {p.isActive === false ? "Inactive" : "Active"}
                </span>
              </div>
              <div className="admin-card-info">
                <div className="admin-card-row">
                  <span className="admin-card-row-icon">📧</span> {p.email}
                </div>
                <div className="admin-card-row">
                  <span className="admin-card-row-icon">📱</span> {p.phone || "Not provided"}
                </div>
                {p.gender && (
                  <div className="admin-card-row">
                    <span className="admin-card-row-icon">👤</span> {p.gender}{p.age ? `, ${p.age} yrs` : ""}
                  </div>
                )}
                {p.bloodGroup && (
                  <div className="admin-card-row">
                    <span className="admin-card-row-icon">🩸</span> {p.bloodGroup}
                  </div>
                )}
              </div>
              <div className="admin-card-actions">
                <button className="admin-btn admin-btn-ghost" onClick={() => setDetailModal({ type: "patient", data: p })}>
                  👁 View
                </button>
                {p.isActive === false ? (
                  <button
                    className="admin-btn admin-btn-success"
                    onClick={() => setConfirmAction({ type: "togglePatient", id: p._id, name: p.name, currentlyActive: false, actionLabel: "Activate" })}
                  >
                    ✅ Activate
                  </button>
                ) : (
                  <button
                    className="admin-btn admin-btn-warning"
                    onClick={() => setConfirmAction({ type: "togglePatient", id: p._id, name: p.name, currentlyActive: true, actionLabel: "Deactivate" })}
                  >
                    ⏸ Deactivate
                  </button>
                )}
                <button
                  className="admin-btn admin-btn-danger"
                  onClick={() => setConfirmAction({ type: "deletePatient", id: p._id, name: p.name, actionLabel: "Delete" })}
                >
                  🗑 Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );

  /* ── Doctors Tab ── */
  const renderDoctors = () => (
    <>
      <div className="admin-toolbar">
        {[
          { label: "All", value: "all", count: doctors.length },
          { label: "Active", value: "active", count: activeDoctors },
          { label: "Inactive", value: "inactive", count: inactiveDoctors },
        ].map(f => (
          <button
            key={f.value}
            className={`admin-filter-btn${doctorFilter === f.value ? " active" : ""}`}
            onClick={() => setDoctorFilter(f.value)}
          >
            {f.label}
            <span className="admin-filter-count">{f.count}</span>
          </button>
        ))}
      </div>

      {loading ? <Skeleton /> : filteredDoctors.length === 0 ? (
        <div className="admin-empty">
          <div className="admin-empty-icon">🔍</div>
          <div className="admin-empty-text">No doctors found</div>
          <div className="admin-empty-sub">{searchQuery ? "Try adjusting your search" : "No doctors registered yet"}</div>
        </div>
      ) : (
        <div className="admin-data-grid">
          {filteredDoctors.map((d, i) => (
            <div
              className={`admin-data-card ${d.isActive === false ? "inactive" : "active-card"}`}
              key={d._id}
              style={{ animationDelay: `${i * 0.05}s` }}
            >
              <div className="admin-card-header">
                <div className="admin-card-name">Dr. {d.firstName} {d.lastName}</div>
                <span className={`admin-card-badge ${d.isActive === false ? "inactive" : "active"}`}>
                  {d.isActive === false ? "Inactive" : "Active"}
                </span>
              </div>
              <div className="admin-card-info">
                <div className="admin-card-row">
                  <span className="admin-card-row-icon">📧</span> {d.email}
                </div>
                <div className="admin-card-row">
                  <span className="admin-card-row-icon">🏥</span> {d.specialization || "General"}
                </div>
                <div className="admin-card-row">
                  <span className="admin-card-row-icon">📱</span> {d.phone || "Not provided"}
                </div>
                {d.experience > 0 && (
                  <div className="admin-card-row">
                    <span className="admin-card-row-icon">⏱</span> {d.experience} yrs experience
                  </div>
                )}
                {d.consultationFee > 0 && (
                  <div className="admin-card-row">
                    <span className="admin-card-row-icon">💰</span> ₹{d.consultationFee} consultation fee
                  </div>
                )}
              </div>
              <div className="admin-card-actions">
                <button className="admin-btn admin-btn-ghost" onClick={() => setDetailModal({ type: "doctor", data: d })}>
                  👁 View
                </button>
                {d.isActive === false ? (
                  <button
                    className="admin-btn admin-btn-success"
                    onClick={() => setConfirmAction({ type: "toggleDoctor", id: d._id, name: `Dr. ${d.firstName} ${d.lastName}`, currentlyActive: false, actionLabel: "Activate" })}
                  >
                    ✅ Activate
                  </button>
                ) : (
                  <button
                    className="admin-btn admin-btn-warning"
                    onClick={() => setConfirmAction({ type: "toggleDoctor", id: d._id, name: `Dr. ${d.firstName} ${d.lastName}`, currentlyActive: true, actionLabel: "Deactivate" })}
                  >
                    ⏸ Deactivate
                  </button>
                )}
                <button
                  className="admin-btn admin-btn-danger"
                  onClick={() => setConfirmAction({ type: "deleteDoctor", id: d._id, name: `Dr. ${d.firstName} ${d.lastName}`, actionLabel: "Delete" })}
                >
                  🗑 Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );

  /* ── Appointments Tab ── */
  const renderAppointments = () => {
    const statusCounts = appointments.reduce((acc, a) => {
      acc[a.status] = (acc[a.status] || 0) + 1;
      return acc;
    }, {});

    return (
      <>
        <div className="admin-toolbar">
          <button
            className={`admin-filter-btn${apptFilter === "all" ? " active" : ""}`}
            onClick={() => setApptFilter("all")}
          >
            All <span className="admin-filter-count">{appointments.length}</span>
          </button>
          {APPT_STATUSES.filter(s => statusCounts[s]).map(s => (
            <button
              key={s}
              className={`admin-filter-btn${apptFilter === s ? " active" : ""}`}
              onClick={() => setApptFilter(s)}
            >
              {s} <span className="admin-filter-count">{statusCounts[s]}</span>
            </button>
          ))}
        </div>

        {loading ? <Skeleton /> : filteredAppointments.length === 0 ? (
          <div className="admin-empty">
            <div className="admin-empty-icon">📅</div>
            <div className="admin-empty-text">No appointments found</div>
            <div className="admin-empty-sub">{searchQuery ? "Try adjusting your search" : apptFilter !== "all" ? "No appointments with this status" : "No appointments yet"}</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {filteredAppointments.map((a, i) => (
              <div className="admin-appt-card" key={a._id} style={{ animationDelay: `${i * 0.04}s` }}>
                <div className="admin-appt-top">
                  <div className="admin-appt-parties">
                    <div className="admin-appt-patient">{a.patientId?.name || "Unknown Patient"}</div>
                    <div className="admin-appt-doctor">
                      {a.doctorId ? `Dr. ${a.doctorId.firstName} ${a.doctorId.lastName} — ${a.doctorId.specialization || ""}` : "Unknown Doctor"}
                    </div>
                  </div>
                  <span className={`admin-status ${a.status}`}>● {a.status}</span>
                </div>
                <div className="admin-appt-meta">
                  <span>📅 {a.date || "No date"}</span>
                  <span>🕐 {a.slot || a.time || "No time"}</span>
                  {a.patientId?.email && <span>📧 {a.patientId.email}</span>}
                </div>
                {a.notes && (
                  <div style={{ fontSize: "0.82rem", color: "#6b7280", marginBottom: 10, fontStyle: "italic" }}>
                    Notes: {a.notes}
                  </div>
                )}
                <div className="admin-appt-actions">
                  <select
                    className="admin-status-select"
                    value={a.status}
                    onChange={(e) => updateApptStatus(a._id, e.target.value)}
                  >
                    {APPT_STATUSES.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  <button
                    className="admin-btn admin-btn-danger"
                    onClick={() => setConfirmAction({ type: "deleteAppointment", id: a._id, name: `appointment for ${a.patientId?.name || "patient"}`, actionLabel: "Delete" })}
                  >
                    🗑 Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </>
    );
  };

  /* ── Medical Records Tab ── */
  const renderRecords = () => {
    const typeCounts = records.reduce((acc, r) => {
      acc[r.recordType || "Other"] = (acc[r.recordType || "Other"] || 0) + 1;
      return acc;
    }, {});

    const typeIcons = {
      "Lab Report": "🧪", "Prescription": "💊", "Scan / X-Ray": "🩻",
      "Discharge Summary": "🏥", "Insurance": "🛡️", "Other": "📎",
    };

    const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";

    return (
      <>
        <div className="admin-toolbar">
          {RECORD_TYPES.map(t => (
            <button
              key={t}
              className={`admin-filter-btn${recordFilter === t ? " active" : ""}`}
              onClick={() => setRecordFilter(t)}
            >
              {t === "All" ? "All" : t}
              <span className="admin-filter-count">{t === "All" ? records.length : (typeCounts[t] || 0)}</span>
            </button>
          ))}
        </div>

        {loading ? <Skeleton /> : filteredRecords.length === 0 ? (
          <div className="admin-empty">
            <div className="admin-empty-icon">📋</div>
            <div className="admin-empty-text">No medical records found</div>
            <div className="admin-empty-sub">{searchQuery ? "Try adjusting your search" : recordFilter !== "All" ? "No records of this type" : "No medical records uploaded yet"}</div>
          </div>
        ) : (
          <div className="admin-data-grid">
            {filteredRecords.map((r, i) => (
              <div className="admin-data-card active-card" key={r._id} style={{ animationDelay: `${i * 0.05}s` }}>
                <div className="admin-card-header">
                  <div className="admin-card-name" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span>{typeIcons[r.recordType] || "📄"}</span>
                    <span style={{ wordBreak: "break-all" }}>{r.fileName}</span>
                  </div>
                  <span className="admin-card-badge active">{r.recordType || "Other"}</span>
                </div>
                <div className="admin-card-info">
                  <div className="admin-card-row">
                    <span className="admin-card-row-icon">👤</span> {r.ownerName || "Unknown"}
                  </div>
                  {r.ownerEmail && (
                    <div className="admin-card-row">
                      <span className="admin-card-row-icon">📧</span> {r.ownerEmail}
                    </div>
                  )}
                  <div className="admin-card-row">
                    <span className="admin-card-row-icon">🏷️</span> {r.userRole === "doctor" ? "Doctor" : "Patient"}
                  </div>
                  <div className="admin-card-row">
                    <span className="admin-card-row-icon">📅</span> {fmtDate(r.createdAt)}
                  </div>
                </div>
                <div className="admin-card-actions">
                  <a href={r.fileUrl} target="_blank" rel="noopener noreferrer" className="admin-btn admin-btn-ghost" style={{ textDecoration: "none" }}>
                    👁 View
                  </a>
                  <button
                    className="admin-btn admin-btn-danger"
                    onClick={() => setConfirmAction({ type: "deleteRecord", id: r._id, name: r.fileName, actionLabel: "Delete" })}
                  >
                    🗑 Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </>
    );
  };

  /* ── Detail Modal ── */
  const renderDetailModal = () => {
    if (!detailModal) return null;
    const { type, data } = detailModal;

    if (type === "patient") {
      return (
        <div className="admin-modal-overlay" onClick={() => setDetailModal(null)}>
          <div className="admin-modal admin-detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-title">👤 Patient Details</div>
            <div className="admin-detail-grid">
              {[
                ["Full Name", data.name],
                ["Email", data.email],
                ["Phone", data.phone || "—"],
                ["Gender", data.gender || "—"],
                ["Age", data.age || "—"],
                ["Blood Group", data.bloodGroup || "—"],
                ["Chronic Conditions", data.chronicConditions || "None"],
                ["Joined", data.createdAt ? new Date(data.createdAt).toLocaleDateString() : "—"],
              ].map(([label, value]) => (
                <div className="admin-detail-item" key={label}>
                  <label>{label}</label>
                  <span>{value}</span>
                </div>
              ))}
              <div className="admin-detail-item">
                <label>Status</label>
                <span className={`admin-card-badge ${data.isActive === false ? "inactive" : "active"}`}>
                  {data.isActive === false ? "Inactive" : "Active"}
                </span>
              </div>
            </div>
            <div className="admin-modal-actions">
              <button className="admin-btn admin-btn-ghost" onClick={() => setDetailModal(null)}>Close</button>
            </div>
          </div>
        </div>
      );
    }

    if (type === "doctor") {
      return (
        <div className="admin-modal-overlay" onClick={() => setDetailModal(null)}>
          <div className="admin-modal admin-detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-title">👨‍⚕️ Doctor Details</div>
            <div className="admin-detail-grid">
              {[
                ["Full Name", `Dr. ${data.firstName} ${data.lastName}`],
                ["Email", data.email],
                ["Phone", data.phone || "—"],
                ["Specialization", data.specialization || "—"],
                ["License Number", data.licenseNumber || "—"],
                ["Experience", data.experience ? `${data.experience} years` : "—"],
                ["Consultation Fee", data.consultationFee ? `₹${data.consultationFee}` : "—"],
                ["Gender", data.gender || "—"],
                ["Clinic Address", data.clinicAddress || "—"],
                ["Joined", data.createdAt ? new Date(data.createdAt).toLocaleDateString() : "—"],
              ].map(([label, value]) => (
                <div className="admin-detail-item" key={label}>
                  <label>{label}</label>
                  <span>{value}</span>
                </div>
              ))}
              <div className="admin-detail-item">
                <label>Status</label>
                <span className={`admin-card-badge ${data.isActive === false ? "inactive" : "active"}`}>
                  {data.isActive === false ? "Inactive" : "Active"}
                </span>
              </div>
            </div>
            <div className="admin-modal-actions">
              <button className="admin-btn admin-btn-ghost" onClick={() => setDetailModal(null)}>Close</button>
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  /* ══════════════════════════════ RENDER ══════════════════════════════ */
  return (
    <div className="admin-layout">
      {/* ── Sidebar ── */}
      <aside className="admin-sidebar">
        <div className="admin-sidebar-brand">
          <img src={logo} alt="HealthSync" />
          <span>HealthSync</span>
        </div>
        <div className="admin-sidebar-user">
          <div className="admin-user-name">{adminName}</div>
          <div className="admin-user-role">Administrator</div>
        </div>
        <div className="admin-sidebar-divider" />
        <nav className="admin-nav">
          {TABS.map(t => (
            <button
              key={t.key}
              className={`admin-nav-btn${tab === t.key ? " active" : ""}`}
              onClick={() => handleTab(t.key)}
            >
              <span className="admin-nav-icon">{t.icon}</span>
              {t.label}
              {t.key === "patients" && patients.length > 0 && <span className="admin-nav-badge">{patients.length}</span>}
              {t.key === "doctors" && doctors.length > 0 && <span className="admin-nav-badge">{doctors.length}</span>}
              {t.key === "appointments" && appointments.length > 0 && <span className="admin-nav-badge">{appointments.length}</span>}
              {t.key === "records" && records.length > 0 && <span className="admin-nav-badge">{records.length}</span>}
            </button>
          ))}
        </nav>
        <button className="admin-logout-btn" onClick={() => setShowLogoutConfirm(true)}>
          🚪 Logout
        </button>
      </aside>

      {/* ── Main ── */}
      <div className="admin-main">
        <header className="admin-topbar">
          <div className="admin-topbar-title">{tabTitles[tab]}</div>
          <div className="admin-topbar-right">
            {tab !== "overview" && (
              <div className="admin-search-box">
                <span>🔍</span>
                <input
                  type="text"
                  placeholder={`Search ${tab}…`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    style={{ border: "none", background: "none", cursor: "pointer", fontSize: "0.9rem", color: "#9ca3af" }}
                  >
                    ✕
                  </button>
                )}
              </div>
            )}
            <button
              className={`admin-refresh-btn${refreshing ? " spinning" : ""}`}
              onClick={handleRefresh}
              title="Refresh data"
            >
              🔄
            </button>
          </div>
        </header>

        <div className="admin-content">
          {tab === "overview" && renderOverview()}
          {tab === "patients" && renderPatients()}
          {tab === "doctors" && renderDoctors()}
          {tab === "appointments" && renderAppointments()}
          {tab === "records" && renderRecords()}
        </div>
      </div>

      {/* ── Confirm Action Modal ── */}
      {confirmAction && (
        <div className="admin-modal-overlay" onClick={() => setConfirmAction(null)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-title">
              {confirmAction.actionLabel === "Delete" ? "⚠️" : "🔄"} Confirm {confirmAction.actionLabel}
            </div>
            <div className="admin-modal-msg">
              Are you sure you want to <strong>{confirmAction.actionLabel?.toLowerCase()}</strong>{" "}
              <strong>{confirmAction.name}</strong>?
              {confirmAction.actionLabel === "Delete" && (
                <><br /><br /><span style={{ color: "#e74c3c" }}>This action is permanent and cannot be undone. All related data will also be removed.</span></>
              )}
            </div>
            <div className="admin-modal-actions">
              <button className="admin-btn admin-btn-ghost" onClick={() => setConfirmAction(null)}>Cancel</button>
              <button
                className={`admin-btn ${confirmAction.actionLabel === "Delete" ? "admin-btn-danger" : confirmAction.actionLabel === "Activate" ? "admin-btn-success" : "admin-btn-warning"}`}
                onClick={executeConfirm}
              >
                {confirmAction.actionLabel}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Logout Modal ── */}
      {showLogoutConfirm && (
        <div className="admin-modal-overlay" onClick={() => setShowLogoutConfirm(false)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-title">🚪 Confirm Logout</div>
            <div className="admin-modal-msg">Are you sure you want to log out of the admin panel?</div>
            <div className="admin-modal-actions">
              <button className="admin-btn admin-btn-ghost" onClick={() => setShowLogoutConfirm(false)}>Cancel</button>
              <button className="admin-btn admin-btn-danger" onClick={handleLogout}>Logout</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Detail Modal ── */}
      {renderDetailModal()}

      {/* ── Toast ── */}
      {toast && (
        <div className={`admin-toast ${toast.type}`}>
          {toast.type === "success" ? "✅" : toast.type === "error" ? "❌" : "ℹ️"} {toast.message}
        </div>
      )}
    </div>
  );
}
