// Shown before any suburb is selected — reused by map.js at both the
// council level (loadCouncilView) and the suburb level (loadSuburbView) so
// the empty-state markup lives in one place. Icon is decorative (aria-hidden)
// — the heading + message carry the actual content for screen readers.
function renderSidebarEmptyState(title, message) {
  document.getElementById("sidebar").innerHTML = `
    <div class="sidebar-empty-state">
      <svg class="empty-state-icon" viewBox="0 0 24 24" width="56" height="56" fill="none" aria-hidden="true" focusable="false">
        <path d="M12 21s7-7.58 7-13a7 7 0 1 0-14 0c0 5.42 7 13 7 13z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" />
        <circle cx="12" cy="8" r="2.5" stroke="currentColor" stroke-width="1.5" />
      </svg>
      <h2 class="empty-state-title">${title}</h2>
      <p class="empty-state-message">${message}</p>
    </div>
  `;
}

AppState.onSelect(async (suburbId) => {
  const panel = document.getElementById("sidebar");
  panel.innerHTML = '<p class="muted" role="status">Loading&hellip;</p>';
  try {
    const suburb = await fetchSuburbDetail(suburbId);
    renderSidebar(suburb);
  } catch (err) {
    console.error(err);
    panel.innerHTML = '<p class="status error" role="alert">Could not load this suburb’s details.</p>';
  }
});

function renderSidebar(suburb) {
  const d = suburb.demographics;
  const a = suburb.access_to_services;
  const panel = document.getElementById("sidebar");

  panel.innerHTML = `
    <h2 tabindex="-1">${suburb.name}, ${suburb.state}</h2>
    <p class="muted">${formatNumber(d.population)} residents</p>
    <button id="compare-toggle" class="compare-toggle-btn"></button>

    <div class="tabs" role="tablist" aria-label="Suburb details">
      <button id="tab-overview" class="tab-btn active" role="tab" aria-selected="true" aria-controls="panel-overview" tabindex="0" data-tab="overview">Overview</button>
      <button id="tab-culture" class="tab-btn" role="tab" aria-selected="false" aria-controls="panel-culture" tabindex="-1" data-tab="culture">Culture</button>
      <button id="tab-services" class="tab-btn" role="tab" aria-selected="false" aria-controls="panel-services" tabindex="-1" data-tab="services">Services</button>
    </div>

    <div id="panel-overview" class="tab-panel" role="tabpanel" aria-labelledby="tab-overview" data-panel="overview">
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

    <div id="panel-culture" class="tab-panel hidden" role="tabpanel" aria-labelledby="tab-culture" data-panel="culture">
      ${
        suburb.cultural_background.length
          ? suburb.cultural_background.map(cultureBar).join("")
          : '<p class="muted">No cultural background data available.</p>'
      }
    </div>

    <div id="panel-services" class="tab-panel hidden" role="tabpanel" aria-labelledby="tab-services" data-panel="services">
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

  // Moves focus into the panel once its real content exists (the panel
  // itself opens synchronously on AppState.select(), but this runs after
  // the async fetchSuburbDetail() above resolves) — tabindex="-1" makes the
  // heading focusable without adding it to the normal Tab order.
  // preventScroll: true — this fires while .sidebar-panel is typically
  // still mid-slide (240ms transform vs. a usually-much-faster local fetch),
  // and the browser's default focus()-triggered "scroll into view" was
  // reading the heading's live (still off-screen, pre-transform-finished)
  // position and briefly scrolling the page to compensate — visible as the
  // map wobbling on open. Nothing here needs that scroll: the panel is a
  // fixed overlay, not something the page needs to pan to reach.
  panel.querySelector("h2").focus({ preventScroll: true });
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

// Standard ARIA tabs pattern (APG "Tabs"): only the active tab sits in the
// Tab order (tabindex 0 vs -1 on the rest) — Left/Right/Home/End move focus
// *and* activate the tab they land on, matching how native OS tab strips
// behave and what a screen reader announcing role="tab" leads users to expect.
function wireTabs(panel) {
  const buttons = Array.from(panel.querySelectorAll(".tab-btn"));

  function activate(btn) {
    buttons.forEach((b) => {
      const isActive = b === btn;
      b.classList.toggle("active", isActive);
      b.setAttribute("aria-selected", String(isActive));
      b.tabIndex = isActive ? 0 : -1;
    });
    btn.focus();
    const target = btn.dataset.tab;
    panel.querySelectorAll(".tab-panel").forEach((p) => {
      p.classList.toggle("hidden", p.dataset.panel !== target);
    });
  }

  buttons.forEach((btn, i) => {
    btn.addEventListener("click", () => activate(btn));
    btn.addEventListener("keydown", (e) => {
      const targets = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: buttons.length - 1 };
      if (!(e.key in targets)) return;
      e.preventDefault();
      const next = (targets[e.key] + buttons.length) % buttons.length;
      activate(buttons[next]);
    });
  });
}
