"""
Builds data/processed/councils.json — the 31 Metro Melbourne councils with
their boundary and an aggregate rent figure, used for the top-level
choropleth map (colour by average rent, drill into a council to see its
suburbs).

Run this AFTER build_master_dataset.py, since it aggregates from
suburbs.json rather than re-deriving from raw ABS files.
"""

import json
from pathlib import Path
from statistics import mean

from melbourne_suburbs import get_simplified_council_boundaries

SUBURBS_PATH = Path(__file__).resolve().parent.parent / "data" / "processed" / "suburbs.json"
OUTPUT_PATH = Path(__file__).resolve().parent.parent / "data" / "processed" / "councils.json"


def build():
    suburbs = json.loads(SUBURBS_PATH.read_text())
    councils = get_simplified_council_boundaries()

    for council in councils:
        members = [s for s in suburbs if s["council"] == council["name"]]
        rents = [s["demographics"]["median_weekly_rent"] for s in members
                 if s["demographics"]["median_weekly_rent"] is not None]

        council["suburb_count"] = len(members)
        council["avg_median_weekly_rent"] = round(mean(rents), 0) if rents else None

    OUTPUT_PATH.write_text(json.dumps(councils, indent=2))
    print(f"Wrote {len(councils)} councils to {OUTPUT_PATH}")

    unmatched = [c["name"] for c in councils if c["suburb_count"] == 0]
    if unmatched:
        print(f"WARNING: councils with zero matched suburbs (name mismatch?): {unmatched}")


if __name__ == "__main__":
    build()
