// Sequential blue -> yellow -> red colour scale (reversed RdYlBu) used to
// colour both the council-level and suburb-level choropleth maps by rent.
// Colour-blind-safe by design: cheapest and priciest ends are distinguished
// by both lightness and a blue/red hue contrast (not a red/green contrast,
// which is indistinguishable under the most common colour vision
// deficiencies) — do not replace this with a green -> red scale.

const SCALE_STOPS = [
  [44, 123, 182], // cheapest — blue
  [171, 217, 233],
  [255, 255, 191], // midpoint — yellow
  [253, 174, 97],
  [215, 48, 39], // priciest — red
];

function rentColor(value, min, max) {
  if (value == null || min == null || max == null || max === min) {
    return "#cbd5e1"; // neutral grey for missing/undifferentiated data
  }
  const t = Math.min(1, Math.max(0, (value - min) / (max - min)));
  const segments = SCALE_STOPS.length - 1;
  const scaled = t * segments;
  const i = Math.min(segments - 1, Math.floor(scaled));
  const localT = scaled - i;
  const rgb = SCALE_STOPS[i].map((channel, c) =>
    Math.round(channel + localT * (SCALE_STOPS[i + 1][c] - channel))
  );
  return `rgb(${rgb.join(",")})`;
}

function renderRentLegend(containerEl, min, max, label) {
  if (min == null || max == null) {
    containerEl.innerHTML = "";
    return;
  }
  const gradient = `linear-gradient(to right, ${SCALE_STOPS.map((rgb) => `rgb(${rgb.join(",")})`).join(", ")})`;
  containerEl.innerHTML = `
    <div class="legend-label">${label}</div>
    <div class="legend-bar" style="background:${gradient}"></div>
    <div class="legend-scale">
      <span>$${Math.round(min)}/wk</span>
      <span>$${Math.round(max)}/wk</span>
    </div>
  `;
}
