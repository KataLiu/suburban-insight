# Suburban Insight

A website that helps newcomers to Melbourne — international students in
particular — explore and compare suburbs using real ABS Census data, not
guesswork or marketing copy.

Melbourne has 500+ suburbs across 31 councils, and comparing them usually
means digging through scattered government statistics by hand. Suburban
Insight puts rent, income, demographics, cultural makeup, and access to
services on one interactive map and a side-by-side comparison view, so
someone deciding where to live can see the real numbers at a glance.

A team project for Monash University's FIT3164 DS_01, Project 7.

## Features

- **Interactive two-level map** (Leaflet) — all 31 Melbourne councils shown
  first, coloured by average weekly rent; click one to drill into its
  actual suburb boundaries, each coloured by its own rent. A sequential,
  colour-blind-safe gradient, not a rainbow scale.
- **Suburb search** — type-ahead autocomplete in the header, fully keyboard-
  operable, jumps straight to a result on the map.
- **Suburb detail panel** — a slide-in overlay with Overview / Culture /
  Services tabs: population, income, rent, overseas-born %, family
  households %, population growth, top cultural backgrounds, and drive-time
  bands to the nearest primary school, hospital, GP, and childcare.
- **Filters** — narrow the currently-viewed council's suburbs by rent
  bucket, income bucket, or cultural background; matching suburbs stay
  highlighted on the map, the rest dim.
- **"Suburbs like this"** — K-means clustering (income, rent, overseas-born
  %, family-household %) surfaces similar suburbs on each profile, one
  click away.
- **Suburb comparison** — add up to 4 suburbs to a side-by-side table
  (persisted across pages via `localStorage`); rent and drive-time rows
  highlight the objectively better value (lower/shorter), with a non-colour
  cue (icon + text) alongside the colour so it's not colour-only.
- **Accessibility** — keyboard-operable map shapes and tabs, WCAG AA colour
  contrast, ARIA live regions and combobox/tablist patterns, visible focus
  rings, and semantic table markup throughout — not an afterthought pass.
- **No invented data** — every statistic traces to a documented ABS source;
  anything the source doesn't cover is an explicit `null`, not a guess.

## Tech stack

- **Frontend** — plain HTML/CSS/JS, no framework and no build step, plus
  [Leaflet](https://leafletjs.com/) for the map.
- **Backend** — [FastAPI](https://fastapi.tiangolo.com/) (Python), serving
  pre-built JSON from memory — there's no database.
- **Data pipeline** — offline Python scripts (pandas, scikit-learn for
  K-means, shapely/pyshp for boundary geometry) that clean raw ABS extracts
  into the JSON the backend serves. Not part of the running app.
- **Data source** — ABS 2021 Census (Suburbs and Localities), the 2016
  Census (State Suburbs, for the population-growth join), and the ABS CARA
  access-to-services FeatureServer.

## Project structure

```
suburban-insight/
├── frontend/          # Static HTML/CSS/JS — index.html (map) + compare.html
│   ├── css/
│   └── js/
├── backend/           # FastAPI app — routes, Pydantic schemas, in-memory data loader
│   └── tests/          # pytest suite
├── data_pipeline/      # Offline scripts: clean ABS extracts -> data/processed/*.json, train K-means
├── data/
│   ├── raw/              # empty placeholder — raw ABS files live outside the repo
│   └── processed/         # committed: suburbs.json, councils.json, suburbs.csv
├── docs/               # requirements, architecture, roadmap, data-field docs
└── tests/              # IEEE 829 test plans (component / integration / system / acceptance)
```

See `docs/roadmap.md` for the fully annotated version and the milestone-by-
milestone build history, and `CLAUDE.md` for architecture notes aimed at
whoever (human or AI) picks the codebase back up next.

## Running it locally

### Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8000
```

Visit `http://localhost:8000/health` — should return `{"status": "ok"}`.

Run the test suite:

```bash
pytest
```

### Frontend

No build step — it's static HTML/CSS/JS. Serve it with any static file
server, e.g.:

```bash
cd frontend
python3 -m http.server 5500
```

Visit `http://localhost:5500`. Make sure the backend is running first, and
that `frontend/js/config.js`'s `API_BASE_URL` matches where it's serving
from — the frontend won't load any data (councils, suburbs, search results)
without it.

> **Note:** open the page via that `http://localhost:5500` URL, not by
> double-clicking `index.html` or using an editor's built-in preview — the
> browser blocks the frontend's requests to the backend unless it's loaded
> from a real HTTP origin.

### Regenerating the data (optional)

The processed dataset (`data/processed/suburbs.json`, `councils.json`) is
committed to git, so the app runs out of the box without this step. To
rebuild it from raw ABS sources — see `data_pipeline/README.md` for exactly
what raw files are expected and where:

```bash
cd data_pipeline
pip install -r requirements.txt
python3 build_master_dataset.py   # resets cluster fields to null; needs internet (live ABS query)
python3 train_clusters.py         # must run after build_master_dataset.py
python3 build_councils.py         # must run after build_master_dataset.py
python3 export_csv.py             # optional: flat CSV export for reports
```

## Data

All suburb statistics come from the **ABS 2021 Census** (population,
income, rent, household composition, country of birth) and the **ABS CARA
access-to-services FeatureServer** (drive-time bands to schools, hospitals,
GPs, and childcare). Population growth is a name-matched join against the
**2016 Census**, since the two years use different suburb-boundary
standards (SSC vs SAL) — an approximation, not an exact boundary
reconciliation.

Two things worth knowing before reading too much into a number:
- **Drive times are category ranges** (e.g. `"2–4 min"`), not exact
  minutes — that's what the public ABS source publishes, not a
  simplification this project introduced.
- **A field is `null`, never invented**, when the source doesn't cover it
  or a suburb's population is too small for ABS to publish a reliable
  median.

**Suburb counts, and how they relate:**
- **531** — the full official list: every suburb across Melbourne's 31
  councils (Victorian Auditor-General's Metropolitan + Interface
  classification).
- **527** of those 531 actually appear in the app — the other 4 are
  essentially uninhabited localities with no usable Census data to show.
- **518** of those 527 get a "Suburbs like this" recommendation — the
  remaining 9 have real profile data but are missing one of the 4 features
  the K-means clustering runs on (e.g. an industrial area or near-zero-
  population locality with no meaningful income/rent/demographic figures
  to cluster on), so they're deliberately left out of clustering rather
  than given a fabricated match.
