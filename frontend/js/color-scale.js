// Sequential YlOrRd colour scale (golden yellow -> orange -> deep red) used
// to colour both the council-level and suburb-level choropleth maps by rent.
// Deliberately sequential, not diverging: rent is a low-to-high ordered
// quantity with no natural "midpoint" to anchor a diverging scale against
// (a diverging red/blue scale would wrongly imply one), so one hue ramping
// monotonically from light to dark reads correctly as "cheap -> expensive".
// Still colour-blind-safe: the ends are distinguished by lightness alone
// (pale -> saturated, not e.g. red vs green), which holds up under the most
// common colour vision deficiencies.

// The palest ColorBrewer YlOrRd stop (#ffffb2) was checked against the OSM
// basemap and dropped — over real map tiles (semi-transparent fill, not
// print-on-white) it blended into pale rural land tiles. Using classes 2-6
// of the 6-class YlOrRd ramp instead keeps the same sequential, colour-blind
// -safe family while starting noticeably more saturated/golden.
const SCALE_STOPS = [
  [254, 217, 118], // cheapest — golden yellow
  [254, 178, 76],
  [253, 141, 60],
  [240, 59, 32],
  [189, 0, 38], // priciest — deep red
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
  const mid = (min + max) / 2;
  containerEl.innerHTML = `
    <div class="legend-label">${label}</div>
    <div class="legend-bar" style="background:${gradient}"></div>
    <div class="legend-scale">
      <span class="legend-scale-min">$${Math.round(min)}/wk</span>
      <span class="legend-scale-mid">$${Math.round(mid)}/wk</span>
      <span class="legend-scale-max">$${Math.round(max)}/wk</span>
    </div>
  `;
}
