from fastapi import FastAPI
from app.core.config import settings

app = FastAPI(title="The Therapist")

@app.get("/")
def health_check():
    return {"status": "ok", "db": settings.DATABASE_URL}
