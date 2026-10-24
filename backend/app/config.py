"""App settings, read from environment variables (or backend/.env in development)."""

from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str
    # Server-side secret mixed into every PIN hash (ADR 0004). Never store it in the database.
    pin_pepper: str = Field(min_length=32)
    session_days: int = 30
    # True whenever the app is served over HTTPS.
    cookie_secure: bool = True


@lru_cache
def get_settings() -> Settings:
    return Settings()
