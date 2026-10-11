// "Find my suburb" — a client-side weighted match scorer over all 527
// suburbs. Every number here traces back to a real field from
// GET /api/suburbs (extended with overseas_born_pct/family_households_pct/
// access_to_services specifically for this page — see backend/app/models/
// schemas.py's SuburbSummary). No factor is invented or estimated.

// Same mapping as compare.js's DRIVE_RANK — duplicated rather than shared,
// matching how compare.js already keeps its own copy rather than living in
// format.js. Keep the en-dash (–, U+2013); it's what
// data_pipeline/access_to_services.py emits.
const DRIVE_RANK = { "0–2 min": 0, "2–4 min": 1, "4–10 min": 2, "10–30 min": 3, "30–90 min": 4 };

// invert:true = "lower/shorter raw value is better", so its normalized
// score is flipped (1 - norm) before weighting. getValue() returns null
// when a suburb has no real data for this factor — normalizedFactorScore()
// turns that into "this factor is skipped for this suburb", never a
// fabricated number.
//
// Overseas-born % and family-households % have no objectively "better"
// direction (compare.js never highlights a winner for them, for the same
// reason) — so their labels describe the raw quantity a user is choosing to
// favour, not a value judgement like "diversity" or "family-friendly". The
// slider only expresses "favour more of this" (or 0 = don't care); there's
// no way to prefer *less* of either — a known limitation, not an oversight.
const FACTORS = [
  {
    key: "affordability",
    label: "Affordability",
    description: "Lower weekly rent scores higher.",
    factLabel: "Median rent",
    invert: true,
    getValue: (s) => s.median_weekly_rent,
  },
  {
    key: "overseasBorn",
    label: "Overseas-born residents",
    description: "Favours suburbs with a higher share of residents born overseas.",
    factLabel: "Overseas-born",
    invert: false,
    getValue: (s) => s.overseas_born_pct,
  },
  {
    key: "familyHouseholds",
    label: "Family households",
    description: "Favours suburbs with a higher share of family households.",
    factLabel: "Family households",
    invert: false,
    getValue: (s) => s.family_households_pct,
  },
  {
    key: "services",
    label: "Access to services",
    description: "Shorter average drive time to school, hospital, GP, and childcare scores higher.",
    factLabel: "Access index",
    invert: true,
    getValue: (s) => averageDriveRank(s.access_to_services),
  },
];

// Optional 5th factor, only in play once a campus is picked from "My
// campus" (campus list + distance maths in universities.js). With no campus
// selected, activeFactors() is exactly FACTORS — same objects, same order —
// so every score and the ranking are identical to the 4-factor page.
let selectedCampus = null;

// universities.js is its own <script>. If it ever doesn't load (a failed
// request, or a stale cached recommend.html from before it existed), the
// page drops the campus picker instead of breaking outright — campus
// support is optional, the 4-factor scorer is not.
const CAMPUS_LIST = typeof CAMPUSES === "undefined" ? [] : CAMPUSES;

function campusById(id) {
  return CAMPUS_LIST.find((c) => c.id === id) || null;
}

const CAMPUS_FACTOR = {
  key: "campus",
  label: "Close to my campus",
  description: "Suburbs closer to your campus score higher.",
  invert: true,
  getValue: (s) => (selectedCampus ? suburbCampusKm(s, selectedCampus) : null),
};

function activeFactors() {
  return selectedCampus ? [...FACTORS, CAMPUS_FACTOR] : FACTORS;
}

const RESULTS_PAGE_SIZE = 20;

// Same 4 fields and same "any one missing disqualifies the suburb" rule as
// data_pipeline/train_clusters.py's `clusterable` filter — these suburbs
// (airports, near-zero-population localities, and a few places where ABS
// suppressed a median for too few responses) are already excluded from
// clustering for exactly this reason: too little real data to describe
// them, not something a normalization pass should paper over. Checked
// against the current dataset: this is the same 9-suburb set whether or
// not median_weekly_household_income is included, since no suburb here is
// missing income alone — kept in the list anyway so this reads as "the
// same standard as clustering," not a different one that happens to
// overlap.
const DATA_SUFFICIENCY_FIELDS = [
  "median_weekly_household_income",
  "median_weekly_rent",
  "overseas_born_pct",
  "family_households_pct",
];

