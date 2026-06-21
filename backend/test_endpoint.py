"""Quick smoke test for the safety_score contract fix."""
import requests
import json

url = "http://localhost:8000/api/v1/routes/score-route"
payload = {
    "origin": [85.324, 27.7172],
    "destination": [83.9856, 28.2096],
    "departure_time": "2026-05-05T10:00:00.000Z",
    "vehicle_type": "4x4",
    "persona": "family"
}

r = requests.post(url, json=payload)
data = r.json()

print(f"Status Code:     {r.status_code}")
print(f"safety_score:    {data.get('safety_score')}")
print(f"road_score:      {data.get('road_score')}")
print(f"surv_score:      {data.get('surv_score')}")
print(f"exp_score:       {data.get('exp_score')}")
print(f"composite_score: {data.get('composite_score')}")
print(f"Top-level keys:  {list(data.keys())}")
print()

# Contract check
assert r.status_code == 200, f"FAIL: Expected 200, got {r.status_code}"
assert "safety_score" in data, "FAIL: safety_score missing from response!"
assert isinstance(data["safety_score"], (int, float)), "FAIL: safety_score is not a number!"
print("ALL CHECKS PASSED")
