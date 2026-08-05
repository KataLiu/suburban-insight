"""
Builds the master suburb dataset used by the backend API.

Merges: the real Melbourne suburb list (melbourne_suburbs.py — the 531
suburbs across the 31 official Metro Melbourne councils), cleaned Census
demographics, cultural background, centroid + simplified boundary geometry,
population growth, and access-to-services, into the shape documented in
docs/data-fields.md. Output: data/processed/suburbs.json — one JSON object
per suburb, in the nested shape the frontend/API expect directly.

Run: python3 build_master_dataset.py  (from the data_pipeline/ directory,
with the backend venv active so pyshp/shapely are importable). Takes a few
minutes at 531 suburbs, mostly the access-to-services FeatureServer queries.
"""

import json
import re
from pathlib import Path

from access_to_services import load_access_to_services
from clean_census import load_cultural_background, load_demographics
from extract_centroids import load_boundary_rings, load_centroids, load_simplified_boundaries
from melbourne_suburbs import get_melbourne_suburbs
from population_growth import load_population_growth

OUTPUT_PATH = (
    Path(__file__).resolve().parent.parent / "data" / "processed" / "suburbs.json"
)


def _slugify(name):
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")


def build():
    melbourne_suburbs = get_melbourne_suburbs()
    print(f"Building dataset for {len(melbourne_suburbs)} suburbs across "
          f"{len(set(s['council'] for s in melbourne_suburbs))} councils...")

    demographics = load_demographics()
    cultural = load_cultural_background()
    centroids = load_centroids(s["sal_code"] for s in melbourne_suburbs)
    boundaries = load_simplified_boundaries(s["sal_code"] for s in melbourne_suburbs)
    population_2016 = load_population_growth(s["name"] for s in melbourne_suburbs)
    boundary_rings = load_boundary_rings(s["sal_code"] for s in melbourne_suburbs)
    print("Querying ABS access-to-services FeatureServer per suburb (this takes a while at 531 suburbs)...")
    access_services = load_access_to_services(boundary_rings)

    suburbs = []
    skipped = []
    for entry in melbourne_suburbs:
        sal_code = entry["sal_code"]
        census_key = f"SAL{sal_code}"
        demo = demographics.get(census_key)
        culture = cultural.get(census_key)
        location = centroids.get(sal_code)

        if not (demo and culture and location):
            skipped.append(entry["name"])
            continue

        pop_2016 = population_2016.get(entry["name"])
        pop_2021 = demo["population"]
        growth_pct = round(100 * (pop_2021 - pop_2016) / pop_2016, 1) if pop_2016 else None

        suburbs.append({
            "id": f"vic-{_slugify(entry['name'])}",
            "name": entry["name"],
            "state": "VIC",
            "council": entry["council"],
            "location": location,
            "boundary": boundaries.get(sal_code),
            "demographics": {
                "population": demo["population"],
                "population_growth_pct": growth_pct,
                "median_weekly_household_income": demo["median_weekly_household_income"],
                "median_weekly_rent": demo["median_weekly_rent"],
                "overseas_born_pct": culture["overseas_born_pct"],
                "family_households_pct": demo["family_households_pct"],
            },
            "cultural_background": culture["cultural_background"],
            "access_to_services": access_services.get(sal_code, {
                "primary_school_drive_time": None,
                "hospital_drive_time": None,
                "gp_clinic_drive_time": None,
                "childcare_drive_time": None,
            }),
            "cluster": {"id": None, "label": None},
            "data_source": {"census_year": 2021, "last_updated": None},
        })

    ids = [s["id"] for s in suburbs]
    duplicate_ids = set(i for i in ids if ids.count(i) > 1)
    if duplicate_ids:
        raise RuntimeError(f"Duplicate suburb ids after slugifying names: {duplicate_ids}")

    no_growth_data = [s["name"] for s in suburbs if s["demographics"]["population_growth_pct"] is None]

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps(suburbs, indent=2))

    print(f"Wrote {len(suburbs)} suburbs to {OUTPUT_PATH}")
    if skipped:
        print(f"Skipped entirely (missing census/culture/location data): {skipped}")
    if no_growth_data:
        print(f"No 2016->2021 population growth match for {len(no_growth_data)} suburbs: {no_growth_data}")


if __name__ == "__main__":
    build()
