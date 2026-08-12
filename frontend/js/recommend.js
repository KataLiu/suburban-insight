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
const FACTORS = [
  {
    key: "affordability",
    label: "Affordability",
    description: "Lower weekly rent scores higher.",
    invert: true,
    getValue: (s) => s.median_weekly_rent,
    getRawDisplay: (s) => (s.median_weekly_rent == null ? null : `${formatMoney(s.median_weekly_rent)}/wk`),
  },
  {
    key: "diversity",
    label: "Cultural diversity",
    description: "Higher share of overseas-born residents scores higher.",
    invert: false,
    getValue: (s) => s.overseas_born_pct,
    getRawDisplay: (s) => (s.overseas_born_pct == null ? null : `${formatPct(s.overseas_born_pct)} overseas-born`),
  },
  {
    key: "familyFriendly",
    label: "Family-friendly",
    description: "Higher share of family households scores higher.",
    invert: false,
    getValue: (s) => s.family_households_pct,
    getRawDisplay: (s) => (s.family_households_pct == null ? null : `${formatPct(s.family_households_pct)} family households`),
  },
  {
    key: "services",
    label: "Access to services",
    description: "Shorter average drive time to school, hospital, GP, and childcare scores higher.",
    invert: true,
    getValue: (s) => averageDriveRank(s.access_to_services),
    getRawDisplay: (s) => averageDriveTimeDisplay(s.access_to_services),
  },
];

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
const currentWeights = Object.fromEntries(FACTORS.map((f) => [f.key, 50])); // equal, non-zero default
let visibleCount = RESULTS_PAGE_SIZE;

