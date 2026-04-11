import { useEffect, useState } from "react";
import "./Toast.css";

let _add = null;

export function toast(message, type = "info", duration = 4000) {
  _add && _add({ message, type, duration, id: Date.now() + Math.random() });
}

export default function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    _add = (t) => {
      setToasts((prev) => [...prev, t]);
      setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== t.id)), t.duration);
    };
    return () => { _add = null; };
  }, []);

  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.type}`}>
          <span className="toast-icon">
            {t.type === "success" && "✓"}
            {t.type === "error"   && "✕"}
            {t.type === "warn"    && "⚠"}
            {t.type === "info"    && "ℹ"}
          </span>
          {t.message}
        </div>
      ))}
    </div>
  );
}