from pydantic import BaseModel
from typing import List, Dict, Any, Optional

class RouteSegment(BaseModel):
    segment_id: str
    geometry: List[List[float]] # [[lng, lat, elev], ...]
    road_class: str
    surface: str
    curvature_index: float
    elevation_grade: float
    barrier_present: bool
    in_landslide_zone: bool
    in_flood_zone: bool
    settlement_density: str
    is_freight_corridor: bool
    weather_rainfall_3h: float
    freshness: Dict[str, str]

class SurvivabilityData(BaseModel):
    nearest_hospital_km: float
    fuel_gap_location: str
    network_dead_zones: List[str]
    rest_stops_per_100km: int
    route_duration_hr: float

class ConfidenceReport(BaseModel):
    segment_id: str
    status: str
    confidence: float
    sources: List[Dict[str, Any]]
    conflict_flag: bool

class ScoredRoute(BaseModel):
    route_id: str
    geojson: Dict[str, Any]
    road_score: float
    surv_score: float
    exp_score: float
    safety_score: float
    composite_score: float
    confidence: ConfidenceReport
    survivability: SurvivabilityData
    freshness: Dict[str, str]
    generated_timestamp: Optional[str] = None
    llm_safety_advice: Optional[str] = None

class TripRequest(BaseModel):
    origin: List[float]
    destination: List[float]
    departure_time: str
    vehicle_type: str
    persona: str

class POICandidate(BaseModel):
    name: str
    geom: str
    scenic_score: float
    safety_score: float
    road_access: str
    dist_m: float

class CrisisResponse(BaseModel):
    trigger_reason: str
    primary_label: str
    secondary_label: str
    status_line: str
    detour_coords: List[float]
    detour_name: str
    all_candidates: List[POICandidate]
