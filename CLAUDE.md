# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Suburban Insight (FIT3163 DS01 Project 7) — a **website** (not an "app"; the
team is explicit about this terminology) helping newcomers compare Melbourne
suburbs, backed by real ABS Census data. No suburb statistics anywhere in
this codebase are invented — every field traces to a documented ABS source
or is explicitly `null`.

## Commands

**Backend (FastAPI):**
```bash
cd backend && source .venv/bin/activate
uvicorn app.main:app --reload --port 8000
pytest                                    # full suite
pytest tests/test_suburbs.py::test_get_known_suburb   # single test
```

**Frontend:** static HTML/CSS/JS, no build step — `cd frontend && python3 -m http.server 5500`

**Data pipeline** (from `data_pipeline/`, with `backend/.venv` active) — **order matters**:
```bash
python3 build_master_dataset.py   # regenerates data/processed/suburbs.json; RESETS cluster fields to null; ~1.5 min (527 suburbs)
python3 train_clusters.py         # must run AFTER build_master_dataset.py — repopulates cluster fields
python3 build_councils.py         # must run AFTER build_master_dataset.py — aggregates rent per council for the top-level map
python3 export_csv.py             # optional: flat suburbs.csv for reports
```
`build_master_dataset.py` makes live network calls to an ABS FeatureServer (access-to-services); needs internet.

## Architecture

- **Raw ABS source files live outside this repo**, at `../data/newData/`
  (i.e. `ClaudeCode/data/newData/`, a sibling of this project directory) —
  not `suburban-insight/data/raw/`, which is now just an empty placeholder.
  See `data_pipeline/README.md` for exactly what's expected there.
- `data/processed/suburbs.json` is a generated artifact produced by the
  pipeline scripts above (committed to git so the app runs out of the box)
  — it's the single source of truth the backend loads into memory at
  startup (`backend/app/services/data_loader.py`). There is no database.
- Data flow is one-directional: `data_pipeline/*.py` (offline) → `data/processed/suburbs.json` → backend (serves it) → frontend (fetches it). The backend never touches raw ABS files directly.
- `access_to_services` fields (`primary_school_drive_time`, etc.) are
  display-ready **range strings** (e.g. `"2–4 min"`), not numeric minutes —
  the public ABS source (CARA FeatureServer, SA1 geography) only publishes
  category bands, not exact figures. Don't reintroduce a numeric-minutes
  field without re-checking this constraint.
- Suburb clustering (`cluster.id` / `cluster.label` / `cluster.similar_suburb_ids`) is precomputed offline by `train_clusters.py` — k was chosen via silhouette score (currently **k=10** at 527-suburb scale — it was k=2 at the old 30-suburb scale; re-running at a different suburb count can change k). Suburbs missing any of the 4 clustering features (e.g. airports, near-zero-population localities) are deliberately excluded from clustering rather than given a fabricated cluster.
- **Suburb scope is the real "531 suburbs across the 31 official Metro Melbourne councils"** (`data_pipeline/melbourne_suburbs.py`), not a hand-picked list — replaced the old 30-suburb `suburb_shortlist.py` (deleted). The 31 councils (22 "Metropolitan" + 9 "Interface") are Victorian Auditor-General's official classification, verified 2026-08-05 — see that module's docstring for why GCCSA and SUA boundaries were tried and rejected first. 527 of the 531 build successfully (4 are essentially uninhabited localities with no usable Census data).
- **The map is a two-level choropleth, not point markers**: councils first (all 31, coloured by average rent), click one to drill into its actual suburb boundaries (coloured by their own rent). `frontend/js/map.js` owns both levels on one Leaflet instance; `GET /api/councils` for the top level, `GET /api/suburbs?council_id=X` for the drill-down (boundary geometry is only included when `council_id` is passed — sending all 527 suburbs' boundaries in one response would be ~2MB+, not needed until a specific council is chosen).
- **`AppState.allSuburbs` vs `AppState.allSuburbNames`** (`frontend/js/state.js`): `allSuburbs` is scoped to whichever council is currently being viewed (used by filters.js); `allSuburbNames` is every suburb, name/id only, loaded once at startup — needed because a suburb's "similar suburbs" (from clustering) can be in a *different* council than the one currently open, so resolving their names can't use the scoped list.
- ABS reports a literal `0` for `median_weekly_rent`/`median_weekly_household_income` in some very-low-population suburbs (too few responses to calculate a median) — `clean_census.py`'s `_median_or_none()` treats that as `null`, not a real $0 figure. Don't remove this guard; without it a couple of suburbs skew the choropleth colour scale and get spuriously included in clustering.
- Frontend is deliberately framework-free (plain HTML/CSS/JS, no build step, no SPA framework) — this is a website, not an app.
- Filtering (rent/income/cultural background) happens entirely client-side against the currently-viewed council's suburb list; there is no `/api/filter` endpoint, and filters are only shown/active in the suburb drill-down view, not the top-level council map.
- Comparison state (`CompareState` in `frontend/js/compare-state.js`) is persisted in `localStorage`, not a query string or backend session — that's how the selected suburbs survive navigating between `index.html` and `compare.html`.

- **Testing is split by IEEE 829 level, one folder per level under `tests/`** — never merge these into a shared folder. `backend/tests/*.py` is the actual Component-level test *code*; `tests/component-test-plan/` documents that code. `tests/component-integration-test-plan/` covers already-tested components working *together* (pipeline→backend, cross-file/cross-record referential integrity, frontend↔backend contracts) — automated (`backend/tests/test_integration.py`) plus 3 manual browser procedures, all done and passing. `tests/system-test-plan/` covers full end-to-end user journeys — plan written, journeys verified informally across sessions but not yet run as one dated formal pass; cross-browser (Firefox/Safari) and performance benchmarking not started. `tests/acceptance-test-plan/` covers real target users — plan written (straight from the proposal's Slide 12), but **cannot be executed without real international student participants**; don't fabricate results for this level.

## Documentation

- `docs/requirements.md` — full requirements traced to the project proposal (`docs/proposal.pdf`), including an explicit "unclear/missing info" section
- `docs/architecture.md` — technical design and the reasoning behind stack choices
- `docs/roadmap.md` — repo structure plus the milestone plan (what's built vs. planned)
- `tests/` — formal IEEE 829-style test plans, one subfolder per test level
- `docs/data-fields.md` — every data field, its ABS source, and the suburb JSON schema
