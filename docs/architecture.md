# Suburban Insight — Technical Architecture

## Stack decision
The proposal's preferred stack (HTML/CSS/JS + Leaflet.js + D3.js frontend, Python/FastAPI backend, pandas, scikit-learn, Vercel/Render deployment) is kept **as-is, with no framework substitutions**. Reasoning, per the "explain before changing" rule:

- The team is 4 students with **varied web/data skills** and **no budget** (proposal constraints) — a JS framework (React/Vue) or a database service would add build tooling and operational surface area the proposal doesn't ask for and the constraints argue against.
- The dataset is a small, static, infrequently-updated Census extract (a few hundred suburbs) — this does not need a database; a pandas-cleaned flat file loaded into memory at API startup is sufficient and simpler to deploy on Render's free tier.
- Two pages (map, compare) with shared state (selected suburb, active filters, comparison set) is well within what vanilla JS modules can handle without a framework.

One deliberate addition beyond what's named in the proposal: a `data_pipeline/` step that runs pandas cleaning **once, offline**, rather than cleaning ABS files on every API request. This is standard practice for static reference data and keeps the FastAPI service fast and simple — flagged here, not silently assumed.

## Frontend structure
Static HTML/CSS/vanilla JS, deployed to Vercel as static files (no build step required, matching "avoid unnecessary frameworks").

```
frontend/
├── index.html        # Map & Search page
├── compare.html       # Suburb Comparison page
├── css/
│   └── styles.css     # Navy/teal theme, shared layout, tabs, chips, tables
├── js/
│   ├── api.js          # fetch() wrapper around the backend API
│   ├── state.js        # shared client state: selected suburb, active filters, comparison set (uses localStorage or in-memory module state)
│   ├── map.js           # Leaflet init, suburb markers, click → select suburb
│   ├── filters.js        # persona filter chip UI + state
│   ├── sidebar.js         # suburb profile panel, Overview/Culture/Services tabs
│   ├── compare.js          # compare.html logic: add/remove suburbs, render table
│   └── charts/
│       └── culture-bar.js   # D3 horizontal bar for cultural background %
└── assets/                    # logo, icons
```

`state.js` is the seam between pages: the comparison set (list of suburb IDs) is the one piece of state that needs to survive navigation from `index.html` to `compare.html`, so it's persisted via `localStorage` rather than passed through a query string (simplest option, no backend session needed — consistent with NFR "no login").

## Backend structure
FastAPI app deployed to Render, serving JSON only (no server-rendered HTML).

```
backend/
├── app/
│   ├── main.py                 # FastAPI app, CORS config, router registration
│   ├── core/
│   │   └── config.py            # env-driven settings (data paths, CORS origins)
│   ├── api/routes/
│   │   ├── health.py             # GET /health
│   │   ├── suburbs.py             # GET /api/suburbs, /api/suburbs/{id}, /api/suburbs/search
│   │   ├── compare.py              # POST /api/compare
│   │   └── recommend.py             # GET /api/recommend
│   ├── models/
│   │   └── schemas.py                # pydantic request/response models
│   ├── services/
│   │   └── data_loader.py             # loads processed dataset into memory once at startup
│   └── ml/
│       └── clustering.py               # loads precomputed cluster assignments; nearest-match logic
├── tests/
│   └── test_health.py
├── requirements.txt
└── .env.example
```

Routes stay thin (parse request → call a service/ml function → return schema); logic lives in `services/` and `ml/` so it's independently testable without spinning up FastAPI.

## API design
| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | Liveness check for Render + local dev |
| GET | `/api/suburbs` | List all suburbs with map-marker-level summary (id, name, lat/lng, population) |
| GET | `/api/suburbs/{id}` | Full profile: Overview + Culture + Services data for one suburb |
| GET | `/api/suburbs/search?q=` | Autocomplete suburb names |
| POST | `/api/compare` `{suburb_ids: [...]}` | Side-by-side data for 2+ suburbs, grouped by Demographics/Culture/Services |
| GET | `/api/recommend?filters=...` | Top-matching suburbs for the active persona filters, using the precomputed clusters |

This list covers FR1–FR7 from `requirements.md`. Filter parameter shape for `/api/recommend` is left open pending clarification of the full filter set (see requirements §20).

## Data flow
```
ABS raw downloads (data/raw/, local-only)
        │  pandas cleaning scripts
        ▼
data_pipeline/clean_census.py, clean_access_measures.py
        │  merge on suburb code
        ▼
data_pipeline/build_master_dataset.py
        │
        ▼
data/processed/master_dataset.parquet   ← single source of truth for the API
        │  loaded once at FastAPI startup (services/data_loader.py)
        ▼
API endpoints (in-memory pandas DataFrame, no DB)
        │  JSON over HTTP
        ▼
Frontend fetch() → Leaflet map / D3 charts / sidebar / comparison table
```

