let allSuburbsById = {};

document.addEventListener("DOMContentLoaded", async () => {
  try {
    const suburbs = await fetchSuburbs();
    allSuburbsById = Object.fromEntries(suburbs.map((s) => [s.id, s]));
    render();
  } catch (err) {
    console.error(err);
    document.getElementById("compare-root").innerHTML =
      '<p class="status error">Could not load the suburb list — is the backend running?</p>';
  }
});

async function render() {
  renderChips();
  await renderTable();
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
      : `<select id="add-suburb">
          <option value="">+ Add suburb</option>
          ${availableOptions.map((s) => `<option value="${s.id}">${s.name}</option>`).join("")}
        </select>`;

  bar.innerHTML = `${chips}${addControl}`;

  bar.querySelectorAll(".chip-remove").forEach((btn) => {
    btn.addEventListener("click", () => {
      CompareState.remove(btn.dataset.id);
      render();
    });
  });

  const addSelect = document.getElementById("add-suburb");
  if (addSelect) {
    addSelect.addEventListener("change", (e) => {
      if (e.target.value) {
        CompareState.add(e.target.value);
        render();
      }
    });
  }
}

async function renderTable() {
  const ids = CompareState.getIds();
  const root = document.getElementById("compare-root");

  if (ids.length === 0) {
    root.innerHTML = '<p class="muted">No suburbs selected yet — add some above, or from the map page.</p>';
    return;
  }

  root.innerHTML = '<p class="muted">Loading&hellip;</p>';
  try {
    const suburbs = await fetchComparison(ids);
    root.innerHTML = buildTable(suburbs);
  } catch (err) {
    console.error(err);
    root.innerHTML = '<p class="status error">Could not load comparison data.</p>';
  }
}

function buildTable(suburbs) {
  const cols = suburbs.length;
  const headerCells = suburbs
    .map(
      (s) => `<th>${s.name}<br><span class="muted">Pop. ${formatNumber(s.demographics.population)}</span></th>`
    )
    .join("");

  const row = (label, valueFn) =>
    `<tr><td>${label}</td>${suburbs.map((s) => `<td>${valueFn(s)}</td>`).join("")}</tr>`;
  const sectionRow = (label) => `<tr class="section-row"><td colspan="${cols + 1}">${label}</td></tr>`;

  return `
    <table class="compare-table">
      <thead><tr><th></th>${headerCells}</tr></thead>
      <tbody>
        ${sectionRow("Demographics")}
        ${row("Median household income", (s) => `${formatMoney(s.demographics.median_weekly_household_income)}/wk`)}
        ${row("Median rent", (s) => `${formatMoney(s.demographics.median_weekly_rent)}/wk`)}
        ${row("Overseas born", (s) => formatPct(s.demographics.overseas_born_pct))}
        ${row("Family households", (s) => formatPct(s.demographics.family_households_pct))}

        ${sectionRow("Cultural background")}
        <tr>
          <td>Top backgrounds</td>
          ${suburbs
            .map(
              (s) =>
                `<td>${s.cultural_background.length ? s.cultural_background.map(cultureBar).join("") : '<span class="muted">No data</span>'}</td>`
            )
            .join("")}
        </tr>

        ${sectionRow("Access to services")}
        ${row("Primary school", (s) => formatMinutes(s.access_to_services.primary_school_min))}
        ${row("Hospital", (s) => formatMinutes(s.access_to_services.hospital_min))}
        ${row("GP / clinic", (s) => formatMinutes(s.access_to_services.gp_clinic_min))}
        ${row("Childcare", (s) => formatMinutes(s.access_to_services.childcare_min))}
      </tbody>
    </table>
    <p class="muted note">Access-to-services data isn't available yet &mdash; planned for a later milestone.</p>
  `;
}
