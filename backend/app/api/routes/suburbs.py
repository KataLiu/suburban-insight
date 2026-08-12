from fastapi import APIRouter, HTTPException

from app.models.schemas import SuburbDetail, SuburbSummary
from app.services.data_loader import get_all_suburbs, get_suburb

router = APIRouter(prefix="/api/suburbs")


@router.get("", response_model=list[SuburbSummary])
def list_suburbs(council_id: str | None = None):
    """Pass council_id (e.g. "council-yarra") to get just that council's
    suburbs, including boundary geometry, for the drill-down map view.
    Without it, returns every suburb WITHOUT boundary geometry (~2MB of
    polygons for all 527 suburbs is too much to send on every page load —
    only needed once a specific council is chosen)."""
    return [
        SuburbSummary(
            id=suburb["id"],
            name=suburb["name"],
            state=suburb["state"],
            council=suburb["council"],
            location=suburb["location"],
            boundary=suburb["boundary"] if council_id else None,
            population=suburb["demographics"]["population"],
            median_weekly_rent=suburb["demographics"]["median_weekly_rent"],
            median_weekly_household_income=suburb["demographics"]["median_weekly_household_income"],
            overseas_born_pct=suburb["demographics"]["overseas_born_pct"],
            family_households_pct=suburb["demographics"]["family_households_pct"],
            access_to_services=suburb["access_to_services"],
            cultural_background=suburb["cultural_background"],
        )
        for suburb in get_all_suburbs(council_id=council_id)
    ]


@router.get("/{suburb_id}", response_model=SuburbDetail)
def get_suburb_detail(suburb_id: str):
    suburb = get_suburb(suburb_id)
    if suburb is None:
        raise HTTPException(status_code=404, detail=f"Suburb '{suburb_id}' not found")
    return suburb
