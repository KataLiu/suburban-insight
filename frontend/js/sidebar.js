AppState.onSelect(async (suburbId) => {
  const panel = document.getElementById("sidebar");
  panel.innerHTML = '<p class="muted">Loading&hellip;</p>';
  try {
    const suburb = await fetchSuburbDetail(suburbId);
    renderSidebar(suburb);
  } catch (err) {
    console.error(err);
    panel.innerHTML = '<p class="status error">Could not load this suburb’s details.</p>';
  }
});

function renderSidebar(suburb) {
  const d = suburb.demographics;
  const panel = document.getElementById("sidebar");

  panel.innerHTML = `
    <h2>${suburb.name}, ${suburb.state}</h2>
    <p class="muted">${formatNumber(d.population)} residents</p>
    <button id="compare-toggle" class="compare-toggle-btn"></button>

    <div class="tabs">
      <button class="tab-btn active" data-tab="overview">Overview</button>
      <button class="tab-btn" data-tab="culture">Culture</button>
      <button class="tab-btn" data-tab="services">Services</button>
    </div>

    <div class="tab-panel" data-panel="overview">
      <div class="stat-grid">
        ${statTile("Median household income", formatMoney(d.median_weekly_household_income), "/week")}
        ${statTile("Median rent", formatMoney(d.median_weekly_rent), "/week")}
        ${statTile("Overseas born", formatPct(d.overseas_born_pct))}
        ${statTile("Family households", formatPct(d.family_households_pct))}
      </div>
      <p class="muted note">Population growth: not yet available — needs a 2016 Census comparison, planned for a later milestone.</p>
    </div>

    <div class="tab-panel hidden" data-panel="culture">
      ${
        suburb.cultural_background.length
          ? suburb.cultural_background.map(cultureBar).join("")
          : '<p class="muted">No cultural background data available.</p>'
      }
    </div>

    <div class="tab-panel hidden" data-panel="services">
      <p class="muted note">Access-to-services data (drive time to school, hospital, GP, childcare) isn't available yet &mdash; planned for a later milestone.</p>
    </div>

    <p class="footer-caption">${suburb.state} &middot; Melbourne suburb &middot; ABS Census ${suburb.data_source.census_year}</p>
  `;

  wireTabs(panel);
  wireCompareToggle(panel, suburb.id);
}

function wireCompareToggle(panel, suburbId) {
  const btn = panel.querySelector("#compare-toggle");

  function render() {
    const inSet = CompareState.has(suburbId);
    const atLimit = !inSet && CompareState.getIds().length >= CompareState.MAX_SUBURBS;
    btn.textContent = inSet
      ? "− Remove from comparison"
      : atLimit
        ? `Comparison full (max ${CompareState.MAX_SUBURBS})`
        : "+ Add to comparison";
    btn.disabled = atLimit;
    btn.classList.toggle("active", inSet);
  }

  btn.addEventListener("click", () => {
    if (CompareState.has(suburbId)) {
      CompareState.remove(suburbId);
    } else {
      CompareState.add(suburbId);
    }
    render();
    const countEl = document.getElementById("compare-count");
    if (countEl) countEl.textContent = CompareState.getIds().length;
  });

  render();
}

function wireTabs(panel) {
  const buttons = panel.querySelectorAll(".tab-btn");
  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      buttons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      const target = btn.dataset.tab;
      panel.querySelectorAll(".tab-panel").forEach((p) => {
        p.classList.toggle("hidden", p.dataset.panel !== target);
      });
    });
  });
}
