import { useState } from "react";
import ImageUploader from "./ImageUploader";
import SentinelChangeDetection from "./SentinelChangeDetection";
import { toast } from "./Toast";
import { api } from "../utils/api";
import { exportChangePDF } from "../utils/pdf";
import "./LandChangeDetection.css";

export default function LandChangeDetection() {
  const [mode,       setMode]       = useState("sentinel"); // "upload" | "sentinel"
  const [beforeB64,  setBeforeB64]  = useState(null);
  const [afterB64,   setAfterB64]   = useState(null);
  const [beforeFile, setBeforeFile] = useState(null);
  const [afterFile,  setAfterFile]  = useState(null);
  const [result,     setResult]     = useState(null);
  const [loading,    setLoading]    = useState(false);

  const handleAnalyze = async () => {
    if (!beforeB64 || !afterB64) return;
    setLoading(true);
    setResult(null);
    try {
      const data = await api.changeDetection(beforeB64, afterB64);
      setResult(data);
      toast(`Change detected: ${data.beforeType} → ${data.afterType}`, "success");
    } catch (err) {
      toast(err.message || "Analysis failed. Is the backend running?", "error");
    } finally {
      setLoading(false);
    }
  };

  const canAnalyze = beforeB64 && afterB64;

  return (
    <div className="lcd-page">
      <div className="lcd-hero">
        <div className="lcd-hero-overlay" />
        <div className="lcd-content">

          {/* ── Mode selector ────────────────────────────────────────── */}
          <div className="lcd-mode-bar glass-card">
            <button
              id="lcd-mode-sentinel"
              className={`lcd-mode-btn ${mode === "sentinel" ? "active sentinel" : ""}`}
              onClick={() => { setMode("sentinel"); setResult(null); }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M2 12h20M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20"/>
              </svg>
              Sentinel-2 via Copernicus
              <span className="lcd-mode-badge">Real Data</span>
            </button>
            <button
              id="lcd-mode-upload"
              className={`lcd-mode-btn ${mode === "upload" ? "active upload" : ""}`}
              onClick={() => { setMode("upload"); setResult(null); }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              Upload Images
              <span className="lcd-mode-badge manual">ResNet50</span>
            </button>
          </div>

          {/* ── Sentinel-2 mode ───────────────────────────────────────── */}
          {mode === "sentinel" && <SentinelChangeDetection />}

          {/* ── Upload mode ───────────────────────────────────────────── */}
          {mode === "upload" && (
            <>
              {/* Upload row */}
              <div className="lcd-upload-row">
                <div className="lcd-upload-panel glass-card">
                  <div className="lcd-panel-header">
                    <h3 className="lcd-panel-title">Before Image</h3>
                    <span className="lcd-time-badge">Time 1</span>
                  </div>
                  <ImageUploader
                    label="Upload Before Image"
                    sublabel="Earlier time period"
                    onImageSelect={(file, _, b64) => { setBeforeB64(b64); setBeforeFile(file); }}
                    buttonColor="blue"
                  />
                </div>

                <div className="lcd-upload-panel glass-card">
                  <div className="lcd-panel-header">
                    <h3 className="lcd-panel-title">After Image</h3>
                    <span className="lcd-time-badge">Time 2</span>
                  </div>
                  <ImageUploader
                    label="Upload After Image"
                    sublabel="Later time period"
                    onImageSelect={(file, _, b64) => { setAfterB64(b64); setAfterFile(file); }}
                    buttonColor="teal"
                  />
                </div>
              </div>

              {/* Info & Analyze */}
              <div className="lcd-info-row glass-card">
                <div className="lcd-info-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                    <path d="M17 1l4 4-4 4"/>
                    <path d="M3 11V9a4 4 0 014-4h14"/>
                    <path d="M7 23l-4-4 4-4"/>
                    <path d="M21 13v2a4 4 0 01-4 4H3"/>
                  </svg>
                </div>
                <div className="lcd-info-text">
                  <h4>Land Change Detection</h4>
                  <p>Upload two satellite images of the same location from different time periods. The ResNet50 model classifies each image into one of 5 land cover classes and computes land cover changes.</p>
                  <ul>
                    <li>5-class output: Urban, Vegetation, Water, Agriculture, Bare Land</li>
                    <li>Changes are derived from direct class-label transitions</li>
                    <li>Export a full PDF report of detected changes</li>
                  </ul>
                </div>
                <div className="lcd-actions">
                  <button
                    className={`btn-analyze ${canAnalyze ? "active" : ""}`}
                    onClick={handleAnalyze}
                    disabled={!canAnalyze || loading}
                    id="lcd-analyze-btn"
                  >
                    {loading ? (
                      <><span className="btn-spinner" />Analyzing…</>
                    ) : "Analyze Changes"}
                  </button>
                  {result && (
                    <button className="btn-export-change" onClick={() => exportChangePDF(result)}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                        <polyline points="7 10 12 15 17 10"/>
                        <line x1="12" y1="15" x2="12" y2="3"/>
                      </svg>
                      Export PDF
                    </button>
                  )}
                </div>
              </div>

              {/* Results */}
              {result && (
                <div className="lcd-results glass-card">
                  <div className="lcd-results-header">
                    <h3 className="lcd-results-title">Change Detection Results</h3>
                    <div className="lcd-type-compare">
                      <span className="lcd-type-badge before">{result.beforeType}</span>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2">
                        <path d="M5 12h14M12 5l7 7-7 7"/>
                      </svg>
                      <span className="lcd-type-badge after">{result.afterType}</span>
                    </div>
                  </div>

                  <div className="lcd-conf-row">
                    <div className="lcd-conf-item">
                      <span className="lcd-conf-label">Before Confidence</span>
                      <span className="lcd-conf-val">{result.beforeConf}%</span>
                    </div>
                    <div className="lcd-conf-item">
                      <span className="lcd-conf-label">After Confidence</span>
                      <span className="lcd-conf-val">{result.afterConf}%</span>
                    </div>
                  </div>

                  <div className="lcd-results-grid">
                    {result.changes.map((item, i) => (
                      <div key={i} className="lcd-result-item">
                        <div className="lcd-result-header">
                          <span className="lcd-result-label">{item.label}</span>
                          <span className="lcd-result-percent">{item.percent}%</span>
                        </div>
                        <div className="lcd-result-bar-track">
                          <div
                            className="lcd-result-bar-fill"
                            style={{ width: `${item.percent}%`, background: item.color }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}