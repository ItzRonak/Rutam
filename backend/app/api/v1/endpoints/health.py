from fastapi import APIRouter
from app.core.logger import setup_logger

logger = setup_logger(__name__)
router = APIRouter()

@router.get("/health")
def health_check():
    logger.info("Health check endpoint called")
    return {"status": "ok", "message": "Rutam Backend is running"}
