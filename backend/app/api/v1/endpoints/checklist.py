from fastapi import APIRouter
from app.models.constitution import ScoredRoute
from app.engines.llm_advisor import LLMAdvisorService

router = APIRouter()

@router.post("")
def get_checklist(route: ScoredRoute):
    advice = LLMAdvisorService.get_advice(route)
    return {"llm_safety_advice": advice}
