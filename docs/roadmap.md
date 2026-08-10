# Suburban Insight — Repository Structure & Development Roadmap

## Part A — Repository Structure

```
suburban-insight/
├── frontend/                  # Static HTML/CSS/JS, deployed to Vercel
│   ├── index.html               # Map & Search page
│   ├── compare.html              # Suburb Comparison page
│   ├── css/                       # Navy/teal theme, shared layout
│   ├── js/                         # api.js, state.js, map.js, filters.js, sidebar.js, compare.js
│   │   └── charts/                  # D3 chart modules
│   └── assets/                        # logo, icons
│
├── backend/                    # FastAPI service, deployed to Render
│   ├── app/
│   │   ├── main.py               # App entrypoint, CORS, router registration
│   │   ├── core/                  # Settings/config (env-driven)
│   │   ├── api/routes/             # One file per resource: health, suburbs, compare, recommend
│   │   ├── models/                  # Pydantic schemas (request/response contracts)
│   │   ├── services/                 # Business logic (data loading) — kept separate from routes
│   │   └── ml/                        # Clustering model loading + recommendation matching
│   ├── tests/                    # pytest suite
│   ├── requirements.txt           # Python dependencies
│   └── .env.example                # Documents required env vars, no real secrets
│
├── data_pipeline/               # One-off/offline scripts, run manually — not part of the live API
│   ├── clean_census.py            # Cleans ABS Census 2021 extract
│   ├── clean_access_measures.py    # Cleans ABS drive-time/access extract
│   └── build_master_dataset.py      # Merges cleaned sources into one dataset
│
├── data/                        # Data storage (gitignored except placeholders)
│   ├── raw/                       # Original ABS downloads — never committed
│   └── processed/                  # Cleaned master dataset — output of data_pipeline/
│
├── docs/                        # Project documentation
│   ├── requirements.md            # Phase 1 output (this document's sibling)
│   ├── architecture.md             # Phase 2 output
│   ├── roadmap.md                   # This file
│   └── data-dictionary.md            # To be filled in once exact ABS tables are confirmed
│
├── .gitignore
└── README.md                    # Setup + run instructions
```

**Why `data_pipeline/` is separate from `backend/`:** cleaning ABS files is a manual, occasional step (run when source data changes), not something that happens on every API request or every deploy. Keeping it out of `backend/app/` makes clear it's not part of the running service — it only produces the file that `services/data_loader.py` reads.

**Why `data/raw/` and `data/processed/` are gitignored:** ABS extracts can be large and are reproducible from the public source; committing generated/downloaded data bloats the repo. Only `.gitkeep` placeholders are committed so the folders exist for a fresh clone.

## Status (updated 2026-08-05)

Milestones 1–11 are **done** — map, filters, comparison, and K-means
clustering are all live and backed by real ABS data (see notes on each
milestone below for where the actual build diverged from the original
plan). Milestones 12–14 (responsive/accessibility polish, formal testing,
deployment) are **not started**.

**One gap nobody's built yet:** suburb search/autocomplete (mentioned in
Milestone 5 below) was never implemented — the only way to reach a suburb
is clicking into its map shape (previously a marker, now a polygon — see
below).

**Post-MVP: map scaled from 30 hand-picked suburbs to the real Melbourne
scope (2026-08-05).** The original 30-suburb list was always a placeholder
(requirements §20 item 3). It's now replaced with all **531 suburbs across
the 31 official Metro Melbourne councils** (Victorian Auditor-General's
Metropolitan + Interface classification — a real, citable boundary, not
another arbitrary pick; 527 build successfully, 4 are essentially
uninhabited localities). Milestone 6's point-marker map is superseded by a
**two-level choropleth**: all 31 councils shown first (coloured by average
rent), click one to drill into its actual suburb boundaries (coloured by
their own rent). See `data_pipeline/melbourne_suburbs.py` for why this
boundary was chosen over two earlier candidates (GCCSA — too broad, sweeps
in rural fringe; SUA — not pursued once councils proved cleaner), and
`CLAUDE.md` for the resulting architecture notes (new `/api/councils`
endpoint, `build_councils.py`, the `AppState.allSuburbs` vs
`allSuburbNames` split, the zero-median data-cleaning fix). Re-running
`train_clusters.py` at this larger scale changed the chosen k from 2 to 10
— silhouette score genuinely picks a different k depending on how many
suburbs are in the dataset, which is expected, not a regression.

## Part B — Development Roadmap

