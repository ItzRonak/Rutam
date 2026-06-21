from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def run_tests():
    print("Testing /api/v1/routes/score-route...")
    payload = {
        "origin": [85.324, 27.7172],
        "destination": [83.9856, 28.2096],
        "departure_time": "2026-05-05T10:00:00.000Z",
        "vehicle_type": "4x4",
        "persona": "family"
    }
    res = client.post("/api/v1/routes/score-route", json=payload)
    if res.status_code != 200:
        print(f"Error in score-route: {res.status_code} - {res.text}")
        return
    
    scored_route = res.json()
    print("Success! Route scored. Safety Score:", scored_route.get("safety_score"))
    
    print("Testing /api/v1/checklist...")
    chk_res = client.post("/api/v1/checklist", json=scored_route)
    if chk_res.status_code != 200:
        print(f"Error in checklist: {chk_res.status_code} - {chk_res.text}")
        return
        
    checklist_data = chk_res.json()
    print("Success! Checklist generated.")
    advice = checklist_data.get("llm_safety_advice")
    if advice:
        print(f"Advice snippet: {advice[:100]}...")
    else:
        print("No advice returned.")

if __name__ == "__main__":
    run_tests()
