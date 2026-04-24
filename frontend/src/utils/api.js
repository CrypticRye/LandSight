const BASE = (import.meta.env.VITE_API_URL || "http://localhost:5000") + "/api";

async function post(path, body, timeoutMs = 30000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  } catch (err) {
    if (err.name === "AbortError") throw new Error("Request timed out. Please try again.");
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

async function get(path) {
  const res = await fetch(`${BASE}${path}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

async function del(path) {
  const res = await fetch(`${BASE}${path}`, { method: "DELETE" });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

export function fileToBase64(file, maxDim = 1200, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      let { width: w, height: h } = img;
      if (w > maxDim || h > maxDim) {
        const ratio = Math.min(maxDim / w, maxDim / h);
        w = Math.round(w * ratio);
        h = Math.round(h * ratio);
      }
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      canvas.getContext("2d").drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = reject;
    img.src = url;
  });
}

export function validateImageFile(file) {
  const MAX_MB = 10;
  const ALLOWED = ["image/jpeg", "image/png", "image/webp"];
  if (!ALLOWED.includes(file.type))
    return "Only JPG, PNG, and WEBP images are supported.";
  if (file.size > MAX_MB * 1024 * 1024)
    return `File too large. Maximum size is ${MAX_MB} MB.`;
  return null;
}

export const api = {
  classify:           (image, filename) => post("/classify", { image, filename }),
  changeDetection:    (beforeImage, afterImage) =>
    post("/change-detection", { beforeImage, afterImage }),
  captureTiles:       (west, south, east, north, size = 640, zoom = 17) =>
    post("/capture-map-tiles", { west, south, east, north, size, zoom }, 45000),
  sentinelFindScenes: (lat, lng, beforeStart, beforeEnd, afterStart, afterEnd, cloudCover = 40) =>
    post("/sentinel-find-scenes", { lat, lng, beforeStart, beforeEnd, afterStart, afterEnd, cloudCover }),
  sentinelStatus:     () => get("/sentinel-status"),
  sentinelHistory:    (page = 1) => get(`/sentinel-history?page=${page}`),
  history:            (page = 1) => get(`/history?page=${page}`),
  changeHistory:      (page = 1) => get(`/change-history?page=${page}`),
  health:             () => get("/health"),
  stats:              () => get("/stats"),
  deleteRecord:       (id) => del(`/history/${id}`),
  clearHistory:       () => del("/history/all"),
  exportCSV:          () => `${BASE}/history/export`,
};
