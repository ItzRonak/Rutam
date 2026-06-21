from sqlmodel import SQLModel, Session
from sqlalchemy import text, inspect
from geoalchemy2.elements import WKTElement
from app.core.db import engine
from app.models.spatial import NoNetworkZone, SavedTrip, BlockedSegment, NepalProvince, NepalDistrict, NepalLocalUnit
import json
import os

def init_database():
    print("Creating database tables...")
    
    with engine.begin() as conn:
        conn.execute(text("DROP TABLE IF EXISTS no_network_zones CASCADE"))
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS no_network_zones (
                id SERIAL PRIMARY KEY,
                name VARCHAR NOT NULL,
                description VARCHAR,
                severity VARCHAR DEFAULT 'Critical',
                geometry geometry(PolygonZ, 4326)
            )
        """))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_no_network_zones_geometry ON no_network_zones USING GIST (geometry)"))
    print("Created no_network_zones with PolygonZ geometry.")
    
    SQLModel.metadata.create_all(engine)
    
    with Session(engine) as session:
        existing = session.query(NoNetworkZone).first()
        if not existing:
            print("Seeding Mugling Dead Zone...")
            wkt_poly = 'POLYGON Z ((84.50 27.80 500, 84.60 27.80 500, 84.60 27.90 500, 84.50 27.90 500, 84.50 27.80 500))'
            zone = NoNetworkZone(
                name="Mugling Dead Zone",
                description="Simulated dead zone for v3.0 testing",
                severity="Critical",
                geometry=WKTElement(wkt_poly, srid=4326)
            )
            session.add(zone)
            session.commit()
            print("Database successfully seeded!")
        else:
            print("Database already seeded.")

    # Seed Nepal Province boundaries
    _seed_admin_boundaries(session_factory=lambda: Session(engine))

def _seed_admin_boundaries(session_factory):
    """Seed Nepal province and district boundaries from GeoJSON files."""
    base_dir = os.path.dirname(os.path.abspath(__file__))
    admin_dir = os.path.join(base_dir, "..", "..", "data", "admin")

    with session_factory() as session:
        # --- Provinces ---
        if session.query(NepalProvince).first() is None:
            prov_path = os.path.join(admin_dir, "nepal_provinces.geojson")
            if os.path.exists(prov_path):
                print("Seeding Nepal provinces...")
                with open(prov_path, "r", encoding="utf-8") as f:
                    fc = json.load(f)
                for feat in fc.get("features", []):
                    props = feat.get("properties", {})
                    geom_str = json.dumps(feat["geometry"])
                    # Use raw SQL for geometry insertion
                    session.execute(
                        text("INSERT INTO nepal_provinces (name, province_no, geometry) VALUES (:name, :pno, ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON(:geom), 4326)))"),
                        {"name": props.get("PROVINCE_NA", props.get("name", "Unknown")), "pno": props.get("PROVINCE", None), "geom": geom_str}
                    )
                session.commit()
                print(f"Seeded {len(fc.get('features', []))} provinces.")
            else:
                print(f"Province GeoJSON not found at {prov_path}")
        else:
            print("Provinces already seeded.")

        # --- Districts (Bagmati + Gandaki) ---
        if session.query(NepalDistrict).first() is None:
            dist_path = os.path.join(admin_dir, "nepal_districts.geojson")
            if os.path.exists(dist_path):
                print("Seeding Nepal districts (Bagmati + Gandaki)...")
                with open(dist_path, "r", encoding="utf-8") as f:
                    fc = json.load(f)
                for feat in fc.get("features", []):
                    props = feat.get("properties", {})
                    geom_str = json.dumps(feat["geometry"])
                    session.execute(
                        text("INSERT INTO nepal_districts (name, province_no, hq, geometry) VALUES (:name, :pno, :hq, ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON(:geom), 4326)))"),
                        {"name": props.get("DISTRICT", "Unknown"), "pno": props.get("PROVINCE", None), "hq": props.get("HQ", None), "geom": geom_str}
                    )
                session.commit()
                print(f"Seeded {len(fc.get('features', []))} districts.")
            else:
                print(f"District GeoJSON not found at {dist_path}")
        else:
            print("Districts already seeded.")

        # --- Local Units (Bagmati + Gandaki) ---
        if session.query(NepalLocalUnit).first() is None:
            local_path = os.path.join(admin_dir, "nepal_local_units.geojson")
            if os.path.exists(local_path):
                print("Seeding Nepal local units (Bagmati + Gandaki)...")
                with open(local_path, "r", encoding="utf-8") as f:
                    fc = json.load(f)
                for feat in fc.get("features", []):
                    props = feat.get("properties", {})
                    geom_str = json.dumps(feat["geometry"])
                    session.execute(
                        text("INSERT INTO nepal_local_units (name, district, province_no, local_type, geometry) VALUES (:name, :district, :pno, :ltype, ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON(:geom), 4326)))"),
                        {
                            "name": props.get("locallevel_name", "Unknown"), 
                            "district": props.get("district", None),
                            "pno": props.get("province", None), 
                            "ltype": props.get("locallevel_type", None), 
                            "geom": geom_str
                        }
                    )
                session.commit()
                print(f"Seeded {len(fc.get('features', []))} local units.")
            else:
                print(f"Local Units GeoJSON not found at {local_path}")
        else:
            print("Local Units already seeded.")

if __name__ == "__main__":
    init_database()
