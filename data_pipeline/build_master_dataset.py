"""
Builds the master suburb dataset used by the backend API.

Merges: the Melbourne suburb shortlist, cleaned Census demographics,
cultural background, and centroid coordinates, into the shape documented in
docs/data-fields.md. Output: data/processed/suburbs.json — one JSON object
per suburb, in the nested shape the frontend/API expect directly.

Run: python3 build_master_dataset.py  (from the data_pipeline/ directory,
with the backend venv active so pyshp/shapely are importable)
"""

import json
import re
from pathlib import Path

from access_to_services import load_access_to_services
from clean_census import load_cultural_background, load_demographics
from extract_centroids import load_boundary_rings, load_centroids
from population_growth import load_population_growth
from suburb_shortlist import MELBOURNE_SUBURBS

OUTPUT_PATH = (
    Path(__file__).resolve().parent.parent / "data" / "processed" / "suburbs.json"
)


def _slugify(name):
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")


def build():
    demographics = load_demographics()
    cultural = load_cultural_background()
    centroids = load_centroids(s["sal_code"] for s in MELBOURNE_SUBURBS)
    population_2016 = load_population_growth(s["name"] for s in MELBOURNE_SUBURBS)
    boundary_rings = load_boundary_rings(s["sal_code"] for s in MELBOURNE_SUBURBS)
    print("Querying ABS access-to-services FeatureServer per suburb...")
    access_services = load_access_to_services(boundary_rings)

    suburbs = []
    skipped = []
    for entry in MELBOURNE_SUBURBS:
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
            "location": location,
            "boundary": None,
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

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps(suburbs, indent=2))

    print(f"Wrote {len(suburbs)} suburbs to {OUTPUT_PATH}")
    if skipped:
        print(f"Skipped (missing data in one or more sources): {skipped}")


if __name__ == "__main__":
    build()
