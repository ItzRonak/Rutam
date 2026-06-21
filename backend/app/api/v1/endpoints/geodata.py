from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.core.db import get_session
from app.core.logger import setup_logger

logger = setup_logger(__name__)
router = APIRouter()

@router.get("/admin/provinces")
def get_provinces(db: Session = Depends(get_session)):
    """Return Nepal province boundaries as GeoJSON FeatureCollection."""
    try:
        rows = db.execute(text("""
            SELECT id, name, province_no,
                   ST_AsGeoJSON(geometry)::json AS geometry
            FROM nepal_provinces
            ORDER BY province_no
        """)).fetchall()

        features = []
        for row in rows:
            features.append({
                "type": "Feature",
                "properties": {
                    "id": row[0],
                    "name": row[1],
                    "province_no": row[2],
                    "layer": "province"
                },
                "geometry": row[3]
            })
        return {"type": "FeatureCollection", "features": features}
    except Exception as e:
        logger.error(f"Error fetching provinces: {e}")
        return {"type": "FeatureCollection", "features": []}


@router.get("/admin/districts")
def get_districts(db: Session = Depends(get_session)):
    """Return Bagmati + Gandaki district boundaries as GeoJSON FeatureCollection."""
    try:
        rows = db.execute(text("""
            SELECT id, name, province_no, hq,
                   ST_AsGeoJSON(geometry)::json AS geometry
            FROM nepal_districts
            ORDER BY province_no, name
        """)).fetchall()

        features = []
        for row in rows:
            features.append({
                "type": "Feature",
                "properties": {
                    "id": row[0],
                    "name": row[1],
                    "province_no": row[2],
                    "hq": row[3],
                    "layer": "district"
                },
                "geometry": row[4]
            })
        return {"type": "FeatureCollection", "features": features}
    except Exception as e:
        logger.error(f"Error fetching districts: {e}")
        return {"type": "FeatureCollection", "features": []}

@router.get("/admin/local")
def get_local_units(db: Session = Depends(get_session)):
    """Return local unit boundaries as GeoJSON FeatureCollection."""
    try:
        rows = db.execute(text("""
            SELECT id, name, district, province_no, local_type,
                   ST_AsGeoJSON(geometry)::json AS geometry
            FROM nepal_local_units
            ORDER BY province_no, district, name
        """)).fetchall()

        features = []
        for row in rows:
            features.append({
                "type": "Feature",
                "properties": {
                    "id": row[0],
                    "name": row[1],
                    "district": row[2],
                    "province_no": row[3],
                    "local_type": row[4],
                    "layer": "local"
                },
                "geometry": row[5]
            })
        return {"type": "FeatureCollection", "features": features}
    except Exception as e:
        logger.error(f"Error fetching local units: {e}")
        return {"type": "FeatureCollection", "features": []}
