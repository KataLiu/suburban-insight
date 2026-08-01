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

function formatMinutes(n) {
  return n == null ? "—" : `${n} min`;
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
