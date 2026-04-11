export function exportClassificationPDF(result, imageDataUrl) {
  const win = window.open("", "_blank");
  const timestamp = new Date().toLocaleString();

  const allProbsHtml = result.allProbs
    ? Object.entries(result.allProbs)
        .sort((a, b) => b[1] - a[1])
        .map(
          ([label, prob]) => `
          <div class="prob-row">
            <span class="prob-label">${label}</span>
            <div class="prob-bar-wrap">
              <div class="prob-bar" style="width:${prob}%"></div>
            </div>
            <span class="prob-val">${prob}%</span>
          </div>`
        )
        .join("")
    : "";

  win.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Land Classification Report</title>
  <style>
    body { font-family: 'Segoe UI', sans-serif; margin: 40px; color: #1a2a4a; }
    h1 { font-size: 26px; margin-bottom: 4px; }
    .sub { color: #666; font-size: 13px; margin-bottom: 28px; }
    .badge { display:inline-block; background:#2ec4b6; color:white; padding:4px 14px;
             border-radius:20px; font-weight:700; margin-bottom:16px; }
    .section { margin-bottom: 24px; }
    .section h2 { font-size:15px; border-bottom:2px solid #e0e0e0; padding-bottom:6px; margin-bottom:12px; }
    .desc { font-size:14px; line-height:1.6; color:#444; }
    .tags { display:flex; flex-wrap:wrap; gap:8px; margin-top:8px; }
    .tag { background:#f0f4f8; border:1px solid #c0cdd8; border-radius:12px; padding:3px 12px; font-size:12px; }
    .conf-bar { height:10px; background:#e0e0e0; border-radius:5px; margin-top:6px; }
    .conf-fill { height:100%; background:linear-gradient(90deg,#2ec4b6,#4a90d9); border-radius:5px; }
    .prob-row { display:flex; align-items:center; gap:10px; margin-bottom:6px; font-size:13px; }
    .prob-label { width:180px; flex-shrink:0; }
    .prob-bar-wrap { flex:1; height:8px; background:#e0e0e0; border-radius:4px; }
    .prob-bar { height:100%; background:#4a90d9; border-radius:4px; }
    .prob-val { width:44px; text-align:right; }
    img.thumb { max-width:260px; border-radius:10px; border:1px solid #ddd; margin-top:8px; }
    @media print { body { margin:20px; } }
  </style>
</head>
<body>
  <h1>Land Classification Report</h1>
  <p class="sub">Generated: ${timestamp} &nbsp;|&nbsp; AI-Powered Analysis</p>

  ${imageDataUrl ? `<img class="thumb" src="${imageDataUrl}" alt="Analysed image"/>` : ""}

  <div class="section">
    <h2>Classification</h2>
    <div class="badge">${result.landType}</div>
    <p class="desc">${result.description || ""}</p>
  </div>

  <div class="section">
    <h2>Confidence Score</h2>
    <strong>${result.confidence}%</strong>
    <div class="conf-bar"><div class="conf-fill" style="width:${result.confidence}%"></div></div>
  </div>

  ${result.features?.length ? `
  <div class="section">
    <h2>Key Features</h2>
    <div class="tags">${result.features.map(f => `<span class="tag">${f}</span>`).join("")}</div>
  </div>` : ""}

  ${allProbsHtml ? `
  <div class="section">
    <h2>All Class Probabilities</h2>
    ${allProbsHtml}
  </div>` : ""}

  ${result.isSatellite === false ? `
  <div class="section" style="background:#fff3cd;padding:12px;border-radius:8px;border:1px solid #ffc107;">
    <strong>⚠ Warning:</strong> ${result.satelliteReason}
  </div>` : ""}
</body>
</html>`);

  win.document.close();
  setTimeout(() => { win.focus(); win.print(); }, 400);
}

export function exportChangePDF(result) {
  const win = window.open("", "_blank");
  const timestamp = new Date().toLocaleString();

  const changesHtml = (result.changes || [])
    .map(
      (c) => `
      <div class="change-row">
        <span class="change-label">${c.label}</span>
        <div class="bar-wrap">
          <div class="bar-fill" style="width:${c.percent}%;background:${c.color}"></div>
        </div>
        <span class="change-val">${c.percent}%</span>
      </div>`
    )
    .join("");

  win.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Land Change Detection Report</title>
  <style>
    body { font-family:'Segoe UI',sans-serif; margin:40px; color:#1a2a4a; }
    h1 { font-size:26px; margin-bottom:4px; }
    .sub { color:#666; font-size:13px; margin-bottom:28px; }
    table { width:100%; border-collapse:collapse; margin-bottom:24px; font-size:14px; }
    th,td { padding:10px 12px; border:1px solid #ddd; text-align:left; }
    th { background:#f0f4f8; font-weight:600; }
    .section h2 { font-size:15px; border-bottom:2px solid #e0e0e0; padding-bottom:6px; margin-bottom:12px; }
    .change-row { display:flex; align-items:center; gap:10px; margin-bottom:8px; font-size:13px; }
    .change-label { width:180px; flex-shrink:0; }
    .bar-wrap { flex:1; height:10px; background:#e0e0e0; border-radius:5px; }
    .bar-fill { height:100%; border-radius:5px; }
    .change-val { width:44px; text-align:right; }
    @media print { body { margin:20px; } }
  </style>
</head>
<body>
  <h1>Land Change Detection Report</h1>
  <p class="sub">Generated: ${timestamp}</p>
  <table>
    <tr><th>Period</th><th>Land Type</th><th>Confidence</th></tr>
    <tr><td>Before</td><td>${result.beforeType}</td><td>${result.beforeConf}%</td></tr>
    <tr><td>After</td><td>${result.afterType}</td><td>${result.afterConf}%</td></tr>
  </table>
  <div class="section">
    <h2>Detected Changes</h2>
    ${changesHtml}
  </div>
</body>
</html>`);
  win.document.close();
  setTimeout(() => { win.focus(); win.print(); }, 400);
}
