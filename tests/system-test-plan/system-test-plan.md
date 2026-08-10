# System Test Plan — Suburban Insight

IEEE 829-2008 Level Test Plan, **System** level: testing the whole website
end-to-end, as a real user would experience it — not one component
(Component level) or one seam between two components (Component
Integration level), but a complete journey through the running site.
Corresponds to the "functional" and "cross-browser" parts of the
proposal's own testing approach (Slide 12).

## 1. Introduction

**1.1 Document identifier:** `system-test-plan.md`, v1, 2026-08-10

**1.2 Scope:** full user journeys across both pages (`index.html`,
`compare.html`), with the real backend and real ABS-derived data — not
isolated components or pairwise integrations.

**1.3 References:** `docs/requirements.md` (user journeys, §5), Slide 12
(proposal's testing approach), `tests/component-integration-test-plan/`

## 2. System Overview

Two pages, one backend: map/council-drill-down/filters/profile on
`index.html`, side-by-side comparison on `compare.html`, both talking to
the same FastAPI backend and sharing state via `localStorage`
(`CompareState`). See `docs/architecture.md` for the full picture.

## 3. Approach

Manual, browser-based (Chrome), no automation framework introduced for
this (see `component-integration-test-plan.md` §4 for why — same
reasoning applies here). Each journey below has been run for real, more
than once, during development — this document formalizes those checks
into repeatable scripted procedures rather than leaving them as one-off
verification.

## 4. Test Cases — User Journeys

**ST-1: First-time visitor explores the map**
1. Load `index.html` fresh. All 31 councils render, coloured by rent, legend shown.
2. Click a council. Its real suburb boundaries render, filter bar appears.
3. Click a suburb. Sidebar shows real demographics, culture, services, cluster label.
4. Click "← Back to all councils". State fully resets.
*Verified: 2026-08-05, 2026-08-10 (multiple councils: Glen Eira, Manningham, Yarra Ranges, Banyule).*

**ST-2: International student narrows down by budget and origin (proposal Use Case 1)**
1. Drill into a council, set the rent filter to a lower bucket.
2. Set the cultural background filter to their home country.
3. Confirm the match count and highlighted suburbs update correctly together.
*Verified: 2026-08-01 (Clayton/China filter combination), 2026-08-10 (Yarra Ranges rent filter, 45/59 match).*

**ST-3: Migrant family compares multiple suburbs (proposal Use Case 2)**
1. From two different councils, add 2–4 suburbs to comparison via "+ Add to comparison".
2. Navigate to `compare.html`. All added suburbs appear as chips with correct real data.
3. Remove one via its chip's ×, add a different one via the dropdown.
4. Confirm the table updates correctly each time, including cultural background bars and access-to-services ranges.
*Verified: 2026-08-01, 2026-08-05, 2026-08-10 (most recently: Clayton, Box Hill, Warburton, Crib Point — 4 suburbs from 3 different councils).*

**ST-4: Discovering suburbs via recommendations**
1. Open a suburb's profile, note its cluster label and "Suburbs like this".
2. Click one of the similar suburbs, including one in a *different* council than currently open.
3. Confirm it navigates correctly and that suburb's own "Suburbs like this" list is coherent (e.g. includes the suburb navigated from, confirming the relationship is genuinely mutual).
*Verified: 2026-08-10 (Healesville → Crib Point → back to Healesville in Crib Point's own list).*

**ST-5: Cross-browser rendering**
Not yet run — the proposal's Slide 12 explicitly calls for Chrome, Firefox,
and Safari. All testing to date has been Chrome only (via the
`claude-in-chrome` tooling available in this environment). **Open gap.**

**ST-6: Performance — map load and API response time**
Not yet formally measured against a target threshold. Informally, the
council view and drill-down have loaded quickly throughout testing (sub-
second API responses observed via manual `curl` timing during
development), but no documented benchmark or acceptable-range target
exists yet. **Open gap.**

## 5. Pass/Fail Criteria

Each journey (ST-1–ST-4) must complete with the expected result at every
step and zero browser console errors. ST-5 and ST-6 have no criteria yet
since they haven't been run — see §7.

## 6. Environment & Resources

Chrome (current version), backend on `:8000`, frontend on `:5500`, real
generated data (`data/processed/suburbs.json`, `councils.json`).

## 7. Risks / Open Gaps

- **No Firefox/Safari testing done** — the proposal specifically asks for
  this (Slide 12). Should be run before claiming System-level testing
  complete.
- **No performance benchmark defined or measured** — "acceptable range" was
  never quantified in the proposal or since; would need a target agreed
  before this can be marked done.
- Same automation gap as the Integration level: these are manual,
  scripted-but-not-automated procedures, so they need to be re-run by hand
  after significant frontend changes.

## 8. Status

**Journeys ST-1–ST-4: verified repeatedly through development (dates
above), but not yet run as one single, dated, formal pass with this
document in front of us.** ST-5 (cross-browser) and ST-6 (performance):
**not started.** Recommend running a single dated formal pass through
ST-1–ST-4 plus at least a Firefox and Safari check (ST-5) before
considering Milestone 13's System level complete.
