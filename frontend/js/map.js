/*
 * Two-level choropleth map: councils first (all 31, coloured by average
 * rent), click one to drill into its actual suburbs (coloured by their own
 * rent). Replaces the old point-marker map — see docs/roadmap.md Milestone
 * "scale to all of Melbourne" for why (30 hand-picked suburbs wasn't
 * actually "every suburb in Melbourne", and pins don't scale to 500+).
 */

const MELBOURNE_CENTER = [-37.8136, 144.9631];
const MELBOURNE_ZOOM = 10;

let leafletMap;
let currentLayer = null;
let suburbLayerById = {};

function initMap() {
  leafletMap = L.map("map").setView(MELBOURNE_CENTER, MELBOURNE_ZOOM);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors",
    maxZoom: 18,
  }).addTo(leafletMap);

  document.getElementById("back-to-councils").addEventListener("click", loadCouncilView);

  loadCouncilView();
  fetchSuburbs().then((suburbs) => AppState.setAllSuburbNames(suburbs)).catch(console.error);
}

function setMapStatus(text, isError = false) {
  const el = document.getElementById("map-status");
  el.textContent = text;
  el.className = `status map-status-badge ${isError ? "error" : "pending"}`;
  el.classList.remove("hidden");
}

function clearMapStatus() {
  document.getElementById("map-status").classList.add("hidden");
}

function toGeoJSONFeatures(items) {
  return items
    .filter((item) => item.boundary)
    .map((item) => ({ type: "Feature", properties: item, geometry: item.boundary }));
}

async function loadCouncilView() {
  setMapStatus("Loading councils…");
  document.getElementById("back-to-councils").classList.add("hidden");
  document.getElementById("filter-bar").classList.add("hidden");
  renderSidebarEmptyState(
    "Explore Melbourne suburbs",
    "Click a council on the map to see its suburbs, then pick one to compare — or search above."
  );

  try {
    const councils = await fetchCouncils();
    const rents = councils.map((c) => c.avg_median_weekly_rent).filter((r) => r != null);
    const min = Math.min(...rents);
    const max = Math.max(...rents);

    if (currentLayer) leafletMap.removeLayer(currentLayer);
    currentLayer = L.geoJSON(toGeoJSONFeatures(councils), {
      style: (feature) => ({
        color: "#14213d",
        weight: 1,
        fillColor: rentColor(feature.properties.avg_median_weekly_rent, min, max),
        fillOpacity: 0.6,
      }),
      onEachFeature: (feature, layer) => {
        const c = feature.properties;
        layer.bindTooltip(`${c.name} — ${c.suburb_count} suburbs, avg $${Math.round(c.avg_median_weekly_rent)}/wk`);
        layer.on("click", () => loadSuburbView(c.id, c.name));
      },
    }).addTo(leafletMap);

    leafletMap.fitBounds(currentLayer.getBounds());
    renderRentLegend(document.getElementById("map-legend"), min, max, "Average weekly rent by council");
    clearMapStatus();
  } catch (err) {
    console.error(err);
    setMapStatus("Could not load councils — is the backend running?", true);
  }
}

async function loadSuburbView(councilId, councilName) {
  setMapStatus(`Loading ${councilName} suburbs…`);
  document.getElementById("back-to-councils").classList.remove("hidden");
  renderSidebarEmptyState(councilName, "Now click a suburb to see its details.");

  try {
    const suburbs = await fetchSuburbs(councilId);
    const rents = suburbs.map((s) => s.median_weekly_rent).filter((r) => r != null);
    const min = Math.min(...rents);
    const max = Math.max(...rents);

    if (currentLayer) leafletMap.removeLayer(currentLayer);
    suburbLayerById = {};
    currentLayer = L.geoJSON(toGeoJSONFeatures(suburbs), {
      style: (feature) => ({
        color: "#0f9d8e",
        weight: 1,
        fillColor: rentColor(feature.properties.median_weekly_rent, min, max),
        fillOpacity: 0.6,
      }),
      onEachFeature: (feature, layer) => {
        layer.bindTooltip(feature.properties.name);
        layer.on("click", () => AppState.select(feature.properties.id));
        suburbLayerById[feature.properties.id] = layer;
      },
    }).addTo(leafletMap);

    leafletMap.fitBounds(currentLayer.getBounds());
    renderRentLegend(document.getElementById("map-legend"), min, max, `Weekly rent — ${councilName}`);
    document.getElementById("filter-bar").classList.remove("hidden");
    AppState.setSuburbs(suburbs);
    clearMapStatus();
  } catch (err) {
    console.error(err);
    setMapStatus("Could not load suburbs — is the backend running?", true);
  }
}

// Pans/zooms to a suburb's polygon and highlights it, if that suburb is
// part of the currently-displayed council (i.e. has an entry in
// suburbLayerById). No-op otherwise — used by the search box (search.js) to
// jump to a result; picking a suburb from a different council than the one
// currently on screen just leaves the map where it is, same as clicking a
// "similar suburb" in the sidebar already does.
function focusSuburb(suburbId) {
  const layer = suburbLayerById[suburbId];
  if (!layer) return;

  leafletMap.fitBounds(layer.getBounds(), { maxZoom: 15 });
  layer.bringToFront();
  layer.setStyle({ weight: 3, color: "#0f9d8e" });

  if (typeof layer.getTooltip === "function" && layer.getTooltip()) {
    layer.openTooltip();
  }
}

// Dims suburb polygons not in matchingIds; pass null to clear (full opacity
// for all). Only meaningful in suburb-view mode — filters are hidden at the
// council level.
function setSuburbHighlight(matchingIds) {
  Object.entries(suburbLayerById).forEach(([suburbId, layer]) => {
    const isMatch = matchingIds === null || matchingIds.has(suburbId);
    layer.setStyle({ fillOpacity: isMatch ? 0.6 : 0.12, opacity: isMatch ? 1 : 0.25 });
  });
}

document.addEventListener("DOMContentLoaded", initMap);
