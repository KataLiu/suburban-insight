let allSuburbsById = {};

document.addEventListener("DOMContentLoaded", async () => {
  try {
    const suburbs = await fetchSuburbs();
    allSuburbsById = Object.fromEntries(suburbs.map((s) => [s.id, s]));
    render();
  } catch (err) {
    console.error(err);
    document.getElementById("compare-root").innerHTML =
      '<p class="status error" role="alert">Could not load the suburb list — is the backend running?</p>';
  }
});

async function render() {
  renderChips();
  await renderTable();
}

// The one place that actually adds a suburb to the comparison — used by the
// "+ Add suburb" combobox (renderChips()) and the empty state's suggestion
// chips (wireEmptyCompareState()), so there's a single add path, not two.
function addSuburbToCompare(suburb) {
  CompareState.add(suburb.id);
  render();
}

function renderChips() {
  const ids = CompareState.getIds();
  const bar = document.getElementById("compare-chips");

  const chips = ids
    .map((id) => {
      const suburb = allSuburbsById[id];
      const label = suburb ? suburb.name : id;
      return `<span class="chip">${label} <button class="chip-remove" data-id="${id}" aria-label="Remove ${label}">&times;</button></span>`;
    })
    .join("");

  const availableOptions = Object.values(allSuburbsById)
    .filter((s) => !ids.includes(s.id))
    .sort((a, b) => a.name.localeCompare(b.name));

  const addControl =
    ids.length >= CompareState.MAX_SUBURBS
      ? `<span class="muted">Max ${CompareState.MAX_SUBURBS} suburbs</span>`
      : `<div class="add-suburb-wrap" id="add-suburb-wrap">
          <label for="add-suburb-input" class="visually-hidden">Add a suburb to compare</label>
          <input
            type="text"
            id="add-suburb-input"
            class="add-suburb-input"
            placeholder="+ Add suburb"
            autocomplete="off"
            role="combobox"
            aria-expanded="false"
            aria-controls="add-suburb-results"
            aria-autocomplete="list"
          />
          <ul id="add-suburb-results" class="suburb-search-results hidden" role="listbox" aria-label="Suburbs available to add"></ul>
          <span id="add-suburb-status" class="visually-hidden" role="status" aria-live="polite"></span>
        </div>`;

  bar.innerHTML = `${chips}${addControl}`;

  bar.querySelectorAll(".chip-remove").forEach((btn) => {
    btn.addEventListener("click", () => {
      CompareState.remove(btn.dataset.id);
      render();
    });
  });

  const addWrap = document.getElementById("add-suburb-wrap");
  if (addWrap) {
    initSuburbCombobox({
      input: document.getElementById("add-suburb-input"),
      list: document.getElementById("add-suburb-results"),
      wrap: addWrap,
      status: document.getElementById("add-suburb-status"),
      getSuburbs: () => availableOptions,
      onChoose: addSuburbToCompare,
      maxResults: Infinity,
      openOnFocus: true,
      emptyText: "No matches.",
      showCouncil: false,
    });
  }
}

async function renderTable() {
  const ids = CompareState.getIds();
  const root = document.getElementById("compare-root");

  if (ids.length === 0) {
    root.innerHTML = emptyCompareStateHtml();
    wireEmptyCompareState(root);
    return;
  }

  root.innerHTML = '<p class="muted" role="status">Loading&hellip;</p>';
  try {
    const suburbs = await fetchComparison(ids);
    root.innerHTML = buildTable(suburbs);
  } catch (err) {
    console.error(err);
    root.innerHTML = '<p class="status error" role="alert">Could not load comparison data.</p>';
  }
}

// Highest-population suburbs from the already-fetched allSuburbsById (no
// hardcoded names, no extra request) — used as one-tap suggestions in the
// empty state. Suburbs with no population figure are skipped rather than
// sorted as if population were 0.
function recommendedSuburbs(count = 5) {
  return Object.values(allSuburbsById)
    .filter((s) => s.population != null)
    .sort((a, b) => b.population - a.population)
    .slice(0, count);
}

// Shown before any suburbs are picked. Reuses the .empty-state-icon/-title/
// -message classes from the map page's sidebar empty state (sidebar.js) for
// a consistent look — only the container class and icon differ, since this
// sits in the page's main content area rather than a narrow sidebar.
function emptyCompareStateHtml() {
  const suggestions = recommendedSuburbs();

  return `
    <div class="compare-empty-state">
      <div class="compare-empty-card">
        <svg class="empty-state-icon" viewBox="0 0 24 24" width="56" height="56" fill="none" aria-hidden="true" focusable="false">
          <rect x="3" y="4" width="8" height="16" rx="2" stroke="currentColor" stroke-width="1.5" />
          <rect x="13" y="4" width="8" height="16" rx="2" stroke="currentColor" stroke-width="1.5" />
        </svg>
        <h2 class="empty-state-title">Compare suburbs side by side</h2>
        <p class="empty-state-message">Add two or more suburbs to see their demographics, rent, and cultural data side by side.</p>
        <button id="empty-state-add-suburb" class="empty-state-cta">+ Add suburb</button>
        ${
          suggestions.length
            ? `
              <div class="empty-state-suggestions">
                <span class="empty-state-suggestions-label">Largest suburbs:</span>
                ${suggestions
                  .map(
                    (s) =>
                      `<button class="similar-suburb-btn suggestion-chip" data-id="${s.id}">${s.name}</button>`
                  )
                  .join("")}
              </div>
            `
            : ""
        }
      </div>
    </div>
  `;
}

