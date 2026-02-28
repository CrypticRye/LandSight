import { useState, useRef } from "react";
import "./App.css";

const CLASS_META = {
  AnnualCrop:             { emoji: "🌾", color: "#f6c90e" },
  Forest:                 { emoji: "🌲", color: "#4fffb0" },
  HerbaceousVegetation:   { emoji: "🌱", color: "#6ee7b7" },
  Highway:                { emoji: "🛣️", color: "#94a3b8" },
  Industrial:             { emoji: "🏭", color: "#f97316" },
  Pasture:                { emoji: "🌿", color: "#86efac" },
  PermanentCrop:          { emoji: "🍊", color: "#fb923c" },
  Residential:            { emoji: "🏘️", color: "#38b2ff" },
  River:                  { emoji: "🏞️", color: "#60a5fa" },
  SeaLake:                { emoji: "🌊", color: "#22d3ee" },
};

const API_URL = "http://127.0.0.1:5000/predict";

export default function App() {
  const [selectedImage, setSelectedImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState(null);
  const fileRef = useRef();

  const handleFile = (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    setSelectedImage(file);
    setPreview(URL.createObjectURL(file));
    setPrediction(null);
    setError(null);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const handlePredict = async () => {
    if (!selectedImage) return;
    setLoading(true);
    setError(null);
    setPrediction(null);

    const formData = new FormData();
    formData.append("file", selectedImage);

    try {
      const response = await fetch(API_URL, { method: "POST", body: formData });
      if (!response.ok) throw new Error(`Server error: ${response.status}`);
      const data = await response.json();
      setPrediction(data);
    } catch (err) {
      setError(err.message || "Could not connect to backend. Is Flask running?");
    }
    setLoading(false);
  };

  const reset = () => {
    setSelectedImage(null);
    setPreview(null);
    setPrediction(null);
    setError(null);
  };

  const top = prediction ? prediction.top3[0] : null;
  const topMeta = top ? CLASS_META[top.label] : null;

  return (
    <div className="tc-root">
      <div className="tc-bg-grid" />
      <div className="tc-bg-glow" />

      {/* Header */}
      <header className="tc-header">
        <div className="tc-header-inner">
          <div className="tc-logo">
            <span className="tc-logo-hex">⬡</span>
            <span className="tc-logo-text">TERRACLASS</span>
          </div>
          <div className="tc-header-badge">EuroSAT · MobileNetV2 · TF 2.x</div>
        </div>
      </header>

      <main className="tc-main">
        {/* Hero */}
        <section className="tc-hero">
          <p className="tc-eyebrow">Satellite Image Analysis</p>
          <h1 className="tc-title">
            Land Classification<br />
            <span className="tc-title-accent">Powered by AI</span>
          </h1>
          <p className="tc-subtitle">
            Upload a satellite image and our CNN model will identify the land type —
            Forest, River, Urban, Cropland and more — in seconds.
          </p>
        </section>

        {/* Upload + Results layout */}
        <div className="tc-workspace">

          {/* Left: Upload Panel */}
          <div className="tc-panel tc-upload-panel">
            <div className="tc-panel-label">INPUT</div>

            {!preview ? (
              <div
                className={`tc-dropzone${dragging ? " tc-dropzone--active" : ""}`}
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current.click()}
              >
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={(e) => handleFile(e.target.files[0])}
                />
                <div className="tc-drop-icon">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <polyline points="16 16 12 12 8 16" />
                    <line x1="12" y1="12" x2="12" y2="21" />
                    <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
                  </svg>
                </div>
                <p className="tc-drop-title">Drop satellite image here</p>
                <p className="tc-drop-sub">or click to browse · JPG PNG TIF</p>
              </div>
            ) : (
              <div className="tc-image-preview">
                <img src={preview} alt="Satellite preview" className="tc-preview-img" />
                <button className="tc-reset-btn" onClick={reset}>
                  ✕ Remove
                </button>
              </div>
            )}

            <button
              className={`tc-predict-btn${loading ? " tc-predict-btn--loading" : ""}`}
              onClick={handlePredict}
              disabled={!selectedImage || loading}
            >
              {loading ? (
                <>
                  <span className="tc-spinner" />
                  Analyzing...
                </>
              ) : (
                <>
                  <span className="tc-btn-icon">⬡</span>
                  Run Classification
                </>
              )}
            </button>

            {error && (
              <div className="tc-error">
                <span>⚠</span> {error}
              </div>
            )}
          </div>

          {/* Right: Results Panel */}
          <div className="tc-panel tc-results-panel">
            <div className="tc-panel-label">PREDICTION RESULT</div>

            {!prediction && !loading && (
              <div className="tc-empty-state">
                <div className="tc-empty-icon">🛰️</div>
                <p>Upload an image and run classification<br />to see results here.</p>
              </div>
            )}

            {loading && (
              <div className="tc-analyzing">
                <div className="tc-pulse-ring" />
                <div className="tc-pulse-dot" />
                <p className="tc-analyzing-text">Classifying land type…</p>
                <p className="tc-analyzing-sub">Running inference through neural network</p>
              </div>
            )}

            {prediction && (
              <div className="tc-result-content">
                {/* Top prediction hero */}
                <div className="tc-top-pred" style={{ "--accent": topMeta?.color || "#4fffb0" }}>
                  <div className="tc-top-emoji">{topMeta?.emoji}</div>
                  <div className="tc-top-info">
                    <span className="tc-top-tag">PREDICTED CLASS</span>
                    <h2 className="tc-top-class">{prediction.predicted_class}</h2>
                    <div className="tc-confidence-row">
                      <div className="tc-confidence-bar-wrap">
                        <div
                          className="tc-confidence-bar"
                          style={{ width: `${(prediction.confidence * 100).toFixed(1)}%`, background: topMeta?.color }}
                        />
                      </div>
                      <span className="tc-confidence-pct">
                        {(prediction.confidence * 100).toFixed(2)}%
                      </span>
                    </div>
                  </div>
                  {/* SVG ring */}
                  <svg className="tc-ring-svg" viewBox="0 0 80 80">
                    <circle cx="40" cy="40" r="32" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="7" />
                    <circle
                      cx="40" cy="40" r="32"
                      fill="none"
                      stroke={topMeta?.color || "#4fffb0"}
                      strokeWidth="7"
                      strokeDasharray={`${(prediction.confidence * 201.1).toFixed(1)} 201.1`}
                      strokeLinecap="round"
                      transform="rotate(-90 40 40)"
                      className="tc-ring-fill"
                    />
                    <text x="40" y="44" textAnchor="middle" fill={topMeta?.color || "#4fffb0"} fontSize="13" fontWeight="bold" fontFamily="monospace">
                      {(prediction.confidence * 100).toFixed(0)}%
                    </text>
                  </svg>
                </div>

                {/* Top 3 breakdown */}
                <div className="tc-top3">
                  <div className="tc-section-label">TOP 3 PREDICTIONS</div>
                  {prediction.top3.map((item, i) => {
                    const meta = CLASS_META[item.label] || { emoji: "🗺️", color: "#6b7280" };
                    const pct = (item.probability * 100).toFixed(2);
                    return (
                      <div key={item.label} className={`tc-bar-row${i === 0 ? " tc-bar-row--top" : ""}`}>
                        <span className="tc-bar-rank">{i + 1}</span>
                        <span className="tc-bar-emoji">{meta.emoji}</span>
                        <span className="tc-bar-label">{item.label}</span>
                        <div className="tc-bar-track">
                          <div
                            className="tc-bar-fill"
                            style={{
                              width: `${pct}%`,
                              background: meta.color,
                              opacity: i === 0 ? 1 : 0.55,
                            }}
                          />
                        </div>
                        <span className="tc-bar-pct">{pct}%</span>
                      </div>
                    );
                  })}
                </div>

                <div className="tc-result-footer">
                  <span>Model: <b>MobileNetV2</b></span>
                  <span>Dataset: <b>EuroSAT</b></span>
                  <span>Accuracy: <b>92.4%</b></span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* About section */}
        <section className="tc-about">
          <p className="tc-eyebrow" style={{ marginBottom: 24 }}>About the Model</p>
          <div className="tc-about-grid">
            {[
              { icon: "📡", title: "Dataset", text: "EuroSAT — 27,000 Sentinel-2 satellite images across 10 land-use classes from the European Space Agency." },
              { icon: "🧬", title: "Architecture", text: "MobileNetV2 with Transfer Learning from ImageNet. Top layers fine-tuned on EuroSAT for 64×64 satellite patches." },
              { icon: "📊", title: "Performance", text: "92.4% test accuracy on 5,400 held-out images. Evaluated across all 10 land classes with per-class F1 scores." },
              { icon: "🗂️", title: "Land Classes", text: "Annual Crop · Forest · Herbaceous · Highway · Industrial · Pasture · Permanent Crop · Residential · River · SeaLake" },
            ].map((c) => (
              <div key={c.title} className="tc-about-card">
                <span className="tc-about-icon">{c.icon}</span>
                <h3 className="tc-about-title">{c.title}</h3>
                <p className="tc-about-text">{c.text}</p>
              </div>
            ))}
          </div>
        </section>

        <footer className="tc-footer">
          <span className="tc-footer-logo">⬡ TERRACLASS</span>
          <span className="tc-footer-note">Vite · React · Flask · TensorFlow · EuroSAT</span>
        </footer>
      </main>
    </div>
  );
}