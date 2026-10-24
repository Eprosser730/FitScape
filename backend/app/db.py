"""Database engine and per-request sessions."""

from collections.abc import Iterator
from functools import lru_cache

from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker

from app.config import get_settings


@lru_cache
def get_engine() -> Engine:
    return create_engine(get_settings().database_url, pool_pre_ping=True)


def get_db() -> Iterator[Session]:
    """FastAPI dependency: one database session per request, committed on success."""
    with sessionmaker(get_engine(), expire_on_commit=False)() as db:
        try:
            yield db
            db.commit()
        except Exception:
            db.rollback()
            raise