document.addEventListener("DOMContentLoaded", async () => {
  const layout = document.getElementById("match-layout");
  try {
    const fetched = await fetchSuburbs();
    allSuburbs = fetched.filter((s) => !hasInsufficientData(s));
    excludedCount = fetched.length - allSuburbs.length;
    computeFactorStats();
    layout.innerHTML = matchLayoutHtml();
    wireControls();
    renderResults();
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

function averageDriveTimeDisplay(access) {
  const avg = averageDriveRank(access);
  if (avg == null) return null;
  return `~${avg.toFixed(1)} avg. band`;
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
  const total = FACTORS.reduce((sum, f) => sum + currentWeights[f.key], 0);
  if (total <= 0) return null;
  return Object.fromEntries(FACTORS.map((f) => [f.key, currentWeights[f.key] / total]));
}

// contributions[key] sums exactly to `total` — this is the same number the
// UI shows as each factor's bar, not a separately-computed approximation.
// A missing factor gets its weight redistributed across the suburb's
// remaining available factors (see the algorithm write-up this
// implements); a suburb where every weighted factor is missing can't be
// scored at all under the user's current weights and is left out of the
// ranking entirely, rather than assigned a fabricated 0.
function scoreSuburb(suburb, normalizedWeights) {
  const factorScores = {};
  FACTORS.forEach((f) => {
    factorScores[f.key] = normalizedFactorScore(f, suburb);
  });

  const available = FACTORS.filter((f) => factorScores[f.key] != null);
  const availableWeightSum = available.reduce((sum, f) => sum + normalizedWeights[f.key], 0);
  if (availableWeightSum <= 0) return null;

  const contributions = {};
  let total = 0;
  FACTORS.forEach((f) => {
    if (factorScores[f.key] == null) {
      contributions[f.key] = null;
      return;
    }
    const effectiveWeight = normalizedWeights[f.key] / availableWeightSum;
    const contribution = effectiveWeight * factorScores[f.key];
    contributions[f.key] = contribution;
    total += contribution;
  });

  return { suburb, total, contributions, reweighted: available.length < FACTORS.length };
}

function computeRanking() {
  const normalizedWeights = getNormalizedWeights();
  if (!normalizedWeights) return null;
  return allSuburbs
    .map((s) => scoreSuburb(s, normalizedWeights))
    .filter((r) => r != null)
    .sort((a, b) => b.total - a.total);
}

function matchLayoutHtml() {
  return `
    <section class="match-controls" aria-label="Your preferences">
      <h2>Your preferences</h2>
      <p class="muted weight-slider-intro">
        Drag each slider to say how much it matters — they don't need to add up to anything, weights are normalized automatically.
      </p>
      ${FACTORS.map(sliderHtml).join("")}
      <button type="button" id="reset-weights-btn" class="show-more-btn">Reset to equal weights</button>
    </section>
    <section class="match-results" aria-label="Matching suburbs">
      ${
        excludedCount
          ? `<p class="muted note">${excludedCount} localities aren't included — too little real ABS data to score reliably (same standard used to exclude them from clustering).</p>`
          : ""
      }
      <p id="match-status" class="muted" role="status" aria-live="polite"></p>
      <ol id="match-list" class="match-list"></ol>
      <button type="button" id="show-more-btn" class="show-more-btn hidden">Show more</button>
    </section>
  `;
}

function sliderHtml(factor) {
  return `
    <div class="weight-slider">
      <div class="weight-slider-head">
        <label for="weight-${factor.key}">${factor.label}</label>
        <span class="weight-slider-pct" id="weight-${factor.key}-pct" aria-hidden="true">25%</span>
      </div>
      <p class="weight-slider-desc muted">${factor.description}</p>
      <input
        type="range"
        id="weight-${factor.key}"
        min="0"
        max="100"
        value="50"
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

function wireControls() {
  FACTORS.forEach((f) => {
    const input = document.getElementById(`weight-${f.key}`);
    input.addEventListener("input", () => {
      currentWeights[f.key] = Number(input.value);
      updateWeightLabel(f.key);
      scheduleRender();
    });
    updateWeightLabel(f.key);
  });

  document.getElementById("reset-weights-btn").addEventListener("click", () => {
    FACTORS.forEach((f) => {
      currentWeights[f.key] = 50;
      document.getElementById(`weight-${f.key}`).value = 50;
      updateWeightLabel(f.key);
    });
    renderResults();
  });

  document.getElementById("show-more-btn").addEventListener("click", () => {
    visibleCount += RESULTS_PAGE_SIZE;
    renderResults();
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
  const { suburb, total, contributions, reweighted } = result;
  const scoreOutOf100 = Math.round(total * 100);

  const factorRows = FACTORS.map((f) => {
    const contribution = contributions[f.key];
    if (contribution == null) {
      return `
        <li class="match-factor match-factor-missing">
          <span class="match-factor-label">${f.label}</span>
          <span class="muted">No data for this suburb — score based on the other factors.</span>
        </li>
      `;
    }
    const pts = Math.round(contribution * 100);
    const fillPct = Math.min(100, Math.round(contribution * 100));
    const raw = f.getRawDisplay(suburb);
    return `
      <li class="match-factor">
        <span class="match-factor-label">${f.label}</span>
        <div class="match-factor-track"><div class="match-factor-fill" style="width:${fillPct}%"></div></div>
        <span class="match-factor-raw">${raw ?? "—"}</span>
        <span class="match-factor-contribution">${pts} pt${pts === 1 ? "" : "s"}</span>
      </li>
    `;
  }).join("");

  return `
    <li class="match-card">
      <div class="match-card-header">
        <span class="match-rank" aria-hidden="true">#${rank}</span>
        <div class="match-card-title">
          <h3>${suburb.name}</h3>
          <span class="muted">${suburb.council ?? ""}</span>
        </div>
        <span class="match-score">${scoreOutOf100}<span class="stat-suffix">/100</span></span>
      </div>
      ${reweighted ? '<p class="muted note match-reweighted-note">Some factors are unavailable for this suburb — remaining weight was redistributed across the rest.</p>' : ""}
      <ul class="match-factor-list">${factorRows}</ul>
    </li>
  `;
}
