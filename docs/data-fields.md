# Suburban Insight — Required Data Fields & Suburb Data Structure

This document re-derives the data needs directly from `proposal.pdf` and the existing `requirements.md` / `architecture.md`, with no invented statistics. It answers: what fields are needed, why, where they come from, and what's essential for the first working version (per the Milestone 4–10 slice in `roadmap.md`, i.e. map + profile + filters + comparison, *before* recommendations).

**Update (2026-08-05):** the two rows below marked "deferred"/"not named" are resolved — see `docs/roadmap.md`'s Status section and `data_pipeline/melbourne_suburbs.py`. Scope is now 531 suburbs across the 31 official Metro Melbourne councils (not the placeholder 30), and suburb boundary polygons are used directly (choropleth map, not point markers). A `council` field (the suburb's council name, e.g. "Monash") was added, used for the map's council→suburb drill-down.

## 1. Required fields

### Identity & geography
| Field | What it is | Feature(s) that need it | Source | Essential for v1? |
|---|---|---|---|---|
| `suburb_id` | Internal stable identifier for a suburb | Every API call, comparison chips, search results | Generated locally when building the master dataset (not from ABS directly) | **Yes** |
| `suburb_name` | Display name, e.g. "Clayton" | Map labels, sidebar header, search, comparison headers | ABS geographic classification (suburb/SA2 name) | **Yes** |
| `state` | e.g. "VIC" | Sidebar header "Clayton, VIC", footer caption | ABS geographic classification | **Yes** |
| `council` | The suburb's council, e.g. "Monash" | Council→suburb drill-down map | ABS LGA 2021 boundary, spatial join (`melbourne_suburbs.py`) | **Yes** |
| `lat` / `lng` (point) | Coordinates for a map marker | Suburb centroid (still used for the "similar suburbs" click target and other point-based needs) | ABS SAL 2021 boundary shapefile, `representative_point()` | **Yes** |
| `boundary` (GeoJSON polygon) | Suburb boundary shape | The choropleth map itself — suburbs and councils are both rendered as their real shape, not point markers | ABS SAL/LGA 2021 boundary shapefiles, simplified (`extract_centroids.load_simplified_boundaries`) | **Yes** |

### Demographics (Overview tab, Slide 7)
| Field | What it is | Feature(s) | Source | Essential for v1? |
|---|---|---|---|---|
| `population` | Total suburb population | Sidebar header stat ("Population: 18,420") | ABS Census 2021 | **Yes** |
| `population_growth_pct` | % population change since 2016 | Overview stat tile, comparison | Derived — requires joining ABS Census **2016 and 2021** figures | **Yes** |
| `median_weekly_household_income` | Median household income per week | Overview stat tile, comparison, recommendation feature vector | ABS Census 2021 (Total Household Income) | **Yes** |
| `median_weekly_rent` | Median weekly rent | Comparison table, "budget" filter chip, recommendation feature vector | ABS Census 2021 (Rent) | **Yes** — shown in comparison (Slide 9) though not the Overview mockup (Slide 7); still needed in the dataset |
| `overseas_born_pct` | % of residents born overseas | Overview stat tile, comparison, cultural-background filter, recommendation feature | ABS Census 2021 (Country of Birth) | **Yes** |
| `family_households_pct` | % of households that are family households | Overview stat tile, comparison, recommendation feature | ABS Census 2021 (Household Composition) | **Yes** |

### Cultural background (Culture tab, Slide 7/9)
| Field | What it is | Feature(s) | Source | Essential for v1? |
|---|---|---|---|---|
| `cultural_background` | List of `{country, pct}` for top countries of origin | Culture tab bars, comparison "top backgrounds", cultural-background filter, recommendation feature | ABS 2021 Census: Cultural diversity in Australia (Slide 17 reference) | **Yes** |

### Access to services (Services tab, Slide 7/9)
| Field | What it is | Feature(s) | Source | Essential for v1? |
|---|---|---|---|---|
| `primary_school_min` | Drive time to nearest primary school | Services tab, comparison | ABS Road distance and drive time access measures (Slide 17 reference) | **Yes** — required for FR6 (Milestone 7), but proposal itself flags "ABS data cleaning complexity" as a risk (Slide 16); if this dataset proves hard to source in time, it can slip to a v1.1 without blocking map/profile/compare |
| `hospital_min` | Drive time to nearest hospital | Services tab, comparison | same | **Yes** (same caveat) |
| `gp_clinic_min` | Drive time to nearest GP/clinic | Services tab, comparison | same | **Yes** (same caveat) |
| `childcare_min` | Drive time to nearest childcare | Services tab, comparison | same | **Yes** (same caveat) |

