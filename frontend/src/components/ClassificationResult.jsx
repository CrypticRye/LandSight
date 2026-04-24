import { exportClassificationPDF } from "../utils/pdf";
import "./ClassificationResult.css";

const CLASS_COLORS = {
  Agriculture: "#4ade80",
  Bareland:    "#fbbf24",
  Urban:       "#a5b4fc",
  Vegetation:  "#34d399",
  Water:       "#60a5fa",
};
const LOW_CONF_THRESHOLD = 65;

export default function ClassificationResult({ result, imageDataUrl }) {
  if (!result) {
    return (
      <div className="result-panel empty">
        <div className="result-empty-icon">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5">
            <rect x="3" y="3" width="18" height="18" rx="2"/>
            <path d="M3 9h18"/><path d="M9 21V9"/>
          </svg>
        </div>
        <p className="result-empty-text">Upload an image to see classification results and detailed description</p>
      </div>
    );
  }

  const sortedProbs = result.allProbs
    ? Object.entries(result.allProbs).sort((a, b) => b[1] - a[1])
    : [];

  return (
    <div className="result-panel">
      <div className="result-header-row">
        <h3 className="result-title">Classification Results</h3>
        <button
          className="btn-export"
          onClick={() => exportClassificationPDF(result, imageDataUrl)}
          title="Export PDF Report"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Export PDF
        </button>
      </div>

      {/* Satellite warning */}
      {result.isSatellite === false && (
        <div className="satellite-warning">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <span>{result.satelliteReason}</span>
        </div>
      )}

      {/* Low-confidence warning */}
      {result.confidence != null && result.confidence < LOW_CONF_THRESHOLD && (
        <div className="low-conf-warning">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <span>Low confidence ({result.confidence}%) — result may be inaccurate. Try a different area or zoom level.</span>
        </div>
      )}

      <div className="result-badge">{result.landType}</div>
      <p className="result-description">{result.description}</p>

      {result.confidence != null && (
        <div className="confidence-bar">
          <div className="confidence-label">
            <span>Confidence</span>
            <span>{result.confidence}%</span>
          </div>
          <div className="confidence-track">
            <div className="confidence-fill" style={{ width: `${result.confidence}%` }} />
          </div>
        </div>
      )}

      {result.features?.length > 0 && (
        <div className="feature-tags">
          {result.features.map((f, i) => <span key={i} className="feature-tag">{f}</span>)}
        </div>
      )}

      {/* All class probabilities */}
      {sortedProbs.length > 0 && (
        <div className="all-probs">
          <h4 className="all-probs-title">All Class Probabilities</h4>
          {sortedProbs.map(([label, prob]) => {
            const color = CLASS_COLORS[label] || "#2ec4b6";
            const isTop = label === result.landType;
            return (
              <div key={label} className={`prob-row ${isTop ? "top" : ""}`}>
                <span className="prob-label">{label}</span>
                <div className="prob-bar-track">
                  <div className="prob-bar-fill" style={{ width: `${prob}%`, background: color }} />
                </div>
                <span className="prob-val" style={{ color }}>{prob}%</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}