function hasInsufficientData(suburb) {
  return DATA_SUFFICIENCY_FIELDS.some((f) => suburb[f] == null);
}

let allSuburbs = [];
let excludedCount = 0;
let factorStats = {}; // key -> { min, max }
const currentWeights = Object.fromEntries([...FACTORS, CAMPUS_FACTOR].map((f) => [f.key, 50])); // equal, non-zero default
let visibleCount = RESULTS_PAGE_SIZE;

// Sliders, "Show more" depth and scroll position survive a round trip to
// the map ("View on map", then the header's "Find my suburb" or Back) —
// otherwise coming back reset everything to equal weights. sessionStorage,
// not localStorage: a fresh tab (e.g. the start of a demo) still opens on
// the defaults. A per-viewer convenience only, so every access is wrapped —
// storage can be unavailable (private mode, blocked site data) and the page
// must still work on its defaults.
const SAVED_STATE_KEY = "suburbanInsight.findMySuburb";

function loadSavedState() {
  try {
    const saved = JSON.parse(sessionStorage.getItem(SAVED_STATE_KEY));
    if (!saved) return null;
    [...FACTORS, CAMPUS_FACTOR].forEach((f) => {
      const w = saved.weights?.[f.key];
      if (Number.isFinite(w) && w >= 0 && w <= 100) currentWeights[f.key] = w;
    });
    if (Number.isFinite(saved.visibleCount) && saved.visibleCount > 0) visibleCount = saved.visibleCount;
    selectedCampus = campusById(saved.campusId); // unknown/missing id -> null, i.e. "None"
    return saved;
  } catch {
    return null;
  }
}

function saveState() {
  try {
    sessionStorage.setItem(
      SAVED_STATE_KEY,
      JSON.stringify({
        weights: currentWeights,
        visibleCount,
        scrollY: window.scrollY,
        campusId: selectedCampus?.id ?? null,
      })
    );
  } catch {
    // Storage unavailable — the page just won't remember, nothing else breaks.
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  const layout = document.getElementById("recommend-layout");
  const saved = loadSavedState();
  try {
    const fetched = await fetchSuburbs();
    allSuburbs = fetched.filter((s) => !hasInsufficientData(s));
    excludedCount = fetched.length - allSuburbs.length;
    if (excludedCount) {
      document.getElementById("data-note").textContent =
        `${excludedCount} of ${fetched.length} suburbs excluded — too little real ABS data to score reliably.`;
    }
    computeFactorStats();
    layout.innerHTML = matchLayoutHtml();
    wireControls();
    renderResults();
    if (saved?.scrollY) window.scrollTo(0, saved.scrollY);
    // pagehide (not beforeunload) also fires when the page goes into the
    // back/forward cache, which is exactly the "View on map" round trip.
    window.addEventListener("pagehide", saveState);
  } catch (err) {
    console.error(err);
    layout.innerHTML = '<p class="status error" role="alert">Could not load suburb data — is the backend running?</p>';
  }
});

// A suburb with no data for a drive-time band, or a whole missing
// access_to_services object, makes "access to services" unscoreable for
// that suburb — averaging over only the bands that happen to be present
// would present a partial figure as if it were the real four-band average,
// which is exactly the kind of invented number this project avoids.
function averageDriveRank(access) {
  if (!access) return null;
  const ranks = [
    DRIVE_RANK[access.primary_school_drive_time],
    DRIVE_RANK[access.hospital_drive_time],
    DRIVE_RANK[access.gp_clinic_drive_time],
    DRIVE_RANK[access.childcare_drive_time],
  ];
  if (ranks.some((r) => r === undefined)) return null;
  return ranks.reduce((sum, r) => sum + r, 0) / ranks.length;
}

