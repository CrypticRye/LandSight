import { useState, useEffect, useCallback } from "react";
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";
import { api } from "../utils/api";
import { formatDistanceToNow } from "../utils/time";
import "./Dashboard.css";

const CLASS_PALETTE = {
  Agriculture: "#4ade80",
  Bareland:    "#fbbf24",
  Urban:       "#a5b4fc",
  Vegetation:  "#34d399",
  Water:       "#60a5fa",
};
const DEFAULT_COLOR = "#94a3b8";

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
  const [stats,   setStats]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    api.stats()
      .then(setStats)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const pieData = stats
    ? Object.entries(stats.distribution).map(([name, value]) => ({ name, value }))
    : [];

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
              <h1 className="db-title">Analytics Dashboard</h1>
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
                  label="Total Predictions" value={stats.total} color="#2ec4b6"
                />
                <StatCard
                  icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>}
                  label="Avg Confidence" value={`${stats.avgConfidence}%`} color="#4a90d9"
                />
                <StatCard
                  icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>}
                  label="This Week" value={stats.thisWeek}
                  sub="predictions in last 7 days" color="#f59e0b"
                />
                <StatCard
                  icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>}
                  label="Top Class" value={stats.topClass || "—"}
                  sub="most predicted category"
                  color={CLASS_PALETTE[stats.topClass] || DEFAULT_COLOR}
                />
              </div>

              {/* ── Charts ── */}
              <div className="db-charts">

                {/* Donut */}
                <div className="db-chart-card">
                  <h3 className="db-chart-title">Class Distribution</h3>
                  {pieData.length > 0 ? (
                    <>
                      <ResponsiveContainer width="100%" height={220}>
                        <PieChart>
                          <Pie
                            data={pieData} cx="50%" cy="50%"
                            innerRadius={60} outerRadius={90}
                            paddingAngle={3} dataKey="value"
                          >
                            {pieData.map((entry) => (
                              <Cell key={entry.name} fill={CLASS_PALETTE[entry.name] || DEFAULT_COLOR} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{ background: "rgba(10,20,40,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 }}
                            itemStyle={{ color: "white" }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="db-legend">
                        {pieData.map(e => (
                          <span key={e.name} className="db-legend-item">
                            <span className="db-legend-dot" style={{ background: CLASS_PALETTE[e.name] || DEFAULT_COLOR }} />
                            {e.name} <strong>{e.value}</strong>
                          </span>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="db-chart-empty">No data yet — classify some images first</div>
                  )}
                </div>

                {/* Bar chart */}
                <div className="db-chart-card">
                  <h3 className="db-chart-title">Predictions — Last 7 Days</h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={stats.daily} margin={{ top: 6, right: 8, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                      <XAxis dataKey="date" tick={{ fontSize: 11, fill: "rgba(255,255,255,0.45)" }} axisLine={false} tickLine={false} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "rgba(255,255,255,0.45)" }} axisLine={false} tickLine={false} />
                      <Tooltip
                        contentStyle={{ background: "rgba(10,20,40,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 }}
                        itemStyle={{ color: "#2ec4b6" }}
                        cursor={{ fill: "rgba(46,196,182,0.08)" }}
                      />
                      <Bar dataKey="count" name="Predictions" fill="#2ec4b6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
