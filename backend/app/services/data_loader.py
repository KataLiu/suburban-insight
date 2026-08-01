import json
from pathlib import Path

from app.core.config import settings

_suburbs_by_id: dict[str, dict] | None = None


def _load():
    global _suburbs_by_id
    if _suburbs_by_id is not None:
        return
    path = Path(__file__).resolve().parent.parent.parent / settings.data_dir / "suburbs.json"
    with path.open() as f:
        suburbs = json.load(f)
    _suburbs_by_id = {suburb["id"]: suburb for suburb in suburbs}


def get_all_suburbs() -> list[dict]:
    _load()
    return list(_suburbs_by_id.values())


def get_suburb(suburb_id: str) -> dict | None:
    _load()
    return _suburbs_by_id.get(suburb_id)
