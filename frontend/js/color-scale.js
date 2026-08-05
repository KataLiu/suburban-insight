// Sequential single-hue colour scale (light teal -> navy) used to colour
// both the council-level and suburb-level choropleth maps by rent. A single
// hue (rather than a rainbow scale) is the standard, accessible choice for
// "low to high" data — it reads as a gradient, not a categorical rainbow.

const SCALE_LOW = [224, 242, 241]; // light teal, ~#e0f2f1
const SCALE_HIGH = [20, 33, 61]; // navy, matches --navy in styles.css

function rentColor(value, min, max) {
  if (value == null || min == null || max == null || max === min) {
    return "#cbd5e1"; // neutral grey for missing/undifferentiated data
  }
  const t = Math.min(1, Math.max(0, (value - min) / (max - min)));
  const rgb = SCALE_LOW.map((lowChannel, i) => Math.round(lowChannel + t * (SCALE_HIGH[i] - lowChannel)));
  return `rgb(${rgb.join(",")})`;
}

function renderRentLegend(containerEl, min, max, label) {
  if (min == null || max == null) {
    containerEl.innerHTML = "";
    return;
  }
  const gradient = `linear-gradient(to right, ${rentColor(min, min, max)}, ${rentColor(max, min, max)})`;
  containerEl.innerHTML = `
    <div class="legend-label">${label}</div>
    <div class="legend-bar" style="background:${gradient}"></div>
    <div class="legend-scale">
      <span>$${Math.round(min)}/wk</span>
      <span>$${Math.round(max)}/wk</span>
    </div>
  `;
}
