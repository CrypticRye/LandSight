import { useState, useEffect, useRef, useCallback } from "react";
import { formatDistanceToNow } from "../utils/time";
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
const PIN_COLORS = {
  Agriculture: "#4ade80", Bareland: "#fbbf24",
  Urban: "#a5b4fc", Vegetation: "#34d399", Water: "#60a5fa",
};

function SatelliteMapPicker({ onCapture, pins = [] }) {
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

  // ── Render pins ───────────────────────────────────────────────────────────────
  const pinsLayerRef = useRef([]);
  useEffect(() => {
    const map = leafletRef.current;
    if (!map || pins.length === 0) return;
    import("leaflet").then((mod) => {
      const L = mod.default ?? mod;
      // Remove old markers
      pinsLayerRef.current.forEach(m => map.removeLayer(m));
      pinsLayerRef.current = [];
      // Add new markers
      pins.forEach(p => {
        const color = PIN_COLORS[p.landType] || "#2ec4b6";
        const m = L.circleMarker([p.lat, p.lng], {
          radius: 8, fillColor: color, color: "white",
          weight: 2, opacity: 1, fillOpacity: 0.9,
        }).bindPopup(`<b>${p.landType}</b><br>${p.conf}% confidence`);
        m.addTo(map);
        pinsLayerRef.current.push(m);
      });
    });
  }, [pins]);

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

      // Route through Flask backend — fetches individual tiles and stitches them
      const curZoom = map.getZoom();
      const result = await api.captureTiles(nw.lng, se.lat, se.lng, nw.lat, 640, curZoom);

      if (!result.image) throw new Error("No image returned from server.");

      // result.image is already a data URL (data:image/jpeg;base64,...)
      const b64     = result.image;
      const preview = result.image;        // same data URL works as preview src

      // compute center lat/lng for pin placement
      const centerLat = (nw.lat + se.lat) / 2;
      const centerLng = (nw.lng + se.lng) / 2;

      onCapture(b64, preview, { lat: centerLat, lng: centerLng });
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
  const [result,        setResult]        = useState(null);
  const [imageDataUrl,  setImageDataUrl]  = useState(null);
  const [loading,       setLoading]       = useState(false);
  const [inputMode,     setInputMode]     = useState("map");
  const [historyTrigger, setHistoryTrigger] = useState(0);
  const [mapPins,        setMapPins]       = useState([]);

  const runClassify = async (b64, previewUrl, filename = "capture.jpg", coords = null) => {
    setImageDataUrl(previewUrl);
    setLoading(true);
    setResult(null);
    try {
      const data = await api.classify(b64, filename);
      setResult(data);
      // Drop a colored pin on map if we have coords
      if (coords) {
        setMapPins(prev => [...prev, { ...coords, landType: data.landType, conf: data.confidence }]);
      }
      // Auto-refresh history panel
      setHistoryTrigger(t => t + 1);
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
  const handleMapCapture   = (b64, previewUrl, coords) => runClassify(b64, previewUrl, "map-capture.jpg", coords);

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
              ? <SatelliteMapPicker onCapture={handleMapCapture} pins={mapPins} />
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
      <PredictionHistory refreshTrigger={historyTrigger} />
    </div>
  );
}

// ── Prediction History ───────────────────────────────────────────────────────
const CLASS_COLORS = {
  Agriculture: { bg: "rgba(34,197,94,0.15)",  border: "rgba(34,197,94,0.4)",  text: "#4ade80" },
  Bareland:    { bg: "rgba(217,119,6,0.15)",   border: "rgba(217,119,6,0.4)",  text: "#fbbf24" },
  Urban:       { bg: "rgba(99,102,241,0.15)",  border: "rgba(99,102,241,0.4)", text: "#a5b4fc" },
  Vegetation:  { bg: "rgba(16,185,129,0.15)",  border: "rgba(16,185,129,0.4)",text: "#34d399" },
  Water:       { bg: "rgba(59,130,246,0.15)",  border: "rgba(59,130,246,0.4)",text: "#60a5fa" },
};

function PredictionHistory({ refreshTrigger = 0 }) {
  const [records,  setRecords]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [page,     setPage]     = useState(1);
  const [hasMore,  setHasMore]  = useState(false);
  const [total,    setTotal]    = useState(0);
  const [error,    setError]    = useState(null);
  const [clearing, setClearing] = useState(false);

  const fetchHistory = useCallback(async (p = 1, append = false) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.history(p);
      setRecords(prev => append ? [...prev, ...data.records] : data.records);
      setTotal(data.total);
      setHasMore(p < data.pages);
      setPage(p);
    } catch (err) {
      setError(err.message || "Failed to load history.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchHistory(1); }, [fetchHistory, refreshTrigger]);

  const loadMore = () => fetchHistory(page + 1, true);

  const handleDelete = async (id) => {
    try {
      await api.deleteRecord(id);
      setRecords(prev => prev.filter(r => r.id !== id));
      setTotal(t => t - 1);
    } catch (err) {
      toast(err.message || "Delete failed.", "error");
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm(`Delete all ${total} prediction records? This cannot be undone.`)) return;
    setClearing(true);
    try {
      await api.clearHistory();
      setRecords([]); setTotal(0); setHasMore(false);
    } catch (err) {
      toast(err.message || "Clear failed.", "error");
    } finally {
      setClearing(false);
    }
  };

  const handleExport = () => window.open(api.exportCSV(), "_blank");

  return (
    <section className="ph-section">
      <div className="ph-header">
        <div className="ph-title-row">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2ec4b6" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
          <h2 className="ph-title">Prediction History</h2>
          {total > 0 && <span className="ph-badge">{total} total</span>}
        </div>
        <div className="ph-header-actions">
          {total > 0 && (
            <>
              <button className="ph-action-btn export" onClick={handleExport} title="Export CSV" id="lc-history-export">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                CSV
              </button>
              <button className="ph-action-btn danger" onClick={handleClearAll} disabled={clearing} title="Clear all" id="lc-history-clear">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6l-1 14H6L5 6"/>
                  <path d="M10 11v6"/><path d="M14 11v6"/>
                  <path d="M9 6V4h6v2"/>
                </svg>
                {clearing ? "Clearing…" : "Clear All"}
              </button>
            </>
          )}
          <button className="ph-refresh" onClick={() => fetchHistory(1)} title="Refresh" id="lc-history-refresh">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="23 4 23 10 17 10"/>
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="ph-error">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          {error}
        </div>
      )}

      {loading && records.length === 0 ? (
        <div className="ph-skeletons">
          {[...Array(4)].map((_, i) => <div key={i} className="ph-skeleton" />)}
        </div>
      ) : records.length === 0 ? (
        <div className="ph-empty">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
          </svg>
          <p>No predictions yet</p>
          <span>Predictions will appear here after you classify an image</span>
        </div>
      ) : (
        <>
          <div className="ph-grid">
            {records.map(rec => {
              const colors = CLASS_COLORS[rec.landType] || CLASS_COLORS.Urban;
              const conf = rec.confidence ?? 0;
              return (
                <div key={rec.id} className="ph-card">
                  {rec.image_base64 && (
                    <div className="ph-thumb-wrap">
                      <img className="ph-thumb" src={rec.image_base64} alt={rec.landType} />
                    </div>
                  )}
                  <div className="ph-card-body">
                    <div className="ph-card-top">
                      <span className="ph-class-badge" style={{ background: colors.bg, border: `1px solid ${colors.border}`, color: colors.text }}>
                        {rec.landType}
                      </span>
                      <div className="ph-card-top-right">
                        <span className="ph-conf">{conf}%</span>
                        <button className="ph-delete-btn" onClick={() => handleDelete(rec.id)} title="Delete" aria-label="Delete record">
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6l-1 14H6L5 6"/>
                            <path d="M10 11v6"/><path d="M14 11v6"/>
                            <path d="M9 6V4h6v2"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                    <div className="ph-conf-bar-wrap">
                      <div className="ph-conf-bar" style={{ width: `${conf}%`, background: colors.text }} />
                    </div>
                    <div className="ph-card-meta">
                      <span className="ph-filename" title={rec.filename}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                          <polyline points="14 2 14 8 20 8"/>
                        </svg>
                        {rec.filename || "—"}
                      </span>
                      <span className="ph-time">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                        </svg>
                        {formatDistanceToNow(rec.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {hasMore && (
            <div className="ph-load-more">
              <button className="ph-load-btn" onClick={loadMore} disabled={loading} id="lc-history-load-more">
                {loading ? <><span className="ph-spin" />Loading…</> : "Load More"}
              </button>
            </div>
          )}
        </>
      )}
    </section>
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