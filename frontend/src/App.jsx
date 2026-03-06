import React from "react";
import { Routes, Route } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import Interface from "./pages/interface"; // splash screen
import LoginRegister from "./pages/login-register"; // choose doctor/patient
import PatientLogin from "./pages/p_login";
import PatientRegistration from "./pages/p_registration"; // patient registration
import DoctorLogin from "./pages/doctor_login";
import DoctorRegistration from "./pages/doctor_registration";
import PatientDashboard from "./pages/patient-dashboard";
import DoctorDashboard from "./pages/doctor-dashboard";
import PatientAppointment from "./pages/patient-appointment";
import DoctorAppointmentPage from "./pages/doctor-appointment";
import PatientProfile from "./pages/patient_profile";
import PatientInformation from "./pages/patient_info";
import DoctorProfile from "./pages/doctor_profile";
import DoctorPatientRecords from "./pages/doctor-patient-records";
import ForgotPassword from "./pages/forgot-password";
import ResetPassword from "./pages/reset-password";
import ChatBot from "./pages/ChatBot";
import MedicalHistory from "./pages/medical-history";
import AdminLogin from "./pages/admin-login";
import AdminDashboard from "./pages/admin-dashboard";

function App() {
  return (
    <>
      <Routes>
        {/* Splash Screen */}
        <Route path="/" element={<Interface />} />

        {/* Choose login/register */}
        <Route path="/login-register" element={<LoginRegister />} />

        {/* Auth pages (public) */}
        <Route path="/patient-login" element={<PatientLogin />} />
        <Route path="/patient-register" element={<PatientRegistration />} />
        <Route path="/doctor-login" element={<DoctorLogin />} />
        <Route path="/doctor-register" element={<DoctorRegistration />} />
        <Route path="/admin-login" element={<AdminLogin />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Patient pages (protected) */}
        <Route path="/patient-dashboard" element={
          <ProtectedRoute allowedRoles={["patient"]}>
            <PatientDashboard />
          </ProtectedRoute>
        } />
        <Route path="/patient-appointment" element={
          <ProtectedRoute allowedRoles={["patient"]}>
            <PatientAppointment />
          </ProtectedRoute>
        } />
        <Route path="/patient_profile" element={
          <ProtectedRoute allowedRoles={["patient"]}>
            <PatientProfile />
          </ProtectedRoute>
        } />
        <Route path="/patient_info" element={
          <ProtectedRoute allowedRoles={["patient"]}>
            <PatientInformation />
          </ProtectedRoute>
        } />
        <Route path="/medical-history" element={
          <ProtectedRoute allowedRoles={["patient", "doctor"]}>
            <MedicalHistory />
          </ProtectedRoute>
        } />

        {/* Doctor pages (protected) */}
        <Route path="/doctor-dashboard" element={
          <ProtectedRoute allowedRoles={["doctor"]}>
            <DoctorDashboard />
          </ProtectedRoute>
        } />
        <Route path="/doctor-appointment" element={
          <ProtectedRoute allowedRoles={["doctor"]}>
            <DoctorAppointmentPage />
          </ProtectedRoute>
        } />
        <Route path="/doctor-profile" element={
          <ProtectedRoute allowedRoles={["doctor"]}>
            <DoctorProfile />
          </ProtectedRoute>
        } />
        <Route path="/doctor-patient-records" element={
          <ProtectedRoute allowedRoles={["doctor"]}>
            <DoctorPatientRecords />
          </ProtectedRoute>
        } />

        {/* Admin pages (protected) */}
        <Route path="/admin-dashboard" element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <AdminDashboard />
          </ProtectedRoute>
        } />
      </Routes>
      <ChatBot />
    </>
  );
}

export default App;
