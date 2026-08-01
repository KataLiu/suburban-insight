"""
Computes population_growth_pct (2016 -> 2021) per suburb.

2016 Census used "SSC" (State Suburb) geography; 2021 uses "SAL" (Suburbs
and Localities) — the successor standard. Suburb boundaries can shift
slightly between the two, so suburbs are matched by NAME (with the same
"(Vic.)" disambiguation ABS uses for suburbs that share a name with one in
another state), not by code. This is an approximation, not an exact
boundary-for-boundary comparison — noted in docs/data-fields.md.

Source: ../data/newData/2016_GCP_SSC_VIC/2016 Census GCP State Suburbs for VIC/
(ClaudeCode/data/newData/ — one level above this project, not inside it)
Table used: G01 (population), same as the 2021 pipeline.
"""

import csv
from pathlib import Path

import openpyxl

RAW_DIR_2016 = Path(__file__).resolve().parent.parent.parent / "data" / "newData" / "2016_GCP_SSC_VIC"
DATA_TABLE_DIR = RAW_DIR_2016 / "2016 Census GCP State Suburbs for VIC"
GEOGRAPHY_LOOKUP = RAW_DIR_2016 / "Metadata" / "2016Census_geog_desc_1st_and_2nd_release.xlsx"


def _load_name_to_code():
    """Returns {suburb_name: ssc_code}, preferring the '(Vic.)'-suffixed
    entry over a same-named suburb in another state."""
    wb = openpyxl.load_workbook(GEOGRAPHY_LOOKUP, read_only=True, data_only=True)
    ws = wb["2016_ASGS_Non-ABS_Structures"]

    by_plain, by_vic = {}, {}
    for row in ws.iter_rows(min_row=2, values_only=True):
        if not row or row[0] != "SSC":
            continue
        name = row[3]
        if name.endswith("(Vic.)"):
            by_vic[name[: -len(" (Vic.)")]] = row[1]
        else:
            by_plain.setdefault(name, row[1])

    return {**by_plain, **by_vic}


def _load_population_2016():
    """Returns {ssc_code: population}."""
    path = DATA_TABLE_DIR / "2016Census_G01_VIC_SSC.csv"
    with path.open(newline="", encoding="utf-8-sig") as f:
        return {row["SSC_CODE_2016"]: int(row["Tot_P_P"]) for row in csv.DictReader(f)}


def load_population_growth(suburb_names):
    """Returns {suburb_name: growth_pct or None} for the given names."""
    name_to_code = _load_name_to_code()
    population_2016 = _load_population_2016()

    result = {}
    for name in suburb_names:
        code = name_to_code.get(name)  # already prefixed, e.g. "SSC20566"
        result[name] = population_2016.get(code) if code else None
    return result