Sequencing follows the requested milestone order, adjusted in two places with reasoning given:
- **Milestone 4 (dataset loading/cleaning) is pulled forward before the Leaflet map/comparison milestones**, matching the proposal's own WBS Phase 2 ("Data + UI Skeleton" builds the map *and* cleans ABS data in parallel, Slide 14) — the map and sidebar can't show real data until the master dataset exists, even in placeholder form.
- **Testing (13) is treated as continuous from Milestone 3 onward** (a growing pytest suite, not a single end-of-project step), with Milestone 13 specifically being the *cross-browser + usability* pass described in Slide 12, which naturally needs a reachable app — hence it still sits just before final deployment hardening in the sequence below, consistent with the WBS's "Polish & Deploy" → "Testing" ordering (Slide 14).

---

### Milestone 1 — Project Setup & Repository Structure ✅ Done
- **Objective:** Establish the repo skeleton, tooling, and dev environment so all four team members can run the project locally.
- **Features included:** none (infrastructure only).
- **Files to create:** full folder structure above, `.gitignore`, `README.md`, `backend/requirements.txt`, `backend/.env.example`.
- **Dependencies:** none — first milestone.
- **Expected output:** `git clone` → follow README → both frontend and backend run locally.
- **Testing criteria:** a teammate who wasn't involved in setup can get the app running from README alone.
- **Completion criteria:** repo pushed, all four members can clone and run it.
- **Possible risks:** environment differences across team members' machines (Python version, Node presence) — mitigate with a documented Python version in README and no frontend build tooling to keep it dependency-light.

### Milestone 2 — Basic Frontend Layout ✅ Done
- **Objective:** Static shell of both pages with the navy/teal visual language, no live data yet.
- **Features included:** navbar, search bar (non-functional), filter chip bar (static), two-panel layout, empty map container, empty sidebar shell with tab headers.
- **Files:** `frontend/index.html`, `frontend/compare.html`, `frontend/css/styles.css`.
- **Dependencies:** Milestone 1.
- **Expected output:** both pages render in-browser matching the wireframe layout, with placeholder content.
- **Testing criteria:** manual visual check against Slides 7 and 9.
- **Completion criteria:** layout approved against wireframes.
- **Possible risks:** scope creep into building real interactivity before the backend exists — keep this milestone visual-only.

### Milestone 3 — Basic FastAPI Backend ✅ Done
- **Objective:** A running backend with a health-check endpoint and CORS configured for the frontend origin.
- **Features included:** `/health`.
- **Files:** `backend/app/main.py`, `backend/app/core/config.py`, `backend/app/api/routes/health.py`, `backend/tests/test_health.py`.
- **Dependencies:** Milestone 1.
- **Expected output:** `GET /health` returns `{"status": "ok"}` locally.
- **Testing criteria:** `pytest` passes; manual `curl`/browser check.
- **Completion criteria:** backend runs locally and is reachable from the frontend dev environment (CORS verified).
- **Possible risks:** none significant — smallest possible backend surface.

