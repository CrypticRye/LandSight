import { useState } from "react";
import Header from "./components/Header";
import LandClassification from "./components/LandClassification";
import LandChangeDetection from "./components/LandChangeDetection";
import Dashboard from "./components/Dashboard";
import Onboarding from "./components/Onboarding";
import ToastContainer from "./components/Toast";
import { useTheme } from "./hooks/useTheme";
import "./App.css";

export default function App() {
  const [activeTab, setActiveTab] = useState("classification");
  const { theme, toggle } = useTheme();

  return (
    <div className="app">
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        theme={theme}
        toggleTheme={toggle}
      />
      <main className="main-content">
        {activeTab === "classification" && <LandClassification />}
        {activeTab === "change"         && <LandChangeDetection />}
        {activeTab === "dashboard"      && <Dashboard />}
      </main>
      <ToastContainer />
      <Onboarding />
    </div>
  );
}