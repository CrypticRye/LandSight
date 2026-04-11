import { useState, useEffect, useRef, useCallback } from "react";
import ClassificationResult from "./ClassificationResult";
import SampleClassifications from "./SampleClassifications";
import { toast } from "./Toast";
import { api, fileToBase64 } from "../utils/api";
import "leaflet/dist/leaflet.css";
import "./LandClassification.css";

const MIN_ZOOM = 17;
const MAX_ZOOM = 18;

// Recommended drawn size in pixels (at Z17–18 this ≈ 200–400 m on the ground)
const RECOMMENDED_PX = 300;

// ── Real-world size estimator ─────────────────────────────────────────────────
// Compute approximate metres-per-pixel for the Esri/OSM tile grid at a given
// zoom level and latitude.
function metersPerPx(zoom, lat) {
  return (Math.cos((lat * Math.PI) / 180) * 2 * Math.PI * 6378137) /
         (256 * Math.pow(2, zoom));
}

// ── Geocoding search bar (Nominatim / no API key) ─────────────────────────────
function GeoSearch({ leafletRef }) {
  const [query,    setQuery]    = useState("");
  const [results,  setResults]  = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [open,     setOpen]     = useState(false);
  const inputRef = useRef(null);

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
    } catch {
      toast("Location search failed. Check internet connection.", "error");
    } finally {
      setLoading(false);
    }
  };

  // Debounce — wait 500 ms after last keystroke before firing
  const timerRef = useRef(null);
  const handleInput = (e) => {
    const val = e.target.value;
    setQuery(val);
    setOpen(false);
    clearTimeout(timerRef.current);
    if (val.trim().length > 2) {
      timerRef.current = setTimeout(() => search(val), 500);
    } else {
      setResults([]);
    }
  };

  const handleKey = (e) => {
    if (e.key === "Enter") { clearTimeout(timerRef.current); search(query); }
    if (e.key === "Escape") { setOpen(false); }
  };

  const selectResult = (item) => {
    const lat = parseFloat(item.lat);
    const lon = parseFloat(item.lon);
    leafletRef.current?.setView([lat, lon], Math.max(MIN_ZOOM, leafletRef.current.getZoom()));
    setQuery(item.display_name.split(",").slice(0, 2).join(", "));
    setOpen(false);
    setResults([]);
    inputRef.current?.blur();
  };

  return (
    <div className="geo-search-wrap">
      <div className="geo-search-input-row">
        <svg className="geo-search-icon" width="14" height="14" viewBox="0 0 24 24"
          fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="2">
          <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
        </svg>
        <input
          ref={inputRef}
          className="geo-search-input"
          type="text"
          placeholder="Search location… (e.g. Makati, Quezon City)"
          value={query}
          onChange={handleInput}
          onKeyDown={handleKey}
          onFocus={() => results.length > 0 && setOpen(true)}
          id="lc-geo-search"
          autoComplete="off"
        />
        {loading && <span className="geo-spin" />}
        {query && (
          <button className="geo-clear" onClick={() => { setQuery(""); setResults([]); setOpen(false); }}>
            ×
          </button>
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

// ── Satellite Map Picker ───────────────────────────────────────────────────────
function SatelliteMapPicker({ onCapture }) {
  const mapDivRef     = useRef(null);
  const overlayRef    = useRef(null);
  const leafletRef    = useRef(null);
  const labelsLayRef  = useRef(null);   // labels tile layer ref

  const [zoom,       setZoom]       = useState(13);
  const [drawMode,   setDrawMode]   = useState(false);
  const [isDrawing,  setIsDrawing]  = useState(false);
  const [drawStart,  setDrawStart]  = useState(null);
  const [selection,  setSelection]  = useState(null); // { x, y, w, h }
  const [capturing,  setCapturing]  = useState(false);
  const [showLabels, setShowLabels] = useState(false);

  // ── init Leaflet ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (leafletRef.current) return;

    import("leaflet").then((mod) => {
      const L = mod.default ?? mod;

      const map = L.map(mapDivRef.current, {
        center:      [14.5995, 120.9842],
        zoom:        13,
        zoomControl: true,
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

  // ── label toggle ─────────────────────────────────────────────────────────────
  const toggleLabels = useCallback(() => {
    const map = leafletRef.current;
    if (!map) return;

    import("leaflet").then((mod) => {
      const L = mod.default ?? mod;
      if (labelsLayRef.current) {
        map.removeLayer(labelsLayRef.current);
        labelsLayRef.current = null;
        setShowLabels(false);
      } else {
        const layer = L.tileLayer(
          "https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
          { opacity: 0.75, maxZoom: 20, pane: "overlayPane" }
        );
        layer.addTo(map);
        labelsLayRef.current = layer;
        setShowLabels(true);
      }
    });
  }, []);

  // ── draw mode ────────────────────────────────────────────────────────────────
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

  // ── pointer events ───────────────────────────────────────────────────────────
  const getPos = (e) => {
    const bounds = overlayRef.current.getBoundingClientRect();
    const src    = e.touches ? e.touches[0] : e;
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

  // ── capture ──────────────────────────────────────────────────────────────────
  const handleCapture = useCallback(async () => {
    const map = leafletRef.current;
    if (!map || !selection || selection.w < 20 || selection.h < 20) {
      toast("Draw a rectangle on the map first.", "warn");
      return;
    }

    const curZoom = map.getZoom();
    if (curZoom < MIN_ZOOM) {
      toast(`Zoom to Z${MIN_ZOOM}–${MAX_ZOOM} before classifying. Current: Z${curZoom}.`, "warn", 5000);
      return;
    }
    if (curZoom > MAX_ZOOM) {
      toast(`Too zoomed in (Z${curZoom}). Zoom out to Z${MIN_ZOOM}–${MAX_ZOOM}.`, "warn", 5000);
      return;
    }

    setCapturing(true);
    toast("Capturing via server…", "info", 1800);

    try {
      const nw = map.containerPointToLatLng([selection.x,               selection.y]);
      const se = map.containerPointToLatLng([selection.x + selection.w,  selection.y + selection.h]);

      // Route through Flask backend — avoids Esri CORS restriction in the browser
      const result = await api.captureTiles(nw.lng, se.lat, se.lng, nw.lat, 640);

      if (!result.image) throw new Error("No image returned from server.");

      // result.image is already a data URL (data:image/jpeg;base64,...)
      const b64     = result.image;
      const preview = result.image;        // same data URL works as preview src

      onCapture(b64, preview);
      toast("Area captured — classifying…", "success");
      setSelection(null);
    } catch (err) {
      toast(`Capture failed: ${err.message}`, "error");
    } finally {
      setCapturing(false);
    }
  }, [selection, onCapture]);

  // ── derived ──────────────────────────────────────────────────────────────────
  const zoomTooLow   = zoom < MIN_ZOOM;
  const zoomTooHigh  = zoom > MAX_ZOOM;
  const zoomOk       = !zoomTooLow && !zoomTooHigh;
  const hasSelection = selection && selection.w > 20 && selection.h > 20;
  const canCapture   = hasSelection && zoomOk && !capturing;

  // Real-world size hint for current selection
  const mpp    = leafletRef.current ? metersPerPx(zoom, leafletRef.current.getCenter().lat) : 1.2;
  const selMW  = selection ? Math.round(selection.w * mpp) : 0;
  const selMH  = selection ? Math.round(selection.h * mpp) : 0;

  // Recommended size hint calculation (shown before drawing)
  const recMW  = Math.round(RECOMMENDED_PX * mpp);

  return (
    <div className="map-picker-wrap">

      {/* ── Geocoding search ─────────────────────────────────────────── */}
      <GeoSearch leafletRef={leafletRef} />

      {/* ── Map + overlay ────────────────────────────────────────────── */}
      <div className="map-outer">
        <div ref={mapDivRef} className="map-container" id="lc-satellite-map" />

        {/* Draw overlay */}
        <div
          ref={overlayRef}
          className={`draw-overlay ${drawMode ? "active" : ""}`}
          onMouseDown={onPointerDown}
          onMouseMove={onPointerMove}
          onMouseUp={onPointerUp}
          onMouseLeave={onPointerUp}
          onTouchStart={onPointerDown}
          onTouchMove={onPointerMove}
          onTouchEnd={onPointerUp}
        >
          {/* Selection rect */}
          {selection && selection.w > 4 && (
            <div
              className={`drawn-rect ${isDrawing ? "drawing" : "done"}`}
              style={{ left: selection.x, top: selection.y, width: selection.w, height: selection.h }}
            >
              {/* Always show px — live counter while drawing, details when done */}
              <span className="rect-label">
                {Math.round(selection.w)} × {Math.round(selection.h)} px
                {!isDrawing && selMW > 0 && <> · ~{selMW}×{selMH} m</>}
              </span>
            </div>
          )}

          {/* Cross-hair hint */}
          {drawMode && !isDrawing && !selection && (
            <div className="draw-hint-overlay">
              <div className="draw-crosshair" />
              <span>Click and drag to select land area</span>
            </div>
          )}
        </div>

        {/* Zoom badge */}
        <div className={`zoom-badge ${zoomOk ? "ok" : zoomTooLow ? "low" : "high"}`}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
          </svg>
          Z{zoom}
        </div>

        {/* Labels toggle pill (top-right corner of map) */}
        <button
          className={`labels-toggle ${showLabels ? "on" : "off"}`}
          onClick={toggleLabels}
          title={showLabels ? "Hide labels" : "Show labels"}
          id="lc-labels-toggle"
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M2 4h20M2 10h15M2 16h10"/>
          </svg>
          {showLabels ? "Labels: On" : "Labels: Off"}
        </button>

        {/* Zoom warnings */}
        {zoomTooLow && (
          <div className="zoom-warn-overlay low">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            <span>Zoom to <strong>Z{MIN_ZOOM}–{MAX_ZOOM}</strong> to enable classification</span>
            <small>Current Z{zoom} — scroll in {MIN_ZOOM - zoom} more level{MIN_ZOOM - zoom !== 1 ? "s" : ""}</small>
          </div>
        )}
        {zoomTooHigh && (
          <div className="zoom-warn-overlay high">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <span>Too zoomed in (Z{zoom}) — zoom out to Z{MIN_ZOOM}–{MAX_ZOOM}</span>
            <small>Area too small for accurate land classification</small>
          </div>
        )}
      </div>

      {/* ── Toolbar ─────────────────────────────────────────────────── */}
      <div className="map-controls-row">
        <button
          className={`btn-draw ${drawMode ? "cancel" : hasSelection ? "redo" : "default"}`}
          onClick={drawMode ? exitDrawMode : enterDrawMode}
          disabled={capturing}
          id="lc-draw-btn"
        >
          {drawMode ? (
            <>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
              Cancel
            </>
          ) : (
            <>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="1"/>
              </svg>
              {hasSelection ? "Redraw" : "Draw Selection"}
            </>
          )}
        </button>

        <button
          className={`btn-capture ${canCapture ? "ready" : "dim"} ${capturing ? "busy" : ""}`}
          onClick={handleCapture}
          disabled={!canCapture || capturing}
          id="lc-capture-btn"
        >
          {capturing ? (
            <><span className="btn-spin" />Capturing…</>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
              Classify Selection
            </>
          )}
        </button>
      </div>

      {/* ── Contextual hint ─────────────────────────────────────────── */}
      <div className="map-instruction">
        {drawMode ? (
          <><span className="hint-icon">✏</span> Drag on the map to draw your selection rectangle</>
        ) : zoomTooLow ? (
          <><span className="hint-icon warn">⚠</span> Zoom to Z{MIN_ZOOM}–{MAX_ZOOM} first, then draw a rectangle</>
        ) : zoomTooHigh ? (
          <><span className="hint-icon warn">⚠</span> Zoom out to Z{MIN_ZOOM}–{MAX_ZOOM} — area is too small</>
        ) : hasSelection ? (
          <><span className="hint-icon ok">✓</span> Selected ~{selMW}×{selMH} m — click <strong>Classify Selection</strong> or <strong>Redraw</strong></>
        ) : (
          <><span className="hint-icon">↖</span> Recommended: draw <strong>~{RECOMMENDED_PX}×{RECOMMENDED_PX} px</strong> ≈ <strong>~{recMW}×{recMW} m</strong> at Z{zoom}</>
        )}
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function LandClassification() {
  const [result,       setResult]       = useState(null);
  const [imageDataUrl, setImageDataUrl] = useState(null);
  const [loading,      setLoading]      = useState(false);
  const [inputMode,    setInputMode]    = useState("map");

  const runClassify = async (b64, previewUrl, filename = "capture.jpg") => {
    setImageDataUrl(previewUrl);
    setLoading(true);
    setResult(null);
    try {
      const data = await api.classify(b64, filename);
      setResult(data);
      if (!data.isSatellite) {
        toast("Warning: image may not be satellite imagery — results may be less accurate.", "warn", 6000);
      } else {
        toast(`Classified as ${data.landType} (${data.confidence}% confidence)`, "success");
      }
    } catch (err) {
      toast(err.message || "Classification failed. Is the backend running?", "error");
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const handleImageSelect  = async (file, previewUrl, b64) => { if (!file) { setResult(null); return; } await runClassify(b64, previewUrl, file.name); };
  const handleMapCapture   = (b64, previewUrl) => runClassify(b64, previewUrl, "map-capture.jpg");

  const handleSampleSelect = async (sample) => {
    setImageDataUrl(sample.url);
    setResult(null);
    setLoading(true);
    try {
      const res  = await fetch(sample.url);
      const blob = await res.blob();
      const file = new File([blob], `${sample.label}.jpg`, { type: "image/jpeg" });
      const b64  = await fileToBase64(file);
      const data = await api.classify(b64, file.name);
      setResult(data);
      toast(`Sample classified as ${data.landType}`, "success");
    } catch (err) {
      toast(err.message || "Classification failed.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="lc-page">
      <div className="lc-hero">
        <div className="lc-hero-overlay" />
        <div className="lc-content">

          <div className="lc-upload-card glass-card">
            <div className="lc-mode-tabs">
              <button className={`lc-mode-tab ${inputMode === "map" ? "active" : ""}`}
                onClick={() => setInputMode("map")} id="lc-mode-map">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/>
                  <line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/>
                </svg>
                Satellite Map
              </button>
              <button className={`lc-mode-tab ${inputMode === "upload" ? "active" : ""}`}
                onClick={() => setInputMode("upload")} id="lc-mode-upload">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
                Upload Image
              </button>
            </div>

            {inputMode === "map"
              ? <SatelliteMapPicker onCapture={handleMapCapture} />
              : (
                <>
                  <h2 className="lc-card-title">Upload Land Image</h2>
                  <UploadZone onImageSelect={handleImageSelect} />
                </>
              )
            }
          </div>

          <div className="lc-result-card glass-card">
            {loading ? (
              <div className="lc-loading">
                <div className="spinner" /><p>Analyzing with ResNet50…</p>
              </div>
            ) : (
              <ClassificationResult result={result} imageDataUrl={imageDataUrl} />
            )}
          </div>
        </div>
      </div>
      <SampleClassifications onSelectSample={handleSampleSelect} />
    </div>
  );
}

// ── Upload zone ───────────────────────────────────────────────────────────────
function UploadZone({ onImageSelect }) {
  const inputRef = useRef(null);
  const handleFile = async (file) => {
    if (!file) return;
    onImageSelect(file, URL.createObjectURL(file), await fileToBase64(file));
  };
  return (
    <div className="upload-zone"
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); }}>
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp"
        style={{ display: "none" }} onChange={(e) => handleFile(e.target.files[0])} />
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#2ec4b6" strokeWidth="1.5">
        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
        <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
      </svg>
      <p>Click or drag &amp; drop a satellite image</p>
      <span>JPG · PNG · WEBP</span>
    </div>
  );
}