import os
import re
from urllib.parse import urlparse

import pytest
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy import text


class _TestEnv(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
    test_database_url: str


_url = _TestEnv().test_database_url
# Tests wipe every table between runs; refuse anything that isn't clearly a test database.
_db_name = urlparse(_url).path.lstrip("/")
assert re.fullmatch(r"[a-z0-9_]*_test", _db_name), f"not a *_test database: {_db_name!r}"
os.environ["DATABASE_URL"] = _url
os.environ.setdefault("PIN_PEPPER", "test-pepper-" + "x" * 32)
os.environ["COOKIE_SECURE"] = "false"

from alembic.config import Config  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from alembic import command  # noqa: E402
from app.db import get_engine  # noqa: E402
from app.main import app  # noqa: E402


@pytest.fixture(scope="session", autouse=True)
def migrated_db():
    # Running the real migrations (not create_all) means the migration itself is tested too.
    command.upgrade(Config("alembic.ini"), "head")


@pytest.fixture(autouse=True)
def clean_tables():
    with get_engine().begin() as conn:
        conn.execute(text("TRUNCATE sessions, users RESTART IDENTITY CASCADE"))


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


NEW_USER = {"username": "Ethan", "first_name": " Ethan ", "last_name": "Prosser", "pin": "4826"}


@pytest.fixture
def signed_up(client: TestClient) -> TestClient:
    assert client.post("/api/auth/signup", json=NEW_USER).status_code == 201
    return client
