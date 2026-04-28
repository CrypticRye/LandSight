import { useEffect, useState, useRef, useCallback } from "react";
import { api } from "../utils/api";
import "./ModelWarmup.css";

/**
 * Full-screen overlay shown while the ML model is warming up.
 * Polls /api/ready every 2 seconds until the model is loaded,
 * then fades out and calls onReady().
 * A "Skip" button always lets the user bypass the wait.
 */
export default function ModelWarmup({ onReady }) {
  const [phase,   setPhase]   = useState("checking");
  const [dots,    setDots]    = useState(".");
  const [elapsed, setElapsed] = useState(0);
  const intervalRef    = useRef(null);
  const dotIntervalRef = useRef(null);
  const startRef       = useRef(Date.now());

  const dismiss = useCallback(() => {
    clearInterval(intervalRef.current);
    setPhase("fading");
    setTimeout(() => {
      setPhase("done");
      onReady();
    }, 400);
  }, [onReady]);

  // Animated dots
  useEffect(() => {
    dotIntervalRef.current = setInterval(() => {
      setDots(d => d.length >= 3 ? "." : d + ".");
    }, 500);
    return () => clearInterval(dotIntervalRef.current);
  }, []);

  // Elapsed timer
  useEffect(() => {
    const t = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
    }, 1000);
    return () => clearInterval(t);
  }, []);

  // Poll /api/ready — auto-dismiss when ready
  useEffect(() => {
    const check = async () => {
      try {
        const data = await api.ready();
        if (data.ready) {
          dismiss();
        } else {
          setPhase("warming");
        }
      } catch {
        // Backend might still be starting — keep polling
        setPhase("warming");
      }
    };

    check();
    intervalRef.current = setInterval(check, 2000);
    return () => clearInterval(intervalRef.current);
  }, [dismiss]);

  if (phase === "done") return null;

  return (
    <div className={`warmup-overlay ${phase === "fading" ? "fade-out" : ""}`}>
      <div className="warmup-card">
        {/* Animated satellite icon */}
        <div className="warmup-icon-wrap">
          <div className="warmup-pulse-ring" />
          <div className="warmup-pulse-ring delay" />
          <svg className="warmup-icon" width="44" height="44" viewBox="0 0 24 24"
            fill="none" stroke="url(#wg)" strokeWidth="1.8">
            <defs>
              <linearGradient id="wg" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#2ec4b6"/>
                <stop offset="100%" stopColor="#4a90d9"/>
              </linearGradient>
            </defs>
            <path d="M12 2L2 7l10 5 10-5-10-5z"/>
            <path d="M2 17l10 5 10-5"/>
            <path d="M2 12l10 5 10-5"/>
          </svg>
        </div>

        <div className="warmup-brand">LandSight</div>

        <h2 className="warmup-title">
          {phase === "checking" ? "Connecting" : "Loading Model"}
          <span className="warmup-dots">{dots}</span>
        </h2>

        <p className="warmup-sub">
          {phase === "checking"
            ? "Connecting to backend server…"
            : "ResNet50 is loading into memory — this takes 10–30 s on first start."}
        </p>

        {/* Progress bar (indeterminate) */}
        <div className="warmup-bar-track">
          <div className="warmup-bar-fill" />
        </div>

        {elapsed > 0 && (
          <p className="warmup-elapsed">{elapsed}s elapsed</p>
        )}

        {/* Skip button — always visible so the app is never truly blocked */}
        <button className="warmup-skip" onClick={dismiss}>
          Skip and enter app →
        </button>

        <div className="warmup-tips">
          <span className="warmup-tip-label">While you wait:</span>
          <ul>
            <li>Zoom the map to Z17–18 to enable classification</li>
            <li>Draw a rectangle over any land area to classify it</li>
            <li>Use Change Detection to compare two time periods</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
