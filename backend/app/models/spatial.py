from typing import Optional, Any
from sqlmodel import SQLModel, Field
from sqlalchemy import Column, JSON, String, DateTime, func
from geoalchemy2 import Geometry
from pydantic import BaseModel, ConfigDict
from datetime import datetime, timezone

class NoNetworkZoneBase(SQLModel):
    name: str = Field(index=True)
    description: Optional[str] = None
    severity: str = Field(default="Critical") # e.g. "Critical", "Warning"

class NoNetworkZone(NoNetworkZoneBase, table=True):
    __tablename__ = "no_network_zones"
    id: Optional[int] = Field(default=None, primary_key=True)
    # Using Polygon, SRID 4326 (WGS 84)
    geometry: Any = Field(sa_column=Column(Geometry(geometry_type='POLYGON', dimension=3, srid=4326, spatial_index=True)))
    
    model_config = ConfigDict(arbitrary_types_allowed=True)

class BlockedSegment(SQLModel, table=True):
    __tablename__ = "blocked_segments"
    id: Optional[int] = Field(default=None, primary_key=True)
    crisis_type: str = Field(index=True)
    severity: str
    geometry: Any = Field(sa_column=Column(Geometry(geometry_type='POINT', dimension=2, srid=4326, spatial_index=True)))
    reported_at: Optional[datetime] = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    )
    
    model_config = ConfigDict(arbitrary_types_allowed=True)

class SavedTrip(SQLModel, table=True):
    __tablename__ = "saved_trips"
    trip_id: str = Field(primary_key=True)
    trip_request: dict = Field(sa_column=Column(JSON))
    scored_route: dict = Field(sa_column=Column(JSON))
    
    model_config = ConfigDict(arbitrary_types_allowed=True)

class NepalProvince(SQLModel, table=True):
    __tablename__ = "nepal_provinces"
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True)
    province_no: Optional[int] = None
    geometry: Any = Field(sa_column=Column(Geometry(geometry_type='MULTIPOLYGON', srid=4326, spatial_index=True)))
    model_config = ConfigDict(arbitrary_types_allowed=True)

class NepalDistrict(SQLModel, table=True):
    __tablename__ = "nepal_districts"
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True)
    province_no: Optional[int] = None
    hq: Optional[str] = None
    geometry: Any = Field(sa_column=Column(Geometry(geometry_type='MULTIPOLYGON', srid=4326, spatial_index=True)))
    model_config = ConfigDict(arbitrary_types_allowed=True)

class NepalLocalUnit(SQLModel, table=True):
    __tablename__ = "nepal_local_units"
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True)
    district: Optional[str] = None
    province_no: Optional[int] = None
    local_type: Optional[str] = None
    geometry: Any = Field(sa_column=Column(Geometry(geometry_type='MULTIPOLYGON', srid=4326, spatial_index=True)))
    model_config = ConfigDict(arbitrary_types_allowed=True)
