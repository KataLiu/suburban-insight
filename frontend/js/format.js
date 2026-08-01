// Shared rendering helpers used by both the suburb profile panel (sidebar.js)
// and the comparison table (compare.js).

function formatNumber(n) {
  return n == null ? "—" : n.toLocaleString();
}

function formatMoney(n) {
  return n == null ? "—" : `$${n.toLocaleString()}`;
}

function formatPct(n) {
  return n == null ? "—" : `${n}%`;
}

function formatSignedPct(n) {
  return n == null ? "—" : `${n > 0 ? "+" : ""}${n}%`;
}

// Access-to-services values are already display-ready range strings
// (e.g. "2–4 min") produced by data_pipeline/access_to_services.py — the
// public ABS source only publishes category bands, not exact minutes.
function formatDriveTime(rangeString) {
  return rangeString || "—";
}

function statTile(label, value, suffix = "") {
  return `
    <div class="stat-tile">
      <div class="stat-value">${value}${suffix ? `<span class="stat-suffix">${suffix}</span>` : ""}</div>
      <div class="stat-label">${label}</div>
    </div>
  `;
}

function cultureBar(entry) {
  return `
    <div class="culture-row">
      <span class="culture-country">${entry.country}</span>
      <div class="culture-bar-track"><div class="culture-bar-fill" style="width:${entry.pct}%"></div></div>
      <span class="culture-pct">${entry.pct}%</span>
    </div>
  `;
}
