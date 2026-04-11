import { useState, useEffect, useRef } from "react";
import { toast } from "./Toast";
import { api } from "../utils/api";
import "leaflet/dist/leaflet.css";
import "./SentinelChangeDetection.css";

// ── Date helpers ───────────────────────────────────────────────────────────────
function today()    { return new Date().toISOString().slice(0, 10); }
function yearsAgo(n){ const d = new Date(); d.setFullYear(d.getFullYear() - n); return d.toISOString().slice(0, 10); }

// ── Mini location map ──────────────────────────────────────────────────────────
function LocationMap({ lat, lng, onLocationChange }) {
  const divRef = useRef(null);
  const mapRef = useRef(null);
  const mkrRef = useRef(null);

  useEffect(() => {
    if (mapRef.current) return;
    import("leaflet").then((mod) => {
      const L = mod.default ?? mod;
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const initLat = parseFloat(lat) || 14.5995;
      const initLng = parseFloat(lng) || 120.9842;

      const map = L.map(divRef.current, { center: [initLat, initLng], zoom: 8 });

      L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        { attribution: "Tiles © Esri", maxZoom: 18 }
      ).addTo(map);

      const marker = L.marker([initLat, initLng], { draggable: true }).addTo(map);
      mkrRef.current = marker;

      const update = ({ lat: la, lng: lo }) =>
        onLocationChange(la.toFixed(6), lo.toFixed(6));

      marker.on("dragend", (e) => update(e.target.getLatLng()));
      map.on("click", (e) => { marker.setLatLng(e.latlng); update(e.latlng); });

      mapRef.current = map;
    });
    return () => { mapRef.current?.remove(); mapRef.current = null; };
  }, []);

  // Sync marker with controlled props
  useEffect(() => {
    if (!mkrRef.current || !lat || !lng) return;
    const la = parseFloat(lat), lo = parseFloat(lng);
    if (isNaN(la) || isNaN(lo)) return;
    mkrRef.current.setLatLng([la, lo]);
    mapRef.current?.panTo([la, lo]);
  }, [lat, lng]);

  return <div ref={divRef} className="s2-mini-map" id="s2-location-map" />;
}

// ── Scene preview card ────────────────────────────────────────────────────────
function SceneCard({ scene, label, color }) {
  if (!scene) return (
    <div className="s2-scene-card empty">
      <div className="s2-scene-placeholder">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5">
          <rect x="3" y="3" width="18" height="18" rx="2"/>
          <circle cx="8.5" cy="8.5" r="1.5"/>
          <polyline points="21 15 16 10 5 21"/>
        </svg>
        <span>No scene found</span>
      </div>
    </div>
  );

  return (
    <div className={`s2-scene-card ${color}`}>
      <div className="s2-scene-badge">{label}</div>
      {scene.image ? (
        <img src={scene.image} alt={`${label} satellite view`} className="s2-scene-img" />
      ) : (
        <div className="s2-scene-placeholder">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5">
            <rect x="3" y="3" width="18" height="18" rx="2"/>
            <circle cx="8.5" cy="8.5" r="1.5"/>
            <polyline points="21 15 16 10 5 21"/>
          </svg>
          <span>Preview unavailable</span>
        </div>
      )}
      <div className="s2-scene-meta">
        <span className="s2-scene-date">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="4" width="18" height="18" rx="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          {scene.date}
        </span>
        <span className="s2-scene-cloud">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 10h-1.26A8 8 0 109 20h9a5 5 0 000-10z"/>
          </svg>
          {scene.cloudCover}% cloud
        </span>
      </div>
      <div className="s2-scene-title" title={scene.title}>{scene.title}</div>
    </div>
  );
}

