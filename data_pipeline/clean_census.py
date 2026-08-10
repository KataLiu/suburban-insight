"""
Cleans the ABS 2021 Census GCP (Suburbs and Localities) tables for Victoria
into per-suburb demographic and cultural-background fields.

Source: ../data/newData/2021_GCP_SAL_VIC/2021 Census GCP Suburbs and Localities for VIC/
(ClaudeCode/data/newData/ — one level above this project, not inside it)
Tables used: G01 (population), G02 (median income/rent), G33 (household
composition), G09F/G09G/G09H (country of birth — the sub-files that hold the
"Persons" totals; see docs/data-fields.md for the full field mapping), G62
(method of travel to work).

Population growth is handled in population_growth.py; access-to-services
drive times in access_to_services.py.
"""

import csv
from pathlib import Path

RAW_DIR = (
    Path(__file__).resolve().parent.parent.parent
    / "data" / "newData" / "2021_GCP_SAL_VIC"
    / "2021 Census GCP Suburbs and Localities for VIC"
)

# ABS abbreviates some country names in column headers; expand the ones that
# aren't just an underscore-for-space swap. "COB_NS" (not stated) and
# "Elsewhere" are excluded entirely — they aren't a named country.
COUNTRY_DISPLAY_NAMES = {
    "PNG": "Papua New Guinea",
    "USA": "United States",
    "Korea_South": "South Korea",
    "Hong_Kong_SAR_Ch": "Hong Kong",
    "Bosnia_Herzegov": "Bosnia and Herzegovina",
}
EXCLUDED_COUNTRY_KEYS = {"Tot", "COB_NS", "Elsewhere"}

TOP_N_CULTURAL_BACKGROUNDS = 4


def _read_csv(filename):
    path = RAW_DIR / filename
    with path.open(newline="", encoding="utf-8-sig") as f:
        return list(csv.DictReader(f))


def _index_by_sal(rows):
    return {row["SAL_CODE_2021"]: row for row in rows}


def _to_number(value):
    if value in (None, ""):
        return None
    try:
        return float(value) if "." in value else int(value)
    except ValueError:
        return None


def _display_country(key):
    return COUNTRY_DISPLAY_NAMES.get(key, key.replace("_", " "))


def _median_or_none(value):
    """ABS reports a literal 0 for these medians in very small/low-response
    suburbs (e.g. Reefton pop. 102, Yering pop. 138) — that means "too few
    responses to calculate a median" (or no renter households at all), not
    a real $0 figure. Treating it as missing avoids a fake outlier skewing
    the choropleth colour scale and the clustering."""
    n = _to_number(value)
    return n if n else None


def load_demographics():
    """Returns {sal_code: {population, median_weekly_household_income,
    median_weekly_rent, family_households_pct}}"""
    g01 = _index_by_sal(_read_csv("2021Census_G01_VIC_SAL.csv"))
    g02 = _index_by_sal(_read_csv("2021Census_G02_VIC_SAL.csv"))
    g33 = _index_by_sal(_read_csv("2021Census_G33_VIC_SAL.csv"))

    result = {}
    for sal_code, row in g01.items():
        income_row = g02.get(sal_code, {})
        household_row = g33.get(sal_code, {})

        total_households = _to_number(household_row.get("Tot_Tot"))
        family_households = _to_number(household_row.get("Tot_Family_households"))
        family_households_pct = (
            round(100 * family_households / total_households, 1)
            if total_households
            else None
        )

        result[sal_code] = {
            "population": _to_number(row.get("Tot_P_P")),
            "median_weekly_household_income": _median_or_none(
                income_row.get("Median_tot_hhd_inc_weekly")
            ),
            "median_weekly_rent": _median_or_none(income_row.get("Median_rent_weekly")),
            "family_households_pct": family_households_pct,
        }
    return result


def load_cultural_background():
    """Returns {sal_code: {overseas_born_pct, cultural_background: [...]}}

    Ranks every country with a "P_<Country>_Tot" column by count and keeps
    the top N per suburb — not a fixed set of countries — so the result
    reflects each suburb's actual composition.
    """
    g09f = _index_by_sal(_read_csv("2021Census_G09F_VIC_SAL.csv"))
    g09g = _index_by_sal(_read_csv("2021Census_G09G_VIC_SAL.csv"))
    g09h = _index_by_sal(_read_csv("2021Census_G09H_VIC_SAL.csv"))

    sal_codes = set(g09f) | set(g09g) | set(g09h)
    result = {}
    for sal_code in sal_codes:
        merged = {**g09f.get(sal_code, {}), **g09g.get(sal_code, {}), **g09h.get(sal_code, {})}
        total = _to_number(merged.get("P_Tot_Tot"))
        if not total:
            continue

        australia_born = _to_number(merged.get("P_Australia_Tot")) or 0
        overseas_born_pct = round(100 * (1 - australia_born / total), 1)

        country_counts = []
        for column, raw_value in merged.items():
            if not (column.startswith("P_") and column.endswith("_Tot")):
                continue
            country_key = column[len("P_"):-len("_Tot")]
            if country_key in EXCLUDED_COUNTRY_KEYS:
                continue
            count = _to_number(raw_value)
            if count:
                country_counts.append((country_key, count))

        country_counts.sort(key=lambda pair: pair[1], reverse=True)
        top_countries = country_counts[:TOP_N_CULTURAL_BACKGROUNDS]

        result[sal_code] = {
            "overseas_born_pct": overseas_born_pct,
            "cultural_background": [
                {"country": _display_country(key), "pct": round(100 * count / total, 1)}
                for key, count in top_countries
            ],
        }
    return result


# Maps our output field name -> the "One method, Persons" column in G62.
# Deliberately a subset of every mode G62 has (excludes Ferry, Taxi/
# Rideshare, Truck, Motorbike, Car-as-passenger, Other, multi-method
# combinations) — these are the modes actually relevant to "can I get
# around this suburb without a car", not an exhaustive dump of the table.
TRANSPORT_MODE_COLUMNS = {
    "train_pct": "One_method_Train_P",
    "tram_pct": "One_met_Tram_or_lt_rail_P",
    "bus_pct": "One_method_Bus_P",
    "car_pct": "One_method_Car_as_driver_P",
    "bicycle_pct": "One_method_Bicycle_P",
    "walked_pct": "One_method_Walked_only_P",
    "worked_from_home_pct": "Worked_home_P",
}


def load_commute_to_work():
    """Returns {sal_code: {train_pct, tram_pct, bus_pct, car_pct,
    bicycle_pct, walked_pct, worked_from_home_pct}} — each a % of ALL
    employed persons the table covers (Tot_P), so they're directly
    comparable across suburbs but won't sum to 100% (excluded modes,
    multi-method commutes, and "did not go to work" aren't included)."""
    g62 = _index_by_sal(_read_csv("2021Census_G62_VIC_SAL.csv"))

    result = {}
    for sal_code, row in g62.items():
        total = _to_number(row.get("Tot_P"))
        if not total:
            continue
        result[sal_code] = {
            field_name: round(100 * (_to_number(row.get(column)) or 0) / total, 1)
            for field_name, column in TRANSPORT_MODE_COLUMNS.items()
        }
    return result