### Commute to work (added 2026-08-10 — not in the original proposal, a post-MVP addition)
| Field | What it is | Feature(s) | Source | Essential for v1? |
|---|---|---|---|---|
| `train_pct` / `tram_pct` / `bus_pct` / `car_pct` / `bicycle_pct` / `walked_pct` / `worked_from_home_pct` | % of all employed persons in the suburb, by method of travel to work | Suburb profile — a public-transport-access proxy where actual station locations aren't an ABS dataset (see requirements §20-style reasoning: literal train-station locations are PTV/state infrastructure data, not ABS) | ABS 2021 Census Table G62, "Method of Travel to Work" (`data_pipeline/clean_census.py`'s `load_commute_to_work()`) | **No** — not part of the original 5 requirements; added as a genuinely useful, ABS-only enrichment once the core product was working |

Won't sum to 100% — deliberately excludes less common modes (ferry, taxi/rideshare, truck, motorbike, car-as-passenger), multi-method commutes, and "did not go to work"/not-stated, since the goal is a readable "how do people get around here" signal, not an exhaustive reproduction of the table.

### Recommendation / clustering (not raw ABS data — computed)
| Field | What it is | Feature(s) | Source | Essential for v1? |
|---|---|---|---|---|
| `cluster_id` | K-means cluster assignment | "Recommended for You" | Computed offline from the demographic fields above (Milestone 11) | **No** — explicitly out of scope until Milestone 11 |
| `cluster_label` | Human-readable name for the cluster (e.g. "Family-oriented") | "Recommended for You" | Computed/assigned after reviewing real cluster output — **not** the illustrative Slide 8 labels, which are examples only | **No** |

### Not a suburb field — user input
Two of the wireframe's filter chips describe the **user**, not the suburb, and don't need a matching column:
- "Family of 3" — a user preference matched against `family_households_pct` (there's no per-suburb "family size" field).
- "From China" — a user preference matched against `cultural_background`.

## 2. Proposed suburb data structure

One nested shape, used both as the API response and as the target shape the data pipeline produces — the same structure supports the map, profile, filters, charts, comparison, and recommendations without transformation between features.

**This example reflects the actual current schema** (`backend/app/models/schemas.py`, `SuburbDetail`) as of 2026-08-10 — Clayton's real values, not illustrative wireframe numbers like the original version of this doc had:

```json
{
  "id": "vic-clayton",
  "name": "Clayton",
  "state": "VIC",
  "council": "Monash",
  "location": { "lat": -37.9151, "lng": 145.1313 },
  "boundary": { "type": "Polygon", "coordinates": [ /* simplified GeoJSON */ ] },

  "demographics": {
    "population": 18988,
    "population_growth_pct": -1.9,
    "median_weekly_household_income": 1494,
    "median_weekly_rent": 400,
    "overseas_born_pct": 72.8,
    "family_households_pct": 53.5
  },

  "cultural_background": [
    { "country": "Australia", "pct": 27.2 },
    { "country": "India", "pct": 16.4 },
    { "country": "China", "pct": 14.7 },
    { "country": "Sri Lanka", "pct": 3.6 }
  ],

  "commute_to_work": {
    "train_pct": 4.5,
    "tram_pct": 0.1,
    "bus_pct": 3.3,
    "car_pct": 41.5,
    "bicycle_pct": 0.8,
    "walked_pct": 5.7,
    "worked_from_home_pct": 19.9
  },

  "access_to_services": {
    "primary_school_drive_time": "2–4 min",
    "hospital_drive_time": "4–10 min",
    "gp_clinic_drive_time": "0–2 min",
    "childcare_drive_time": "0–2 min"
  },

  "cluster": {
    "id": 1,
    "label": "Share / non-family households + Higher-rent",
    "similar_suburb_ids": ["vic-box-hill", "vic-melbourne", "vic-springvale"]
  },

  "data_source": {
    "census_year": 2021,
    "last_updated": null
  }
}
```

**Why this shape:**
- `demographics`, `cultural_background`, and `access_to_services` map 1:1 onto the three sidebar tabs (Overview/Culture/Services) — the frontend can render a tab straight from its matching key, no reshaping.
- The **same object** is what a comparison view needs for two-or-more suburbs — comparison is just "render this shape twice, side by side," not a different data model.
- `cultural_background` as a list (not fixed `culture_1`, `culture_2`... columns) handles suburbs having different numbers of significant countries of origin without empty/null columns.
- `cluster` and `data_source` exist as fields now but stay `null` until Milestones 11 and 4 respectively populate them — the schema doesn't need to change shape when those land.

**How it's produced:** `data_pipeline/build_master_dataset.py` should output one row per suburb in this shape (pandas can hold `cultural_background` as a nested/list column in a Parquet file via `pyarrow`, or it can be flattened to a companion long-form table `suburb_id, country, pct` if a simpler flat-CSV pipeline is preferred — either works, the API layer normalizes to the JSON shape above either way).

No values in this document are real suburb statistics — the numbers shown are the same illustrative example already in the proposal's own wireframe (Slide 7), included only to show the shape, not as data to ship.
