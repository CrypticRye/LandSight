import "./ProgressBar.css";

export default function ProgressBar({ progress, label }) {
  return (
    <div className="upload-progress">
      <div className="upload-progress-header">
        <span>{label || "Uploading…"}</span>
        <span>{Math.round(progress)}%</span>
      </div>
      <div className="upload-progress-track">
        <div className="upload-progress-fill" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}