// One min/max pass per factor over all 527 suburbs, done once at load —
// slider changes only recompute weighted sums over these cached stats, not
// this pass.
function computeFactorStats() {
  factorStats = {};
  FACTORS.forEach((f) => {
    const values = allSuburbs.map((s) => f.getValue(s)).filter((v) => v != null);
    factorStats[f.key] = values.length
      ? { min: Math.min(...values), max: Math.max(...values) }
      : { min: 0, max: 0 };
  });
  computeCampusStats();
}

// Separate from the one-off pass above because the campus factor's values
// change whenever a different campus is picked.
function computeCampusStats() {
  if (!selectedCampus) return;
  const values = allSuburbs.map((s) => CAMPUS_FACTOR.getValue(s)).filter((v) => v != null);
  factorStats[CAMPUS_FACTOR.key] = values.length
    ? { min: Math.min(...values), max: Math.max(...values) }
    : { min: 0, max: 0 };
}

// Returns a 0-1 score where 1 is always "best", or null if this suburb has
// no real value for this factor. If every suburb ties on a factor, min-max
// has no range to divide by — 0.5 for everyone, which doesn't change the
// ranking since it's identical across the board.
function normalizedFactorScore(factor, suburb) {
  const raw = factor.getValue(suburb);
  if (raw == null) return null;
  const { min, max } = factorStats[factor.key];
  if (max === min) return 0.5;
  const norm = (raw - min) / (max - min);
  return factor.invert ? 1 - norm : norm;
}

function getNormalizedWeights() {
  const factors = activeFactors();
  const total = factors.reduce((sum, f) => sum + currentWeights[f.key], 0);
  if (total <= 0) return null;
  return Object.fromEntries(factors.map((f) => [f.key, currentWeights[f.key] / total]));
}

// contributions[key] sums exactly to `total` — this is the same number the
// UI shows as each factor's bar, not a separately-computed approximation.
// A missing factor gets its weight redistributed across the suburb's
// remaining available factors (see the algorithm write-up this
// implements); a suburb where every weighted factor is missing can't be
// scored at all under the user's current weights and is left out of the
// ranking entirely, rather than assigned a fabricated 0.
function scoreSuburb(suburb, normalizedWeights) {
  const factors = activeFactors();
  const factorScores = {};
  factors.forEach((f) => {
    factorScores[f.key] = normalizedFactorScore(f, suburb);
  });

  const available = factors.filter((f) => factorScores[f.key] != null);
  const availableWeightSum = available.reduce((sum, f) => sum + normalizedWeights[f.key], 0);
  if (availableWeightSum <= 0) return null;

  const contributions = {};
  let total = 0;
  factors.forEach((f) => {
    if (factorScores[f.key] == null) {
      contributions[f.key] = null;
      return;
    }
    const effectiveWeight = normalizedWeights[f.key] / availableWeightSum;
    const contribution = effectiveWeight * factorScores[f.key];
    contributions[f.key] = contribution;
    total += contribution;
  });

  return { suburb, total, contributions, reweighted: available.length < factors.length };
}

function computeRanking() {
  const normalizedWeights = getNormalizedWeights();
  if (!normalizedWeights) return null;
  return allSuburbs
    .map((s) => scoreSuburb(s, normalizedWeights))
    .filter((r) => r != null)
    .sort((a, b) => b.total - a.total);
}

// The compact per-suburb fact grid shows each factor's own real value, not
// its weighted contribution — three of the four are intuitive on their own
// (a dollar figure, two percentages), so they're shown as-is. "Access to
// services" isn't (a raw average drive-time band like "1.8" means nothing
// out of context), so it's the one case that shows the same 0-1 normalized
// score already computed for scoring, scaled to a 0-100 "index" instead —
// display-only, not a second scoring pass.
function factDisplayValue(factor, suburb) {
  if (factor.key === "services") {
    const score = normalizedFactorScore(factor, suburb);
    return score == null ? null : `${Math.round(score * 100)}/100`;
  }
  const raw = factor.getValue(suburb);
  if (raw == null) return null;
  return factor.key === "affordability" ? `${formatMoney(raw)}/wk` : formatPct(raw);
}

