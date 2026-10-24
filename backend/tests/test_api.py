from datetime import UTC, datetime, timedelta

from fastapi.testclient import TestClient
from sqlalchemy import text, update

from app import security
from app.auth import COOKIE_NAME
from app.db import get_engine
from app.models import Session, User
from tests.conftest import NEW_USER


def login(client: TestClient, pin: str, username: str = "ethan"):
    return client.post("/api/auth/login", json={"username": username, "pin": pin})


def test_health(client):
    assert client.get("/api/health").json() == {"status": "ok"}


def test_unknown_username_offers_signup(client):
    r = login(client, "4826", username="nobody")
    assert r.status_code == 404
    assert r.json() == {"code": "user_not_found"}


def test_signup_normalises_and_signs_in(client):
    r = client.post("/api/auth/signup", json=NEW_USER)
    assert r.status_code == 201
    assert r.json() == {"username": "ethan", "first_name": "Ethan", "last_name": "Prosser"}
    cookie = r.headers["set-cookie"].lower()
    assert "httponly" in cookie and "samesite=strict" in cookie
    assert client.get("/api/me").json()["username"] == "ethan"


def test_pin_is_stored_peppered_and_hashed(signed_up):
    with get_engine().connect() as conn:
        pin_hash = conn.scalar(text("SELECT pin_hash FROM users"))
    assert pin_hash.startswith("$argon2id$") and "4826" not in pin_hash
    assert security.verify_pin("4826", pin_hash)
    # The same PIN hashed without the pepper must not match: proves the pepper is really used.
    assert not security._hasher.verify("4826", pin_hash)


def test_duplicate_username_conflicts(signed_up):
    r = signed_up.post("/api/auth/signup", json={**NEW_USER, "username": "ETHAN"})
    assert r.status_code == 409
    assert r.json() == {"code": "username_taken"}


def test_signup_validation(client):
    bad = [
        {"username": "ab"},  # too short
        {"username": "has space"},
        {"pin": "123"},
        {"pin": "12a4"},
        {"pin": "1234"},  # denylisted
        {"first_name": "   "},
    ]
    for override in bad:
        assert client.post("/api/auth/signup", json={**NEW_USER, **override}).status_code == 422


def test_login_rejects_form_posts(signed_up):
    # JSON-only is half of the CSRF defence (ADR 0004): a cross-site HTML form can't send JSON.
    r = signed_up.post("/api/auth/login", data={"username": "ethan", "pin": "4826"})
    assert r.status_code == 422


def test_login_and_logout(signed_up):
    signed_up.cookies.clear()
    assert signed_up.get("/api/me").status_code == 401
    assert login(signed_up, "4826").status_code == 200
    assert signed_up.get("/api/me").status_code == 200

    assert signed_up.post("/api/auth/logout").status_code == 204
    assert signed_up.get("/api/me").status_code == 401
    with get_engine().connect() as conn:
        assert conn.scalar(text("SELECT count(*) FROM sessions")) == 1  # only signup's session


def test_lockout_after_five_wrong_pins(signed_up):
    for left in (4, 3, 2, 1):
        r = login(signed_up, "0001")
        assert r.status_code == 401
        assert r.json() == {"code": "wrong_pin", "attempts_left": left}
    r = login(signed_up, "0001")
    assert r.status_code == 423 and r.json()["code"] == "locked"
    # Even the right PIN is refused while locked.
    assert login(signed_up, "4826").status_code == 423


def test_lock_expires_and_success_resets_counter(signed_up):
    with get_engine().begin() as conn:
        conn.execute(
            update(User).values(
                locked_until=datetime.now(UTC) - timedelta(seconds=1), failed_pin_attempts=3
            )
        )
    assert login(signed_up, "4826").status_code == 200
    assert login(signed_up, "0001").json()["attempts_left"] == 4


def test_expired_session_is_rejected(signed_up):
    with get_engine().begin() as conn:
        conn.execute(update(Session).values(expires_at=datetime.now(UTC) - timedelta(seconds=1)))
    assert signed_up.get("/api/me").status_code == 401


def test_bogus_cookie_is_rejected(client):
    client.cookies.set(COOKIE_NAME, "not-a-real-token")
    assert client.get("/api/me").status_code == 401


def test_login_purges_expired_sessions(signed_up):
    with get_engine().begin() as conn:
        conn.execute(update(Session).values(expires_at=datetime.now(UTC) - timedelta(seconds=1)))
    assert login(signed_up, "4826").status_code == 200
    with get_engine().connect() as conn:
        assert conn.scalar(text("SELECT count(*) FROM sessions")) == 1  # old one gone, new one kept
