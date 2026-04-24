/**
 * Lightweight "time ago" formatter — no external dependency.
 * @param {string} isoString - ISO 8601 datetime string from the backend
 * @returns {string} e.g. "just now", "3 minutes ago", "2 hours ago"
 */
export function formatDistanceToNow(isoString) {
  if (!isoString) return "—";
  const diff = Date.now() - new Date(isoString).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 10)  return "just now";
  if (s < 60)  return `${s} sec ago`;
  const m = Math.floor(s / 60);
  if (m < 60)  return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h} hr ago`;
  const d = Math.floor(h / 24);
  if (d < 30)  return `${d}d ago`;
  return new Date(isoString).toLocaleDateString();
}
