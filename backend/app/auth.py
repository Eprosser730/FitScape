"""Sign-in, sign-up, sign-out, and the current user (ADR 0004)."""

from datetime import UTC, datetime, timedelta
from typing import Annotated

from fastapi import APIRouter, Cookie, Depends, HTTPException, Response, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel, StringConstraints, field_validator
from sqlalchemy import delete, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session as DbSession

from app import security
from app.config import get_settings
from app.db import get_db
from app.models import Session, User

COOKIE_NAME = "fitscape_session"

router = APIRouter(prefix="/api")

# Any case is accepted, then lowercased, so "Ethan" and "ethan" are the same account.
Username = Annotated[
    str, StringConstraints(strip_whitespace=True, to_lower=True, pattern=r"^[A-Za-z0-9_]{3,20}$")
]
Name = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=50)]
Pin = Annotated[str, StringConstraints(pattern=r"^[0-9]{4}$")]


class LoginIn(BaseModel):
    username: Username
    pin: Pin


class SignupIn(BaseModel):
    username: Username
    first_name: Name
    last_name: Name
    pin: Pin

    @field_validator("pin")
    @classmethod
    def not_obvious(cls, pin: str) -> str:
        if pin in security.PIN_DENYLIST:
            raise ValueError("PIN is too easy to guess")
        return pin


class UserOut(BaseModel):
    username: str
    first_name: str
    last_name: str


def _error(status_code: int, code: str, **extra) -> JSONResponse:
    return JSONResponse(status_code=status_code, content={"code": code, **extra})


def _start_session(db: DbSession, user: User, response: Response) -> None:
    settings = get_settings()
    token, token_hash = security.new_session_token()
    now = datetime.now(UTC)
    expires = now + timedelta(days=settings.session_days)
    # Tidy this user's expired sessions so the table doesn't grow forever.
    db.execute(delete(Session).where(Session.user_id == user.id, Session.expires_at <= now))
    db.add(Session(token_hash=token_hash, user_id=user.id, expires_at=expires))
    # Commit now: get_db's own commit runs after the response (and its cookie) is already sent.
    db.commit()
    response.set_cookie(
        COOKIE_NAME,
        token,
        max_age=settings.session_days * 86400,
        httponly=True,
        samesite="strict",
        secure=settings.cookie_secure,
        path="/",
    )


def current_user(
    db: DbSession = Depends(get_db),
    token: Annotated[str | None, Cookie(alias=COOKIE_NAME)] = None,
) -> User:
    if token:
        user = db.scalar(
            select(User)
            .join(Session)
            .where(
                Session.token_hash == security.hash_token(token),
                Session.expires_at > datetime.now(UTC),
            )
        )
        if user:
            return user
    raise HTTPException(status.HTTP_401_UNAUTHORIZED, "not signed in")


@router.post("/auth/login", response_model=UserOut)
def login(body: LoginIn, response: Response, db: DbSession = Depends(get_db)):
    # Row lock: two simultaneous guesses can't both read the same attempt count.
    user = db.scalar(select(User).where(User.username == body.username).with_for_update())
    if user is None:
        return _error(404, "user_not_found")

    now = datetime.now(UTC)
    if user.locked_until and user.locked_until > now:
        return _error(423, "locked", locked_until=user.locked_until.isoformat())

    if not security.verify_pin(body.pin, user.pin_hash):
        user.failed_pin_attempts += 1
        if user.failed_pin_attempts >= security.MAX_PIN_ATTEMPTS:
            user.failed_pin_attempts = 0
            user.locked_until = now + timedelta(minutes=security.LOCKOUT_MINUTES)
            db.commit()  # an error response must still save the lockout
            return _error(423, "locked", locked_until=user.locked_until.isoformat())
        db.commit()
        attempts_left = security.MAX_PIN_ATTEMPTS - user.failed_pin_attempts
        return _error(401, "wrong_pin", attempts_left=attempts_left)

    user.failed_pin_attempts = 0
    user.locked_until = None
    _start_session(db, user, response)
    return user


@router.post("/auth/signup", response_model=UserOut, status_code=201)
def signup(body: SignupIn, response: Response, db: DbSession = Depends(get_db)):
    user = User(
        username=body.username,
        first_name=body.first_name,
        last_name=body.last_name,
        pin_hash=security.hash_pin(body.pin),
    )
    db.add(user)
    try:
        db.flush()
    except IntegrityError:
        db.rollback()
        return _error(409, "username_taken")
    _start_session(db, user, response)
    return user


@router.post("/auth/logout", status_code=204)
def logout(
    response: Response,
    db: DbSession = Depends(get_db),
    token: Annotated[str | None, Cookie(alias=COOKIE_NAME)] = None,
):
    if token:
        db.execute(delete(Session).where(Session.token_hash == security.hash_token(token)))
    response.delete_cookie(COOKIE_NAME, path="/")


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(current_user)):
    return user
