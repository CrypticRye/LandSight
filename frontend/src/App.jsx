import { useState, useCallback } from "react";
import Header from "./components/Header";
import LandClassification from "./components/LandClassification";
import LandChangeDetection from "./components/LandChangeDetection";
import Dashboard from "./components/Dashboard";
import Onboarding from "./components/Onboarding";
import ModelWarmup from "./components/ModelWarmup";
import ToastContainer from "./components/Toast";
import { useTheme } from "./hooks/useTheme";
import "./App.css";

export default function App() {
  const [activeTab,    setActiveTab]    = useState("classification");
  const [modelReady,   setModelReady]   = useState(false);
  const { theme, toggle } = useTheme();

  // Read ?id=<n> from URL on first load → switch to classification tab
  // The LandClassification component handles displaying the record.
  const initialRecordId = (() => {
    try {
      const p = new URLSearchParams(window.location.search);
      const v = parseInt(p.get("id"), 10);
      return isNaN(v) ? null : v;
    } catch {
      return null;
    }
  })();

  const handleModelReady = useCallback(() => setModelReady(true), []);

  return (
    <div className="app">
      {/* Model warm-up overlay — polls /api/ready until ML model is loaded */}
      {!modelReady && <ModelWarmup onReady={handleModelReady} />}

      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        theme={theme}
        toggleTheme={toggle}
      />
      <main className="main-content">
        {activeTab === "classification" && (
          <LandClassification initialRecordId={initialRecordId} />
        )}
        {activeTab === "change"     && <LandChangeDetection />}
        {activeTab === "dashboard"  && <Dashboard />}
      </main>
      <ToastContainer />
      <Onboarding />
    </div>
  );
}