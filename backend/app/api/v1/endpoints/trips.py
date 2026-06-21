import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.db import get_session
from app.models.constitution import TripRequest, ScoredRoute
from app.models.spatial import SavedTrip
from app.engines.audit import AuditService
from pydantic import BaseModel

router = APIRouter()

class SaveTripRequest(BaseModel):
    trip_request: TripRequest
    scored_route: ScoredRoute

@router.post("/save")
def save_trip(data: SaveTripRequest, db: Session = Depends(get_session)):
    trip_id = str(uuid.uuid4())[:8] # Short trip ID for shareability
    
    # Save the trip
    audit_status = "UNKNOWN"
    try:
        saved_trip = SavedTrip(
            trip_id=trip_id,
            trip_request=data.trip_request.model_dump(mode='json'),
            scored_route=data.scored_route.model_dump(mode='json')
        )
        db.add(saved_trip)
        db.commit()
        
        # Audit persistence
        s3_payload = AuditService.generate_audit_signature(trip_id, data.scored_route)
        audit_status = s3_payload["storage_status"]
    except Exception as e:
        print(f"Failed to save trip or audit: {e}")
        db.rollback()
        # Fallback for audit if DB failed entirely
        try:
            s3_payload = AuditService.generate_audit_signature(trip_id, data.scored_route)
            audit_status = s3_payload["storage_status"]
        except Exception:
            audit_status = "FAILED"
    
    return {"trip_id": trip_id, "audit_status": audit_status}

@router.get("/{trip_id}")
def get_trip(trip_id: str, db: Session = Depends(get_session)):
    trip = db.query(SavedTrip).filter(SavedTrip.trip_id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
        
    return {
        "trip_request": trip.trip_request,
        "scored_route": trip.scored_route
    }
