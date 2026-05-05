import { useState, useRef } from "react";
import ImageUploader from "./ImageUploader";
import SentinelChangeDetection from "./SentinelChangeDetection";
import { toast } from "./Toast";
import { api } from "../utils/api";
import { exportChangePDF } from "../utils/pdf";
import "leaflet/dist/leaflet.css";
import "./LandClassification.css";
import "./LandChangeDetection.css";

const CLASS_COLORS = {
  "Urban Area": "#e67e22", "Urban": "#e67e22",
  "Vegetation": "#27ae60",
  "Water Body": "#3498db", "Water": "#3498db",
  "Agricultural Land": "#f1c40f", "Agriculture": "#f1c40f",
  "Bare Land": "#95a5a6", "Bareland": "#95a5a6",
};

// ── Embed the Wayback URL exactly as requested ────────────────────────────────
const WAYBACK_URL = import.meta.env.VITE_WAYBACK_DEFAULT_URL
  || "https://livingatlas.arcgis.com/wayback/#mapCenter=-115.22839%2C36.22130%2C16&mode=explore&active=22869";

// Parse mapCenter + active release from the Wayback URL hash
function parseWaybackUrl(url) {
  const hash = (url || "").split("#")[1] || "";
  const p = new URLSearchParams(hash);
  const c = p.get("mapCenter");
  if (!c) return null;
  const parts = c.split(",").map(Number);
  if (parts.length < 3 || parts.some(isNaN)) return null;
  const [lng, lat, zoom] = parts;
  return { lng, lat, zoom: Math.round(zoom), active: p.get("active") || null };
}

// Parse the .env URL once — this is the ground truth for the embedded iframe
const MAP = parseWaybackUrl(WAYBACK_URL) || { lng: -115.22839, lat: 36.22130, zoom: 16, active: "22869" };

