import os
import sys
import json

# Add backend directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from app.core.db import SessionLocal
from app.models.spatial import NoNetworkZone
from shapely.geometry import shape

# Mock data for No-Network zones around the KTM-Pokhara route
ZONES_GEOJSON = {
    "type": "FeatureCollection",
    "features": [
        {
            "type": "Feature",
            "properties": {
                "name": "Malekhu Dead Zone",
                "description": "Known signal drop area near Malekhu",
                "severity": "Critical"
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [[
                    [84.70, 27.80],
                    [84.85, 27.80],
                    [84.85, 27.85],
                    [84.70, 27.85],
                    [84.70, 27.80]
                ]]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "name": "Mugling Gorge",
                "description": "Deep gorge area with no cell coverage",
                "severity": "Critical"
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [[
                    [84.50, 27.80],
                    [84.60, 27.80],
                    [84.60, 27.90],
                    [84.50, 27.90],
                    [84.50, 27.80]
                ]]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "name": "Naubise Valley",
                "description": "Intermittent coverage valley",
                "severity": "Warning"
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [[
                    [85.00, 27.70],
                    [85.10, 27.70],
                    [85.10, 27.75],
                    [85.00, 27.75],
                    [85.00, 27.70]
                ]]
            }
        }
    ]
}

def seed_zones():
    db = SessionLocal()
    try:
        # Check if zones exist
        existing = db.query(NoNetworkZone).count()
        if existing > 0:
            print(f"Found {existing} zones. Skipping seed.")
            return

        print("Seeding No-Network Zones...")
        for feature in ZONES_GEOJSON["features"]:
            geom = shape(feature["geometry"])
            zone = NoNetworkZone(
                name=feature["properties"]["name"],
                description=feature["properties"]["description"],
                severity=feature["properties"]["severity"],
                geometry=f"SRID=4326;{geom.wkt}"
            )
            db.add(zone)
        
        db.commit()
        print("Successfully seeded 3 No-Network Zones.")
    except Exception as e:
        print(f"Error seeding zones: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_zones()