// Focuses the "+ Add suburb" combobox already rendered in the chips bar
// (renderChips(), openOnFocus: true) instead of building a second picker —
// same dropdown, same keyboard/ARIA behaviour, one implementation. The
// suggestion chips reuse addSuburbToCompare() directly — same add path as
// picking a suburb from that combobox, not a second one.
function wireEmptyCompareState(root) {
  const btn = root.querySelector("#empty-state-add-suburb");
  if (btn) {
    btn.addEventListener("click", () => {
      document.getElementById("add-suburb-input")?.focus();
    });
  }

  root.querySelectorAll(".suggestion-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      const suburb = allSuburbsById[chip.dataset.id];
      if (suburb) addSuburbToCompare(suburb);
    });
  });
}

// Access-to-services values are display-ready range strings (e.g. "2–4 min"),
// not numbers — see format.js formatDriveTime(). This ranks them so "winner"
// rows can compare bands the same way they'd compare a number. Keep the
// en-dash (–, U+2013) — it's what data_pipeline/access_to_services.py emits.
const DRIVE_RANK = { "0–2 min": 0, "2–4 min": 1, "4–10 min": 2, "10–30 min": 3, "30–90 min": 4 };

function buildTable(suburbs) {
  const cols = suburbs.length;
  const headerCells = suburbs
    .map(
      (s) =>
        `<th scope="col">${s.name}<br><span class="muted">Pop. ${formatNumber(s.demographics.population)}</span></th>`
    )
    .join("");

  // rawFn + direction are only passed for rows with an objectively "better"
  // direction (lower rent, shorter drive time) — see the caller below.
  // Rows without them (income, cultural mix, etc.) render exactly as before.
  const row = (label, valueFn, rawFn = null, direction = null) => {
    const winnerIds = rawFn ? findWinners(suburbs, rawFn, direction) : null;

    const cells = suburbs
      .map((s) => {
        const isWinner = winnerIds && winnerIds.has(s.id);
        return `<td${isWinner ? ' class="winner"' : ""}>${valueFn(s)}${
          isWinner
            ? ' <span class="winner-badge" aria-hidden="true">✓</span><span class="visually-hidden"> Best</span>'
            : ""
        }</td>`;
      })
      .join("");

    return `<tr><th scope="row">${label}</th>${cells}</tr>`;
  };
  const sectionRow = (label) => `<tr class="section-row"><th scope="colgroup" colspan="${cols + 1}">${label}</th></tr>`;

  return `
    <table class="compare-table">
      <caption class="visually-hidden">Comparison of selected suburbs' demographics, cultural background, and access to services</caption>
      <thead><tr><th scope="col"></th>${headerCells}</tr></thead>
      <tbody>
        ${sectionRow("Demographics")}
        ${row("Median household income", (s) => `${formatMoney(s.demographics.median_weekly_household_income)}/wk`)}
        ${row(
          "Median rent",
          (s) => `${formatMoney(s.demographics.median_weekly_rent)}/wk`,
          (s) => s.demographics.median_weekly_rent,
          "lower"
        )}
        ${row("Overseas born", (s) => formatPct(s.demographics.overseas_born_pct))}
        ${row("Family households", (s) => formatPct(s.demographics.family_households_pct))}
        ${row("Population growth (since 2016)", (s) => formatSignedPct(s.demographics.population_growth_pct))}

        ${sectionRow("Cultural background")}
        <tr>
          <th scope="row">Top backgrounds</th>
          ${suburbs
            .map(
              (s) =>
                `<td>${s.cultural_background.length ? s.cultural_background.map(cultureBar).join("") : '<span class="muted">No data</span>'}</td>`
            )
            .join("")}
        </tr>

        ${sectionRow("Access to services")}
        ${row(
          "Primary school",
          (s) => formatDriveTime(s.access_to_services.primary_school_drive_time),
          (s) => DRIVE_RANK[s.access_to_services.primary_school_drive_time] ?? null,
          "lower"
        )}
        ${row(
          "Hospital",
          (s) => formatDriveTime(s.access_to_services.hospital_drive_time),
          (s) => DRIVE_RANK[s.access_to_services.hospital_drive_time] ?? null,
          "lower"
        )}
        ${row(
          "GP / clinic",
          (s) => formatDriveTime(s.access_to_services.gp_clinic_drive_time),
          (s) => DRIVE_RANK[s.access_to_services.gp_clinic_drive_time] ?? null,
          "lower"
        )}
        ${row(
          "Childcare",
          (s) => formatDriveTime(s.access_to_services.childcare_drive_time),
          (s) => DRIVE_RANK[s.access_to_services.childcare_drive_time] ?? null,
          "lower"
        )}
      </tbody>
    </table>
    <p class="muted note">Drive times are typical ranges (most common ABS category among the suburb's local areas), not exact figures.</p>
  `;
}

// Suburbs with a null raw value are excluded (never crowned a winner). If
// every remaining value ties, nobody wins. Ties among the best value all win.
function findWinners(suburbs, rawFn, direction) {
  const values = suburbs.map((s) => ({ id: s.id, value: rawFn(s) })).filter((v) => v.value != null);
  if (values.length < 2) return null;

  const allTie = values.every((v) => v.value === values[0].value);
  if (allTie) return null;

  const best =
    direction === "lower"
      ? Math.min(...values.map((v) => v.value))
      : Math.max(...values.map((v) => v.value));

  return new Set(values.filter((v) => v.value === best).map((v) => v.id));
}
