import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "./medical-history.css";
import "./patient-dashboard.css";
import logo from "../assets/health-sync-logo.svg";

import { API } from "../config";

const RECORD_TYPES = ["All", "Lab Report", "Prescription", "Scan / X-Ray", "Discharge Summary", "Insurance", "Other"];

const TYPE_BADGE_CLASS = {
  "Lab Report":        "mh-type-badge mh-type-badge--lab",
  "Prescription":      "mh-type-badge mh-type-badge--rx",
  "Scan / X-Ray":      "mh-type-badge mh-type-badge--scan",
  "Discharge Summary": "mh-type-badge mh-type-badge--discharge",
  "Insurance":         "mh-type-badge mh-type-badge--insurance",
  "Other":             "mh-type-badge",
};

const NAV = [
  { label: "Dashboard",       icon: "🏠", key: "dashboard" },
  { label: "Appointments",    icon: "📅", key: "appointments" },
  { label: "Medical History",  icon: "📋", key: "history" },
  { label: "My Profile",      icon: "👤", key: "profile" },
];

export default function MedicalHistory() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadType, setUploadType] = useState("Other");
  const [filterType, setFilterType] = useState("All");
  const [sortBy, setSortBy] = useState("date-desc");
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const getToken = () => localStorage.getItem("token");

  const userName = (() => {
    try { return JSON.parse(localStorage.getItem("user"))?.name || ""; } catch { return ""; }
  })();

  // ── Fetch records ──
  const fetchRecords = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterType !== "All") params.set("type", filterType);
      if (sortBy === "date-asc")  { params.set("sort", "date"); params.set("order", "asc"); }
      if (sortBy === "date-desc") { params.set("sort", "date"); params.set("order", "desc"); }
      if (sortBy === "name-asc")  { params.set("sort", "name"); params.set("order", "asc"); }
      if (sortBy === "name-desc") { params.set("sort", "name"); params.set("order", "desc"); }

      const res = await fetch(`${API}/api/records?${params.toString()}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (res.ok) setRecords(data.data);
    } catch (err) { console.error("Failed to fetch records:", err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchRecords(); }, [filterType, sortBy]);

  // ── Upload ──
  const handleUpload = async () => {
    if (!selectedFile) { setError("Please choose a file first."); return; }
    setUploading(true); setError("");
    try {
      const fd = new FormData();
      fd.append("file", selectedFile);
      fd.append("recordType", uploadType);
      const res = await fetch(`${API}/api/records/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}` },
        body: fd,
      });
      const data = await res.json();
      if (res.ok) {
        setRecords(prev => [data.data, ...prev]);
        setSelectedFile(null);
        setSuccessMsg("Record uploaded successfully!");
        setTimeout(() => setSuccessMsg(""), 2500);
      } else { setError(data.message || "Upload failed."); }
    } catch { setError("Server error. Please try again."); }
    finally { setUploading(false); }
  };

  // ── Delete ──
  const handleDelete = async (id) => {
    try {
      const res = await fetch(`${API}/api/records/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.ok) setRecords(prev => prev.filter(r => r._id !== id));
    } catch (err) { console.error("Delete failed:", err); }
  };

  // ── Download (opens Cloudinary URL and triggers download) ──
  const handleDownload = (record) => {
    // For Cloudinary, change /upload/ to /upload/fl_attachment/ to force download
    let url = record.fileUrl;
    if (url.includes("/upload/")) {
      url = url.replace("/upload/", "/upload/fl_attachment/");
    }
    const a = document.createElement("a");
    a.href = url;
    a.download = record.fileName;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // ── Print ──
  const handlePrint = (record) => {
    const win = window.open(record.fileUrl, "_blank");
    if (win) {
      win.addEventListener("load", () => { win.print(); });
    }
  };

  // ── Nav ──
  const handleNavClick = (key) => {
    if (key === "dashboard") navigate("/patient-dashboard");
    else if (key === "appointments") navigate("/patient-appointment");
    else if (key === "history") { /* already here */ }
    else if (key === "profile") navigate("/patient_profile");
  };

  // ── Search filter (client-side) ──
  const filtered = records.filter(r =>
    r.fileName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // ── Stats ──
  const typeCounts = {};
  records.forEach(r => { typeCounts[r.recordType || "Other"] = (typeCounts[r.recordType || "Other"] || 0) + 1; });

  const fmtDate = (d) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

  return (
    <div className="db-page">

      {/* ── Mobile header ── */}
      <div className="db-mobile-header">
        <button onClick={() => navigate("/patient-dashboard")} style={{ position:"absolute", top:14, left:14, width:34, height:34, borderRadius:"50%", background:"rgba(255,255,255,0.18)", border:"none", color:"#fff", fontSize:15, cursor:"pointer" }}>←</button>
        <img src={logo} alt="HealthSync" className="db-mobile-logo" />
        <h1 className="db-mobile-brand">HEALTHSYNC</h1>
        <p className="db-mobile-greeting">Medical History</p>
        <p className="db-mobile-subtitle">View, sort & manage your health records</p>
      </div>

      {/* ── Sidebar (desktop) ── */}
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
          {NAV.map(item => (
            <button key={item.key}
              className={`db-nav-btn${item.key === "history" ? " db-nav-btn--active" : ""}`}
              onClick={() => handleNavClick(item.key)}>
              <span className="db-nav-icon">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* ── Main content ── */}
      <div className="db-main">
        <div className="db-topbar">
          <div>
            <div className="db-topbar-title">Medical History 📋</div>
            <div className="db-topbar-subtitle">View, sort & manage all your health records</div>
          </div>
          <div className="db-topbar-badge"><span>🩺</span> Patient Portal</div>
        </div>

        <div className="db-content" style={{ padding: "24px 28px" }}>

          {/* ── Stats ── */}
          <div className="mh-stats">
            <div className="mh-stat">
              <span className="mh-stat-icon">📄</span>
              <div>
                <div className="mh-stat-num">{records.length}</div>
                <div className="mh-stat-label">Total Records</div>
              </div>
            </div>
            {Object.entries(typeCounts).map(([type, count]) => (
              <div className="mh-stat" key={type}>
                <span className="mh-stat-icon">{type === "Lab Report" ? "🧪" : type === "Prescription" ? "💊" : type === "Scan / X-Ray" ? "🩻" : type === "Discharge Summary" ? "🏥" : type === "Insurance" ? "🛡️" : "📎"}</span>
                <div>
                  <div className="mh-stat-num">{count}</div>
                  <div className="mh-stat-label">{type}</div>
                </div>
              </div>
            ))}
          </div>

          {/* ── Upload bar ── */}
          <div className="mh-upload-bar">
            <input type="file" accept=".jpg,.jpeg,.png,.pdf" ref={fileInputRef} onChange={e => { setSelectedFile(e.target.files[0]); setError(""); }} style={{ display: "none" }} />
            <button className="mh-upload-btn" onClick={() => fileInputRef.current?.click()}>📎 Choose File</button>
            {selectedFile && <span className="mh-upload-filename">{selectedFile.name}</span>}
            <select value={uploadType} onChange={e => setUploadType(e.target.value)}>
              {RECORD_TYPES.filter(t => t !== "All").map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            {selectedFile && (
              <button className="mh-upload-btn" onClick={handleUpload} disabled={uploading}>
                {uploading ? "Uploading…" : "⬆ Upload"}
              </button>
            )}
          </div>
          {error && <p style={{ color: "#dc2626", fontSize: "0.82rem", margin: "0 0 10px" }}>{error}</p>}
          {successMsg && <p style={{ color: "#059669", fontSize: "0.82rem", margin: "0 0 10px" }}>✅ {successMsg}</p>}

          {/* ── Toolbar ── */}
          <div className="mh-toolbar">
            <select value={filterType} onChange={e => setFilterType(e.target.value)}>
              {RECORD_TYPES.map(t => <option key={t} value={t}>{t === "All" ? "All Types" : t}</option>)}
            </select>
            <select value={sortBy} onChange={e => setSortBy(e.target.value)}>
              <option value="date-desc">Newest First</option>
              <option value="date-asc">Oldest First</option>
              <option value="name-asc">Name A–Z</option>
              <option value="name-desc">Name Z–A</option>
            </select>
            <input type="text" placeholder="🔍 Search by filename…" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>

          {/* ── Records table (desktop) ── */}
          {loading ? (
            <div className="mh-empty"><span className="mh-empty-icon">⏳</span>Loading records…</div>
          ) : filtered.length === 0 ? (
            <div className="mh-empty">
              <span className="mh-empty-icon">📭</span>
              {records.length === 0 ? "No records uploaded yet. Use the upload bar above to get started!" : "No records match your filter."}
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="mh-table-wrap">
                <table className="mh-table">
                  <thead>
                    <tr>
                      <th>File Name</th>
                      <th>Type</th>
                      <th>Date Uploaded</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(record => (
                      <tr key={record._id}>
                        <td>
                          <a href={record.fileUrl} target="_blank" rel="noopener noreferrer" className="mh-file-link">
                            📄 {record.fileName}
                          </a>
                        </td>
                        <td>
                          <span className={TYPE_BADGE_CLASS[record.recordType] || "mh-type-badge"}>
                            {record.recordType || "Other"}
                          </span>
                        </td>
                        <td>{fmtDate(record.createdAt)}</td>
                        <td>
                          <div className="mh-actions">
                            <button className="mh-action-btn" onClick={() => handleDownload(record)} title="Download">⬇ Download</button>
                            <button className="mh-action-btn" onClick={() => handlePrint(record)} title="Print">🖨 Print</button>
                            <button className="mh-action-btn mh-action-btn--danger" onClick={() => handleDelete(record._id)} title="Delete">✕</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="mh-cards">
                {filtered.map((record, i) => (
                  <div key={record._id} className="mh-card" style={{ animationDelay: `${i * 0.05}s` }}>
                    <div className="mh-card-top">
                      <span className="mh-card-icon">📄</span>
                      <span className="mh-card-name">{record.fileName}</span>
                    </div>
                    <div className="mh-card-meta">
                      <span className={TYPE_BADGE_CLASS[record.recordType] || "mh-type-badge"}>{record.recordType || "Other"}</span>
                      <span>{fmtDate(record.createdAt)}</span>
                    </div>
                    <div className="mh-card-actions">
                      <button className="mh-action-btn" onClick={() => handleDownload(record)}>⬇ Download</button>
                      <button className="mh-action-btn" onClick={() => handlePrint(record)}>🖨 Print</button>
                      <a href={record.fileUrl} target="_blank" rel="noopener noreferrer" className="mh-action-btn">👁 View</a>
                      <button className="mh-action-btn mh-action-btn--danger" onClick={() => handleDelete(record._id)}>✕ Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
