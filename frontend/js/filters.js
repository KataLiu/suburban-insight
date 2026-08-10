/*
 * Filters map onto Req.2 (rent, income, cultural background) — see
 * docs/requirements.md §8. The wireframe's "family size" chip is
 * deliberately not implemented: there's no suburb-level field it maps to
 * cleanly (see docs/data-fields.md, "Not a suburb field — user input").
 */

const RENT_BUCKETS = [
  { label: "Any weekly rent", min: null, max: null },
  { label: "Under $400/wk", min: null, max: 400 },
  { label: "$400–500/wk", min: 400, max: 500 },
  { label: "$500+/wk", min: 500, max: null },
];

const INCOME_BUCKETS = [
  { label: "Any household income", min: null, max: null },
  { label: "Under $1,500/wk", min: null, max: 1500 },
  { label: "$1,500–2,000/wk", min: 1500, max: 2000 },
  { label: "$2,000+/wk", min: 2000, max: null },
];

let currentFilters = { rentIndex: 0, incomeIndex: 0, country: "" };

AppState.onSuburbsLoaded((suburbs) => {
  renderFilterBar(suburbs);
  applyFilters(suburbs);
});

function renderFilterBar(suburbs) {
  const countries = Array.from(
    new Set(suburbs.flatMap((s) => s.cultural_background.map((c) => c.country)))
  ).sort();

  const bar = document.getElementById("filter-bar");
  bar.innerHTML = `
    <label for="filter-rent" class="visually-hidden">Filter by weekly rent</label>
    <select id="filter-rent">
      ${RENT_BUCKETS.map((b, i) => `<option value="${i}">${b.label}</option>`).join("")}
    </select>
    <label for="filter-income" class="visually-hidden">Filter by weekly household income</label>
    <select id="filter-income">
      ${INCOME_BUCKETS.map((b, i) => `<option value="${i}">${b.label}</option>`).join("")}
    </select>
    <label for="filter-country" class="visually-hidden">Filter by cultural background</label>
    <select id="filter-country">
      <option value="">Any cultural background</option>
      ${countries.map((c) => `<option value="${c}">From ${c}</option>`).join("")}
    </select>
    <span id="filter-count" class="muted" role="status" aria-live="polite"></span>
  `;

  document.getElementById("filter-rent").addEventListener("change", (e) => {
    currentFilters.rentIndex = Number(e.target.value);
    applyFilters(AppState.allSuburbs);
  });
  document.getElementById("filter-income").addEventListener("change", (e) => {
    currentFilters.incomeIndex = Number(e.target.value);
    applyFilters(AppState.allSuburbs);
  });
  document.getElementById("filter-country").addEventListener("change", (e) => {
    currentFilters.country = e.target.value;
    applyFilters(AppState.allSuburbs);
  });
}

function applyFilters(suburbs) {
  const rentBucket = RENT_BUCKETS[currentFilters.rentIndex];
  const incomeBucket = INCOME_BUCKETS[currentFilters.incomeIndex];
  const isDefault =
    currentFilters.rentIndex === 0 && currentFilters.incomeIndex === 0 && !currentFilters.country;

  const matching = suburbs.filter((s) => {
    if (rentBucket.min != null && s.median_weekly_rent < rentBucket.min) return false;
    if (rentBucket.max != null && s.median_weekly_rent >= rentBucket.max) return false;
    if (incomeBucket.min != null && s.median_weekly_household_income < incomeBucket.min) return false;
    if (incomeBucket.max != null && s.median_weekly_household_income >= incomeBucket.max) return false;
    if (currentFilters.country && !s.cultural_background.some((c) => c.country === currentFilters.country)) {
      return false;
    }
    return true;
  });

  setSuburbHighlight(isDefault ? null : new Set(matching.map((s) => s.id)));
  document.getElementById("filter-count").textContent = isDefault
    ? `${suburbs.length} suburbs`
    : `${matching.length} of ${suburbs.length} suburbs match`;
}
