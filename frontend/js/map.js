const markersBySuburbId = {};

function initMap() {
  const map = L.map("map").setView([-37.8136, 144.9631], 10); // Melbourne CBD

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors",
    maxZoom: 18,
  }).addTo(map);

  fetchSuburbs()
    .then((suburbs) => {
      suburbs.forEach((suburb) => {
        const marker = L.marker([suburb.location.lat, suburb.location.lng]).addTo(map);
        marker.bindTooltip(suburb.name, { direction: "top" });
        marker.on("click", () => AppState.select(suburb.id));
        markersBySuburbId[suburb.id] = marker;
      });
      AppState.setSuburbs(suburbs);
      document.getElementById("map-status").remove();
    })
    .catch((err) => {
      console.error(err);
      const statusEl = document.getElementById("map-status");
      statusEl.textContent = "Could not load suburb markers — is the backend running?";
      statusEl.className = "status error map-status-badge";
    });

  return map;
}

// Dims markers not in matchingIds; pass null to clear all highlighting (show everything at full opacity).
function setSuburbHighlight(matchingIds) {
  Object.entries(markersBySuburbId).forEach(([suburbId, marker]) => {
    const isMatch = matchingIds === null || matchingIds.has(suburbId);
    marker.setOpacity(isMatch ? 1 : 0.25);
  });
}

document.addEventListener("DOMContentLoaded", initMap);
