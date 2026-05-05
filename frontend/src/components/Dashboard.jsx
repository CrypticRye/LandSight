import { useState, useEffect, useCallback } from "react";
import { api } from "../utils/api";
import "./Dashboard.css";

function StatCard({ icon, label, value, sub, color }) {
  return (
    <div className="db-stat-card">
      <div className="db-stat-icon" style={{ background: `${color}22`, color }}>
        {icon}
      </div>
      <div className="db-stat-body">
        <span className="db-stat-value">{value}</span>
        <span className="db-stat-label">{label}</span>
        {sub && <span className="db-stat-sub">{sub}</span>}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [stats,      setStats]      = useState(null);
  const [modelInfo,  setModelInfo]  = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);

    Promise.all([
      api.stats(),
      api.health(),
    ])
      .then(([statsData, healthData]) => {
        setStats(statsData);
        setModelInfo(healthData);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="db-page">
      <div className="db-hero">
        <div className="db-hero-overlay" />
        <div className="db-inner">

          {/* ── Header ── */}
          <div className="db-header">
            <div className="db-title-row">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2ec4b6" strokeWidth="2">
                <rect x="2" y="2" width="9" height="9" rx="1"/><rect x="13" y="2" width="9" height="9" rx="1"/>
                <rect x="2" y="13" width="9" height="9" rx="1"/><rect x="13" y="13" width="9" height="9" rx="1"/>
              </svg>
              <div>
                <h1 className="db-title">Analytics Dashboard</h1>
                {modelInfo && (
                  <span className="db-model-tag">
                    {modelInfo.model_version} · TF {modelInfo.tf_version}
                    <span className={`db-model-dot ${modelInfo.model_loaded ? "loaded" : "unloaded"}`} />
                  </span>
                )}
              </div>
            </div>
            <button className="db-refresh" onClick={load} id="db-refresh-btn">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
              </svg>
              Refresh
            </button>
          </div>

          {error && (
            <div className="db-error">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {error} — is the backend running?
            </div>
          )}

          {loading && !stats ? (
            <div className="db-loading">
              <div className="db-spinner" />
              <span>Loading analytics…</span>
            </div>
          ) : stats ? (
            <>
              {/* ── Stat Cards ── */}
              <div className="db-cards">
                <StatCard
                  icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>}
                  label="Classification Predictions" value={stats.totalClassifications || 0} color="#2ec4b6"
                />
                <StatCard
                  icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>}
                  label="Change Detection Predictions" value={stats.totalChangeDetections || 0} color="#4a90d9"
                />
                <StatCard
                  icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>}
                  label="Usage History" value={stats.total || 0}
                  sub="total analyzed images" color="#f59e0b"
                />
              </div>

              {/* ── System Overview ── */}
              <div className="db-info-grid">
                <div className="db-info-card glass-card">
                  <h3 className="db-info-title">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2ec4b6" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
                    </svg>
                    How Classification Works
                  </h3>
                  <p>
                    LandSight uses a deep learning model based on the <strong>ResNet50</strong> architecture, 
                    trained specifically on high-resolution satellite imagery. When you upload or capture an image, 
                     the system processes it through the neural network to identify visual patterns 
                     characteristic of five distinct land cover classes:
                  </p>
                  <ul className="db-info-list">
                    <li><strong>Urban:</strong> Buildings, roads, and human-made infrastructure.</li>
                    <li><strong>Vegetation:</strong> Forests, parks, and dense greenery.</li>
                    <li><strong>Agriculture:</strong> Farmlands, crops, and cultivated soil.</li>
                    <li><strong>Water:</strong> Rivers, lakes, and coastal areas.</li>
                    <li><strong>Bareland:</strong> Open soil, rocky terrain, or cleared land.</li>
                  </ul>
                </div>

                <div className="db-info-card glass-card">
                  <h3 className="db-info-title">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4a90d9" strokeWidth="2">
                      <path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 014-4h14"/><path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 01-4 4H3"/>
                    </svg>
                    How Change Detection Works
                  </h3>
                  <p>
                    The Land Change Detection module performs a temporal analysis by comparing two 
                    geographically aligned images from different time periods ("Before" and "After").
                  </p>
                  <ul className="db-info-list">
                    <li><strong>Feature Comparison:</strong> Both images are analyzed using the same ResNet50 model to generate classification probabilities.</li>
                    <li><strong>Transition Mapping:</strong> The system identifies class transitions (e.g., Vegetation turning into Urban) to detect urban sprawl or deforestation.</li>
                    <li><strong>Sentinel-2 Integration:</strong> For large-scale changes, users can pull historical multispectral data directly from the Copernicus satellite constellation.</li>
                  </ul>
                </div>

                <div className="db-info-card glass-card db-info-wide">
                  <h3 className="db-info-title">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                    Credits & Attribution
                  </h3>
                  <div className="db-credits-content">
                    <p>
                      This website includes an embedded feature from <strong>Esri Wayback Imagery</strong> through iframe/web embedding to enhance user functionality and accessibility. 
                      All rights, content, and services related to the embedded website belong to their respective owners. 
                      Our system only integrates the website for user convenience and does not claim ownership over its content.
                    </p>
                    <p className="db-credits-sub">
                      Satellite imagery provided by Esri, Maxar, GeoEye, Earthstar Geographics, CNES/Airbus DS, USDA, USGS, AeroGRID, IGN, and the GIS User Community.
                    </p>
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
