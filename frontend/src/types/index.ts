export interface RouteSegment {
  segment_id: string;
  geometry: number[][]; // [[lng, lat, elev], ...]
  road_class: string;
  surface: string;
  curvature_index: number;
  elevation_grade: number;
  barrier_present: boolean;
  in_landslide_zone: boolean;
  in_flood_zone: boolean;
  settlement_density: string;
  is_freight_corridor: boolean;
  weather_rainfall_3h: number;
  freshness: Record<string, string>;
}

export interface SurvivabilityData {
  nearest_hospital_km: number;
  max_fuel_gap_km: number;
  fuel_gap_location: string;
  network_dead_zones: string[];
  rest_stops_per_100km: number;
  route_duration_hr: number;
}

export interface ConfidenceReport {
  segment_id: string;
  status: string; // clear | blocked | caution | conflicting
  confidence: number;
  sources: Array<Record<string, any>>;
  conflict_flag: boolean;
}

export interface ScoredRoute {
  route_id: string;
  geojson: GeoJSON.FeatureCollection;
  road_score: number;
  surv_score: number;
  exp_score: number;
  safety_score: number; // explicitly maps to core safety requirement
  composite_score: number;
  confidence: ConfidenceReport;
  survivability: SurvivabilityData;
  freshness: Record<string, string>;
  generated_timestamp: string; // ISO 8601 timestamp for Audit Log verification
  llm_safety_advice?: string;
}

export interface TripRequest {
  origin: [number, number]; // [lng, lat]
  destination: [number, number]; // [lng, lat]
  departure_time: string; // ISO datetime
  vehicle_type: string;
  persona: string; // family | adventure | backpacker | pilgrimage
}

export interface POICandidate {
  name: string;
  geom: string;
  scenic_score: number;
  safety_score: number;
  road_access: string;
  dist_m: number;
}

export interface CrisisResponse {
  trigger_reason: string;
  primary_label: string;
  secondary_label: string;
  status_line: string;
  detour_coords: [number, number];
  detour_name: string;
  all_candidates: POICandidate[];
}

export interface CrisisReport {
  type: string;
  latitude: number;
  longitude: number;
  severity: string;
}
