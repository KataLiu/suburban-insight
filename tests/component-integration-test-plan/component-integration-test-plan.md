# Component Integration Test Plan — Suburban Insight

Follows the IEEE 829-2008 Level Test Plan structure (Clause 9), scoped to
the **Component Integration** level: verifying that already-tested
individual components correctly work *together*. Sits between the
Component Test Plan (unit-level, `backend/tests/test_health.py`,
`test_suburbs.py`, `test_councils.py`, `test_compare.py`) and the System
Test Plan (whole-website, end-to-end) in the test hierarchy — see
`CLAUDE.md` and `docs/roadmap.md`'s Milestone 13 status for where this
sits in the overall project.

## 1. Introduction

**1.1 Document identifier:** `component-integration-test-plan.md`, v1, 2026-08-10

**1.2 Scope:** the integration points between Suburban Insight's already-built
components — the data pipeline, the backend API, and the frontend's
JavaScript modules. Does not cover testing any single component in
isolation (that's the Component Test Plan) or full user-facing acceptance
criteria (that's the Acceptance Test Plan).

**1.3 References:**
- `CLAUDE.md` — architecture facts this plan assumes (data flow, pipeline run order)
- `docs/architecture.md` — original architecture design
- `docs/roadmap.md` — milestone status (this plan corresponds to part of Milestone 13, "Testing")
- `docs/requirements.md` — Slide 12's testing approach (functional/cross-browser/performance/usability), which this plan formalizes the "functional" portion of

## 2. System Overview

Suburban Insight has three layers that must integrate correctly:
`data_pipeline/*.py` (offline, produces `data/processed/suburbs.json` and
`councils.json`) → `backend/app/*` (FastAPI, loads that data into memory,
serves it over HTTP) → `frontend/js/*` (fetches from the API, renders the
map/sidebar/comparison). Each layer already has its own component-level
tests or manual verification; this plan targets the seams between them.

## 3. Test Items — the six integration points

| ID | Integration | Components involved |
|---|---|---|
| INT-1 | Data pipeline output → Backend load | `build_master_dataset.py`, `train_clusters.py`, `build_councils.py` → `app/services/data_loader.py` |
| INT-2 | Cross-file referential integrity | `suburbs.json`'s `council` field → `councils.json`'s `name` field |
| INT-3 | Cross-record referential integrity | `cluster.similar_suburb_ids` → other suburb records in the same dataset |
| INT-4 | Backend API contract → Frontend fetch calls | `app/api/routes/*.py` responses → `frontend/js/api.js` |
| INT-5 | Frontend module → Frontend module (client-side) | `map.js` ↔ `filters.js` ↔ `sidebar.js` ↔ `compare-state.js` |
| INT-6 | Frontend → Backend, full round trip | Browser fetch → live FastAPI server → real JSON response |

## 4. Approach

**INT-1, INT-2, INT-3, part of INT-4** are automated: `backend/tests/test_integration.py`
(5 tests, `test_cit1`–`test_cit5`). These load the *real* generated dataset
files — not mocks or fixtures — so a broken pipeline run or a bad manual
edit to the JSON would be caught the same way a real bug would be.

**INT-5 and the rest of INT-4/INT-6** (anything requiring a browser/DOM) are
**manual**, run in Chrome, following the scripted procedures in §6. Reason:
the frontend is deliberately framework-free with no build step or test
runner (`CLAUDE.md`), and introducing a browser-automation dependency
(e.g. Playwright, which needs Node.js) to test six specific interactions
is a bigger toolchain decision than this plan makes on its own — flagged
here for a deliberate decision, not silently added.

## 5. Automated Test Cases (implemented)

| Test | Checks |
|---|---|
| `test_cit1_pipeline_output_loads_into_backend` | Real dataset loads with a sane suburb/council count and every record is shaped correctly |
| `test_cit2_every_suburb_council_exists_in_councils_dataset` | No suburb references a council that doesn't exist (would silently break the map drill-down) |
| `test_cit3_similar_suburb_ids_reference_real_suburbs` | Regression test for the exact cross-council "similar suburbs" bug found and fixed 2026-08-05 |
| `test_cit4_council_filter_returns_only_that_councils_suburbs` | `?council_id=X` filtering is correct and includes boundary geometry |
| `test_cit5_compare_endpoint_accepts_ids_from_live_suburb_list` | End-to-end id flow: real `/api/suburbs` ids passed to `/api/compare`, not hardcoded ids |

Run: `cd backend && source .venv/bin/activate && pytest tests/test_integration.py -v`

## 6. Manual Test Procedures (INT-5, INT-6)

Each procedure: precondition → steps → expected result. Run in Chrome with
both dev servers up (`uvicorn` on :8000, `python3 -m http.server 5500` on
:5500).

**MP-1 — Map renders and filters correctly dim polygons**
1. Load `index.html`. *Expected:* 31 council polygons render, coloured by
   average rent, legend shows a real min/max range.
2. Click a council. *Expected:* map swaps to that council's real suburb
   boundaries; filter bar appears; sidebar placeholder updates to name
   that council.
3. Set the rent filter to a non-default bucket. *Expected:* matching
   suburbs stay full-opacity, others dim; the "X of Y suburbs match"
   count updates correctly.

**MP-2 — Suburb selection integrates map → sidebar → comparison**
1. Click a suburb polygon. *Expected:* sidebar shows that suburb's real
   name, population, and demographics — not stale data from a previous
   selection.
2. Click "Suburbs like this" for a suburb in a *different* council than
   currently viewed. *Expected:* correctly navigates and loads that
   suburb's own profile (regression check for the INT-3 bug class).
3. Click "+ Add to comparison", then open `compare.html` directly (new
   tab or navigation). *Expected:* the added suburb appears as a chip —
   confirms `CompareState`'s `localStorage` persistence survives
   navigation between pages.

**MP-3 — Back-navigation resets state correctly**
1. From a council's suburb view, click "← Back to all councils".
   *Expected:* filter bar hides, sidebar resets to the council-level
   placeholder, map re-renders all 31 councils.

**Pass/fail criteria:** all three procedures produce their expected result
with zero console errors (`mcp__claude-in-chrome__read_console_messages`
or browser DevTools, filtered to errors only).

## 7. Environment & Resources

- Backend: `uvicorn app.main:app --port 8000`, real `data/processed/*.json` (not fixtures)
- Frontend: `python3 -m http.server 5500`
- Automated: pytest 9.x, already in `backend/requirements.txt`
- Manual: Chrome (any current version)

## 8. Entry / Exit Criteria

**Entry:** all Component-level tests pass (`pytest -q` in `backend/`, 15/15 as of 2026-08-10).
**Exit:** all 5 automated integration tests pass, and all 3 manual
procedures produce their expected result with no console errors.

## 9. Risks

- Manual procedures (MP-1–MP-3) aren't automated, so they rely on being
  re-run by hand after future frontend changes — easy to forget. If
  frontend integration testing becomes a recurring need, revisit
  introducing a browser-automation tool rather than continuing manually.
- `test_cit1`'s "sane count" assertions (`> 500` suburbs, `== 31` councils)
  will need updating if the suburb scope changes again (see
  `data_pipeline/melbourne_suburbs.py`).

## 10. Status

Automated tests (§5): **implemented, 5/5 passing, 2026-08-10.**
Manual procedures (§6): **executed 2026-08-10, all pass, zero console
errors.** Specific results:
- MP-1: 31 councils rendered correctly; drilling into Yarra Ranges (59
  suburbs) worked; rent filter correctly reduced to "45 of 59 suburbs
  match" with matching suburbs staying full-opacity.
- MP-2: Healesville's profile loaded with real data; its cross-council
  "Suburbs like this" (Crib Point, in a different council) navigated
  correctly and showed Healesville back in *its* similar-suburbs list
  (confirms the relationship is genuinely bidirectional, not one-way);
  "Add to comparison" persisted through navigation to `compare.html` (4
  suburbs shown correctly, "Max 4 suburbs" cap displayed).
- MP-3: "Back to all councils" correctly reset the filter bar (hidden),
  sidebar placeholder, and map legend back to council-level state.
