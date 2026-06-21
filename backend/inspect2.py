from app.core.db import SessionLocal
from sqlalchemy import text
from datetime import datetime, timezone, timedelta

db = SessionLocal()

print("=== SCHEMA ===")
cols = db.execute(text(
    "SELECT column_name, data_type FROM information_schema.columns "
    "WHERE table_name='blocked_segments' ORDER BY ordinal_position"
)).fetchall()
for c in cols:
    print(f"  {c[0]}  ({c[1]})")

print("\n=== ROWS ===")
rows = db.execute(text(
    "SELECT id, crisis_type, severity, reported_at, ST_AsText(geometry) as geom "
    "FROM blocked_segments ORDER BY id"
)).fetchall()
print(f"Total rows: {len(rows)}")
six_hours_ago = datetime.now(timezone.utc) - timedelta(hours=6)
for r in rows:
    ts = r[3]
    if ts is not None and ts.tzinfo is None:
        ts = ts.replace(tzinfo=timezone.utc)
    in_window = (ts > six_hours_ago) if ts else "NO_TIMESTAMP"
    print(f"  id={r[0]}  type={r[1]}  sev={r[2]}  reported_at={r[3]}  geom={r[4]}  in_window={in_window}")

print(f"\n6-hour cutoff: {six_hours_ago.isoformat()}")
db.close()
