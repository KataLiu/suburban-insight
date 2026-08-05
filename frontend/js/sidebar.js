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
  const a = suburb.access_to_services;
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
        ${statTile("Population growth", formatSignedPct(d.population_growth_pct), "since 2016")}
      </div>

      ${suburb.cluster.label ? `<p class="cluster-badge">${suburb.cluster.label}</p>` : ""}
      <h3 class="section-heading">Suburbs like this</h3>
      ${similarSuburbsHtml(suburb)}
    </div>

    <div class="tab-panel hidden" data-panel="culture">
      ${
        suburb.cultural_background.length
          ? suburb.cultural_background.map(cultureBar).join("")
          : '<p class="muted">No cultural background data available.</p>'
      }
    </div>

    <div class="tab-panel hidden" data-panel="services">
      <div class="stat-grid">
        ${statTile("Primary school", formatDriveTime(a.primary_school_drive_time))}
        ${statTile("Hospital", formatDriveTime(a.hospital_drive_time))}
        ${statTile("GP / clinic", formatDriveTime(a.gp_clinic_drive_time))}
        ${statTile("Childcare", formatDriveTime(a.childcare_drive_time))}
      </div>
      <p class="muted note">Typical drive time from homes in this suburb, based on the most common ABS category among its local areas &mdash; a range, not an exact figure (ABS only publishes category bands, e.g. "2&ndash;4 min").</p>
    </div>

    <p class="footer-caption">${suburb.state} &middot; Melbourne suburb &middot; ABS Census ${suburb.data_source.census_year}</p>
  `;

  wireTabs(panel);
  wireCompareToggle(panel, suburb.id);
  wireSimilarSuburbs(panel);
}

function similarSuburbsHtml(suburb) {
  const ids = suburb.cluster.similar_suburb_ids || [];
  const matches = ids
    .map((id) => AppState.allSuburbNames.find((s) => s.id === id))
    .filter(Boolean);

  if (!matches.length) {
    return '<p class="muted note">No similar suburbs found — clustering hasn\'t run yet, or this suburb has no close matches.</p>';
  }

  return `
    <div class="similar-suburbs">
      ${matches.map((s) => `<button class="similar-suburb-btn" data-id="${s.id}">${s.name}</button>`).join("")}
    </div>
  `;
}

function wireSimilarSuburbs(panel) {
  panel.querySelectorAll(".similar-suburb-btn").forEach((btn) => {
    btn.addEventListener("click", () => AppState.select(btn.dataset.id));
  });
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
