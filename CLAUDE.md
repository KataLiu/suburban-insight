# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Suburban Insight (FIT3163 DS01 Project 7) — a **website** (not an "app"; the
team is explicit about this terminology) helping newcomers compare Melbourne
suburbs, backed by real ABS Census data. No suburb statistics anywhere in
this codebase are invented — every field traces to a documented ABS source
or is explicitly `null`.

**Layout:** `frontend/` (static HTML/CSS/JS, no build step, no framework)
talks to `backend/` (FastAPI) over a handful of read-only REST endpoints;
the backend holds no database — it loads pre-built JSON into memory at
startup. `data_pipeline/` is offline, one-off scripts (not part of the
running app) that turn raw ABS extracts into that JSON. See
`docs/roadmap.md` Part A for the full annotated directory tree — though
its `frontend/js/charts/` and `frontend/assets/` entries don't actually
exist (D3 was never added, per that same doc's Milestone 9 note; there's
no logo/icon assets folder either).

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
- Suburb clustering (`cluster.id` / `cluster.label` / `cluster.similar_suburb_ids`) is precomputed offline by `train_clusters.py` — k was chosen via silhouette score (currently **k=10** at 527-suburb scale — it was k=2 at the old 30-suburb scale; re-running at a different suburb count can change k). Suburbs missing any of the 4 clustering features (e.g. airports, near-zero-population localities) are deliberately excluded from clustering rather than given a fabricated cluster. **`backend/app/ml/` is an empty package** (just `__init__.py`) — there's no live ML/recommendation code, and no `/api/recommend` endpoint; clustering happens entirely offline and `similar_suburb_ids` just gets served back as a plain field on `/api/suburbs/{id}`.
- **Suburb scope is the real "531 suburbs across the 31 official Metro Melbourne councils"** (`data_pipeline/melbourne_suburbs.py`), not a hand-picked list — replaced the old 30-suburb `suburb_shortlist.py` (deleted). The 31 councils (22 "Metropolitan" + 9 "Interface") are Victorian Auditor-General's official classification, verified 2026-08-05 — see that module's docstring for why GCCSA and SUA boundaries were tried and rejected first. 527 of the 531 build successfully (4 are essentially uninhabited localities with no usable Census data).
- **The map is a two-level choropleth, not point markers**: councils first (all 31, coloured by average rent), click one to drill into its actual suburb boundaries (coloured by their own rent). `frontend/js/map.js` owns both levels on one Leaflet instance; `GET /api/councils` for the top level, `GET /api/suburbs?council_id=X` for the drill-down (boundary geometry is only included when `council_id` is passed — sending all 527 suburbs' boundaries in one response would be ~2MB+, not needed until a specific council is chosen).
- **Rent colour scale is a 5-stop sequential YlOrRd gradient** (`frontend/js/color-scale.js`'s `SCALE_STOPS`: golden yellow → orange → deep red) — deliberately *sequential*, not diverging, since rent is a low-to-high ordered quantity with no natural midpoint a diverging scale would wrongly imply one around. Colour-blind-safe via monotonic lightness (pale → saturated), not a hue contrast. The palest true ColorBrewer YlOrRd stop (`#ffffb2`) was tried and rejected — as a semi-transparent fill over real OSM tiles (not print-on-white) it blended into pale rural basemap areas, so the scale starts from the 2nd of 6 YlOrRd classes instead; check any future palette change against a rural stress-test area (e.g. Whittlesea/Kinglake), not just central Melbourne. `rentColor()` and `renderRentLegend()` share the same `SCALE_STOPS` array so the map and its legend can't drift out of sync — if you touch one, touch both, or better, just edit `SCALE_STOPS`. The legend also renders a dynamically-computed `(min+max)/2` midpoint label alongside the two ends, so there's a reference point for the middle of the gradient, not just its extremes.
- **Suburb selection is a tiny pub/sub, not a value anyone reads directly**: `AppState.select(id)` / `onSelect(fn)` and the symmetric `AppState.deselect()` / `onDeselect(fn)` (`frontend/js/state.js`) are the only sanctioned way to set/clear `selectedSuburbId` — don't read/write that field directly from a new call site, hook the pub/sub instead. Current listeners: `sidebar.js` renders the suburb-detail panel content on select; `panel.js` opens/closes the side panel on select/deselect. `deselect()` was added later than `select()` — nothing consumed a "cleared" selection before the side panel's close button needed one.
- **The side panel (`frontend/js/panel.js`) is a pure `position:absolute` overlay drawn on top of the map — `.map-pane` never resizes or reflows for it.** It's nested inside `.map-pane` alongside the other map badges (`#back-to-councils`, `#map-legend`, `#map-status`, `#map-hint`), not a flex sibling in `.app-layout`. It slides via a GPU-only `transform: translateX()` (240ms ease-out), collapsed (`visibility:hidden`, off-screen) whenever nothing is selected. **An earlier version made the map itself narrow via an animated `flex-basis`, which visibly janked** (animating a layout property forces the browser to reflow/repaint the whole map — hundreds of tiles plus 527 suburbs' worth of SVG — every frame) **and needed `leafletMap.invalidateSize()` after every open/close; the current overlay approach needs neither** — don't reintroduce either without re-reading this note. `sidebar.js`'s `renderSidebar()` moves focus to the suburb heading (`<h2 tabindex="-1">`) once real content renders, using `.focus({ preventScroll: true })` — the option is load-bearing, not decoration: the heading's transform-based position is still mid-slide when this fires (async fetch usually resolves faster than the 240ms animation), and without `preventScroll` the browser's default scroll-into-view visibly wobbles the whole page trying to reveal an element that's actually just off-screen mid-animation, not a page overflow. `map.js`'s `focusSuburb()` (the header search's "jump to this result" pan) reads the panel's live `offsetWidth` and passes it as `fitBounds()`'s `paddingBottomRight`, so a search result doesn't land underneath the about-to-open panel — reads the DOM rather than a hardcoded width on purpose, so it keeps working if the panel's `width`/`max-width` in `styles.css` ever changes.
- `#map-hint` ("Click a council…") only ever hides via a council click/keydown (`loadSuburbView()` in `map.js`) and only ever reappears via the header title's click handler (`#logo-home-btn`, `initMap()`) — `loadCouncilView()` itself deliberately never un-hides it, or the existing "Back to all councils" button (which also calls `loadCouncilView()`) would resurrect it too. That title button is a "reset to initial view" shortcut (`AppState.deselect()` + re-show the hint + `loadCouncilView()` — the same function `#back-to-councils` already uses, so the map-refit-to-all-councils comes for free); compare.html's title is a plain `<a href="index.html">` instead, since a full page load already resets index.html via `initMap()`.
- **`AppState.allSuburbs` vs `AppState.allSuburbNames`** (`frontend/js/state.js`): `allSuburbs` is scoped to whichever council is currently being viewed (used by filters.js); `allSuburbNames` is every suburb, name/id only, loaded once at startup — needed because a suburb's "similar suburbs" (from clustering) can be in a *different* council than the one currently open, so resolving their names can't use the scoped list. `frontend/js/search.js`'s autocomplete filters this same array client-side — no `/api/search` endpoint exists or is planned.
- The header search box (`frontend/js/search.js`) selects a suburb via the same `AppState.select(id)` path as the sidebar's "similar suburb" buttons — it deliberately does **not** auto-switch the map to the result's own council if that's not the one currently on screen (there's a `TODO (v2)` at the call site: doing so needs a council-name→council-id lookup that doesn't exist client-side yet). If the result belongs to the currently-displayed council, `map.js`'s `focusSuburb()` pans/highlights it; otherwise only the sidebar updates.
- **`initSuburbCombobox()` (`frontend/js/suburb-combobox.js`) is the one accessible combobox implementation shared by both the header search and the compare page's "+ Add suburb" control** (`compare.js`) — don't fork a second copy for a future picker; add a config option instead. The two call sites differ only in config: the header search (`search.js`) only opens on typing (`openOnFocus: false`, the default) and caps results at 8, since it's a type-ahead jump-to; the compare picker (`compare.js`) sets `openOnFocus: true` and `maxResults: Infinity` so clicking it browses the *entire* available-suburbs list (scrollable via the existing `.suburb-search-results` `max-height`/`overflow-y`), narrowing as you type, and passes `showCouncil: false` since suburb names are unique across all 527 (the header search leaves `showCouncil` at its default `true`, since disambiguating context is more useful there). Both get the same keyboard handling (arrow keys + `aria-activedescendant`, Enter to choose, Escape/Tab/outside-click to close) and reuse the same `.suburb-search-results`/`.suburb-search-option` dropdown styling — only the input's own CSS class differs, because the compare page's control sits on the light `.chips-bar` background instead of the dark header.
- The compare table (`frontend/js/compare.js`) only highlights a "winner" cell for metrics with an objectively better direction — currently just rent (lower) and the four drive-time bands via `DRIVE_RANK` (shorter). Income, overseas-born%, family-households%, population growth, and cultural background are deliberately never highlighted (no "better" direction exists) — don't extend winner-highlighting to those without re-litigating that.
- **`--teal` (`frontend/css/styles.css`) fails WCAG AA as a text/icon color** — it's only ~3.4:1 against white/off-white (needs 4.5:1). Use `--teal-text` (`#0a746a`) for anything rendering as text or an icon, or white text sitting on a teal background; keep `--teal` for borders and non-text fills (map polygons, decorative icons at reduced opacity) where the 3:1 non-text threshold is enough. Don't add a new `color: var(--teal)` text rule without checking this.
- Leaflet's council/suburb map shapes are keyboard-operable (`makeLayerKeyboardAccessible()` in `map.js`) — each SVG `<path>` gets `tabindex`/`role="button"`/`aria-label` once Leaflet actually mounts it (listens for the layer's `"add"` event, since `layer.getElement()` returns nothing before that), with Enter/Space triggering the same handler as a click. Any new map layer with a click handler should go through this helper too, or it'll be keyboard-unreachable like the old implementation was.
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
