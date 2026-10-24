"""PIN hashing and session tokens (ADR 0004)."""

import hashlib
import hmac
import secrets

from pwdlib import PasswordHash
from pwdlib.hashers.argon2 import Argon2Hasher

from app.config import get_settings

_hasher = PasswordHash((Argon2Hasher(),))

MAX_PIN_ATTEMPTS = 5
LOCKOUT_MINUTES = 15
PIN_DENYLIST = frozenset(
    {
        "0000",
        "1111",
        "2222",
        "3333",
        "4444",
        "5555",
        "6666",
        "7777",
        "8888",
        "9999",
        "1234",
        "4321",
        "1212",
        "0123",
        "9876",
        "2580",
        "1004",
        "6969",
    }
)


def _peppered(pin: str) -> str:
    # HMAC with the server-only pepper first, so a stolen DB dump can't be brute-forced offline.
    return hmac.new(get_settings().pin_pepper.encode(), pin.encode(), hashlib.sha256).hexdigest()


def hash_pin(pin: str) -> str:
    return _hasher.hash(_peppered(pin))


def verify_pin(pin: str, pin_hash: str) -> bool:
    return _hasher.verify(_peppered(pin), pin_hash)


def new_session_token() -> tuple[str, str]:
    """Returns (token for the cookie, hash for the database)."""
    token = secrets.token_urlsafe(32)
    return token, hash_token(token)


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()
