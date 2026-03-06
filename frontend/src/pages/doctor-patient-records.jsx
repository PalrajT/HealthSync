import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./patient-dashboard.css";
import logo from "../assets/health-sync-logo.svg";
import { API } from "../config";

const getToken = () => localStorage.getItem("token");

export default function DoctorPatientRecords() {
  const navigate = useNavigate();
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [records, setRecords] = useState([]);
  const [patientInfo, setPatientInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  /* ── Fetch the doctor's patient list ── */
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API}/api/doctor/patients`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        const data = await res.json();
        if (data.success) setPatients(data.data);
        else setError(data.message || "Failed to load patients.");
      } catch {
        setError("Network error while loading patients.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /* ── Fetch records for a selected patient ── */
  const fetchRecords = async (patientId) => {
    try {
      setLoading(true);
      setError("");
      const res = await fetch(`${API}/api/records/patient/${patientId}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (data.success) {
        setRecords(data.data.records);
        setPatientInfo(data.data.patient);
      } else {
        setRecords([]);
        setPatientInfo(null);
        setError(data.message || "Failed to load records.");
      }
    } catch {
      setError("Network error while loading records.");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPatient = (p) => {
    setSelectedPatient(p._id);
    fetchRecords(p._id);
  };

  return (
    <div className="db-container">
      {/* ── Sidebar ── */}
      <aside className="db-sidebar">
        <div className="db-sidebar-logo-row">
          <img src={logo} alt="HealthSync" className="db-sidebar-logo" />
          <span className="db-sidebar-title">HealthSync</span>
        </div>
        <nav className="db-sidebar-nav">
          <button className="db-sidebar-btn" onClick={() => navigate("/doctor-dashboard")}>⬅️ Back to Dashboard</button>
        </nav>
      </aside>

      {/* ── Main ── */}
      <main className="db-main" style={{ padding: "2rem" }}>
        <h2 style={{ marginBottom: "1.5rem" }}>Patient Records</h2>

        {error && <p style={{ color: "#e74c3c" }}>{error}</p>}
        {loading && <p>Loading…</p>}

        {/* Patient list */}
        {!selectedPatient && (
          <>
            <p style={{ marginBottom: "1rem", color: "#888" }}>
              Select a patient to view their medical records.
            </p>
            {patients.length === 0 && !loading && (
              <p>No patients found. You need accepted or completed appointments to see patients here.</p>
            )}
            <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))" }}>
              {patients.map((p) => (
                <div
                  key={p._id}
                  onClick={() => handleSelectPatient(p)}
                  style={{
                    border: "1px solid #e0e0e0",
                    borderRadius: 12,
                    padding: "1.2rem",
                    cursor: "pointer",
                    background: "#fff",
                    transition: "box-shadow .2s",
                    boxShadow: "0 1px 4px rgba(0,0,0,.06)",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,.12)")}
                  onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,.06)")}
                >
                  <strong>{p.name}</strong>
                  <div style={{ color: "#666", fontSize: 14, marginTop: 4 }}>{p.email}</div>
                  {p.phone && <div style={{ color: "#666", fontSize: 14 }}>📞 {p.phone}</div>}
                  {p.gender && <div style={{ color: "#666", fontSize: 14 }}>Gender: {p.gender}</div>}
                  {p.bloodGroup && <div style={{ color: "#666", fontSize: 14 }}>Blood: {p.bloodGroup}</div>}
                </div>
              ))}
            </div>
          </>
        )}

        {/* Records view for selected patient */}
        {selectedPatient && (
          <>
            <button
              onClick={() => { setSelectedPatient(null); setRecords([]); setPatientInfo(null); setError(""); }}
              style={{
                marginBottom: "1rem",
                background: "none",
                border: "none",
                color: "#4f8cff",
                cursor: "pointer",
                fontSize: 15,
              }}
            >
              ⬅ Back to patient list
            </button>

            {patientInfo && (
              <div style={{ marginBottom: "1.5rem", padding: "1rem", background: "#f7f8fc", borderRadius: 10 }}>
                <h3 style={{ margin: 0 }}>{patientInfo.name}</h3>
                <span style={{ color: "#666", fontSize: 14 }}>
                  {patientInfo.email}
                  {patientInfo.age ? ` · Age ${patientInfo.age}` : ""}
                  {patientInfo.gender ? ` · ${patientInfo.gender}` : ""}
                  {patientInfo.bloodGroup ? ` · ${patientInfo.bloodGroup}` : ""}
                </span>
                {patientInfo.chronicConditions && (
                  <div style={{ marginTop: 6, fontSize: 13, color: "#888" }}>
                    Chronic conditions: {patientInfo.chronicConditions}
                  </div>
                )}
              </div>
            )}

            {records.length === 0 && !loading && (
              <p style={{ color: "#888" }}>No medical records found for this patient.</p>
            )}

            <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))" }}>
              {records.map((r) => (
                <div
                  key={r._id}
                  style={{
                    border: "1px solid #e0e0e0",
                    borderRadius: 10,
                    padding: "1rem",
                    background: "#fff",
                    boxShadow: "0 1px 4px rgba(0,0,0,.06)",
                  }}
                >
                  <div style={{ fontWeight: 600 }}>{r.fileName || "Untitled"}</div>
                  {r.recordType && <div style={{ fontSize: 13, color: "#4f8cff" }}>{r.recordType}</div>}
                  <div style={{ fontSize: 12, color: "#999", marginTop: 4 }}>
                    {new Date(r.createdAt).toLocaleDateString()}
                  </div>
                  {r.fileUrl && (
                    <a
                      href={r.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: 13, color: "#4f8cff", marginTop: 6, display: "inline-block" }}
                    >
                      View / Download
                    </a>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