function matchLayoutHtml() {
  return `
    <section class="recommend-preferences" aria-labelledby="preferences-heading">
      <div class="recommend-panel-heading">
        <h2 id="preferences-heading">Your priorities</h2>
        <p>Adjust the <span id="slider-count">${selectedCampus ? "five" : "four"}</span> sliders — they don't need to add up to anything, weights are normalized automatically.</p>
      </div>
      ${CAMPUS_LIST.length ? campusPickerHtml() : ""}
      <div class="recommend-controls">
        ${sliderHtml(CAMPUS_FACTOR)}
        ${FACTORS.map(sliderHtml).join("")}
      </div>
      <button type="button" id="reset-weights-btn" class="recommend-reset">Reset to equal weights</button>
    </section>
    <section class="recommend-results" aria-labelledby="results-heading">
      <div class="recommend-results-heading">
        <div>
          <h2 id="results-heading">Best matches</h2>
          <p id="match-status" role="status" aria-live="polite"></p>
        </div>
        <span class="recommend-score-label">Match score</span>
      </div>
      <ol id="match-list" class="recommend-list"></ol>
      <button type="button" id="show-more-btn" class="recommend-more hidden">Show more</button>
    </section>
  `;
}

function campusPickerHtml() {
  return `
    <div class="recommend-campus">
      <label for="campus-select">My campus</label>
      <select id="campus-select" aria-describedby="campus-select-desc">
        <option value="">None</option>
        ${CAMPUS_LIST.map((c) => `<option value="${c.id}"${c === selectedCampus ? " selected" : ""}>${c.name}</option>`).join("")}
      </select>
      <p id="campus-select-desc">Choose your campus to see how far each suburb is and rank suburbs by distance. Distances are measured in a straight line, not by travel time.</p>
    </div>
  `;
}

function sliderHtml(factor) {
  const hidden = factor === CAMPUS_FACTOR && !selectedCampus;
  return `
    <div class="recommend-control${hidden ? " hidden" : ""}" id="control-${factor.key}">
      <div class="recommend-control-top">
        <label for="weight-${factor.key}">${factor.label}</label>
        <span class="recommend-control-pct" id="weight-${factor.key}-pct" aria-hidden="true">25%</span>
      </div>
      <p>${factor.description}</p>
      <input
        type="range"
        id="weight-${factor.key}"
        min="0"
        max="100"
        value="${currentWeights[factor.key]}"
        aria-describedby="weight-${factor.key}-desc"
      />
      <span id="weight-${factor.key}-desc" class="visually-hidden">${factor.description}</span>
    </div>
  `;
}

// Debounced so dragging a slider doesn't re-render the results DOM on every
// pixel of pointer movement — recompute happens ~80ms after input settles.
let renderTimer = null;
function scheduleRender() {
  clearTimeout(renderTimer);
  renderTimer = setTimeout(renderResults, 80);
}

// Normalizing one slider's weight changes every other slider's percentage
// too (they all share the same total) — so any single drag has to refresh
// all four labels, not just the one being dragged.
function updateAllWeightLabels() {
  activeFactors().forEach((f) => updateWeightLabel(f.key));
}

