# Data Pipeline

Builds `data/processed/suburbs.json` — the master suburb dataset the backend
API serves — from real ABS sources. No suburb statistics here are invented.

## Run it

```bash
cd data_pipeline
pip install -r requirements.txt
python3 build_master_dataset.py   # builds demographics, culture, growth, services
python3 train_clusters.py         # then: K-means clustering + "similar suburbs"
```

`build_master_dataset.py` makes live network calls to the ABS access-to-
services FeatureServer (one spatial query per suburb, ~5s total for 30
suburbs) — an internet connection is required to run it.

Requires the raw ABS files already in `../data/newData/` — i.e.
`ClaudeCode/data/newData/`, one level above this project, **not** inside
`suburban-insight/` (not committed to git — see below).

## What each script does
- `suburb_shortlist.py` — the MVP's Melbourne suburb list (30 well-known
  suburbs). **This is a placeholder scope**, not an official "Greater
  Melbourne" boundary — see `docs/requirements.md` §20 item 3.
- `clean_census.py` — parses the ABS 2021 Census GCP (SAL) tables for VIC:
  population, median household income, median rent, household composition,
  and country-of-birth (for `overseas_born_pct` and `cultural_background`,
  ranked by actual count per suburb, not a fixed country list).
- `extract_centroids.py` — reads the ABS SAL 2021 boundary shapefile and
  computes a representative lat/lng point per suburb (for map markers) and
  each suburb's polygon rings (for the spatial query in
  `access_to_services.py`).
- `population_growth.py` — joins the 2016 Census (SSC geography) against the
  2021 figures, matched by suburb **name** (2016 and 2021 use different
  suburb-geography standards — SSC vs SAL — so boundaries aren't identical;
  name-matching is an approximation, not an exact boundary reconciliation).
- `access_to_services.py` — queries the ABS CARA access-to-services
  FeatureServer (SA1 geography) with each suburb's boundary polygon as a
  spatial filter, then takes the most common category among the suburb's
  SA1 areas. **Output is a range string (e.g. "2–4 min"), not exact
  minutes** — the public ABS source only publishes category bands, this
  isn't a simplification we introduced.
- `train_clusters.py` — K-means clustering (Req.4) over income/rent/
  overseas-born%/family-household% ; picks k via silhouette score (currently
  k=2 — the data's natural split, not forced to match the proposal's
  illustrative 3-cluster example) and writes each suburb's cluster label and
  nearest same-cluster suburbs back into the dataset.
- `build_master_dataset.py` — merges all of the above into the schema
  documented in `docs/data-fields.md` and writes `data/processed/suburbs.json`.

## Raw data expected in `ClaudeCode/data/newData/` (outside the repo, not gitignored — it's simply not inside `suburban-insight/`)
- `2021_GCP_SAL_VIC/` — unzipped ABS 2021 Census GCP DataPack, Suburbs and
  Localities, Victoria (`2021_GCP_SAL_for_VIC_short-header.zip` from
  abs.gov.au/census/find-census-data/datapacks)
- `2016_GCP_SSC_VIC/` — unzipped ABS 2016 Census GCP DataPack, State
  Suburbs, Victoria (`2016_GCP_SSC_for_VIC_short-header.zip`, same page)
- `SAL_2021_AUST_SHP/` — unzipped ABS SAL 2021 digital boundary shapefile
  (`SAL_2021_AUST_GDA2020_SHP.zip` from abs.gov.au's ASGS digital boundary
  files page)

Access-to-services data isn't a local file — it's queried live from ABS's
hosted FeatureServer at build time.
