import os
import google.generativeai as genai
from app.models.constitution import ScoredRoute
from app.engines.confidence import sanitize_text_input
from app.core.logger import setup_logger

logger = setup_logger(__name__)

class LLMAdvisorService:
    @staticmethod
    def get_advice(scored_route: ScoredRoute) -> str:
        # network_dead_zones is technically typed as List[Dict] or List[str] in earlier code. 
        # We updated scoring.py to pass a list of strings (zone names).
        zones = scored_route.survivability.network_dead_zones
        # Just in case it's dicts (from older mock), we extract string names:
        zone_names = []
        for z in zones:
            if isinstance(z, dict) and "name" in z:
                zone_names.append(z["name"])
            elif isinstance(z, str):
                zone_names.append(z)
                
        if zone_names:
            zone_text = f"a No-Network Zone at {', '.join(zone_names)}"
        else:
            zone_text = "no critical network zones"
            
        # Find the worst segment to make the prompt reactive to specific hazards
        worst_segment = "Unknown"
        lowest_score = 100
        for f in scored_route.geojson.get("features", []):
            props = f.get("properties", {})
            # We can use computed_score which blends road and safety
            score = props.get("computed_score", 100)
            if score < lowest_score:
                lowest_score = score
                worst_segment = props.get("name", "Unknown")
                
        hazard_context = f"The most hazardous segment is {worst_segment} with a local score of {lowest_score}."
            
        raw_prompt = f"Provide a brief safety advisory for a traveler. The route includes {zone_text} and the highest risk area is {worst_segment}. Do not restate the segment name or score. Do not use a persona or casual tone. Use a plain, calm, informational tone. Do not invent any place names. Write exactly 1 to 2 short sentences (maximum 30 words) stating the specific hazard risk and one concrete action (e.g. check fuel, download offline maps)."
        
        # Sanitize the prompt as required by the Safety Gate
        try:
            prompt = sanitize_text_input(raw_prompt)
        except ValueError as e:
            logger.warning(f"Prompt sanitation failed: {e}")
            return "Safety advice is currently unavailable due to security filters."
            
        provider = os.getenv("LLM_PROVIDER", "gemini").lower()
        
        if provider == "ollama":
            import httpx
            ollama_url = os.getenv("OLLAMA_URL", "http://localhost:11434")
            try:
                with httpx.Client() as client:
                    resp = client.post(
                        f"{ollama_url}/api/generate",
                        json={
                            "model": "qwen2.5:3b",
                            "prompt": prompt,
                            "stream": False
                        },
                        timeout=15.0
                    )
                    resp.raise_for_status()
                    return resp.json().get("response", "").strip()
            except Exception as e:
                logger.error(f"Ollama generation failed: {e}")
                return "Unable to generate safety advice at this time (Ollama offline)."
                
        elif provider == "gemini":
            api_key = os.getenv("GEMINI_API_KEY")
            if not api_key:
                logger.warning("GEMINI_API_KEY not found. Returning mocked LLM advice.")
                if zone_names:
                    return "Network coverage is unavailable ahead. Download offline maps and confirm route details before proceeding."
                else:
                    return "Route conditions require caution. Maintain a steady speed and verify fuel levels."
                    
            try:
                genai.configure(api_key=api_key)
                model = genai.GenerativeModel('gemini-1.5-flash')
                response = model.generate_content(prompt)
                return response.text.strip()
            except Exception as e:
                logger.error(f"Gemini LLM Generation failed: {e}")
                return "Unable to generate safety advice at this time."
        
        return "Invalid LLM Provider configured."
