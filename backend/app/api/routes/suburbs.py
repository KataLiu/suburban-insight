from fastapi import APIRouter, HTTPException

from app.models.schemas import SuburbDetail, SuburbSummary
from app.services.data_loader import get_all_suburbs, get_suburb

router = APIRouter(prefix="/api/suburbs")


@router.get("", response_model=list[SuburbSummary])
def list_suburbs():
    return [
        SuburbSummary(
            id=suburb["id"],
            name=suburb["name"],
            state=suburb["state"],
            location=suburb["location"],
            population=suburb["demographics"]["population"],
            median_weekly_rent=suburb["demographics"]["median_weekly_rent"],
            median_weekly_household_income=suburb["demographics"]["median_weekly_household_income"],
            cultural_background=suburb["cultural_background"],
        )
        for suburb in get_all_suburbs()
    ]


@router.get("/{suburb_id}", response_model=SuburbDetail)
def get_suburb_detail(suburb_id: str):
    suburb = get_suburb(suburb_id)
    if suburb is None:
        raise HTTPException(status_code=404, detail=f"Suburb '{suburb_id}' not found")
    return suburb
