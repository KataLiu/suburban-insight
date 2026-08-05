from fastapi import APIRouter

from app.models.schemas import Council
from app.services.data_loader import get_all_councils

router = APIRouter(prefix="/api/councils")


@router.get("", response_model=list[Council])
def list_councils():
    return get_all_councils()