## Data storage approach
Flat files (Parquet/CSV), no database. This is intentional given the "no budget" constraint and the small, static dataset size — a database would add an operational dependency (hosting, migrations, connection config on Render) for no real benefit here. If the dataset later grows to need querying beyond what pandas comfortably handles in memory, SQLite is the natural next step (still free, still simple) — not needed at this stage.

## Data-cleaning pipeline
1. Raw ABS Census 2021 and Access Measures files land in `data/raw/` (gitignored — real ABS files are not committed; only placeholder/`.gitkeep`).
2. `clean_census.py` — column renaming, missing-value handling, filter to Melbourne suburbs, compute population growth % (requires joining 2016 and 2021 Census figures).
3. `clean_access_measures.py` — clean drive-time fields per suburb.
4. `build_master_dataset.py` — merges both on suburb code (likely SA2, pending ABS table confirmation — see requirements §20) into one `master_dataset.parquet` in `data/processed/`.
5. A `docs/data-dictionary.md` should be filled in once the exact ABS tables are confirmed, documenting every column, its source table, and any derived-field formulas.

No fabricated suburb statistics are introduced anywhere in this pipeline or the scaffold — until real ABS data is loaded, the API returns clearly-labelled placeholder/demo data only (see `docs/roadmap.md` milestone 4).

## Map architecture
Leaflet.js map centred on Melbourne. Start with **point markers** (matches the current wireframe exactly — Slide 7 shows pins, not polygons) and treat suburb boundary polygons (GeoJSON) as a later enhancement once a boundary data source is confirmed (requirements §20). Marker click → `state.js` sets `selectedSuburbId` → `sidebar.js` re-renders.

## Chart architecture
D3.js, small reusable render functions rather than a chart library — each takes a container element + data and draws one chart type:
- `culture-bar.js`: horizontal percentage bars for cultural background, reused on both the profile sidebar and the comparison table.
Stat tiles (income, growth %, etc.) are plain HTML/CSS, not D3 — they're numbers with labels, not charts.

## Recommendation-system architecture
Training happens **offline**, not per-request:
1. `data_pipeline` (or a dedicated `ml/train_clusters.py`) selects features (median income, median rent, overseas-born %, family household %, cultural background, population growth), applies `StandardScaler`, and runs K-means.
2. k is chosen via elbow/silhouette analysis (per WBS, Slide 14) — not hardcoded to 3, despite the illustrative 3-cluster example on Slide 8.
3. Cluster assignments are persisted to `data/processed/` (or a joblib model file) alongside the master dataset.
4. `backend/app/ml/clustering.py` loads the precomputed assignments at startup; `/api/recommend` matches active filters against cluster centroids or does a simple nearest-match — exact matching logic is still open pending requirements §20 item 4.

## Deployment architecture
- **Frontend** → Vercel, static files, no build step.
- **Backend** → Render, FastAPI + uvicorn, free tier.
- CORS on the backend allow-lists the Vercel frontend origin.
- Config (API base URL for frontend, CORS origins for backend) via environment variables; only `.env.example` files are committed, never real `.env`.

## Error handling
- Backend: FastAPI exception handlers return structured JSON errors with correct status codes (404 unknown suburb, 422 validation, 500 unexpected).
- Frontend: sidebar and comparison views render an explicit empty/error state on fetch failure rather than a blank panel (named directly in the WBS, Slide 14).

## Testing approach
Mirrors Slide 12 exactly:
- **Functional** — pytest against API endpoints (starts with the health check in the scaffold); manual/E2E for UI flows.
- **Cross-browser** — manual verification in Chrome, Firefox, Safari.
- **Performance** — map load time and API response time checks.
- **Usability** — 5+ international students completing: find a suburb, apply filters, compare suburbs; measured via task completion rate, navigation clarity, data comprehension accuracy, satisfaction.

## Responsive design approach
The proposal rules out a **mobile app**, not a **responsive layout** — these are different things (requirements §18). Recommendation: build the desktop-first two-panel layout described in requirements §14, and let it reflow gracefully at tablet widths using CSS flexbox/grid, without investing in a dedicated mobile UX. This is a recommendation, not a stated requirement — flagged as such.

## Accessibility approach
No WCAG level or equivalent standard is specified in the proposal (requirements §20). Recommendation: bake in baseline practices at no extra cost — semantic HTML, sufficient colour contrast within the navy/teal palette, keyboard-operable filter chips and tabs — without treating any specific WCAG conformance level as a hard requirement until confirmed.
