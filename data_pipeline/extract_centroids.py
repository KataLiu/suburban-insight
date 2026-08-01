"""
Extracts a representative point (lat/lng) per suburb from the ABS SAL 2021
digital boundary shapefile, for use as a map marker location.

Source: data/raw/SAL_2021_AUST_SHP/SAL_2021_AUST_GDA2020.shp (national file;
filtered here to the suburb shortlist). GDA2020 coordinates are treated as
WGS84 lat/lng for Leaflet — the datum difference is negligible at this scale.

Suburb boundary polygons themselves are not used yet (map markers only, per
docs/architecture.md's decision to defer boundary layers).
"""

from pathlib import Path

import shapefile
from shapely.geometry import shape

SHAPEFILE_PATH = (
    Path(__file__).resolve().parent.parent
    / "data" / "raw" / "SAL_2021_AUST_SHP" / "SAL_2021_AUST_GDA2020.shp"
)


def load_centroids(sal_codes):
    """Returns {sal_code: {"lat": float, "lng": float}} for the given codes."""
    wanted = set(sal_codes)
    result = {}
    reader = shapefile.Reader(str(SHAPEFILE_PATH))
    for shape_record in reader.iterShapeRecords():
        code = shape_record.record["SAL_CODE21"]
        if code not in wanted:
            continue
        point = shape(shape_record.shape.__geo_interface__).representative_point()
        result[code] = {"lat": point.y, "lng": point.x}
        if len(result) == len(wanted):
            break
    return result
