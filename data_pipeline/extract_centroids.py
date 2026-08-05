"""
Extracts a representative point (lat/lng) per suburb from the ABS SAL 2021
digital boundary shapefile, for use as a map marker location.

Source: ../data/newData/SAL_2021_AUST_SHP/SAL_2021_AUST_GDA2020.shp
(ClaudeCode/data/newData/ — one level above this project, not inside it;
national file, filtered here to the suburb shortlist). GDA2020 coordinates
are treated as WGS84 lat/lng for Leaflet — the datum difference is
negligible at this scale.

Two boundary extractions live here:
- load_boundary_rings: full-precision rings, used only for the
  access_to_services.py spatial query (accuracy matters there).
- load_simplified_boundaries: simplified GeoJSON geometry for map
  rendering (choropleth polygons) — full-precision boundaries for all 531
  Melbourne suburbs are ~10.7MB of JSON; simplifying with shapely at a
  0.0005-degree tolerance (~50m, imperceptible at suburb scale on a city
  map) brings that down to ~820KB.
"""

from pathlib import Path

import shapefile
from shapely.geometry import mapping, shape

SIMPLIFY_TOLERANCE_DEGREES = 0.0005

SHAPEFILE_PATH = (
    Path(__file__).resolve().parent.parent.parent
    / "data" / "newData" / "SAL_2021_AUST_SHP" / "SAL_2021_AUST_GDA2020.shp"
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


def load_boundary_rings(sal_codes):
    """Returns {sal_code: [[ [x,y], ... ], ...]} — the polygon ring
    coordinates for each suburb, in GDA2020 lat/lng, used to query the ABS
    access-to-services FeatureServer with a spatial filter (see
    access_to_services.py). Not used for map rendering (point markers only)."""
    wanted = set(sal_codes)
    result = {}
    reader = shapefile.Reader(str(SHAPEFILE_PATH))
    for shape_record in reader.iterShapeRecords():
        code = shape_record.record["SAL_CODE21"]
        if code not in wanted:
            continue
        points = shape_record.shape.points
        parts = list(shape_record.shape.parts) + [len(points)]
        rings = [points[parts[i] : parts[i + 1]] for i in range(len(parts) - 1)]
        result[code] = rings
        if len(result) == len(wanted):
            break
    return result


def load_simplified_boundaries(sal_codes):
    """Returns {sal_code: geojson_geometry_dict} — simplified polygon/
    multipolygon geometry per suburb, ready to embed directly as a
    GeoJSON Feature's "geometry" for map rendering."""
    wanted = set(sal_codes)
    result = {}
    reader = shapefile.Reader(str(SHAPEFILE_PATH))
    for shape_record in reader.iterShapeRecords():
        code = shape_record.record["SAL_CODE21"]
        if code not in wanted:
            continue
        geometry = shape(shape_record.shape.__geo_interface__)
        simplified = geometry.simplify(SIMPLIFY_TOLERANCE_DEGREES, preserve_topology=True)
        result[code] = mapping(simplified)
        if len(result) == len(wanted):
            break
    return result