// ── Change result bar ──────────────────────────────────────────────────────────
function ChangeBar({ item }) {
  return (
    <div className="s2-change-item">
      <div className="s2-change-header">
        <span>{item.label}</span>
        <span className="s2-change-pct">{item.percent}%</span>
      </div>
      <div className="s2-bar-track">
        <div className="s2-bar-fill" style={{ width: `${item.percent}%`, background: item.color }} />
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function SentinelChangeDetection() {
  const [lat,         setLat]          = useState("14.5995");
  const [lng,         setLng]          = useState("120.9842");
  const [beforeStart, setBeforeStart]  = useState(yearsAgo(5));
  const [beforeEnd,   setBeforeEnd]    = useState(yearsAgo(4));
  const [afterStart,  setAfterStart]   = useState(yearsAgo(1));
  const [afterEnd,    setAfterEnd]     = useState(today());
  const [cloudCover,  setCloudCover]   = useState(40);

  const [status,       setStatus]       = useState(null);
  const [scenes,       setScenes]       = useState(null);   // { before, after, errors }
  const [searching,    setSearching]    = useState(false);
  const [result,       setResult]       = useState(null);
  const [analyzing,    setAnalyzing]    = useState(false);

  useEffect(() => {
    api.sentinelStatus()
      .then(s => setStatus(s))
      .catch(() => setStatus({ configured: false, error: "Backend unreachable." }));
  }, []);

  const useMyLocation = () => {
    if (!navigator.geolocation) { toast("Geolocation not supported.", "error"); return; }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLat(coords.latitude.toFixed(6));
        setLng(coords.longitude.toFixed(6));
        toast("Location set.", "success");
      },
      () => toast("Could not get location.", "error")
    );
  };

  const handleSearch = async () => {
    setScenes(null);
    setResult(null);
    setSearching(true);
    try {
      const data = await api.sentinelFindScenes(
        parseFloat(lat), parseFloat(lng),
        beforeStart, beforeEnd,
        afterStart,  afterEnd,
        cloudCover
      );
      setScenes(data);
      if (data.errors?.length) {
        data.errors.forEach(e => toast(e, "warn", 8000));
      }
      if (data.before || data.after) {
        toast("Sentinel-2 scenes retrieved! Preview below.", "success");
      }
    } catch (err) {
      toast(err.message || "Scene search failed.", "error");
    } finally {
      setSearching(false);
    }
  };

  const handleAnalyze = async () => {
    if (!scenes?.before?.image || !scenes?.after?.image) {
      toast("Both before and after scene images are required.", "warn");
      return;
    }
    setAnalyzing(true);
    setResult(null);
    try {
      const data = await api.changeDetection(scenes.before.image, scenes.after.image);
      setResult(data);
      toast(`Change detected: ${data.beforeType} → ${data.afterType}`, "success");
    } catch (err) {
      toast(err.message || "Change detection failed.", "error");
    } finally {
      setAnalyzing(false);
    }
  };

  const canSearch  = lat && lng && beforeStart && beforeEnd && afterStart && afterEnd && status?.configured;
  const canAnalyze = scenes?.before?.image && scenes?.after?.image;

  return (
    <div className="s2-section">

      {/* ── Status banner ─────────────────────────────────────────────────── */}
      {status && !status.configured && (
        <div className="s2-banner warn">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <span>
            <strong>Copernicus not configured.</strong>&nbsp;
            Set <code>COPERNICUS_USER</code> &amp; <code>COPERNICUS_PASS</code> in <code>backend/.env</code>.
            &nbsp;<a href="https://dataspace.copernicus.eu" target="_blank" rel="noopener noreferrer">Register free →</a>
          </span>
        </div>
      )}
      {status?.configured && (
        <div className="s2-banner ok">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
          <span>Copernicus CDSE connected — Sentinel-2 L2A (10 m)</span>
        </div>
      )}

      {/* ── Step 1: Setup ──────────────────────────────────────────────────── */}
      <div className="s2-setup-grid">

        {/* Map */}
        <div className="s2-setup-card glass-card">
          <div className="s2-card-hdr">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/>
              <line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/>
            </svg>
            Pick Location
          </div>

          <LocationMap lat={lat} lng={lng} onLocationChange={(la, lg) => { setLat(la); setLng(lg); }} />

          <div className="s2-coord-row">
            <div className="s2-field">
              <label>Lat</label>
              <input type="number" step="0.0001" value={lat} onChange={e => setLat(e.target.value)} placeholder="14.5995" />
            </div>
            <div className="s2-field">
              <label>Lng</label>
              <input type="number" step="0.0001" value={lng} onChange={e => setLng(e.target.value)} placeholder="120.9842" />
            </div>
            <button className="btn-locate" onClick={useMyLocation}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>
              </svg>
              My Location
            </button>
          </div>
        </div>

        {/* Date ranges + cloud + search */}
        <div className="s2-setup-card glass-card">
          <div className="s2-card-hdr">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            Date Ranges
          </div>

          <div className="s2-period-box before-box">
            <span className="s2-period-label">Before Period</span>
            <div className="s2-date-row">
              <div className="s2-field"><label>Start</label>
                <input type="date" value={beforeStart} onChange={e => setBeforeStart(e.target.value)} /></div>
              <div className="s2-field"><label>End</label>
                <input type="date" value={beforeEnd} onChange={e => setBeforeEnd(e.target.value)} /></div>
            </div>
          </div>

          <div className="s2-period-box after-box">
            <span className="s2-period-label">After Period</span>
            <div className="s2-date-row">
              <div className="s2-field"><label>Start</label>
                <input type="date" value={afterStart} onChange={e => setAfterStart(e.target.value)} /></div>
              <div className="s2-field"><label>End</label>
                <input type="date" value={afterEnd} onChange={e => setAfterEnd(e.target.value)} /></div>
            </div>
          </div>

          <div className="s2-cloud-row">
            <label>Max Cloud Cover <strong>{cloudCover}%</strong></label>
            <input type="range" min="10" max="90" step="5" value={cloudCover}
              onChange={e => setCloudCover(+e.target.value)} className="s2-slider" />
          </div>

          <button
            className={`btn-s2-search ${canSearch ? "active" : ""}`}
            onClick={handleSearch}
            disabled={!canSearch || searching}
            id="s2-search-btn"
          >
            {searching
              ? <><span className="s2-spinner" />Searching Copernicus archive…</>
              : <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
                  </svg>
                  Find Sentinel-2 Scenes
                </>
            }
          </button>

          <p className="s2-hint">
            Searches the Copernicus archive for the clearest scene at your location in each period. Typical wait: 5–15 s.
          </p>
        </div>
      </div>

      {/* ── Step 2: Preview found scenes ──────────────────────────────────── */}
      {scenes && (
        <div className="s2-preview-section glass-card">
          <div className="s2-preview-header">
            <h3>Satellite Image Preview</h3>
            <span className="s2-preview-sub">
              Sentinel-2 L2A · cropped around your location · Copernicus CDSE
            </span>
          </div>

          <div className="s2-scenes-row">
            <SceneCard scene={scenes.before} label="Before" color="blue" />
            <div className="s2-scenes-arrow">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </div>
            <SceneCard scene={scenes.after} label="After" color="green" />
          </div>

          {/* Error messages */}
          {scenes.errors?.length > 0 && (
            <div className="s2-errors">
              {scenes.errors.map((e, i) => (
                <div key={i} className="s2-error-item">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#ff6b6b" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  {e}
                </div>
              ))}
              <p className="s2-error-tip">
                💡 <strong>Tips:</strong> Widen the date range to 1–2 years, or raise cloud cover to 60–80%.
                Coastal or rainy-season locations tend to have more cloud cover.
              </p>
            </div>
          )}

          {/* Analyze button */}
          {canAnalyze && (
            <button
              className={`btn-s2-analyze ${!analyzing ? "active" : ""}`}
              onClick={handleAnalyze}
              disabled={analyzing}
              id="s2-analyze-btn"
            >
              {analyzing
                ? <><span className="s2-spinner" />Running ResNet50 change detection…</>
                : <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 014-4h14"/>
                      <path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 01-4 4H3"/>
                    </svg>
                    Run Change Detection on These Images
                  </>
              }
            </button>
          )}
        </div>
      )}

      {/* ── Step 3: Results ───────────────────────────────────────────────── */}
      {result && (
        <div className="s2-results glass-card">
          <h3 className="s2-results-title">Change Detection Results</h3>

          <div className="s2-type-compare">
            <div className="s2-type-pill before">
              <span>{scenes?.before?.date}</span>
              <strong>{result.beforeType}</strong>
              <small>{result.beforeConf}% conf.</small>
            </div>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
            <div className="s2-type-pill after">
              <span>{scenes?.after?.date}</span>
              <strong>{result.afterType}</strong>
              <small>{result.afterConf}% conf.</small>
            </div>
          </div>

          <div className="s2-change-grid">
            {result.changes.map((item, i) => <ChangeBar key={i} item={item} />)}
          </div>
        </div>
      )}
    </div>
  );
}
