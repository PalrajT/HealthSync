import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import healthSyncLogo from "../assets/health-sync-logo.svg";
import "./doctor_registration.css";
import { API } from "../config";

const DoctorRegistration = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    firstName: "", lastName: "", email: "", phone: "",
    password: "", confirmPassword: "", specialization: "",
    licenseNumber: "", experience: "", consultationFee: "", clinicAddress: "", gender: "", agreeToTerms: false,
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (!formData.agreeToTerms) {
      setError("You must agree to the terms & conditions.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/doctor-auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (res.ok) {
        navigate("/doctor-login");
      } else {
        setError(data.message || "Registration failed. Please try again.");
      }
    } catch {
      setError("Server error. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const specializations = [
    "General Practitioner","Cardiologist","Dermatologist","Neurologist",
    "Orthopedic","Pediatrician","Psychiatrist","Radiologist","Surgeon","Other",
  ];

  return (
    <div style={{ minHeight:"100vh", display:"flex", background:"#f0f4f8" }}>

      {/* ── Left panel (desktop) ── */}
      <div className="dreg-left">
        <div className="dreg-deco-ring dreg-ring-lg" />
        <div className="dreg-deco-ring dreg-ring-md" />
        <div className="dreg-deco-blob dreg-blob-tr" />
        <div className="dreg-deco-blob dreg-blob-bl" />
        <img src={healthSyncLogo} alt="HealthSync" className="dreg-left-logo" />
        <h1 className="dreg-left-brand">HEALTHSYNC</h1>
        <p className="dreg-left-tagline">Join our network of trusted healthcare professionals.</p>
        <div className="dreg-left-steps">
          {["Register with your credentials","Get verified by our team","Start managing patients"].map((s,i)=>(
            <div key={i} className="dreg-step-row">
              <div className="dreg-step-num">{i+1}</div>
              <span>{s}</span>
            </div>
          ))}
        </div>
        <div className="dreg-badge">
          <span>🏥</span>
          <span>Licensed Professionals Only</span>
        </div>
      </div>

      {/* ── Right panel ── */}
      <div className="dreg-right">

        {/* Mobile header */}
        <div className="dreg-mobile-header">
          <button type="button" onClick={() => navigate("/login-register")} className="dreg-back-btn">←</button>
          <img src={healthSyncLogo} alt="HealthSync" style={{ width:52, height:52, marginBottom:6 }} />
          <h1 style={{ color:"#fff", fontSize:"1.1rem", fontWeight:900, letterSpacing:"0.1em", margin:0 }}>HEALTHSYNC</h1>
        </div>

        <div className="dreg-form-wrap">
          <button type="button" onClick={() => navigate("/doctor-login")} className="dreg-desktop-back">← Back to Login</button>

          <h2 className="dreg-title">Doctor Registration</h2>
          <p className="dreg-subtitle">Register with your professional credentials</p>

          <form onSubmit={handleSubmit} className="dreg-form">

            {/* Name row */}
            <div className="dreg-row">
              <div className="dreg-field">
                <label className="dreg-label">First Name</label>
                <input name="firstName" type="text" value={formData.firstName} onChange={handleChange}
                  placeholder="John" required className="dreg-input" />
              </div>
              <div className="dreg-field">
                <label className="dreg-label">Last Name</label>
                <input name="lastName" type="text" value={formData.lastName} onChange={handleChange}
                  placeholder="Smith" required className="dreg-input" />
              </div>
            </div>

            {/* Email + Phone */}
            <div className="dreg-row">
              <div className="dreg-field">
                <label className="dreg-label">Email</label>
                <input name="email" type="email" value={formData.email} onChange={handleChange}
                  placeholder="doctor@hospital.com" required className="dreg-input" />
              </div>
              <div className="dreg-field">
                <label className="dreg-label">Phone</label>
                <input name="phone" type="tel" value={formData.phone} onChange={handleChange}
                  placeholder="+1 234 567 8900" required className="dreg-input" />
              </div>
            </div>

            {/* Specialization + License */}
            <div className="dreg-row">
              <div className="dreg-field">
                <label className="dreg-label">Specialization</label>
                <select name="specialization" value={formData.specialization} onChange={handleChange} required className="dreg-input">
                  <option value="">Select specialization</option>
                  {specializations.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="dreg-field">
                <label className="dreg-label">License / UID Number</label>
                <input name="licenseNumber" type="text" value={formData.licenseNumber} onChange={handleChange}
                  placeholder="LIC-XXXXXXXX" required className="dreg-input" />
              </div>
            </div>

            {/* Experience + Consultation Fee */}
            <div className="dreg-row">
              <div className="dreg-field">
                <label className="dreg-label">Years of Experience</label>
                <input name="experience" type="number" min="0" max="60" value={formData.experience} onChange={handleChange}
                  placeholder="e.g. 5" required className="dreg-input" />
              </div>
              <div className="dreg-field">
                <label className="dreg-label">Consultation Fee (₹)</label>
                <input name="consultationFee" type="number" min="0" value={formData.consultationFee} onChange={handleChange}
                  placeholder="e.g. 500" required className="dreg-input" />
              </div>
            </div>

            {/* Gender + Clinic */}
            <div className="dreg-row">
              <div className="dreg-field">
                <label className="dreg-label">Gender</label>
                <select name="gender" value={formData.gender} onChange={handleChange} required className="dreg-input">
                  <option value="">Select gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="dreg-field">
                <label className="dreg-label">Clinic / Hospital</label>
                <input name="clinicAddress" type="text" value={formData.clinicAddress} onChange={handleChange}
                  placeholder="City General Hospital" required className="dreg-input" />
              </div>
            </div>

            {/* Password */}
            <div className="dreg-row">
              <div className="dreg-field">
                <label className="dreg-label">Password</label>
                <input name="password" type="password" value={formData.password} onChange={handleChange}
                  placeholder="Min 8 characters" required className="dreg-input" />
              </div>
              <div className="dreg-field">
                <label className="dreg-label">Confirm Password</label>
                <input name="confirmPassword" type="password" value={formData.confirmPassword} onChange={handleChange}
                  placeholder="Repeat password" required className="dreg-input" />
              </div>
            </div>

            <label className="dreg-terms">
              <input type="checkbox" name="agreeToTerms" checked={formData.agreeToTerms} onChange={handleChange}
                style={{ width:15, height:15, accentColor:"#027346", cursor:"pointer", flexShrink:0 }} />
              <span>I agree to the <span style={{ color:"#027346", fontWeight:600 }}>terms &amp; conditions</span></span>
            </label>

            {error && <div className="dreg-error">{error}</div>}

            <button type="submit" disabled={loading} className="dreg-submit">
              {loading ? <span className="dreg-spinner" /> : null}
              {loading ? "Registering..." : "Register as Doctor"}
            </button>

            <p className="dreg-footer">
              Already have an account?{" "}
              <Link to="/doctor-login" className="dreg-link">Sign in</Link>
            </p>
          </form>
        </div>
      </div>


    </div>
  );
};

export default DoctorRegistration;
