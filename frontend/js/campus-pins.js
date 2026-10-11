// University campus pins on the map page, with an on/off toggle row in the
// map legend. Purely additive: its own L.layerGroup on top of
// whatever map.js is showing — never touches currentLayer, the council /
// suburb drill-down, or the selection flow, and survives view switches
// because it's added to the map itself, not to either choropleth layer.
//
// Campus list + sources live in universities.js (shared with Find my
// suburb). Each pin sits at the centre of that campus's OpenStreetMap
// feature: roughly where the campus is, not a specific gate or building.

// Mortarboard, drawn inline so there's no image request (same approach as
// the other icons in this codebase, e.g. nav.js).
const CAMPUS_ICON_SVG = `<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true" focusable="false"><path d="M12 3 1 9l11 6 9-4.91V17h2V9L12 3z"/><path d="M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z"/></svg>`;

function campusMarker(campus) {
  const marker = L.marker([campus.lat, campus.lng], {
    icon: L.divIcon({
      className: "campus-marker",
      html: `<span class="campus-pin">${CAMPUS_ICON_SVG}</span>`,
      iconSize: [26, 26],
      iconAnchor: [13, 13],
    }),
    // Stays keyboard-focusable (Leaflet's default for markers); the label is
    // set on "add" below, since the element doesn't exist before then —
    // same reason as makeLayerKeyboardAccessible() in map.js.
    keyboard: true,
    riseOnHover: true,
  });

  marker.bindTooltip(campus.name, { direction: "top", offset: [0, -12] });
  // Clicking (or Enter on a focused pin — Leaflet fires "click" for that)
  // only shows the name; it never selects a suburb or opens the panel.
  marker.on("click", () => marker.openTooltip());

  marker.on("add", () => {
    const el = marker.getElement();
    if (!el) return;
    el.setAttribute("aria-label", `${campus.name} (university campus)`);
    el.addEventListener("focus", () => marker.openTooltip());
    el.addEventListener("blur", () => marker.closeTooltip());
  });

  return marker;
}

// The on/off toggle is a row at the bottom of the map legend card — the
// legend is where the map's symbols are explained, so the pin's key and its
// switch live together. It's appended to #map-legend-card, not #map-legend,
// because map.js replaces #map-legend's contents on every view change.
function addCampusLegendRow(pins) {
  const card = document.getElementById("map-legend-card");
  if (!card) return;

  const row = document.createElement("label");
  row.className = "campus-toggle";
  row.innerHTML = `
    <span class="campus-toggle-key">
      <span class="campus-pin campus-pin-legend">${CAMPUS_ICON_SVG}</span>
      University campuses
    </span>
    <input type="checkbox" checked />
  `;
  row.querySelector("input").addEventListener("change", (e) => {
    if (e.target.checked) pins.addTo(leafletMap);
    else pins.remove();
  });
  card.appendChild(row);
}

// Registered after map.js's own DOMContentLoaded listener (this script is
// included after map.js), so leafletMap already exists here. If
// universities.js didn't load, there are simply no pins and no legend row —
// the map itself is unaffected.
document.addEventListener("DOMContentLoaded", () => {
  if (typeof leafletMap === "undefined" || !leafletMap || typeof CAMPUSES === "undefined") return;

  const pins = L.layerGroup(CAMPUSES.map(campusMarker)).addTo(leafletMap);
  addCampusLegendRow(pins);
});
