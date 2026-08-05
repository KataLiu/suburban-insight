import json
from pathlib import Path

from app.core.config import settings

_suburbs_by_id: dict[str, dict] | None = None
_councils_by_id: dict[str, dict] | None = None


def _data_dir() -> Path:
    return Path(__file__).resolve().parent.parent.parent / settings.data_dir


def _load_suburbs():
    global _suburbs_by_id
    if _suburbs_by_id is not None:
        return
    with (_data_dir() / "suburbs.json").open() as f:
        suburbs = json.load(f)
    _suburbs_by_id = {suburb["id"]: suburb for suburb in suburbs}


def _load_councils():
    global _councils_by_id
    if _councils_by_id is not None:
        return
    with (_data_dir() / "councils.json").open() as f:
        councils = json.load(f)
    _councils_by_id = {council["id"]: council for council in councils}


def get_all_suburbs(council_id: str | None = None) -> list[dict]:
    _load_suburbs()
    suburbs = list(_suburbs_by_id.values())
    if council_id is not None:
        _load_councils()
        council = _councils_by_id.get(council_id)
        council_name = council["name"] if council else None
        suburbs = [s for s in suburbs if s["council"] == council_name]
    return suburbs


def get_suburb(suburb_id: str) -> dict | None:
    _load_suburbs()
    return _suburbs_by_id.get(suburb_id)


def get_all_councils() -> list[dict]:
    _load_councils()
    return list(_councils_by_id.values())
