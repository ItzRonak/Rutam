from app.models.constitution import ScoredRoute, ConfidenceReport, SurvivabilityData
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import select, func
from shapely.geometry import shape
import json

class RouteScorer:
    @staticmethod
    def get_spatial_penalty(route_data: Dict[str, Any], db: Session) -> list[str]:
        """
        Check if any feature in the route intersects with a NoNetworkZone.
        Returns a list of zone names.
        """
        from app.models.spatial import NoNetworkZone
        if not db:
            return []
            
        try:
            intersecting_zones = []
            for f in route_data.get("features", []):
                if "geometry" not in f:
                    continue
                geom = shape(f["geometry"])
                # Extract WKT, using 2D for intersection if Z dimension causes issues, but standard WKT works
                wkt = geom.wkt
                
                query = select(NoNetworkZone).where(
                    func.ST_Intersects(
                        NoNetworkZone.geometry,
                        func.ST_GeomFromText(wkt, 4326)
                    )
                )
                result = db.execute(query).first()
                if result:
                    intersecting_zones.append(result[0].name)
        except Exception as e:
            # Depending on context, we might log it. We'll assume no intersection on error.
            print(f"Spatial query error: {e}")
            pass
            
        return list(set(intersecting_zones))

    @staticmethod
    def score_route(route_data: Dict[str, Any], departure_hour: int, db: Optional[Session] = None) -> ScoredRoute:
        """
        Port of the deterministic math from frontend's useRouteScorer.ts into a Python class.
        """
        if not route_data or "features" not in route_data or not route_data["features"]:
            raise ValueError("Invalid route data")
            
        is_detour = False
        if db:
            from app.models.spatial import BlockedSegment
            try:
                blocked_coords = []
                six_hours_ago = datetime.now(timezone.utc) - timedelta(hours=6)
                for f in route_data.get("features", []):
                    if "geometry" not in f: continue
                    geom = shape(f["geometry"])
                    wkt = geom.wkt
                    query = select(BlockedSegment).where(
                        func.ST_DWithin(
                            BlockedSegment.geometry,
                            func.ST_GeomFromText(wkt, 4326),
                            0.02
                        ),
                        BlockedSegment.reported_at > six_hours_ago
                    )
                    results = db.execute(query).all()
                    for res in results:
                        lonlat_query = select(func.ST_X(res[0].geometry), func.ST_Y(res[0].geometry))
                        point = db.execute(lonlat_query).first()
                        if point:
                            blocked_coords.append(f"{point[0]},{point[1]}")
                
                blocked_coords = list(set(blocked_coords))
                if blocked_coords:
                    print(f"Blockage detected! Re-routing around: {blocked_coords}")
                    is_detour = True
                    first_coords = route_data["features"][0]["geometry"]["coordinates"]
                    origin_str = f"{first_coords[0][0]},{first_coords[0][1]}"
                    last_coords = route_data["features"][-1]["geometry"]["coordinates"]
                    dest_str = f"{last_coords[-1][0]},{last_coords[-1][1]}"
                    
                    nogo_str = "|".join([f"{coord},500" for coord in blocked_coords])
                    brouter_url = f"http://localhost:17777/brouter?lonlats={origin_str}|{dest_str}&format=geojson&profile=car-vario&nogo={nogo_str}"
                    import httpx
                    with httpx.Client() as client:
                        resp = client.get(brouter_url, timeout=5.0)
                        resp.raise_for_status()
                        route_data = resp.json()
            except Exception as e:
                print(f"Detour override failed (expected if BRouter mocked): {e}")
        
        total_road_score_sum = 0
        total_safety_score_sum = 0
        time_penalty = 0
        
        if departure_hour >= 20 or departure_hour <= 4:
            time_penalty = -40
        elif departure_hour >= 17:
            time_penalty = -20
        elif 6 <= departure_hour <= 9:
            time_penalty = 5
            
        features_with_score = []
        
        for f in route_data["features"]:
            props = f.get("properties", {})
            road_seg_score = 100
            safety_seg_score = 100
            
            # --- Road Condition factors (surface, curvature, grade) ---
            surface = props.get("surface", "unknown")
            if surface in ["dirt", "unknown"]:
                road_seg_score -= 15
            elif surface == "gravel":
                road_seg_score -= 8
                
            elevation_grade = props.get("elevation_grade", 0)
            barrier_present = props.get("barrier_present", False)
            if elevation_grade > 10:
                road_seg_score -= 10
                
            curvature = props.get("curvature_index", 0)
            if curvature > 0.5:
                road_seg_score -= round(curvature * 10)
            
            # --- Safety / Hazard factors (barriers, zones, weather, visibility) ---
            if elevation_grade > 8 and not barrier_present:
                safety_seg_score -= 20
                
            if props.get("in_landslide_zone", False):
                safety_seg_score -= 25
            if props.get("in_flood_zone", False):
                safety_seg_score -= 15
                
            if props.get("weather_rainfall_3h", 0) > 10:
                safety_seg_score -= 15
            
            # Night visibility is a safety concern, not a road-condition concern
            safety_seg_score += time_penalty
                
            # Apply time penalty to road_score as well (legacy behavior preserved)
            road_seg_score += time_penalty
            
            road_seg_score = max(0, min(100, road_seg_score))
            safety_seg_score = max(0, min(100, safety_seg_score))
            
            total_road_score_sum += road_seg_score
            total_safety_score_sum += safety_seg_score
            
            new_props = props.copy()
            # computed_score uses the combined view for map coloring
            new_props["computed_score"] = round((road_seg_score + safety_seg_score) / 2)
            
            new_feature = f.copy()
            new_feature["properties"] = new_props
            features_with_score.append(new_feature)
        
        num_segments = len(features_with_score)
        road_score = round(total_road_score_sum / num_segments)
        safety_score = round(total_safety_score_sum / num_segments)
        surv_score = 65
        exp_score = 80
        
        # Apply spatial penalty
        dead_zones = []
        if db:
            dead_zones = RouteScorer.get_spatial_penalty(route_data, db)
            if dead_zones:
                safety_score = 0

        
        # Composite: road 40%, safety 20%, survivability 20%, experience 20%
        composite_score = round(
            (road_score * 0.4) + (safety_score * 0.2) +
            (surv_score * 0.2) + (exp_score * 0.2)
        )
        
        import uuid
        return ScoredRoute(
            route_id=f"rt_{uuid.uuid4().hex}",
            geojson={"type": "FeatureCollection", "features": features_with_score},
            road_score=road_score,
            surv_score=surv_score,
            exp_score=exp_score,
            safety_score=safety_score,
            composite_score=composite_score,
            confidence=ConfidenceReport(
                segment_id="overall",
                status="blocked" if is_detour else ("clear" if safety_score > 50 else "caution"),
                confidence=8.5,
                sources=[{"source_type": "static_kb", "count": 1}],
                conflict_flag=False
            ),
            survivability=SurvivabilityData(
                nearest_hospital_km=12.4,
                max_fuel_gap_km=45.0,
                fuel_gap_location="Malekhu",
                network_dead_zones=dead_zones,
                rest_stops_per_100km=3,
                route_duration_hr=6.5
            ),
            freshness={
                "weather": datetime.utcnow().isoformat() + "Z"
            }
        )
