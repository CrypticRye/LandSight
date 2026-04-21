import { useState, useEffect, useRef, useCallback } from "react";
import ImageUploader from "./ImageUploader";
import SentinelChangeDetection from "./SentinelChangeDetection";
import { toast } from "./Toast";
import { api } from "../utils/api";
import { exportChangePDF } from "../utils/pdf";
import "leaflet/dist/leaflet.css";
import "./LandClassification.css"; // reuse map/draw/zoom styles
import "./LandChangeDetection.css";

const MIN_ZOOM = 17;
const MAX_ZOOM = 18;

const CLASS_COLORS = {
  "Urban Area":        "#e67e22",
  "Urban":             "#e67e22",
  "Vegetation":        "#27ae60",
  "Water Body":        "#3498db",
  "Water":             "#3498db",
  "Agricultural Land": "#f1c40f",
  "Agriculture":       "#f1c40f",
  "Bare Land":         "#95a5a6",
  "Bareland":          "#95a5a6",
};

function metersPerPx(zoom, lat) {
  return (Math.cos((lat * Math.PI) / 180) * 2 * Math.PI * 6378137) /
         (256 * Math.pow(2, zoom));
}

// ── Geocoding search ──────────────────────────────────────────────────────────
function GeoSearch({ leafletRef }) {
  const [query,   setQuery]   = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open,    setOpen]    = useState(false);
  const timerRef = useRef(null);

  const search = async (q) => {
    if (!q.trim()) return;
    setLoading(true);
    try {
      const r = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5`,
        { headers: { "Accept-Language": "en" } }
      );
      const data = await r.json();
      setResults(data);
      setOpen(data.length > 0);
    } catch { toast("Location search failed.", "error"); }
    finally { setLoading(false); }
  };

  const handleInput = (e) => {
    setQuery(e.target.value);
    setOpen(false);
    clearTimeout(timerRef.current);
    if (e.target.value.trim().length > 2)
      timerRef.current = setTimeout(() => search(e.target.value), 500);
    else setResults([]);
  };

  const selectResult = (item) => {
    leafletRef.current?.setView(
      [parseFloat(item.lat), parseFloat(item.lon)],
      Math.max(MIN_ZOOM, leafletRef.current.getZoom())
    );
    setQuery(item.display_name.split(",").slice(0, 2).join(", "));
    setOpen(false);
    setResults([]);
  };

  return (
    <div className="geo-search-wrap">
      <div className="geo-search-input-row">
        <svg className="geo-search-icon" width="14" height="14" viewBox="0 0 24 24"
          fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="2">
          <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
        </svg>
        <input
          className="geo-search-input" type="text"
          placeholder="Search location… (e.g. Makati, Quezon City)"
          value={query} onChange={handleInput}
          onKeyDown={(e) => { if (e.key === "Enter") { clearTimeout(timerRef.current); search(query); } }}
          autoComplete="off" id="lcd-change-geo-search"
        />
        {loading && <span className="geo-spin" />}
        {query && (
          <button className="geo-clear"
            onClick={() => { setQuery(""); setResults([]); setOpen(false); }}>×</button>
        )}
      </div>
      {open && results.length > 0 && (
        <ul className="geo-results">
          {results.map((r, i) => (
            <li key={i} className="geo-result-item" onClick={() => selectResult(r)}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#2ec4b6" strokeWidth="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
              <span>{r.display_name}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── Satellite Map Capture Panel ───────────────────────────────────────────────
function MapCapturePanel({ onCaptureImage, beforeCaptured, afterCaptured }) {
  const mapDivRef  = useRef(null);
  const overlayRef = useRef(null);
  const leafletRef = useRef(null);

  const [zoom,      setZoom]      = useState(13);
  const [drawMode,  setDrawMode]  = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState(null);
  const [selection, setSelection] = useState(null);
  const [capturing, setCapturing] = useState(null); // "before" | "after" | null

  useEffect(() => {
    if (leafletRef.current) return;
    import("leaflet").then((mod) => {
      const L = mod.default ?? mod;
      const map = L.map(mapDivRef.current, {
        center: [14.5995, 120.9842], zoom: 13, zoomControl: true,
      });
      L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        { attribution: "Tiles © Esri — Maxar, GeoEye", maxZoom: 20 }
      ).addTo(map);
      map.on("zoomend", () => setZoom(map.getZoom()));
      leafletRef.current = map;
    });
    return () => { leafletRef.current?.remove(); leafletRef.current = null; };
  }, []);

  const enterDrawMode = useCallback(() => {
    leafletRef.current?.dragging.disable();
    leafletRef.current?.scrollWheelZoom.disable();
    leafletRef.current?.doubleClickZoom.disable();
    setDrawMode(true);
    setSelection(null);
  }, []);

  const exitDrawMode = useCallback(() => {
    leafletRef.current?.dragging.enable();
    leafletRef.current?.scrollWheelZoom.enable();
    leafletRef.current?.doubleClickZoom.enable();
    setDrawMode(false);
    setIsDrawing(false);
  }, []);

  const getPos = (e) => {
    const bounds = overlayRef.current.getBoundingClientRect();
    const src = e.touches ? e.touches[0] : e;
    return { x: src.clientX - bounds.left, y: src.clientY - bounds.top };
  };

  const onPointerDown = (e) => {
    if (!drawMode) return;
    e.preventDefault();
    const pos = getPos(e);
    setDrawStart(pos);
    setSelection({ x: pos.x, y: pos.y, w: 0, h: 0 });
    setIsDrawing(true);
  };

  const onPointerMove = (e) => {
    if (!isDrawing || !drawStart) return;
    e.preventDefault();
    const pos = getPos(e);
    setSelection({
      x: Math.min(drawStart.x, pos.x),
      y: Math.min(drawStart.y, pos.y),
      w: Math.abs(pos.x - drawStart.x),
      h: Math.abs(pos.y - drawStart.y),
    });
  };

  const onPointerUp = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    setIsDrawing(false);
    exitDrawMode();
  };

  const captureAs = useCallback(async (slot) => {
    const map = leafletRef.current;
    if (!map || !selection || selection.w < 20 || selection.h < 20) {
      toast("Draw a rectangle on the map first.", "warn");
      return;
    }
    const curZoom = map.getZoom();
    if (curZoom < MIN_ZOOM) {
      toast(`Zoom to Z${MIN_ZOOM}–${MAX_ZOOM} first.`, "warn", 5000);
      return;
    }
    setCapturing(slot);
    toast(`Capturing ${slot === "before" ? "Before" : "After"} image…`, "info", 1800);
    try {
      const nw = map.containerPointToLatLng([selection.x, selection.y]);
      const se = map.containerPointToLatLng([selection.x + selection.w, selection.y + selection.h]);
      const result = await api.captureTiles(nw.lng, se.lat, se.lng, nw.lat, 640, curZoom);
      if (!result.image) throw new Error("No image returned.");
      onCaptureImage(slot, result.image);
      toast(`${slot === "before" ? "Before" : "After"} image captured!`, "success");
    } catch (err) {
      toast(`Capture failed: ${err.message}`, "error");
    } finally {
      setCapturing(null);
    }
  }, [selection, onCaptureImage]);

  const zoomTooLow  = zoom < MIN_ZOOM;
  const zoomOk      = !zoomTooLow && zoom <= MAX_ZOOM;
  const hasSelection = selection && selection.w > 20 && selection.h > 20;
  const mpp  = leafletRef.current ? metersPerPx(zoom, leafletRef.current.getCenter().lat) : 1.2;
  const selMW = selection ? Math.round(selection.w * mpp) : 0;
  const selMH = selection ? Math.round(selection.h * mpp) : 0;

  return (
    <div className="lcd-map-capture-wrap glass-card">
      <div className="lcd-map-capture-header">
        <div className="lcd-step-badge">Step 1</div>
        <span>Navigate to your area of interest, then draw a rectangle and capture it as <strong>Before</strong> and <strong>After</strong></span>
      </div>

      <GeoSearch leafletRef={leafletRef} />

      <div className="map-outer">
        <div ref={mapDivRef} className="map-container lcd-map-container" id="lcd-change-map" />

        <div
          ref={overlayRef}
          className={`draw-overlay ${drawMode ? "active" : ""}`}
          onMouseDown={onPointerDown} onMouseMove={onPointerMove}
          onMouseUp={onPointerUp} onMouseLeave={onPointerUp}
          onTouchStart={onPointerDown} onTouchMove={onPointerMove} onTouchEnd={onPointerUp}
        >
          {selection && selection.w > 4 && (
            <div
              className={`drawn-rect ${isDrawing ? "drawing" : "done"}`}
              style={{ left: selection.x, top: selection.y, width: selection.w, height: selection.h }}
            >
              <span className="rect-label">
                {Math.round(selection.w)} × {Math.round(selection.h)} px
                {!isDrawing && selMW > 0 && <> · ~{selMW}×{selMH} m</>}
              </span>
            </div>
          )}
          {drawMode && !isDrawing && !selection && (
            <div className="draw-hint-overlay">
              <div className="draw-crosshair" />
              <span>Click and drag to select the land area</span>
            </div>
          )}
        </div>

        <div className={`zoom-badge ${zoomOk ? "ok" : "low"}`}>Z{zoom}</div>

        {zoomTooLow && (
          <div className="zoom-warn-overlay low">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            <span>Zoom to <strong>Z{MIN_ZOOM}–{MAX_ZOOM}</strong> to capture</span>
            <small>Current Z{zoom} — scroll in {MIN_ZOOM - zoom} more level{MIN_ZOOM - zoom !== 1 ? "s" : ""}</small>
          </div>
        )}
      </div>

      {/* Controls row */}
      <div className="lcd-capture-controls">
        <button
          className={`btn-draw ${drawMode ? "cancel" : hasSelection ? "redo" : "default"}`}
          onClick={drawMode ? exitDrawMode : enterDrawMode}
          id="lcd-draw-btn"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {drawMode
              ? <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>
              : <rect x="3" y="3" width="18" height="18" rx="1"/>}
          </svg>
          {drawMode ? "Cancel" : hasSelection ? "Redraw" : "Draw Area"}
        </button>

        <button
          className={`lcd-slot-btn before-btn ${hasSelection && zoomOk && capturing !== "before" ? "ready" : "dim"} ${capturing === "before" ? "busy" : ""} ${beforeCaptured ? "captured" : ""}`}
          onClick={() => captureAs("before")}
          disabled={!hasSelection || !zoomOk || !!capturing}
          id="lcd-capture-before-btn"
        >
          {capturing === "before"
            ? <><span className="btn-spin" />Capturing…</>
            : <>{beforeCaptured ? "✓ " : "📷 "}Capture as Before</>}
        </button>

        <button
          className={`lcd-slot-btn after-btn ${hasSelection && zoomOk && capturing !== "after" ? "ready" : "dim"} ${capturing === "after" ? "busy" : ""} ${afterCaptured ? "captured" : ""}`}
          onClick={() => captureAs("after")}
          disabled={!hasSelection || !zoomOk || !!capturing}
          id="lcd-capture-after-btn"
        >
          {capturing === "after"
            ? <><span className="btn-spin" />Capturing…</>
            : <>{afterCaptured ? "✓ " : "📷 "}Capture as After</>}
        </button>
      </div>

      <div className="map-instruction">
        {drawMode
          ? <><span className="hint-icon">✏</span> Drag on the map to draw your selection</>
          : zoomTooLow
            ? <><span className="hint-icon warn">⚠</span> Zoom to Z{MIN_ZOOM}–{MAX_ZOOM} first, then draw and capture</>
            : hasSelection
              ? <><span className="hint-icon ok">✓</span> Area selected (~{selMW}×{selMH} m) — capture as <strong>Before</strong> then <strong>After</strong></>
              : <><span className="hint-icon">↖</span> Draw a rectangle over the area you want to analyze</>}
      </div>
    </div>
  );
}

// ── TransitionHero ─────────────────────────────────────────────────────────────
function TransitionHero({ beforeType, afterType, beforeConf, afterConf }) {
  const beforeColor = CLASS_COLORS[beforeType] || "#7f8c8d";
  const afterColor  = CLASS_COLORS[afterType]  || "#7f8c8d";
  const isChange    = beforeType !== afterType;

  return (
    <div className={`lcd-transition-hero ${isChange ? "changed" : "stable"}`}>
      <div className="lcd-th-pill" style={{ borderColor: `${beforeColor}66`, background: `${beforeColor}15` }}>
        <div className="lcd-th-dot" style={{ background: beforeColor }} />
        <div className="lcd-th-pill-text">
          <span className="lcd-th-period">Before</span>
          <strong className="lcd-th-class" style={{ color: beforeColor }}>{beforeType}</strong>
          <span className="lcd-th-conf">{beforeConf}% confidence</span>
        </div>
      </div>

      <div className="lcd-th-arrow">
        {isChange
          ? <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          : <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#27ae60" strokeWidth="2.5">
              <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
            </svg>}
        <span className="lcd-th-arrow-label">{isChange ? "Changed to" : "No Change Detected"}</span>
      </div>

      <div className="lcd-th-pill" style={{ borderColor: `${afterColor}66`, background: `${afterColor}15` }}>
        <div className="lcd-th-dot" style={{ background: afterColor }} />
        <div className="lcd-th-pill-text">
          <span className="lcd-th-period">After</span>
          <strong className="lcd-th-class" style={{ color: afterColor }}>{afterType}</strong>
          <span className="lcd-th-conf">{afterConf}% confidence</span>
        </div>
      </div>
    </div>
  );
}

// ── Expandable probability table ───────────────────────────────────────────────
function ProbTable({ label, allProbs }) {
  const [open, setOpen] = useState(false);
  if (!allProbs || Object.keys(allProbs).length === 0) return null;
  const entries = Object.entries(allProbs).sort((a, b) => b[1] - a[1]);

  return (
    <div className="lcd-prob-table">
      <button className="lcd-prob-expand-btn" onClick={() => setOpen(o => !o)}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          {open ? <polyline points="18 15 12 9 6 15"/> : <polyline points="6 9 12 15 18 9"/>}
        </svg>
        {label} — All Class Probabilities
      </button>
      {open && (
        <div className="lcd-prob-rows">
          {entries.map(([cls, pct]) => (
            <div key={cls} className="lcd-prob-row">
              <span className="lcd-prob-cls">{cls}</span>
              <div className="lcd-prob-bar-track">
                <div className="lcd-prob-bar-fill"
                  style={{ width: `${pct}%`, background: CLASS_COLORS[cls] || "#4a90d9" }} />
              </div>
              <span className="lcd-prob-pct">{pct.toFixed(1)}%</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── MAIN COMPONENT ─────────────────────────────────────────────────────────────
export default function LandChangeDetection() {
  const [inputMode,     setInputMode]     = useState("map"); // "map" | "upload" | "sentinel"
  const [beforeB64,     setBeforeB64]     = useState(null);
  const [afterB64,      setAfterB64]      = useState(null);
  const [beforePreview, setBeforePreview] = useState(null);
  const [afterPreview,  setAfterPreview]  = useState(null);
  const [result,        setResult]        = useState(null);
  const [loading,       setLoading]       = useState(false);

  const handleMapCapture = useCallback((slot, dataUrl) => {
    if (slot === "before") { setBeforeB64(dataUrl); setBeforePreview(dataUrl); }
    else                   { setAfterB64(dataUrl);  setAfterPreview(dataUrl); }
    setResult(null);
  }, []);

  const handleUploadSelect = (slot, file, _, b64) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    if (slot === "before") { setBeforeB64(b64); setBeforePreview(url); }
    else                   { setAfterB64(b64);  setAfterPreview(url); }
    setResult(null);
  };

  const handleAnalyze = async () => {
    if (!beforeB64 || !afterB64) return;
    setLoading(true);
    setResult(null);
    try {
      const data = await api.changeDetection(beforeB64, afterB64);
      setResult(data);
      toast(`${data.beforeType} → ${data.afterType}`, "success");
    } catch (err) {
      toast(err.message || "Analysis failed. Is the backend running?", "error");
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (mode) => {
    setInputMode(mode);
    setResult(null);
    // keep images when switching between map/upload
  };

  const canAnalyze = beforeB64 && afterB64;

  return (
    <div className="lcd-page">
      <div className="lcd-hero">
        <div className="lcd-hero-overlay" />
        <div className="lcd-content">

          {/* ── Mode tabs ──────────────────────────────────────────────── */}
          <div className="lcd-mode-bar glass-card">
            <button id="lcd-mode-map"
              className={`lcd-mode-btn ${inputMode === "map" ? "active map" : ""}`}
              onClick={() => switchMode("map")}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/>
                <line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/>
              </svg>
              Satellite Map
              <span className="lcd-mode-badge">Interactive</span>
            </button>

            <button id="lcd-mode-upload"
              className={`lcd-mode-btn ${inputMode === "upload" ? "active upload" : ""}`}
              onClick={() => switchMode("upload")}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              Upload Images
              <span className="lcd-mode-badge manual">ResNet50</span>
            </button>

            <button id="lcd-mode-sentinel"
              className={`lcd-mode-btn ${inputMode === "sentinel" ? "active sentinel" : ""}`}
              onClick={() => switchMode("sentinel")}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M2 12h20M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20"/>
              </svg>
              Sentinel-2
              <span className="lcd-mode-badge">Real Data</span>
            </button>
          </div>

          {/* ── Satellite Map mode ─────────────────────────────────────── */}
          {inputMode === "map" && (
            <>
              <MapCapturePanel
                onCaptureImage={handleMapCapture}
                beforeCaptured={!!beforeB64}
                afterCaptured={!!afterB64}
              />

              {/* Captured image previews */}
              {(beforePreview || afterPreview) && (
                <div className="lcd-captured-row glass-card">
                  <div className="lcd-step-badge" style={{ alignSelf: "flex-start" }}>Step 2</div>
                  <div className="lcd-captured-slots">
                    <div className="lcd-captured-slot">
                      <span className="lcd-captured-label">
                        <span className="lcd-slot-dot before-dot" />Before Image
                      </span>
                      {beforePreview
                        ? <img src={beforePreview} alt="Before capture" className="lcd-captured-img" />
                        : <div className="lcd-captured-empty">Not captured yet — click "Capture as Before"</div>}
                    </div>
                    <div className="lcd-captured-vs">→</div>
                    <div className="lcd-captured-slot">
                      <span className="lcd-captured-label">
                        <span className="lcd-slot-dot after-dot" />After Image
                      </span>
                      {afterPreview
                        ? <img src={afterPreview} alt="After capture" className="lcd-captured-img" />
                        : <div className="lcd-captured-empty">Not captured yet — click "Capture as After"</div>}
                    </div>
                  </div>

                  <button
                    className={`btn-analyze ${canAnalyze ? "active" : ""} lcd-analyze-full`}
                    onClick={handleAnalyze}
                    disabled={!canAnalyze || loading}
                    id="lcd-analyze-btn-map"
                  >
                    {loading
                      ? <><span className="btn-spinner" />Analyzing with ResNet50…</>
                      : <>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 014-4h14"/>
                            <path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 01-4 4H3"/>
                          </svg>
                          Analyze Changes
                        </>}
                  </button>
                </div>
              )}
            </>
          )}

          {/* ── Upload mode ─────────────────────────────────────────────── */}
          {inputMode === "upload" && (
            <>
              <div className="lcd-upload-row">
                <div className="lcd-upload-panel glass-card">
                  <div className="lcd-panel-header">
                    <h3 className="lcd-panel-title">Before Image</h3>
                    <span className="lcd-time-badge">Time 1</span>
                  </div>
                  <ImageUploader
                    label="Upload Before Image" sublabel="Earlier time period"
                    onImageSelect={(f, url, b64) => handleUploadSelect("before", f, url, b64)}
                    buttonColor="blue"
                  />
                  {beforePreview && (
                    <img src={beforePreview} alt="Before preview" className="lcd-upload-thumb" />
                  )}
                </div>

                <div className="lcd-upload-panel glass-card">
                  <div className="lcd-panel-header">
                    <h3 className="lcd-panel-title">After Image</h3>
                    <span className="lcd-time-badge">Time 2</span>
                  </div>
                  <ImageUploader
                    label="Upload After Image" sublabel="Later time period"
                    onImageSelect={(f, url, b64) => handleUploadSelect("after", f, url, b64)}
                    buttonColor="teal"
                  />
                  {afterPreview && (
                    <img src={afterPreview} alt="After preview" className="lcd-upload-thumb" />
                  )}
                </div>
              </div>

              <div className="lcd-info-row glass-card">
                <div className="lcd-info-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                    <path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 014-4h14"/>
                    <path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 01-4 4H3"/>
                  </svg>
                </div>
                <div className="lcd-info-text">
                  <h4>Land Change Detection</h4>
                  <p>Upload two satellite images of the same location from different time periods. ResNet50 classifies each into one of 5 land cover classes and compares results.</p>
                  <ul>
                    <li>5-class model: Urban, Vegetation, Water, Agriculture, Bare Land</li>
                    <li>Changes derived from direct class-label transitions</li>
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
                    {loading ? <><span className="btn-spinner" />Analyzing…</> : "Analyze Changes"}
                  </button>
                  {result && (
                    <button className="btn-export-change" onClick={() => exportChangePDF(result)}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                        <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                      </svg>
                      Export PDF
                    </button>
                  )}
                </div>
              </div>
            </>
          )}

          {/* ── Sentinel mode ─────────────────────────────────────────── */}
          {inputMode === "sentinel" && <SentinelChangeDetection />}

          {/* ── RESULTS (shared: map + upload) ─────────────────────────── */}
          {result && inputMode !== "sentinel" && (
            <div className="lcd-results glass-card">
              <h3 className="lcd-results-title">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2ec4b6" strokeWidth="2">
                  <path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 014-4h14"/>
                  <path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 01-4 4H3"/>
                </svg>
                Change Detection Results
              </h3>

              {/* Hero transition card */}
              <TransitionHero
                beforeType={result.beforeType} afterType={result.afterType}
                beforeConf={result.beforeConf} afterConf={result.afterConf}
              />

              {/* Side-by-side image previews */}
              {(beforePreview || afterPreview) && (
                <div className="lcd-result-images">
                  {beforePreview && (
                    <div className="lcd-result-img-slot">
                      <span className="lcd-result-img-label before-label">Before</span>
                      <img src={beforePreview} alt="Before" className="lcd-result-img" />
                    </div>
                  )}
                  <div className="lcd-result-img-arrow">→</div>
                  {afterPreview && (
                    <div className="lcd-result-img-slot">
                      <span className="lcd-result-img-label after-label">After</span>
                      <img src={afterPreview} alt="After" className="lcd-result-img" />
                    </div>
                  )}
                </div>
              )}

              {/* Change probability bars */}
              <div className="lcd-results-section-label">Detected Changes</div>
              <div className="lcd-results-grid">
                {result.changes.map((item, i) => (
                  <div key={i} className="lcd-result-item">
                    <div className="lcd-result-header">
                      <span className="lcd-result-label">{item.label}</span>
                      <span className="lcd-result-percent">{item.percent}%</span>
                    </div>
                    <div className="lcd-result-bar-track">
                      <div className="lcd-result-bar-fill"
                        style={{ width: `${item.percent}%`, background: item.color }} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Expandable per-image probability tables */}
              {(result.beforeAllProbs || result.afterAllProbs) && (
                <div className="lcd-prob-section">
                  <div className="lcd-results-section-label">Model Probabilities</div>
                  <ProbTable label="Before Image" allProbs={result.beforeAllProbs} />
                  <ProbTable label="After Image"  allProbs={result.afterAllProbs} />
                </div>
              )}

              {/* Export */}
              <button className="btn-export-change lcd-export-bottom" onClick={() => exportChangePDF(result)}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                Export PDF Report
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}