function wireControls() {
  [...FACTORS, CAMPUS_FACTOR].forEach((f) => {
    const input = document.getElementById(`weight-${f.key}`);
    input.addEventListener("input", () => {
      currentWeights[f.key] = Number(input.value);
      updateAllWeightLabels();
      scheduleRender();
      saveState();
    });
  });
  updateAllWeightLabels();

  document.getElementById("reset-weights-btn").addEventListener("click", () => {
    [...FACTORS, CAMPUS_FACTOR].forEach((f) => {
      currentWeights[f.key] = 50;
      document.getElementById(`weight-${f.key}`).value = 50;
    });
    updateAllWeightLabels();
    visibleCount = RESULTS_PAGE_SIZE;
    renderResults();
    saveState();
  });

  document.getElementById("show-more-btn").addEventListener("click", () => {
    visibleCount += RESULTS_PAGE_SIZE;
    renderResults();
    saveState();
  });

  document.getElementById("campus-select")?.addEventListener("change", (e) => {
    selectedCampus = campusById(e.target.value);
    computeCampusStats();
    document.getElementById("control-campus").classList.toggle("hidden", !selectedCampus);
    document.getElementById("slider-count").textContent = selectedCampus ? "five" : "four";
    updateAllWeightLabels();
    renderResults();
    saveState();
  });
}

function updateWeightLabel(key) {
  const weights = getNormalizedWeights();
  const pct = weights ? Math.round(weights[key] * 100) : 0;
  const input = document.getElementById(`weight-${key}`);
  const label = document.getElementById(`weight-${key}-pct`);
  label.textContent = `${pct}%`;
  // aria-valuetext overrides the raw 0-100 the browser would otherwise
  // announce for a range input, so screen reader users hear the same
  // normalized percentage sighted users see, not the un-normalized slider
  // position.
  input.setAttribute("aria-valuetext", `${input.value}, ${pct}% of total weight`);
}

function renderResults() {
  const statusEl = document.getElementById("match-status");
  const listEl = document.getElementById("match-list");
  const showMoreBtn = document.getElementById("show-more-btn");

  const ranking = computeRanking();
  if (!ranking) {
    statusEl.textContent = "Set at least one preference above to see matches.";
    listEl.innerHTML = "";
    showMoreBtn.classList.add("hidden");
    return;
  }

  visibleCount = Math.min(visibleCount, ranking.length) || Math.min(RESULTS_PAGE_SIZE, ranking.length);
  const visible = ranking.slice(0, visibleCount);

  statusEl.textContent = `Showing ${visible.length} of ${ranking.length} suburbs, ranked by match.`;
  listEl.innerHTML = visible.map((result, i) => matchCardHtml(result, i + 1)).join("");

  showMoreBtn.classList.toggle("hidden", visibleCount >= ranking.length);
}

function matchCardHtml(result, rank) {
  const { suburb, total, reweighted } = result;
  const scoreOutOf100 = Math.round(total * 100);

  const facts = FACTORS.map((f) => {
    const value = factDisplayValue(f, suburb);
    return `<div><dt>${f.factLabel}</dt><dd>${value ?? "—"}</dd></div>`;
  }).join("");

  const campusKm = selectedCampus ? suburbCampusKm(suburb, selectedCampus) : null;
  const campusLine =
    campusKm == null
      ? ""
      : `<p class="recommend-campus-distance">${campusKm.toFixed(1)} km to ${selectedCampus.name} <span class="muted">· straight-line distance</span></p>`;

  return `
    <li class="recommend-result" aria-label="Rank ${rank}: ${suburb.name}, ${scoreOutOf100} percent match">
      <div class="recommend-rank" aria-hidden="true">${String(rank).padStart(2, "0")}</div>
      <div class="recommend-result-main">
        <div class="recommend-result-top">
          <div>
            <h3>${suburb.name}</h3>
            <p>${suburb.council ?? ""} council</p>
            <a class="recommend-map-link" href="index.html?suburb=${encodeURIComponent(suburb.id)}">View <span class="visually-hidden">${suburb.name} </span>on map &rarr;</a>
          </div>
          <strong class="recommend-score">${scoreOutOf100}<span>%</span></strong>
        </div>
        ${campusLine}
        <dl class="recommend-facts">${facts}</dl>
        ${reweighted ? '<p class="muted note recommend-reweighted-note">Some factors are unavailable for this suburb — remaining weight was redistributed across the rest.</p>' : ""}
      </div>
    </li>
  `;
}
