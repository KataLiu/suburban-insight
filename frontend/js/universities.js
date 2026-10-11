// Melbourne university campus locations, for the "Close to my campus"
// factor on Find my suburb (recommend.js). Not ABS data and not suburb
// statistics — a small fixed reference list, documented in
// docs/data-fields.md.
//
// Every coordinate comes from OpenStreetMap (retrieved 2026-10-11 via the
// Overpass API): it's the centre of the bounding box of the OSM feature
// linked in `source`, never typed in from memory. Two campuses don't map
// one-to-one onto a campus-wide OSM area, noted inline below.
const CAMPUSES = [
  {
    id: "unimelb-parkville",
    name: "University of Melbourne (Parkville)",
    lat: -37.79814,
    lng: 144.95932,
    source: "https://www.openstreetmap.org/relation/15629064",
  },
  {
    id: "monash-clayton",
    name: "Monash University (Clayton)",
    lat: -37.91063,
    lng: 145.13647,
    source: "https://www.openstreetmap.org/way/10585250",
  },
  {
    id: "monash-caulfield",
    name: "Monash University (Caulfield)",
    lat: -37.87725,
    lng: 145.04494,
    source: "https://www.openstreetmap.org/way/27877559",
  },
  {
    id: "rmit-city",
    name: "RMIT University (City)",
    lat: -37.80825,
    lng: 144.96239,
    source: "https://www.openstreetmap.org/way/772558888",
  },
  {
    id: "rmit-bundoora",
    name: "RMIT University (Bundoora West)",
    lat: -37.68021,
    lng: 145.06346,
    source: "https://www.openstreetmap.org/way/27675043",
  },
  {
    id: "rmit-brunswick",
    name: "RMIT University (Brunswick)",
    lat: -37.77212,
    lng: 144.95755,
    source: "https://www.openstreetmap.org/way/5179347",
  },
  {
    id: "deakin-burwood",
    name: "Deakin University (Burwood)",
    lat: -37.84469,
    lng: 145.1125,
    source: "https://www.openstreetmap.org/way/34094453",
  },
  {
    id: "latrobe-bundoora",
    name: "La Trobe University (Bundoora)",
    lat: -37.72085,
    lng: 145.04757,
    source: "https://www.openstreetmap.org/way/27877532",
  },
  {
    id: "swinburne-hawthorn",
    name: "Swinburne University (Hawthorn)",
    lat: -37.82162,
    lng: 145.03939,
    source: "https://www.openstreetmap.org/relation/20514062",
  },
  {
    // OSM has no campus-wide area for Footscray Park, only this feature
    // ("Building M", tagged as the campus) — a point inside the campus.
    id: "vu-footscray-park",
    name: "Victoria University (Footscray Park)",
    lat: -37.79323,
    lng: 144.89898,
    source: "https://www.openstreetmap.org/way/412862393",
  },
  {
    // VU's City Flinders campus isn't mapped in OSM; City Queen is the VU
    // city campus that is.
    id: "vu-city-queen",
    name: "Victoria University (City Queen)",
    lat: -37.81161,
    lng: 144.95958,
    source: "https://www.openstreetmap.org/way/737711381",
  },
  {
    id: "acu-melbourne",
    name: "Australian Catholic University (Melbourne)",
    lat: -37.80736,
    lng: 144.97803,
    source: "https://www.openstreetmap.org/way/32247329",
  },
];

function findCampus(id) {
  return CAMPUSES.find((c) => c.id === id) || null;
}

// Great-circle ("as the crow flies") distance in km between two lat/lng
// points — the haversine formula, mean Earth radius. Straight-line only:
// it says nothing about roads, public transport, or travel time.
function straightLineKm(lat1, lng1, lat2, lng2) {
  const R = 6371.0088;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// A suburb's distance to a campus, measured from the suburb's `location` —
// the ABS SAL boundary's representative point (always inside the suburb;
// see data_pipeline/extract_centroids.py), so large suburbs can be several
// km closer or further at their edges. null if the suburb has no location.
function suburbCampusKm(suburb, campus) {
  const loc = suburb.location;
  if (!loc || !Number.isFinite(loc.lat) || !Number.isFinite(loc.lng)) return null;
  return straightLineKm(loc.lat, loc.lng, campus.lat, campus.lng);
}
