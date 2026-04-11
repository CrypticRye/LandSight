import { useRef, useState } from "react";
import { validateImageFile, fileToBase64 } from "../utils/api";
import ProgressBar from "./ProgressBar";
import { toast } from "./Toast";
import "./ImageUploader.css";

export default function ImageUploader({ label, sublabel, onImageSelect, buttonColor = "teal" }) {
  const inputRef = useRef();
  const [dragOver, setDragOver] = useState(false);
  const [preview, setPreview] = useState(null);
  const [progress, setProgress] = useState(0);
  const [compressing, setCompressing] = useState(false);

  const handleFile = async (file) => {
    if (!file) return;

    const err = validateImageFile(file);
    if (err) { toast(err, "error"); return; }

    setCompressing(true);
    setProgress(10);

    try {
      // Simulate compression progress
      const ticker = setInterval(() => setProgress((p) => Math.min(p + 15, 85)), 120);
      const b64 = await fileToBase64(file);
      clearInterval(ticker);
      setProgress(100);

      const previewUrl = URL.createObjectURL(file);
      setPreview(previewUrl);
      onImageSelect && onImageSelect(file, previewUrl, b64);
    } catch (e) {
      toast("Failed to process image.", "error");
    } finally {
      setCompressing(false);
      setTimeout(() => setProgress(0), 600);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const reset = (e) => {
    e.stopPropagation();
    setPreview(null);
    onImageSelect && onImageSelect(null, null, null);
  };

  return (
    <div
      className={`image-uploader ${dragOver ? "drag-over" : ""} ${preview ? "has-preview" : ""}`}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      onClick={() => !preview && !compressing && inputRef.current.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/jpg,image/jpeg,image/png,image/webp"
        style={{ display: "none" }}
        onChange={(e) => handleFile(e.target.files[0])}
      />

      {preview ? (
        <div className="preview-container">
          <img src={preview} alt="Uploaded preview" className="preview-image" />
          <button className="change-btn" onClick={reset}>Change Image</button>
        </div>
      ) : compressing ? (
        <div className="upload-placeholder">
          <div className={`upload-icon-circle ${buttonColor}`}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
          </div>
          <p className="upload-title">Processing image…</p>
          <ProgressBar progress={progress} label="Compressing & encoding" />
        </div>
      ) : (
        <div className="upload-placeholder">
          <div className={`upload-icon-circle ${buttonColor}`}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
          </div>
          <p className="upload-title">{label || "Drop your image here or click to browse"}</p>
          <p className="upload-sub">{sublabel || "Supports: JPG, PNG, WEBP (Max 10 MB)"}</p>
          <button
            className={`btn-upload ${buttonColor}`}
            onClick={(e) => { e.stopPropagation(); inputRef.current.click(); }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <path d="M3 9h18"/><path d="M9 21V9"/>
            </svg>
            Select Image
          </button>
        </div>
      )}
    </div>
  );
}