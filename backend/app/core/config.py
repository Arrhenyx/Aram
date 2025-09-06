import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./app.db"
    DEEPSEEK_API_KEY: str = os.getenv("DEEPSEEK_API_KEY", "")
    EMERGENCY_CONTACT: str = os.getenv("EMERGENCY_CONTACT", "")

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
