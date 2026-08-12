from typing import Any, Optional

from pydantic import BaseModel


class Location(BaseModel):
    lat: float
    lng: float


class Demographics(BaseModel):
    population: Optional[int] = None
    population_growth_pct: Optional[float] = None
    median_weekly_household_income: Optional[int] = None
    median_weekly_rent: Optional[int] = None
    overseas_born_pct: Optional[float] = None
    family_households_pct: Optional[float] = None


class CulturalBackgroundEntry(BaseModel):
    country: str
    pct: float


class AccessToServices(BaseModel):
    """Drive-time fields are display-ready range strings (e.g. "2–4 min"),
    not exact minutes — the public ABS source only publishes category
    ranges, not precise figures. See data_pipeline/access_to_services.py."""

    primary_school_drive_time: Optional[str] = None
    hospital_drive_time: Optional[str] = None
    gp_clinic_drive_time: Optional[str] = None
    childcare_drive_time: Optional[str] = None


class CommuteToWork(BaseModel):
    """% of all employed persons the ABS table covers (Table G62), by
    method of travel to work. Won't sum to 100% — excludes less common
    modes (ferry, taxi, truck, motorbike, car-as-passenger), multi-method
    commutes, and "did not go to work"/not-stated. See
    data_pipeline/clean_census.py's load_commute_to_work()."""

    train_pct: Optional[float] = None
    tram_pct: Optional[float] = None
    bus_pct: Optional[float] = None
    car_pct: Optional[float] = None
    bicycle_pct: Optional[float] = None
    walked_pct: Optional[float] = None
    worked_from_home_pct: Optional[float] = None


class Cluster(BaseModel):
    id: Optional[int] = None
    label: Optional[str] = None
    similar_suburb_ids: list[str] = []


class DataSource(BaseModel):
    census_year: Optional[int] = None
    last_updated: Optional[str] = None


class SuburbSummary(BaseModel):
    """Shape for the choropleth map and client-side filtering (rent, income,
    cultural background) — includes boundary geometry so the map can render
    the suburb's actual shape rather than a point marker."""

    id: str
    name: str
    state: str
    council: Optional[str] = None
    location: Location
    boundary: Optional[dict[str, Any]] = None
    population: Optional[int] = None
    median_weekly_rent: Optional[int] = None
    median_weekly_household_income: Optional[int] = None
    cultural_background: list[CulturalBackgroundEntry] = []


class SuburbDetail(BaseModel):
    """Full profile shape for the suburb information panel."""

    id: str
    name: str
    state: str
    council: Optional[str] = None
    location: Location
    demographics: Demographics
    cultural_background: list[CulturalBackgroundEntry]
    commute_to_work: CommuteToWork
    access_to_services: AccessToServices
    cluster: Cluster
    data_source: DataSource


class Council(BaseModel):
    """Shape for the top-level council choropleth map."""

    id: str
    name: str
    boundary: dict[str, Any]
    suburb_count: int
    avg_median_weekly_rent: Optional[float] = None