// ── Web Mercator helpers ────────────────────────────────────────────────────
const D2R = Math.PI / 180;
const lngToPx = (lng, z) => ((lng + 180) / 360) * 256 * 2 ** z;
const latToPx = (lat, z) => {
  const s = Math.sin(lat * D2R);
  return (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * 256 * 2 ** z;
};
const pxToLng = (px, z) => (px / (256 * 2 ** z)) * 360 - 180;
const pxToLat = (py, z) => Math.atan(Math.sinh(Math.PI - (2 * Math.PI * py) / (256 * 2 ** z))) * (180 / Math.PI);

// Wayback sidebar width in pixels (the date-list panel on the left)
const SIDEBAR_W = 0; // Set to 0 because ArcGIS Wayback renders the map behind the sidebar

// ══════════════════════════════════════════════════════════════════════════════
function MapCapturePanel({ onCaptureImage }) {
  const overlayRef = useRef(null);
  const videoRef = useRef(null);
  const [drawMode,    setDrawMode]    = useState(false);
  const [isDrawing,   setIsDrawing]   = useState(false);
  const [drawStart,   setDrawStart]   = useState(null);
  const [selection,   setSelection]   = useState(null);
  const [isCapturing, setIsCapturing] = useState(null);

  const [videoStream, setVideoStream] = useState(null);

  const stopScreenShare = () => {
    if (videoStream) {
      videoStream.getTracks().forEach(t => t.stop());
      setVideoStream(null);
    }
  };

  const getPos = (e) => {
    const r = overlayRef.current.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const handleCapture = async (slot) => {
    if (!selection || selection.w < 10) { toast("Draw an area first.", "warn"); return; }
    
    let activeStream = videoStream;
    let activeVideo = videoRef.current;

    // Automatically prompt for tab sharing if not already active
    if (!activeStream) {
      try {
        activeStream = await navigator.mediaDevices.getDisplayMedia({
          video: { displaySurface: "browser" },
          audio: false,
          preferCurrentTab: true,
        });
        
        const track = activeStream.getVideoTracks()[0];
        const settings = track.getSettings();
        
        // ENFORCE 'This Tab' sharing. If they share the Window or Screen, the browser UI 
        // offsets the pixels, causing bad crops and black bars.
        if (settings.displaySurface && settings.displaySurface !== "browser") {
          toast("Error: You MUST select 'This Tab' for the capture to align correctly. Please try again.", "error");
          activeStream.getTracks().forEach(t => t.stop());
          return;
        }

        setVideoStream(activeStream);
        if (activeVideo) {
          activeVideo.srcObject = activeStream;
          await activeVideo.play();
        }
        track.onended = () => setVideoStream(null);
        
        // Give the video element a tiny fraction of a second to render the first frame
        await new Promise(r => setTimeout(r, 400));
      } catch (err) {
        toast("Screen sharing is required to capture the map exactly as seen.", "error");
        return;
      }
    }

    setDrawMode(false);
    setIsCapturing(slot);
    try {
      const canvas = document.createElement("canvas");
      
      const vw = activeVideo.videoWidth;
      const vh = activeVideo.videoHeight;
      const ww = window.innerWidth;
      const wh = window.innerHeight;
      
      // Calculate DPI scale (how much the video is scaled compared to CSS pixels)
      const scaleX = vw / ww;
      const scaleY = vh / wh;

      const overlayRect = overlayRef.current.getBoundingClientRect();
      const absX = overlayRect.left + selection.x;
      const absY = overlayRect.top + selection.y;

      const cropX = absX * scaleX;
      const cropY = absY * scaleY;
      const cropW = selection.w * scaleX;
      const cropH = selection.h * scaleY;

      canvas.width = cropW;
      canvas.height = cropH;

      const ctx = canvas.getContext("2d");
      ctx.drawImage(activeVideo, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

      const b64 = canvas.toDataURL("image/jpeg", 0.95);
      onCaptureImage(slot, b64);
      toast(`${slot === "before" ? "Before" : "After"} captured successfully!`, "success");
    } catch (err) {
      toast(`Capture failed: ${err.message}`, "error");
    } finally {
      setIsCapturing(null);
    }
  };

  return (
    <div className="lcd-map-capture-wrap">
      {/* Hidden video element receives the screen stream */}
      <video ref={videoRef} style={{ display: "none" }} muted playsInline />

      {/* Control Bar */}
      <div className="lcd-info-bar" style={{ justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span className="lcd-info-bar-icon">✂️</span>
          <span className="lcd-info-bar-text">
            <strong>Screen Snipping Tool</strong>
          </span>
          <span className="lcd-info-bar-hint">
            (Draw an area, click capture, and share <strong>This Tab</strong> when prompted)
          </span>
        </div>
        <div>
          {videoStream && (
            <button className="lcd-action-btn draw" onClick={stopScreenShare} style={{ padding: "4px 12px", fontSize: "11px", background: "rgba(248, 113, 113, 0.2)", color: "#f87171" }}>
              ⏹ Stop Capture Mode
            </button>
          )}
        </div>
      </div>

      {/* Embedded Wayback iframe — exactly as requested */}
      <div className="lcd-iframe-outer">
        <iframe
          id="wayback-explorer"
          src={WAYBACK_URL}
          title="Wayback Explorer"
          width="100%"
          height="100%"
          style={{ border: "none", background: "#050a12" }}
        />

        {/* Drawing overlay */}
        <div
          ref={overlayRef}
          className={`lcd-drawing-overlay ${drawMode ? "active" : ""}`}
          onMouseDown={(e) => {
            if (!drawMode) return;
            const p = getPos(e);
            setDrawStart(p);
            setSelection({ ...p, w: 0, h: 0 });
            setIsDrawing(true);
          }}
          onMouseMove={(e) => {
            if (!isDrawing) return;
            let p = getPos(e);
            const rect = overlayRef.current.getBoundingClientRect();
            
            // Calculate the strictly visible portion of the overlay (relative to the overlay itself)
            // This ensures we NEVER draw outside the visible browser window (which prevents black bars in the video crop)
            const minX = Math.max(0, -rect.left);
            const minY = Math.max(0, -rect.top);
            const maxX = Math.min(rect.width, window.innerWidth - rect.left);
            const maxY = Math.min(rect.height, window.innerHeight - rect.top);

            // Clamp mouse exactly to these visible bounds
            p.x = Math.max(minX, Math.min(p.x, maxX));
            p.y = Math.max(minY, Math.min(p.y, maxY));

            const diffX = p.x - drawStart.x;
            const diffY = p.y - drawStart.y;
            
            // Calculate max available width and height based on the direction the user is dragging
            const maxW = diffX > 0 ? maxX - drawStart.x : drawStart.x - minX;
            const maxH = diffY > 0 ? maxY - drawStart.y : drawStart.y - minY;
            
            // Force the selection to be a PERFECT SQUARE, bounded strictly by the visible screen area.
            const size = Math.min(Math.max(Math.abs(diffX), Math.abs(diffY)), maxW, maxH);
            
            setSelection({
              x: diffX > 0 ? drawStart.x : drawStart.x - size,
              y: diffY > 0 ? drawStart.y : drawStart.y - size,
              w: size,
              h: size,
            });
          }}
          onMouseUp={() => { setIsDrawing(false); setDrawMode(false); }}
        >
          {selection && selection.w > 2 && (
            <div
              className="lcd-draw-box"
              style={{ left: selection.x, top: selection.y, width: selection.w, height: selection.h }}
            >
              <span className="lcd-box-label">Target Area</span>
            </div>
          )}
        </div>

        {/* Floating controls */}
        <div className="lcd-map-overlay-controls">
          <div className="lcd-glass-panel">
            <button
              className={`lcd-action-btn draw ${drawMode ? "active" : ""}`}
              onClick={() => { setDrawMode(!drawMode); setSelection(null); }}
            >
              {drawMode ? "Drawing…" : "Draw Area"}
            </button>
            <div className="lcd-capture-group">
              <button
                className={`lcd-action-btn cap before ${isCapturing === "before" ? "loading" : ""}`}
                onClick={() => handleCapture("before")}
                disabled={!!isCapturing}
              >Before</button>
              <button
                className={`lcd-action-btn cap after ${isCapturing === "after" ? "loading" : ""}`}
                onClick={() => handleCapture("after")}
                disabled={!!isCapturing}
              >After</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
function TransitionHero({ result, beforePreview, afterPreview }) {
  const bC = CLASS_COLORS[result.beforeType] || "#7f8c8d";
  const aC = CLASS_COLORS[result.afterType]  || "#7f8c8d";
  const ch = result.beforeType !== result.afterType;
  return (
    <div className="lcd-hero-transition-wrap"><div className="lcd-hero-transition">
      <div className="lcd-th-pill" style={{ color: bC }}>
        {beforePreview && <img src={beforePreview} alt="Before" className="lcd-th-preview" />}
        <div className="lcd-th-dot" style={{ background: bC }} /><strong>{result.beforeType}</strong>
        <span className="lcd-th-conf">{result.beforeConf?.toFixed(1)}%</span>
      </div>
      <div className="lcd-th-arrow">{ch ? "→" : "✓"}<span className="lcd-th-change-label">{ch ? "Changed" : "Stable"}</span></div>
      <div className="lcd-th-pill" style={{ color: aC }}>
        {afterPreview && <img src={afterPreview} alt="After" className="lcd-th-preview" />}
        <div className="lcd-th-dot" style={{ background: aC }} /><strong>{result.afterType}</strong>
        <span className="lcd-th-conf">{result.afterConf?.toFixed(1)}%</span>
      </div>
    </div></div>
  );
}

function ClassChanges({ beforeProbs, afterProbs }) {
  if (!beforeProbs || !afterProbs) return null;
  const changes = [...new Set([...Object.keys(beforeProbs), ...Object.keys(afterProbs)])]
    .map(c => ({ cls: c, before: beforeProbs[c] || 0, after: afterProbs[c] || 0, delta: (afterProbs[c] || 0) - (beforeProbs[c] || 0) }))
    .filter(c => Math.abs(c.delta) >= 0.5)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  if (!changes.length) return <div className="lcd-changes-empty glass-card"><p>No significant class changes.</p></div>;
  return (
    <div className="lcd-changes-grid">
      {changes.map(({ cls, before, after, delta }) => (
        <div key={cls} className={`lcd-change-card glass-card ${delta > 0 ? "increase" : "decrease"}`}>
          <div className="lcd-change-header">
            <div className="lcd-change-dot" style={{ background: CLASS_COLORS[cls] || "#7f8c8d" }} />
            <span className="lcd-change-cls">{cls}</span>
            <span className={`lcd-change-badge ${delta > 0 ? "up" : "down"}`}>{delta > 0 ? "▲" : "▼"} {Math.abs(delta).toFixed(1)}%</span>
          </div>
          <div className="lcd-change-bars">
            <div className="lcd-change-bar-row"><span className="lcd-change-label">Before</span>
              <div className="lcd-change-bar-track"><div className="lcd-change-bar-fill" style={{ width: `${before}%`, background: CLASS_COLORS[cls], opacity: 0.5 }} /></div>
              <span className="lcd-change-val">{before.toFixed(1)}%</span></div>
            <div className="lcd-change-bar-row"><span className="lcd-change-label">After</span>
              <div className="lcd-change-bar-track"><div className="lcd-change-bar-fill" style={{ width: `${after}%`, background: CLASS_COLORS[cls] }} /></div>
              <span className="lcd-change-val">{after.toFixed(1)}%</span></div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
export default function LandChangeDetection() {
  const [inputMode, setInputMode] = useState("map");
  const [beforeB64, setBeforeB64] = useState(null);
  const [afterB64,  setAfterB64]  = useState(null);
  const [result,    setResult]    = useState(null);
  const [loading,   setLoading]   = useState(false);

  const handleCapture = (slot, b64) => {
    if (slot === "before") setBeforeB64(b64); else setAfterB64(b64);
    setResult(null);
  };

  const handleAnalyze = async () => {
    if (!beforeB64 || !afterB64) return;
    setLoading(true);
    try {
      setResult(await api.changeDetection(beforeB64, afterB64));
      toast("Analysis complete", "success");
    } catch { toast("Analysis failed", "error"); }
    finally { setLoading(false); }
  };

  return (
    <div className="lcd-page"><div className="lcd-content">
      <div className="lcd-tabs glass-card">
        <button className={inputMode === "map"      ? "active" : ""} onClick={() => setInputMode("map")}>Wayback Explorer</button>
        <button className={inputMode === "upload"   ? "active" : ""} onClick={() => setInputMode("upload")}>Manual Upload</button>
        <button className={inputMode === "sentinel" ? "active" : ""} onClick={() => setInputMode("sentinel")}>Sentinel-2</button>
      </div>

      {inputMode === "map"      && <MapCapturePanel onCaptureImage={handleCapture} />}
      {inputMode === "upload"   && (
        <div className="lcd-upload-grid">
          <div className="glass-card lcd-upload-box"><h3>Before Image</h3><ImageUploader onImageSelect={(f, u, b64) => handleCapture("before", b64)} /></div>
          <div className="glass-card lcd-upload-box"><h3>After Image</h3><ImageUploader onImageSelect={(f, u, b64) => handleCapture("after", b64)} /></div>
        </div>
      )}
      {inputMode === "sentinel" && <SentinelChangeDetection />}

      {beforeB64 && afterB64 && !result && (
        <div className="lcd-analyze-wrap">
          <button className="btn-analyze" onClick={handleAnalyze} disabled={loading}>
            {loading ? "Processing…" : "Compare & Analyze"}
          </button>
        </div>
      )}

      {result && (
        <div className="lcd-results-section">
          <TransitionHero result={result} beforePreview={beforeB64} afterPreview={afterB64} />
          <ClassChanges beforeProbs={result.beforeAllProbs} afterProbs={result.afterAllProbs} />
          <div className="lcd-results-footer glass-card">
            <p>{result.beforeType === result.afterType
              ? `Land cover remained as ${result.beforeType}.`
              : `Land transitioned from ${result.beforeType} to ${result.afterType}.`}
            </p>
            <button className="btn-export" onClick={() => exportChangePDF(result)}>Download PDF Report</button>
          </div>
        </div>
      )}
    </div></div>
  );
}