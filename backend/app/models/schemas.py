from typing import Optional

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


class Cluster(BaseModel):
    id: Optional[int] = None
    label: Optional[str] = None
    similar_suburb_ids: list[str] = []


class DataSource(BaseModel):
    census_year: Optional[int] = None
    last_updated: Optional[str] = None


class SuburbSummary(BaseModel):
    """Shape for map markers, extended with the fields needed to filter
    client-side (rent, income, cultural background) without a second
    per-suburb request."""

    id: str
    name: str
    state: str
    location: Location
    population: Optional[int] = None
    median_weekly_rent: Optional[int] = None
    median_weekly_household_income: Optional[int] = None
    cultural_background: list[CulturalBackgroundEntry] = []


class SuburbDetail(BaseModel):
    """Full profile shape for the suburb information panel."""

    id: str
    name: str
    state: str
    location: Location
    demographics: Demographics
    cultural_background: list[CulturalBackgroundEntry]
    access_to_services: AccessToServices
    cluster: Cluster
    data_source: DataSource
