from pydantic import BaseModel, ConfigDict
from typing import List, Dict, Any, Optional

class ConfidenceReport(BaseModel):
    segment_id: str
    status: str
    confidence: float
    sources: List[Dict[str, Any]]
    conflict_flag: bool
    model_config = ConfigDict(from_attributes=True)

class SurvivabilityData(BaseModel):
    nearest_hospital_km: float
    fuel_gap_location: str
    network_dead_zones: List[str]
    rest_stops_per_100km: int
    route_duration_hr: float
    model_config = ConfigDict(from_attributes=True)

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
    model_config = ConfigDict(from_attributes=True)

class TripRequest(BaseModel):
    origin: List[float]
    destination: List[float]
    departure_time: str
    vehicle_type: str
    persona: str
    model_config = ConfigDict(from_attributes=True)

class CrisisReport(BaseModel):
    type: str
    latitude: float
    longitude: float
    severity: str
    model_config = ConfigDict(from_attributes=True)

class CrisisResponse(BaseModel):
    trigger_reason: str
    primary_label: str
    secondary_label: str
    status_line: str
    detour_coords: List[float]
    detour_name: str
    all_candidates: List[Dict[str, Any]]
    model_config = ConfigDict(from_attributes=True)
