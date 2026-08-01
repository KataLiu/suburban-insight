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
python3 build_master_dataset.py   # regenerates data/processed/suburbs.json; RESETS cluster fields to null
python3 train_clusters.py         # must run AFTER build_master_dataset.py — repopulates cluster fields
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
- Suburb clustering (`cluster.id` / `cluster.label` / `cluster.similar_suburb_ids`) is precomputed offline by `train_clusters.py` — k was chosen via silhouette score (currently **k=2**), not hardcoded to match the proposal wireframe's illustrative 3-cluster example.
- The 30-suburb list in `data_pipeline/suburb_shortlist.py` is a placeholder "Greater Melbourne" scope, not an official ABS boundary — see `docs/requirements.md` §20.
- Frontend is deliberately framework-free (plain HTML/CSS/JS, no build step, no SPA framework) — this is a website, not an app.
- Filtering (rent/income/cultural background) happens entirely client-side against the already-fetched suburb list; there is no `/api/filter` endpoint.
- Comparison state (`CompareState` in `frontend/js/compare-state.js`) is persisted in `localStorage`, not a query string or backend session — that's how the selected suburbs survive navigating between `index.html` and `compare.html`.

## Documentation

- `docs/requirements.md` — full requirements traced to the project proposal (`docs/proposal.pdf`), including an explicit "unclear/missing info" section
- `docs/architecture.md` — technical design and the reasoning behind stack choices
- `docs/roadmap.md` — repo structure plus the milestone plan (what's built vs. planned)
- `docs/data-fields.md` — every data field, its ABS source, and the suburb JSON schema
