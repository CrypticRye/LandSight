import { useState } from "react";
import Header from "./components/Header";
import LandClassification from "./components/LandClassification";
import LandChangeDetection from "./components/LandChangeDetection";
import ToastContainer from "./components/Toast";
import { useTheme } from "./hooks/useTheme";
import "./App.css";

export default function App() {
  const [activeTab, setActiveTab] = useState("classification");
  const { theme, toggle } = useTheme();
  // Vercel env var fix

  return (
    <div className="app">
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        theme={theme}
        toggleTheme={toggle}
      />
      <main className="main-content">
        {activeTab === "classification" ? (
          <LandClassification />
        ) : (
          <LandChangeDetection />
        )}
      </main>
      <ToastContainer />
    </div>
  );
}