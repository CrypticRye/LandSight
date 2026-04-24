import { useState, useEffect } from "react";
import { api } from "../utils/api";
import "./Header.css";

export default function Header({ activeTab, setActiveTab, theme, toggleTheme }) {
  const [health, setHealth] = useState("checking"); // "ok" | "error" | "checking"

  useEffect(() => {
    const check = () =>
      api.health()
        .then(() => setHealth("ok"))
        .catch(() => setHealth("error"));
    check();
    const id = setInterval(check, 30000);
    return () => clearInterval(id);
  }, []);

  return (
    <header className="header">
      <div className="header-logo">
        <div className="logo-icon">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
        </div>
        <div className="logo-text">
          <span className="logo-title">LandSight</span>
          <span className="logo-subtitle">Land Classification &amp; Change Detection</span>
        </div>
      </div>

      <nav className="header-nav">
        <button
          className={`nav-tab ${activeTab === "classification" ? "active" : ""}`}
          onClick={() => setActiveTab("classification")}
          id="nav-classify"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
          </svg>
          Classification
        </button>
        <button
          className={`nav-tab ${activeTab === "change" ? "active" : ""}`}
          onClick={() => setActiveTab("change")}
          id="nav-change"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 014-4h14"/>
            <path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 01-4 4H3"/>
          </svg>
          Change Detection
        </button>
        <button
          className={`nav-tab ${activeTab === "dashboard" ? "active" : ""}`}
          onClick={() => setActiveTab("dashboard")}
          id="nav-dashboard"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="2" y="2" width="9" height="9" rx="1"/><rect x="13" y="2" width="9" height="9" rx="1"/>
            <rect x="2" y="13" width="9" height="9" rx="1"/><rect x="13" y="13" width="9" height="9" rx="1"/>
          </svg>
          Dashboard
        </button>
      </nav>

      <div className="header-right">
        {/* API health dot */}
        <div
          className={`health-dot ${health}`}
          title={health === "ok" ? "Backend online" : health === "error" ? "Backend offline" : "Checking…"}
          id="header-health-dot"
        >
          <span className="health-ring" />
          <span className="health-core" />
          <span className="health-label">
            {health === "ok" ? "Online" : health === "error" ? "Offline" : "…"}
          </span>
        </div>

        {/* Theme toggle */}
        <button
          className="theme-toggle-btn"
          onClick={toggleTheme}
          id="header-theme-toggle"
          title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
        >
          {theme === "dark" ? (
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="5"/>
              <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
            </svg>
          ) : (
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
            </svg>
          )}
        </button>
      </div>
    </header>
  );
}