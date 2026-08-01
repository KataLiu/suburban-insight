# Data Pipeline

Builds `data/processed/suburbs.json` — the master suburb dataset the backend
API serves — from real ABS sources. No suburb statistics here are invented.

## Run it

```bash
cd data_pipeline
pip install -r requirements.txt
python3 build_master_dataset.py
```

Requires the raw ABS files already in `data/raw/` (not committed to git —
see below).

## What each script does
- `suburb_shortlist.py` — the MVP's Melbourne suburb list (30 well-known
  suburbs). **This is a placeholder scope**, not an official "Greater
  Melbourne" boundary — see `docs/requirements.md` §20 item 3.
- `clean_census.py` — parses the ABS 2021 Census GCP (SAL) tables for VIC:
  population, median household income, median rent, household composition,
  and country-of-birth (for `overseas_born_pct` and `cultural_background`,
  ranked by actual count per suburb, not a fixed country list).
- `extract_centroids.py` — reads the ABS SAL 2021 boundary shapefile and
  computes one representative lat/lng point per suburb, for map markers.
- `build_master_dataset.py` — merges the three into the schema documented in
  `docs/data-fields.md` and writes `data/processed/suburbs.json`.

## Raw data expected in `data/raw/` (gitignored)
- `2021_GCP_SAL_VIC/` — unzipped ABS 2021 Census GCP DataPack, Suburbs and
  Localities, Victoria (`2021_GCP_SAL_for_VIC_short-header.zip` from
  abs.gov.au/census/find-census-data/datapacks)
- `SAL_2021_AUST_SHP/` — unzipped ABS SAL 2021 digital boundary shapefile
  (`SAL_2021_AUST_GDA2020_SHP.zip` from abs.gov.au's ASGS digital boundary
  files page)

## Deliberately deferred (not in this dataset yet)
- **Population growth since 2016** — needs a 2016 Census extract joined
  against 2021, with suburb-boundary changes between Censuses to reconcile.
  `demographics.population_growth_pct` is `null` in the output until this is
  built.
- **Access to services (drive times)** — the ABS data for this lives at SA1
  geography via an interactive service, not a simple suburb-level bulk
  download; needs a spatial aggregation step. `access_to_services.*` fields
  are all `null` in the output until this is built.

Both are explicitly scheduled for a later milestone (see `docs/roadmap.md`).
