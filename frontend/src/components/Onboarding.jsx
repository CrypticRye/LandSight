import { useState, useEffect } from "react";
import "./Onboarding.css";

const STEPS = [
  {
    icon: (
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#2ec4b6" strokeWidth="1.5">
        <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
        <line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>
      </svg>
    ),
    title: "Step 1 — Zoom In",
    desc: "Navigate the satellite map to your area of interest. Zoom to level Z17–Z18 so LandSight can see individual land features clearly.",
    tip: "💡 Use the search bar to jump to any location",
  },
  {
    icon: (
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#2ec4b6" strokeWidth="1.5">
        <rect x="3" y="3" width="18" height="18" rx="2"/>
        <line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/>
        <line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/>
      </svg>
    ),
    title: "Step 2 — Draw a Selection",
    desc: "Click \"Draw Selection\" then drag a rectangle over the land area you want to classify. Aim for ~300×300 px for best results.",
    tip: "💡 Bigger isn't always better — keep your selection focused",
  },
  {
    icon: (
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#2ec4b6" strokeWidth="1.5">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
      </svg>
    ),
    title: "Step 3 — Classify",
    desc: "Click \"Classify Selection\" to send the satellite image to the AI model. Results show the land type, confidence score, and all class probabilities.",
    tip: "💡 Results are saved to your history automatically",
  },
];

export default function Onboarding() {
  const [visible, setVisible] = useState(false);
  const [step,    setStep]    = useState(0);

  useEffect(() => {
    if (!localStorage.getItem("landsight_onboarded")) {
      setVisible(true);
    }
  }, []);

  const dismiss = () => {
    localStorage.setItem("landsight_onboarded", "1");
    setVisible(false);
  };

  if (!visible) return null;

  const current = STEPS[step];
  const isLast  = step === STEPS.length - 1;

  return (
    <div className="ob-backdrop" onClick={(e) => e.target === e.currentTarget && dismiss()}>
      <div className="ob-modal">
        <button className="ob-close" onClick={dismiss} id="ob-close-btn" aria-label="Close">×</button>

        <div className="ob-progress">
          {STEPS.map((_, i) => (
            <div key={i} className={`ob-dot ${i === step ? "active" : i < step ? "done" : ""}`} />
          ))}
        </div>

        <div className="ob-icon">{current.icon}</div>
        <h2 className="ob-title">{current.title}</h2>
        <p  className="ob-desc">{current.desc}</p>
        <div className="ob-tip">{current.tip}</div>

        <div className="ob-actions">
          {step > 0 && (
            <button className="ob-btn secondary" onClick={() => setStep(s => s - 1)}>
              ← Back
            </button>
          )}
          <button
            className="ob-btn primary"
            onClick={isLast ? dismiss : () => setStep(s => s + 1)}
            id="ob-next-btn"
          >
            {isLast ? "Got it — let's go! 🚀" : "Next →"}
          </button>
        </div>

        <button className="ob-skip" onClick={dismiss}>Skip tutorial</button>
      </div>
    </div>
  );
}
