from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.core.db import get_session
from app.core.logger import setup_logger

logger = setup_logger(__name__)
router = APIRouter()

# Hardcoded route segment data for search (mirrors ktm_pokhara.json properties)
ROUTE_SEGMENTS = [
    {"name": "Kathmandu to Naubise", "segment_id": "seg_ktm_naubise", "road_class": "primary", "surface": "paved", "category": "route"},
    {"name": "Naubise to Malekhu", "segment_id": "seg_naubise_malekhu", "road_class": "primary", "surface": "paved", "category": "route"},
    {"name": "Malekhu to Mugling (Hazard Zone)", "segment_id": "seg_malekhu_mugling", "road_class": "primary", "surface": "dirt", "category": "hazard"},
    {"name": "Mugling to Pokhara", "segment_id": "seg_mugling_pokhara", "road_class": "primary", "surface": "paved", "category": "route"},
]

# Static POI data by category (to be replaced with tourism_poi PostGIS query when seeded)
STATIC_POIS = [
    {"name": "Mugling Dead Zone", "category": "hazard_zone", "lng": 84.55, "lat": 27.87, "description": "No mobile network coverage"},
    {"name": "Malekhu Fuel Station", "category": "fuel_stop", "lng": 84.83, "lat": 27.82, "description": "Last fuel before gorge"},
    {"name": "Pokhara Valley Hospital", "category": "hospital", "lng": 83.99, "lat": 28.21, "description": "Nearest tertiary hospital"},
    {"name": "Manakamana Temple", "category": "scenic_poi", "lng": 84.42, "lat": 27.93, "description": "Popular pilgrimage and tourist site"},
    {"name": "Bandipur Village", "category": "scenic_poi", "lng": 84.42, "lat": 27.93, "description": "Hilltop heritage town"},
    {"name": "Naubise Checkpoint", "category": "fuel_stop", "lng": 85.07, "lat": 27.73, "description": "Fuel and rest stop"},
    {"name": "Mugling Junction Hospital", "category": "hospital", "lng": 84.56, "lat": 27.85, "description": "Small district hospital"},
]


@router.get("/search")
def search_features(q: str = Query(..., min_length=1), db: Session = Depends(get_session)):
    """
    Search route segments, POIs, and network zones by name.
    Returns a list of matching features with their coordinates.
    """
    q_lower = q.lower()
    results = []

    # Search route segments
    for seg in ROUTE_SEGMENTS:
        if q_lower in seg["name"].lower():
            results.append({
                "type": "segment",
                "name": seg["name"],
                "segment_id": seg["segment_id"],
                "properties": seg
            })

    # Search static POIs
    for poi in STATIC_POIS:
        if q_lower in poi["name"].lower():
            results.append({
                "type": "poi",
                "name": poi["name"],
                "lat": poi["lat"],
                "lng": poi["lng"],
                "properties": poi
            })

    # Search PostGIS no_network_zones
    try:
        zones = db.execute(text(
            "SELECT name, ST_Y(ST_Centroid(geometry)) as lat, ST_X(ST_Centroid(geometry)) as lng FROM no_network_zones WHERE LOWER(name) LIKE :q"
        ), {"q": f"%{q_lower}%"}).fetchall()
        for z in zones:
            results.append({"type": "zone", "name": z[0], "lat": z[1], "lng": z[2], "properties": {"category": "hazard_zone"}})
    except Exception as e:
        logger.warning(f"Zone search failed: {e}")

    return {"query": q, "results": results, "count": len(results)}


@router.get("/pois")
def get_pois_by_category(category: str = Query("all"), db: Session = Depends(get_session)):
    """
    Return POIs filtered by category.
    Categories: all, hazard_zone, fuel_stop, hospital, scenic_poi
    """
    if category == "all":
        filtered = STATIC_POIS
    else:
        filtered = [p for p in STATIC_POIS if p["category"] == category]

    features = [
        {
            "type": "Feature",
            "properties": {**p, "name": p["name"]},
            "geometry": {"type": "Point", "coordinates": [p["lng"], p["lat"]]}
        }
        for p in filtered
    ]
    return {"type": "FeatureCollection", "features": features, "category": category}
