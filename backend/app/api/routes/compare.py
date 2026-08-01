from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.models.schemas import SuburbDetail
from app.services.data_loader import get_suburb

router = APIRouter(prefix="/api/compare")


class CompareRequest(BaseModel):
    suburb_ids: list[str] = Field(min_length=1)


@router.post("", response_model=list[SuburbDetail])
def compare_suburbs(payload: CompareRequest):
    suburbs = []
    for suburb_id in payload.suburb_ids:
        suburb = get_suburb(suburb_id)
        if suburb is None:
            raise HTTPException(status_code=404, detail=f"Suburb '{suburb_id}' not found")
        suburbs.append(suburb)
    return suburbs
