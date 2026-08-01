# Suburban Insight — Required Data Fields & Suburb Data Structure

This document re-derives the data needs directly from `proposal.pdf` and the existing `requirements.md` / `architecture.md`, with no invented statistics. It answers: what fields are needed, why, where they come from, and what's essential for the first working version (per the Milestone 4–10 slice in `roadmap.md`, i.e. map + profile + filters + comparison, *before* recommendations).

## 1. Required fields

### Identity & geography
| Field | What it is | Feature(s) that need it | Source | Essential for v1? |
|---|---|---|---|---|
| `suburb_id` | Internal stable identifier for a suburb | Every API call, comparison chips, search results | Generated locally when building the master dataset (not from ABS directly) | **Yes** |
| `suburb_name` | Display name, e.g. "Clayton" | Map labels, sidebar header, search, comparison headers | ABS geographic classification (suburb/SA2 name) | **Yes** |
| `state` | e.g. "VIC" | Sidebar header "Clayton, VIC", footer caption | ABS geographic classification | **Yes** |
| `lat` / `lng` (point) | Coordinates for a map marker | Leaflet map markers (Milestone 6) | **Not named in the proposal** — needs a geocoding/centroid source (e.g. ABS ASGS SA2 centroid, or a public suburb gazetteer). You need to confirm/provide this. | **Yes** — v1 uses point markers, per the wireframe |
| `boundary` (GeoJSON polygon) | Suburb boundary shape | Future boundary-based map layer (WBS mentions "Leaflet map + GeoJSON") | Unclear — likely ABS ASGS shapefiles, not confirmed | **No** — deliberately deferred; wireframe only shows points |

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

One nested shape, used both as the API response and as the target shape the data pipeline produces — the same structure supports the map, profile, filters, charts, comparison, and (later) recommendations without transformation between features:

```json
{
  "id": "vic-clayton",
  "name": "Clayton",
  "state": "VIC",
  "location": { "lat": -37.9147, "lng": 145.1128 },
  "boundary": null,

  "demographics": {
    "population": 18420,
    "population_growth_pct": 8.4,
    "median_weekly_household_income": 1240,
    "median_weekly_rent": 420,
    "overseas_born_pct": 52,
    "family_households_pct": 61
  },

  "cultural_background": [
    { "country": "China", "pct": 38 },
    { "country": "India", "pct": 22 },
    { "country": "Australia", "pct": 18 },
    { "country": "Vietnam", "pct": 10 }
  ],

  "access_to_services": {
    "primary_school_min": 4,
    "hospital_min": 8,
    "gp_clinic_min": 3,
    "childcare_min": 5
  },

  "cluster": {
    "id": null,
    "label": null
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
