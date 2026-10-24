"""FitScape API entry point. Run locally with: uv run fastapi dev app/main.py"""

from fastapi import Depends, FastAPI
from sqlalchemy import text
from sqlalchemy.orm import Session

from app import auth, lifting, prayer, profile, running
from app.db import get_db

app = FastAPI(title="FitScape API")
app.include_router(auth.router)
app.include_router(profile.router)
app.include_router(prayer.router)
app.include_router(lifting.router)
app.include_router(running.router)


@app.get("/api/health")
def health(db: Session = Depends(get_db)):
    db.execute(text("SELECT 1"))
    return {"status": "ok"}
