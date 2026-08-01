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

## Part B — Development Roadmap

Sequencing follows the requested milestone order, adjusted in two places with reasoning given:
- **Milestone 4 (dataset loading/cleaning) is pulled forward before the Leaflet map/comparison milestones**, matching the proposal's own WBS Phase 2 ("Data + UI Skeleton" builds the map *and* cleans ABS data in parallel, Slide 14) — the map and sidebar can't show real data until the master dataset exists, even in placeholder form.
- **Testing (13) is treated as continuous from Milestone 3 onward** (a growing pytest suite, not a single end-of-project step), with Milestone 13 specifically being the *cross-browser + usability* pass described in Slide 12, which naturally needs a reachable app — hence it still sits just before final deployment hardening in the sequence below, consistent with the WBS's "Polish & Deploy" → "Testing" ordering (Slide 14).

---

### Milestone 1 — Project Setup & Repository Structure
- **Objective:** Establish the repo skeleton, tooling, and dev environment so all four team members can run the project locally.
- **Features included:** none (infrastructure only).
- **Files to create:** full folder structure above, `.gitignore`, `README.md`, `backend/requirements.txt`, `backend/.env.example`.
- **Dependencies:** none — first milestone.
- **Expected output:** `git clone` → follow README → both frontend and backend run locally.
- **Testing criteria:** a teammate who wasn't involved in setup can get the app running from README alone.
- **Completion criteria:** repo pushed, all four members can clone and run it.
- **Possible risks:** environment differences across team members' machines (Python version, Node presence) — mitigate with a documented Python version in README and no frontend build tooling to keep it dependency-light.

### Milestone 2 — Basic Frontend Layout
- **Objective:** Static shell of both pages with the navy/teal visual language, no live data yet.
- **Features included:** navbar, search bar (non-functional), filter chip bar (static), two-panel layout, empty map container, empty sidebar shell with tab headers.
- **Files:** `frontend/index.html`, `frontend/compare.html`, `frontend/css/styles.css`.
- **Dependencies:** Milestone 1.
- **Expected output:** both pages render in-browser matching the wireframe layout, with placeholder content.
- **Testing criteria:** manual visual check against Slides 7 and 9.
- **Completion criteria:** layout approved against wireframes.
- **Possible risks:** scope creep into building real interactivity before the backend exists — keep this milestone visual-only.

### Milestone 3 — Basic FastAPI Backend
- **Objective:** A running backend with a health-check endpoint and CORS configured for the frontend origin.
- **Features included:** `/health`.
- **Files:** `backend/app/main.py`, `backend/app/core/config.py`, `backend/app/api/routes/health.py`, `backend/tests/test_health.py`.
- **Dependencies:** Milestone 1.
- **Expected output:** `GET /health` returns `{"status": "ok"}` locally.
- **Testing criteria:** `pytest` passes; manual `curl`/browser check.
- **Completion criteria:** backend runs locally and is reachable from the frontend dev environment (CORS verified).
- **Possible risks:** none significant — smallest possible backend surface.

### Milestone 4 — Dataset Loading & Cleaning
- **Objective:** Produce one clean master dataset from raw ABS extracts, without inventing any suburb statistics.
- **Features included:** offline cleaning pipeline.
- **Files:** `data_pipeline/clean_census.py`, `clean_access_measures.py`, `build_master_dataset.py`, `docs/data-dictionary.md` (draft).
- **Dependencies:** Milestone 1; **blocked on the user providing/confirming actual ABS source files and table IDs** (requirements §20 item 1).
- **Expected output:** `data/processed/master_dataset.parquet` with one row per suburb.
- **Testing criteria:** spot-check a handful of suburbs' cleaned values against the raw ABS source.
- **Completion criteria:** dataset covers the confirmed suburb list with no missing required fields, or missing values handled explicitly (not silently zero-filled).
- **Possible risks:** ABS data cleaning complexity — explicitly called out as an anticipated challenge in the proposal itself (Slide 16). Real ABS Census tables often need geographic-code joins (e.g. SA2 to suburb name) that can be fiddly.

### Milestone 5 — Suburb API Endpoints
- **Objective:** Serve the cleaned dataset over HTTP.
- **Features included:** `/api/suburbs`, `/api/suburbs/{id}`, `/api/suburbs/search`.
- **Files:** `backend/app/api/routes/suburbs.py`, `backend/app/services/data_loader.py`, `backend/app/models/schemas.py`.
- **Dependencies:** Milestone 3, Milestone 4.
- **Expected output:** endpoints return real (or clearly-marked placeholder) suburb data as JSON.
- **Testing criteria:** pytest coverage for each endpoint, including a 404 case for an unknown suburb ID.
- **Completion criteria:** frontend can fetch suburb data successfully.
- **Possible risks:** if Milestone 4 is blocked on data, this milestone must use clearly-labelled placeholder data (per the "no invented data" rule) rather than stall entirely.

