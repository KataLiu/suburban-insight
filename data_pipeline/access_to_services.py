"""
Computes suburb-level "typical drive time" ranges to childcare, GP clinics,
hospitals, and primary schools.

Source: ABS's CARA Access to Services (2021) FeatureServer — road distance
and drive-time DATA IS ONLY PUBLISHED AS CATEGORY RANGES (e.g. "2.0-3.9
min"), not exact minutes, at SA1 geography (finer than our suburbs).
https://geo.abs.gov.au/arcgis/rest/services/Hosted/CARA_access_to_serv_TEXT_2021_SA1/FeatureServer

Method: for each suburb, spatially query the FeatureServer for every SA1
that intersects the suburb's boundary polygon (from the SAL shapefile —
see extract_centroids.load_boundary_rings), then take the most common
("mode") category among that suburb's SA1s as its typical range. SA1s
tagged "Not applicable" / "No data available" (areas with no dwellings) are
excluded from the count.

This makes a live network call per suburb per service type at build time —
not something the backend does per-request (see docs/architecture.md).
"""

import json
from collections import Counter

import requests

FEATURE_SERVER_URL = (
    "https://geo.abs.gov.au/arcgis/rest/services/Hosted/"
    "CARA_access_to_serv_TEXT_2021_SA1/FeatureServer/0/query"
)

# ABS field name -> our field name
SERVICE_FIELDS = {
    "cara_ats_9": "primary_school_drive_time",
    "cara_ats_6": "hospital_drive_time",
    "cara_ats_4": "gp_clinic_drive_time",
    "cara_ats_2": "childcare_drive_time",
}

# Raw ABS category text -> tidy display string. Categories not listed here
# (None, "Not applicable", "No data availab" — ABS's field is truncated)
# mean "excluded from aggregation", not "zero".
CATEGORY_DISPLAY = {
    "0.1 - 1.9 min": "0–2 min",
    "2.0 - 3.9 min": "2–4 min",
    "4.0 - 9.9 min": "4–10 min",
    "10.0 - 29.9 min": "10–30 min",
    "30.0 - 89.9 min": "30–90 min",
    "Over 90 min": "90+ min",
}


def _query_sa1_categories(rings):
    geometry = json.dumps({"rings": rings, "spatialReference": {"wkid": 7844}})
    response = requests.post(
        FEATURE_SERVER_URL,
        data={
            "where": "1=1",
            "geometry": geometry,
            "geometryType": "esriGeometryPolygon",
            "spatialRel": "esriSpatialRelIntersects",
            "inSR": "7844",
            "outFields": ",".join(SERVICE_FIELDS.keys()),
            "returnGeometry": "false",
            "f": "json",
        },
        timeout=30,
    )
    response.raise_for_status()
    return [f["attributes"] for f in response.json().get("features", [])]


def _typical_range(raw_values):
    valid = [v for v in raw_values if v and v.strip() not in ("Not applicable", "No data availab")]
    if not valid:
        return None
    most_common_raw, _ = Counter(valid).most_common(1)[0]
    return CATEGORY_DISPLAY.get(most_common_raw)


def load_access_to_services(sal_code_to_rings):
    """sal_code_to_rings: {sal_code: rings} from extract_centroids.load_boundary_rings.
    Returns {sal_code: {our_field_name: "X–Y min" or None}}."""
    result = {}
    for sal_code, rings in sal_code_to_rings.items():
        sa1_records = _query_sa1_categories(rings)
        result[sal_code] = {
            our_name: _typical_range([r.get(abs_field) for r in sa1_records])
            for abs_field, our_name in SERVICE_FIELDS.items()
        }
    return result
