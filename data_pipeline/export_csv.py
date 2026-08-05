"""
Exports a flat CSV version of data/processed/suburbs.json, for opening in
Excel/Sheets or attaching to a report — the JSON is what the app actually
runs on, this is a convenience export, not a separate data source.

Flattening notes:
- location.lat/lng become top-level lat/lng columns.
- cultural_background (a variable-length list) becomes up to 4 fixed
  columns (culture_1_country/pct .. culture_4_country/pct) since no suburb
  in the dataset has more than 4 entries; empty if a suburb has fewer.
- cluster.similar_suburb_ids (a list of ids) becomes a semicolon-separated
  list of suburb NAMES (looked up from the same dataset), for readability.

Run: python3 export_csv.py  (from data_pipeline/, after build_master_dataset.py
and train_clusters.py have produced suburbs.json)
"""

import csv
import json
from pathlib import Path

INPUT_PATH = Path(__file__).resolve().parent.parent / "data" / "processed" / "suburbs.json"
OUTPUT_PATH = Path(__file__).resolve().parent.parent / "data" / "processed" / "suburbs.csv"

FIELDNAMES = [
    "id", "name", "state", "lat", "lng",
    "population", "population_growth_pct",
    "median_weekly_household_income", "median_weekly_rent",
    "overseas_born_pct", "family_households_pct",
    "culture_1_country", "culture_1_pct",
    "culture_2_country", "culture_2_pct",
    "culture_3_country", "culture_3_pct",
    "culture_4_country", "culture_4_pct",
    "primary_school_drive_time", "hospital_drive_time",
    "gp_clinic_drive_time", "childcare_drive_time",
    "cluster_id", "cluster_label", "similar_suburbs",
    "census_year",
]

MAX_CULTURE_COLUMNS = 4


def _flatten(suburb, name_by_id):
    d = suburb["demographics"]
    a = suburb["access_to_services"]
    c = suburb["cluster"]
    culture = suburb["cultural_background"]

    row = {
        "id": suburb["id"],
        "name": suburb["name"],
        "state": suburb["state"],
        "lat": suburb["location"]["lat"],
        "lng": suburb["location"]["lng"],
        "population": d["population"],
        "population_growth_pct": d["population_growth_pct"],
        "median_weekly_household_income": d["median_weekly_household_income"],
        "median_weekly_rent": d["median_weekly_rent"],
        "overseas_born_pct": d["overseas_born_pct"],
        "family_households_pct": d["family_households_pct"],
        "primary_school_drive_time": a["primary_school_drive_time"],
        "hospital_drive_time": a["hospital_drive_time"],
        "gp_clinic_drive_time": a["gp_clinic_drive_time"],
        "childcare_drive_time": a["childcare_drive_time"],
        "cluster_id": c["id"],
        "cluster_label": c["label"],
        "similar_suburbs": "; ".join(name_by_id.get(sid, sid) for sid in c["similar_suburb_ids"]),
        "census_year": suburb["data_source"]["census_year"],
    }
    for i in range(MAX_CULTURE_COLUMNS):
        if i < len(culture):
            row[f"culture_{i + 1}_country"] = culture[i]["country"]
            row[f"culture_{i + 1}_pct"] = culture[i]["pct"]
        else:
            row[f"culture_{i + 1}_country"] = ""
            row[f"culture_{i + 1}_pct"] = ""
    return row


def export():
    suburbs = json.loads(INPUT_PATH.read_text())
    name_by_id = {s["id"]: s["name"] for s in suburbs}

    with OUTPUT_PATH.open("w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=FIELDNAMES)
        writer.writeheader()
        writer.writerows(_flatten(s, name_by_id) for s in suburbs)

    print(f"Wrote {len(suburbs)} rows to {OUTPUT_PATH}")


if __name__ == "__main__":
    export()
