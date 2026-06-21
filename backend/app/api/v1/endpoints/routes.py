import json
import os
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from app.core.logger import setup_logger
from app.core.db import get_session
import httpx
from app.models.constitution import ScoredRoute, TripRequest
from app.engines.scoring import RouteScorer
from app.engines.audit import AuditService

logger = setup_logger(__name__)
router = APIRouter()

@router.get("/ktm-pokhara")
def get_ktm_pokhara_route():
    logger.info("Fetching static KTM-Pokhara GeoJSON for Phase 2 stub")
    
    # Path relative to this file up to the frontend data directory
    file_path = os.path.join(os.path.dirname(__file__), "../../../../../frontend/src/data/routes/ktm_pokhara.json")
    
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)
            return data
    except Exception as e:
        logger.error(f"Failed to read mock data: {e}")
        return {"error": "Data not found", "details": str(e)}

@router.post("/score-route", response_model=ScoredRoute)
def score_route(request: TripRequest, db: Session = Depends(get_session)):
    logger.info(f"Scoring route for departure time: {request.departure_time}")
    
    # Extract hour from ISO string
    try:
        if "T" in request.departure_time:
            time_part = request.departure_time.split("T")[1]
            hour = int(time_part.split(":")[0])
        else:
            hour = 10
    except Exception:
        hour = 10
        
    origin_str = f"{request.origin[0]},{request.origin[1]}"
    dest_str = f"{request.destination[0]},{request.destination[1]}"
    # Using public brouter by default in production, or localhost for local dev
    base_brouter_url = os.getenv("BROUTER_URL", "https://brouter.de")
    brouter_url = f"{base_brouter_url}/brouter?lonlats={origin_str}|{dest_str}&profile=car-vario&alternativeidx=0&format=geojson"
    
    try:
        with httpx.Client() as client:
            resp = client.get(brouter_url, timeout=15.0)
            resp.raise_for_status()
            geojson = resp.json()
    except Exception as e:
        logger.error(f"BRouter unreachable or failed: {e}")
        raise HTTPException(status_code=502, detail=f"Failed to fetch route from BRouter: {str(e)}")
        
    # Execute Phase 2 Logic Engines
    scored_route = RouteScorer.score_route(geojson, hour, db)
    
    # Security Mitigation 1: Generate immutable signature
    s3_payload = AuditService.generate_audit_signature(scored_route.route_id, scored_route)
    logger.info(f"Audit signature generated for S3 payload: {s3_payload['signature']}")
    
    # Append the signed timestamp to the response
    scored_route.generated_timestamp = s3_payload["timestamp"]
    
    return scored_route
