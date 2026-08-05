"""
Computes the real "Melbourne suburbs" scope, replacing the old hand-picked
30-suburb suburb_shortlist.py.

"Melbourne" is defined here as the 31 councils Victoria's own government
classifies as Metropolitan or Interface (Victorian Auditor-General's
council category data) — a real, citable administrative definition, not an
arbitrary pick. A suburb (SAL) is included if its representative point
falls inside any of those 31 council (LGA) polygons.

This deliberately supersedes two earlier, broader candidates that were
tried and rejected:
- The "Greater Melbourne" GCCSA boundary (572 suburbs) — too broad; GCCSA is
  drawn around the whole commuting region and sweeps in rural fringe
  localities most people wouldn't call a Melbourne suburb.
- ABS's "Significant Urban Area" boundary — not pursued once the
  council-based approach proved cleaner and gave a citable, well-known
  number (531 suburbs across 31 councils, verified 2026-08-05).

Note: this uses the 2021-vintage LGA boundary file to match the 2021
Census geography used everywhere else in the pipeline. "Moreland" was
renamed "Merri-bek" in 2022, after this boundary vintage — it will appear
as "Moreland" here.
"""

import re
from pathlib import Path

import shapefile
from shapely.geometry import mapping, shape
from shapely.ops import unary_union

COUNCIL_SIMPLIFY_TOLERANCE_DEGREES = 0.0005

LGA_SHAPEFILE_PATH = (
    Path(__file__).resolve().parent.parent.parent
    / "data" / "newData" / "LGA_2021_AUST_SHP" / "LGA_2021_AUST_GDA2020.shp"
)
SAL_SHAPEFILE_PATH = (
    Path(__file__).resolve().parent.parent.parent
    / "data" / "newData" / "SAL_2021_AUST_SHP" / "SAL_2021_AUST_GDA2020.shp"
)

# The 31 councils Local Government Victoria / the Victorian Auditor-General
# classify as Metropolitan (22) or Interface (9). Names matching more than
# one LGA nationally need the "(Vic.)" disambiguation ABS uses.
METRO_MELBOURNE_COUNCILS = [
    "Banyule", "Bayside (Vic.)", "Boroondara", "Brimbank", "Darebin",
    "Frankston", "Glen Eira", "Greater Dandenong", "Hobsons Bay",
    "Kingston (Vic.)", "Knox", "Manningham", "Maribyrnong", "Maroondah",
    "Melbourne", "Monash", "Moonee Valley", "Moreland", "Port Phillip",
    "Stonnington", "Whitehorse", "Yarra",
    "Cardinia", "Casey", "Hume", "Melton", "Mornington Peninsula",
    "Nillumbik", "Whittlesea", "Wyndham", "Yarra Ranges",
]


def get_council_polygons():
    """Returns {council_name: shapely geometry} for the 31 target councils.
    council_name has the "(Vic.)" suffix stripped for display."""
    reader = shapefile.Reader(str(LGA_SHAPEFILE_PATH))
    polygons = {}
    for shape_record in reader.iterShapeRecords():
        name = shape_record.record.as_dict()["LGA_NAME21"]
        if name in METRO_MELBOURNE_COUNCILS:
            display_name = name.replace(" (Vic.)", "")
            polygons[display_name] = shape(shape_record.shape.__geo_interface__)
    missing = set(n.replace(" (Vic.)", "") for n in METRO_MELBOURNE_COUNCILS) - set(polygons)
    if missing:
        raise RuntimeError(f"Could not find LGA boundary for: {missing}")
    return polygons


def get_melbourne_suburbs():
    """Returns [{"sal_code": ..., "name": ..., "council": ...}, ...] for
    every VIC suburb whose representative point falls inside any of the
    31 target councils."""
    council_polygons = get_council_polygons()
    metro_union = unary_union(list(council_polygons.values()))

    reader = shapefile.Reader(str(SAL_SHAPEFILE_PATH))
    suburbs = []
    for shape_record in reader.iterShapeRecords():
        record = shape_record.record.as_dict()
        if record["STE_CODE21"] != "2" or shape_record.shape.shapeType == shapefile.NULL:
            continue
        point = shape(shape_record.shape.__geo_interface__).representative_point()
        if not metro_union.contains(point):
            continue

        council_name = next(
            (name for name, poly in council_polygons.items() if poly.contains(point)),
            None,
        )
        suburbs.append({
            "sal_code": record["SAL_CODE21"],
            "name": record["SAL_NAME21"].replace(" (Vic.)", ""),
            "council": council_name,
        })

    return suburbs


def _slugify(name):
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")


def get_simplified_council_boundaries():
    """Returns [{"id": ..., "name": ..., "boundary": geojson_geometry}, ...]
    for the 31 target councils, simplified for map rendering."""
    council_polygons = get_council_polygons()
    return [
        {
            "id": f"council-{_slugify(name)}",
            "name": name,
            "boundary": mapping(polygon.simplify(COUNCIL_SIMPLIFY_TOLERANCE_DEGREES, preserve_topology=True)),
        }
        for name, polygon in council_polygons.items()
    ]
