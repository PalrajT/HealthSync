import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import healthSyncLogo from "../assets/health-sync-logo.svg";
import "./p_registration.css";
import { API } from "../config";

const PatientRegistration = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "", email: "", phone: "", password: "", confirmPassword: "",
    dateOfBirth: "", gender: "", bloodGroup: "", address: "", agreeToTerms: false,
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
      // Calculate age from dateOfBirth
      let age;
      if (formData.dateOfBirth) {
        const dob = new Date(formData.dateOfBirth);
        const today = new Date();
        age = today.getFullYear() - dob.getFullYear();
        const m = today.getMonth() - dob.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
      }

      const { confirmPassword, agreeToTerms, dateOfBirth, address, ...rest } = formData;
      const payload = { ...rest, age };

      const res = await fetch(`${API}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        navigate("/patient-login");
      } else {
        setError(data.message || "Registration failed. Please try again.");
      }
    } catch {
      setError("Server error. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight:"100vh", display:"flex", background:"#f0f4f8" }}>

      {/* ── Left panel (desktop) ── */}
      <div className="reg-left">
        <div className="reg-deco-ring reg-ring-lg" />
        <div className="reg-deco-ring reg-ring-md" />
        <div className="reg-deco-blob reg-blob-tr" />
        <div className="reg-deco-blob reg-blob-bl" />
        <img src={healthSyncLogo} alt="HealthSync" className="reg-left-logo" />
        <h1 className="reg-left-brand">HEALTHSYNC</h1>
        <p className="reg-left-tagline">Join thousands of patients managing their health smarter.</p>
        <div className="reg-left-steps">
          {["Fill in your details","Verify your account","Book your first appointment"].map((s,i)=>(
            <div key={i} className="reg-step-row">
              <div className="reg-step-num">{i+1}</div>
              <span>{s}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right scroll panel ── */}
      <div className="reg-right">

        {/* Mobile header */}
        <div className="reg-mobile-header">
          <button type="button" onClick={() => navigate("/login-register")} className="reg-back-btn">←</button>
          <img src={healthSyncLogo} alt="HealthSync" style={{ width:52, height:52, marginBottom:6 }} />
          <h1 style={{ color:"#fff", fontSize:"1.1rem", fontWeight:900, letterSpacing:"0.1em", margin:0 }}>HEALTHSYNC</h1>
        </div>

        <div className="reg-form-wrap">
          <button type="button" onClick={() => navigate("/patient-login")} className="reg-desktop-back">← Back to Login</button>

          <h2 className="reg-title">Create Patient Account</h2>
          <p className="reg-subtitle">Fill in your details to get started</p>

          <form onSubmit={handleSubmit} className="reg-form">
            <div className="reg-field">
              <label className="reg-label">Full Name</label>
              <input name="name" type="text" value={formData.name} onChange={handleChange}
                placeholder="John Doe" required className="reg-input" />
            </div>

            <div className="reg-row">
              <div className="reg-field">
                <label className="reg-label">Email</label>
                <input name="email" type="email" value={formData.email} onChange={handleChange}
                  placeholder="john@example.com" required className="reg-input" />
              </div>
              <div className="reg-field">
                <label className="reg-label">Phone</label>
                <input name="phone" type="tel" value={formData.phone} onChange={handleChange}
                  placeholder="+1 234 567 8900" required className="reg-input" />
              </div>
            </div>

            <div className="reg-row">
              <div className="reg-field">
                <label className="reg-label">Date of Birth</label>
                <input name="dateOfBirth" type="date" value={formData.dateOfBirth} onChange={handleChange}
                  required className="reg-input" />
              </div>
              <div className="reg-field">
                <label className="reg-label">Gender</label>
                <select name="gender" value={formData.gender} onChange={handleChange} required className="reg-input">
                  <option value="">Select gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div className="reg-field">
              <label className="reg-label">Blood Group</label>
              <select name="bloodGroup" value={formData.bloodGroup} onChange={handleChange} required className="reg-input">
                <option value="">Select blood group</option>
                {["A+","A-","B+","B-","AB+","AB-","O+","O-"].map(bg => (
                  <option key={bg} value={bg}>{bg}</option>
                ))}
              </select>
            </div>

            <div className="reg-field">
              <label className="reg-label">Address</label>
              <input name="address" type="text" value={formData.address} onChange={handleChange}
                placeholder="123 Main St, City" required className="reg-input" />
            </div>

            <div className="reg-row">
              <div className="reg-field">
                <label className="reg-label">Password</label>
                <input name="password" type="password" value={formData.password} onChange={handleChange}
                  placeholder="Min 8 characters" required className="reg-input" />
              </div>
              <div className="reg-field">
                <label className="reg-label">Confirm Password</label>
                <input name="confirmPassword" type="password" value={formData.confirmPassword} onChange={handleChange}
                  placeholder="Repeat password" required className="reg-input" />
              </div>
            </div>

            <label className="reg-terms">
              <input type="checkbox" name="agreeToTerms" checked={formData.agreeToTerms} onChange={handleChange}
                style={{ width:15, height:15, accentColor:"#027346", cursor:"pointer", flexShrink:0 }} />
              <span>I agree to the <span style={{ color:"#027346", fontWeight:600 }}>terms &amp; conditions</span></span>
            </label>

            {error && <div className="reg-error">{error}</div>}

            <button type="submit" disabled={loading} className="reg-submit">
              {loading ? <span className="reg-spinner" /> : null}
              {loading ? "Creating account..." : "Create Account"}
            </button>

            <p className="reg-footer">
              Already have an account?{" "}
              <Link to="/patient-login" className="reg-link">Sign in</Link>
            </p>
          </form>
        </div>
      </div>


    </div>
  );
};

export default PatientRegistration;
