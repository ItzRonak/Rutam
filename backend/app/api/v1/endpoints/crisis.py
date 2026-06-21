from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.core.db import get_session
from app.models.constitution import CrisisReport, CrisisResponse
from app.models.spatial import BlockedSegment
from app.core.logger import setup_logger
import json

logger = setup_logger(__name__)
router = APIRouter()

@router.post("/report-crisis", response_model=CrisisResponse)
def report_crisis(report: CrisisReport, db: Session = Depends(get_session)):
    logger.info(f"Received crisis report: {report.type} at {report.latitude}, {report.longitude}")
    try:
        geom_wkt = f"POINT({report.longitude} {report.latitude})"
        
        query = text("""
            INSERT INTO blocked_segments (crisis_type, severity, geometry) 
            VALUES (:type, :sev, ST_GeomFromText(:geom, 4326))
        """)
        
        db.execute(query, {
            "type": report.type,
            "sev": report.severity,
            "geom": geom_wkt
        })
        db.commit()
    except Exception as e:
        logger.error(f"Failed to insert crisis report: {e}")
        db.rollback()

    # Find detour
    persona = "family" # default
    candidates = []
    try:
        candidates_query = text("""
            SELECT name, ST_AsGeoJSON(geometry) as geom,
                   scenic_score, safety_score, road_access,
                   ST_Distance(geometry::geography,
                               ST_MakePoint(:lng,:lat)::geography) as dist_m
            FROM tourism_poi
            WHERE ST_DWithin(geometry::geography, ST_MakePoint(:lng,:lat)::geography, 35000)
            ORDER BY dist_m LIMIT 10
        """)
        candidates = db.execute(candidates_query, {'lat': report.latitude, 'lng': report.longitude}).fetchall()
    except Exception as e:
        logger.warning(f"Failed to query tourism_poi (table likely missing): {e}")

    candidate_dicts = []
    for c in candidates:
        candidate_dicts.append({
            "name": c.name,
            "geom": c.geom,
            "scenic_score": getattr(c, "scenic_score", 50),
            "safety_score": getattr(c, "safety_score", 50),
            "road_access": getattr(c, "road_access", "unknown"),
            "dist_m": c.dist_m
        })

    if not candidate_dicts:
        # Fallback if no POI
        return CrisisResponse(
            trigger_reason="user_reported_blockage",
            primary_label="NO SAFE DETOUR FOUND",
            secondary_label="Stay in place",
            status_line="Route blocked. Wait for rescue.",
            detour_coords=[report.longitude, report.latitude],
            detour_name="Current Location",
            all_candidates=[]
        )

    # Sort candidates
    safe_candidates = [c for c in candidate_dicts if c["road_access"] == 'paved']
    if not safe_candidates:
        safe_candidates = candidate_dicts
    safe_candidates.sort(key=lambda c: c["safety_score"], reverse=True)

    top = safe_candidates[0]
    dist_km = round(top["dist_m"] / 1000, 1)
    
    geom_data = json.loads(top["geom"])
    
    return CrisisResponse(
        trigger_reason="user_reported_blockage",
        primary_label=f"TAKE ME TO {top['name'].upper()} — {dist_km}km",
        secondary_label="See other options",
        status_line=f"Route blocked. Divert to {top['name']}.",
        detour_coords=geom_data.get("coordinates", [report.longitude, report.latitude]),
        detour_name=top['name'],
        all_candidates=candidate_dicts[:3]
    )

@router.post("/clear-blockages")
def clear_blockages(db: Session = Depends(get_session)):
    logger.info("Clearing all blocked segments")
    try:
        db.execute(text("TRUNCATE TABLE blocked_segments"))
        db.commit()
        return {"status": "success", "message": "All blockages cleared"}
    except Exception as e:
        logger.error(f"Failed to clear blockages: {e}")
        db.rollback()
        return {"status": "error", "message": str(e)}
