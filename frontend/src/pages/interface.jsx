import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import healthSyncLogo from "../assets/health-sync-logo.svg";

const Interface = () => {
  const navigate = useNavigate();
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Animate progress bar over 3 seconds
    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) { clearInterval(interval); return 100; }
        return p + 2;
      });
    }, 60);

    const timer = setTimeout(() => navigate("/login-register"), 3200);
    return () => { clearTimeout(timer); clearInterval(interval); };
  }, [navigate]);

  return (
    <main
      style={{
        minHeight: "100vh",
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #027346 0%, #013d25 60%, #011f14 100%)",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* Background decorative circles */}
      <div style={{
        position: "absolute", width: 500, height: 500,
        borderRadius: "50%", border: "1px solid rgba(255,255,255,0.06)",
        top: "50%", left: "50%", transform: "translate(-50%,-50%)",
        pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute", width: 340, height: 340,
        borderRadius: "50%", border: "1px solid rgba(255,255,255,0.08)",
        top: "50%", left: "50%", transform: "translate(-50%,-50%)",
        pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute", width: 180, height: 180,
        borderRadius: "50%", background: "rgba(255,255,255,0.04)",
        top: "50%", left: "50%", transform: "translate(-50%,-50%)",
        pointerEvents: "none",
      }} />

      {/* Top-right decorative blob */}
      <div style={{
        position: "absolute", top: -80, right: -80,
        width: 280, height: 280, borderRadius: "50%",
        background: "rgba(3,150,88,0.25)", filter: "blur(60px)",
        pointerEvents: "none",
      }} />
      {/* Bottom-left blob */}
      <div style={{
        position: "absolute", bottom: -60, left: -60,
        width: 220, height: 220, borderRadius: "50%",
        background: "rgba(1,92,56,0.35)", filter: "blur(50px)",
        pointerEvents: "none",
      }} />

      {/* Content */}
      <section style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", zIndex: 1, padding: "0 24px" }}>
        {/* Logo with pulse */}
        <div style={{ animation: "pulse 2.5s ease-in-out infinite", marginBottom: 28 }}>
          <img
            src={healthSyncLogo}
            alt="HealthSync logo"
            style={{ width: 100, height: 100, filter: "drop-shadow(0 4px 20px rgba(0,0,0,0.3))" }}
          />
        </div>

        {/* Brand name — slide up */}
        <h1
          style={{
            color: "#ffffff",
            fontSize: "clamp(2rem, 6vw, 3.2rem)",
            fontWeight: 900,
            letterSpacing: "0.12em",
            margin: "0 0 10px",
            animation: "slideUp 0.7s ease 0.2s both",
          }}
        >
          HEALTHSYNC
        </h1>

        {/* Tagline */}
        <p
          style={{
            color: "rgba(255,255,255,0.7)",
            fontSize: "clamp(0.95rem, 2.5vw, 1.15rem)",
            fontWeight: 400,
            letterSpacing: "0.06em",
            margin: "0 0 48px",
            animation: "slideUp 0.7s ease 0.4s both",
          }}
        >
          Click. Book. Heal.
        </p>

        {/* Progress bar */}
        <div
          style={{
            width: "clamp(160px, 40vw, 220px)",
            height: 4,
            background: "rgba(255,255,255,0.15)",
            borderRadius: 4,
            overflow: "hidden",
            animation: "fadeIn 0.5s ease 0.6s both",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${progress}%`,
              background: "rgba(255,255,255,0.85)",
              borderRadius: 4,
              transition: "width 0.06s linear",
              boxShadow: "0 0 8px rgba(255,255,255,0.6)",
            }}
          />
        </div>
      </section>
    </main>
  );
};

export default Interface;
