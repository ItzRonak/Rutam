from fastapi import APIRouter
from app.api.v1.endpoints import health, routes, checklist, crisis, trips, geodata, search

api_router = APIRouter()
api_router.include_router(health.router, tags=["health"])
api_router.include_router(routes.router, prefix="/routes", tags=["routes"])
api_router.include_router(checklist.router, prefix="/checklist", tags=["checklist"])
api_router.include_router(crisis.router, prefix="/crisis", tags=["crisis"])
api_router.include_router(trips.router, prefix="/trips", tags=["trips"])
api_router.include_router(geodata.router, prefix="/geodata", tags=["geodata"])
api_router.include_router(search.router, prefix="/search", tags=["search"])
