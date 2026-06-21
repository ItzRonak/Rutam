from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    PROJECT_NAME: str = "Rutam WebGIS Backend"
    API_V1_STR: str = "/api/v1"
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "https://rutam.vercel.app",
        "https://*.vercel.app",
    ]
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/rutam"
    
    class Config:
        case_sensitive = True

settings = Settings()