### Milestone 4 — Dataset Loading & Cleaning ✅ Done
- **Objective:** Produce one clean master dataset from raw ABS extracts, without inventing any suburb statistics.
- **Features included:** offline cleaning pipeline.
- **Actual files** (JSON output, not parquet — see architecture.md's note on this simplification): `data_pipeline/clean_census.py`, `extract_centroids.py`, `population_growth.py`, `access_to_services.py`, `suburb_shortlist.py`, `build_master_dataset.py`.
- **Dependencies:** Milestone 1.
- **Actual output:** `data/processed/suburbs.json`, one object per suburb, for the 30-suburb shortlist in `suburb_shortlist.py` (a placeholder "Melbourne" scope — see requirements §20 item 3, still unconfirmed).
- **Testing criteria:** spot-checked several suburbs' values (Clayton, Box Hill, Northcote) against the raw ABS source directly.
- **Completion criteria met:** all fields populated for all 30 suburbs — population growth (2016→2021 name-matched join) and access-to-services (live spatial query against an ABS FeatureServer) were both closed as data gaps after this milestone first shipped with them null.
- **Risk that materialized:** ABS data cleaning complexity, as anticipated (Slide 16) — the access-to-services source turned out to be categorical (range bands), not exact minutes, and required a live spatial query rather than a simple file join.

### Milestone 5 — Suburb API Endpoints ✅ Done (search/autocomplete NOT built)
- **Objective:** Serve the cleaned dataset over HTTP.
- **Features included:** `/api/suburbs`, `/api/suburbs/{id}`. **`/api/suburbs/search` was never built** — there is no suburb search/autocomplete anywhere in the app; the only way to reach a suburb is clicking its map marker. Still open.
- **Files:** `backend/app/api/routes/suburbs.py`, `backend/app/services/data_loader.py`, `backend/app/models/schemas.py`.
- **Dependencies:** Milestone 3, Milestone 4.
- **Expected output:** endpoints return real (or clearly-marked placeholder) suburb data as JSON.
- **Testing criteria:** pytest coverage for each endpoint, including a 404 case for an unknown suburb ID.
- **Completion criteria:** frontend can fetch suburb data successfully.
- **Possible risks:** if Milestone 4 is blocked on data, this milestone must use clearly-labelled placeholder data (per the "no invented data" rule) rather than stall entirely.

### Milestone 6 — Interactive Leaflet Map ✅ Done
- **Objective:** Real map with clickable suburb markers wired to live API data.
- **Features included:** FR1 (map with clickable suburbs).
- **Files:** `frontend/js/map.js`, `frontend/js/api.js`, `frontend/js/state.js`.
- **Dependencies:** Milestone 2, Milestone 5.
- **Expected output:** map loads suburb markers from `/api/suburbs`; clicking one sets `state.selectedSuburbId`.
- **Testing criteria:** manual check — click each visible marker, confirm state updates (visible via a temporary console log or the sidebar in Milestone 7).
- **Completion criteria:** map renders all suburbs from the dataset; click events fire correctly.
- **Possible risks:** suburb boundary/GeoJSON source is unconfirmed (requirements §20 item 2) — this milestone deliberately uses point markers only, matching the wireframe, to avoid blocking on that open question.

### Milestone 7 — Suburb Information Panel ✅ Done
- **Objective:** Sidebar profile with Overview/Culture/Services tabs showing real data for the clicked suburb.
- **Features included:** FR6.
- **Files:** `frontend/js/sidebar.js`.
- **Dependencies:** Milestone 6.
- **Expected output:** clicking a map marker populates the sidebar with that suburb's data across all three tabs.
- **Testing criteria:** manual check against Slide 7 layout for at least 2 suburbs.
- **Completion criteria:** all fields from `/api/suburbs/{id}` are represented in the UI.
- **Possible risks:** none major — mostly rendering work once the endpoint exists.

### Milestone 8 — Filters ✅ Done (built to Req.2, not the wireframe's exact chips)
- **Objective:** Filters that actually narrow results, matching Req.2 exactly: rent, income, cultural background.
- **Features included:** FR2. The wireframe's "family size" chip was deliberately **not** built — there's no suburb-level field it maps to honestly (see data-fields.md). All three filters run client-side against the already-fetched suburb list (dims non-matching map markers); there is no `/api/filter` or `/api/recommend` endpoint.
- **Files:** `frontend/js/filters.js`.
- **Dependencies:** Milestone 6, Milestone 7.
- **Completion criteria met:** filter state (rent bucket, income bucket, cultural background) dims/highlights map markers live and shows a match count; verified in-browser.
- **Note:** filters are independent of Milestone 11's clustering — clustering surfaces "similar suburbs" per-suburb, not filter-driven recommendations (a deliberate product decision, see requirements §20 item 4).

### Milestone 9 — Charts and Visualisations ✅ Done (plain CSS bars, not D3.js — deviation from architecture.md)
- **Objective:** Cultural background bars on the profile sidebar and comparison table.
- **Features included:** part of FR6, visual polish toward Req.3.
- **Actual implementation:** `cultureBar()` in `frontend/js/format.js` — plain HTML/CSS percentage bars, reused by both `sidebar.js` and `compare.js`. **D3.js was never added to the project** despite being named in the original tech stack (architecture.md, Slide 10) — the bars didn't need it, and no other chart type has been built yet. If a future feature needs a real chart (scatter, distribution, etc.), D3 would need to be introduced then.
- **Dependencies:** Milestone 7.
- **Completion criteria met:** bars render correctly for suburbs with varying numbers of top backgrounds (verified 1–4 countries).

### Milestone 10 — Suburb Comparison ✅ Done (no colour-highlighting)
- **Objective:** Full `/compare` page functionality.
- **Features included:** FR3, FR7.
- **Files:** `frontend/compare.html`, `frontend/js/compare.js`, `backend/app/api/routes/compare.py`.
- **Dependencies:** Milestone 5, Milestone 9 (reuses the culture-bar chart).
- **Expected output:** adding/removing suburbs updates the comparison table live; state persists from the map page via `state.js`.
- **Testing criteria:** pytest for `/api/compare`; manual check of add/remove flow with 2–4 suburbs.
- **Completion criteria:** table matches Slide 9's grouped layout (Demographics / Cultural Background / Access to Services).
- **Possible risks:** the colour-highlighting rule for "better" values is unconfirmed (requirements §20 item 5) — ship without highlighting first, add it once the rule is confirmed, rather than guessing.

### Milestone 11 — Recommendation / Clustering System ✅ Done (suburb-similarity, not filter-based — a deliberate product decision)
- **Objective:** Real K-means-based suburb recommendations.
- **Features included:** FR4.
- **Actual files:** `data_pipeline/train_clusters.py` (offline training only — there is no `backend/app/ml/` module and no `/api/recommend` endpoint). `similar_suburb_ids` (top 3, same cluster, ranked by distance) is precomputed and embedded directly in each suburb's `cluster` field, already returned by the existing `/api/suburbs/{id}`. The frontend renders it as a "Suburbs like this" section with clickable links in `sidebar.js`.
- **Why not filter-based:** mapping the filter bar's rent/income buckets onto a K-means feature vector would mean inventing proxies (what point represents "under $400/wk"?) — the user chose the cleaner, direct suburb-similarity approach instead (see requirements §20 item 4). This can still be added as a second pass later if wanted.
- **Dependencies:** Milestone 4 (needs the master dataset).
- **Silhouette analysis result:** k=2 scored highest (0.325) across k=2–6 — a real 13/17 "affordable" vs "higher-income" split, not the wireframe's illustrative 3-cluster example. This was surfaced to and confirmed by the user rather than silently picked.
- **Completion criteria met:** cluster count/labels are derived from real data (auto-labelled from each centroid's most distinguishing features) and verified end-to-end in-browser (clicking a "similar suburb" correctly navigates and shows its own profile + its own similar suburbs).

### Milestone 12 — Responsive Design and Accessibility
- **Objective:** Layout reflows reasonably at tablet widths; baseline accessibility practices applied.
- **Features included:** none new — polish pass across existing screens.
- **Files:** `frontend/css/styles.css` updates across the board.
- **Dependencies:** Milestones 2–10 (everything visual should exist first).
- **Expected output:** no horizontal scroll/broken layout at common breakpoints; keyboard-operable tabs and filter chips.
- **Testing criteria:** manual check at 3–4 viewport widths; keyboard-only navigation pass.
- **Completion criteria:** no WCAG target was specified (requirements §20), so completion here means "baseline practices applied", not a specific conformance level, until confirmed otherwise.
- **Possible risks:** low — mostly CSS effort.

### Milestone 13 — Testing 🟡 All 4 IEEE 829 levels now documented; 2 of 4 executed
- **Objective:** The dedicated testing pass from Slide 12: cross-browser and usability testing, on top of the pytest suite that's been growing since Milestone 3.
- **Formalized as the IEEE 829 test-level hierarchy** (`tests/`, one folder per level — each plan gets its own folder, not shared):
  - **Component** (`tests/component-test-plan/`) — ✅ done, 10/10 automated tests passing (`backend/tests/test_health.py`/`test_suburbs.py`/`test_compare.py`/`test_councils.py`)
  - **Component Integration** (`tests/component-integration-test-plan/`) — ✅ done 2026-08-10, 5 automated tests (`backend/tests/test_integration.py`) + 3 manual browser procedures, all passing
  - **System** (`tests/system-test-plan/`) — 🟡 plan written, 4 of 6 journeys verified informally across development sessions but not yet run as one single dated formal pass; cross-browser (Firefox/Safari) and performance benchmarking not started
  - **Acceptance** (`tests/acceptance-test-plan/`) — 🟡 plan written (using the proposal's own Slide 12 tasks/metrics verbatim), **cannot be executed without real participants** — recruiting 5+ international students is the only blocker
- **Features included:** none new.
- **Files:** `tests/component-test-plan/`, `tests/component-integration-test-plan/`, `tests/system-test-plan/`, `tests/acceptance-test-plan/` (one `.md` plan each), `backend/tests/test_integration.py`.
- **Dependencies:** all prior milestones.
- **Expected output:** cross-browser check across Chrome/Firefox/Safari; usability sessions with 5+ international students on the 3 key tasks (find a suburb, apply filters, compare suburbs).
- **Testing criteria:** task completion rate, navigation clarity, data comprehension accuracy, user satisfaction (Slide 12's own metrics).
- **Completion criteria:** critical bugs from both passes are fixed; results documented.
- **Possible risks:** recruiting 5+ real international student testers takes lead time — start recruiting well before this milestone is reached.

### Milestone 14 — Deployment
- **Objective:** Live, publicly reachable app.
- **Features included:** none new.
- **Files:** `frontend/vercel.json` (if needed), Render service config.
- **Dependencies:** Milestone 13 (deploy after testing, to ship a verified build).
- **Expected output:** frontend live on Vercel, backend live on Render, frontend correctly calling the deployed backend URL (env-configured, not hardcoded).
- **Testing criteria:** smoke-test all API endpoints and both pages against the live URLs.
- **Completion criteria:** a fresh visitor can use the full flow (map → profile → filter → compare) with no local setup.
- **Possible risks:** free-tier Render services can cold-start slowly after inactivity — worth noting to the team ahead of any live demo (Slide 13's Week 11 presentation).