### Milestone 6 — Interactive Leaflet Map
- **Objective:** Real map with clickable suburb markers wired to live API data.
- **Features included:** FR1 (map with clickable suburbs).
- **Files:** `frontend/js/map.js`, `frontend/js/api.js`, `frontend/js/state.js`.
- **Dependencies:** Milestone 2, Milestone 5.
- **Expected output:** map loads suburb markers from `/api/suburbs`; clicking one sets `state.selectedSuburbId`.
- **Testing criteria:** manual check — click each visible marker, confirm state updates (visible via a temporary console log or the sidebar in Milestone 7).
- **Completion criteria:** map renders all suburbs from the dataset; click events fire correctly.
- **Possible risks:** suburb boundary/GeoJSON source is unconfirmed (requirements §20 item 2) — this milestone deliberately uses point markers only, matching the wireframe, to avoid blocking on that open question.

### Milestone 7 — Suburb Information Panel
- **Objective:** Sidebar profile with Overview/Culture/Services tabs showing real data for the clicked suburb.
- **Features included:** FR6.
- **Files:** `frontend/js/sidebar.js`.
- **Dependencies:** Milestone 6.
- **Expected output:** clicking a map marker populates the sidebar with that suburb's data across all three tabs.
- **Testing criteria:** manual check against Slide 7 layout for at least 2 suburbs.
- **Completion criteria:** all fields from `/api/suburbs/{id}` are represented in the UI.
- **Possible risks:** none major — mostly rendering work once the endpoint exists.

### Milestone 8 — Filters
- **Objective:** Persona filter chips (background, family size, budget) that actually narrow results.
- **Features included:** FR2.
- **Files:** `frontend/js/filters.js`.
- **Dependencies:** Milestone 6, Milestone 7.
- **Expected output:** changing a filter updates which suburbs are highlighted/shown as recommended.
- **Testing criteria:** manual — apply each filter individually and in combination, confirm results narrow sensibly.
- **Completion criteria:** filter state is reflected in the UI and available for the recommend endpoint (Milestone 11).
- **Possible risks:** full filter set/value ranges are still open (requirements §20 item 6) — start with the 3 wireframe filters, extend once confirmed.

### Milestone 9 — Charts and Visualisations
- **Objective:** D3-built cultural background bars on the profile sidebar.
- **Features included:** part of FR6, visual polish toward Req.3.
- **Files:** `frontend/js/charts/culture-bar.js`.
- **Dependencies:** Milestone 7.
- **Expected output:** cultural background renders as horizontal bars, not a plain list.
- **Testing criteria:** visual check against Slide 7's cultural background section.
- **Completion criteria:** chart renders correctly for suburbs with varying numbers of top backgrounds.
- **Possible risks:** none major.

### Milestone 10 — Suburb Comparison
- **Objective:** Full `/compare` page functionality.
- **Features included:** FR3, FR7.
- **Files:** `frontend/compare.html`, `frontend/js/compare.js`, `backend/app/api/routes/compare.py`.
- **Dependencies:** Milestone 5, Milestone 9 (reuses the culture-bar chart).
- **Expected output:** adding/removing suburbs updates the comparison table live; state persists from the map page via `state.js`.
- **Testing criteria:** pytest for `/api/compare`; manual check of add/remove flow with 2–4 suburbs.
- **Completion criteria:** table matches Slide 9's grouped layout (Demographics / Cultural Background / Access to Services).
- **Possible risks:** the colour-highlighting rule for "better" values is unconfirmed (requirements §20 item 5) — ship without highlighting first, add it once the rule is confirmed, rather than guessing.

### Milestone 11 — Recommendation / Clustering System
- **Objective:** Real K-means-based "Recommended for You".
- **Features included:** FR4.
- **Files:** `data_pipeline`/`backend/app/ml/train_clusters.py` (offline training), `backend/app/ml/clustering.py`, `backend/app/api/routes/recommend.py`.
- **Dependencies:** Milestone 4 (needs the master dataset), Milestone 8 (needs filter state to match against).
- **Expected output:** `/api/recommend` returns suburbs from the best-matching cluster given active filters.
- **Testing criteria:** elbow/silhouette analysis documented; pytest for the recommend endpoint with a fixed filter input.
- **Completion criteria:** cluster count and labels are derived from real data, not hardcoded to the Slide 8 illustrative example.
- **Possible risks:** explicitly anticipated in the proposal itself — "ML clustering may not produce meaningful groups" (Slide 16). If clusters aren't meaningful, fall back to simple rule-based filtering rather than shipping a misleading recommendation.

### Milestone 12 — Responsive Design and Accessibility
- **Objective:** Layout reflows reasonably at tablet widths; baseline accessibility practices applied.
- **Features included:** none new — polish pass across existing screens.
- **Files:** `frontend/css/styles.css` updates across the board.
- **Dependencies:** Milestones 2–10 (everything visual should exist first).
- **Expected output:** no horizontal scroll/broken layout at common breakpoints; keyboard-operable tabs and filter chips.
- **Testing criteria:** manual check at 3–4 viewport widths; keyboard-only navigation pass.
- **Completion criteria:** no WCAG target was specified (requirements §20), so completion here means "baseline practices applied", not a specific conformance level, until confirmed otherwise.
- **Possible risks:** low — mostly CSS effort.

### Milestone 13 — Testing
- **Objective:** The dedicated testing pass from Slide 12: cross-browser and usability testing, on top of the pytest suite that's been growing since Milestone 3.
- **Features included:** none new.
- **Files:** none new (test artifacts/notes only).
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
