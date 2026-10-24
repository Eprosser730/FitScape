"""Personal profile and BMI."""

from decimal import Decimal
from typing import Annotated, Literal

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session as DbSession

from app.auth import current_user
from app.db import get_db
from app.models import Profile, User

router = APIRouter(prefix="/api/profile")

Gender = Literal["male", "female", "other", "prefer_not_to_say"]


class ProfileIn(BaseModel):
    gender: Gender
    age: Annotated[int, Field(ge=13, le=120)]
    height_ft: Annotated[int, Field(ge=3, le=8)]
    height_in: Annotated[int, Field(ge=0, le=11)]
    weight_lb: Annotated[Decimal, Field(ge=50, le=1000, decimal_places=1)]


class ProfileOut(ProfileIn):
    bmi: float
    bmi_category: str


def bmi(weight_lb: float, height_in: int) -> float:
    """Body-mass index from pounds and inches (the CDC imperial formula)."""
    return round(703 * weight_lb / height_in**2, 1)


def bmi_category(value: float) -> str:
    # CDC adult categories.
    if value < 18.5:
        return "Underweight"
    if value < 25:
        return "Healthy weight"
    if value < 30:
        return "Overweight"
    return "Obesity"


def _out(p: Profile) -> ProfileOut:
    value = bmi(float(p.weight_lb), p.height_in)
    return ProfileOut(
        gender=p.gender,
        age=p.age,
        height_ft=p.height_in // 12,
        height_in=p.height_in % 12,
        weight_lb=p.weight_lb,
        bmi=value,
        bmi_category=bmi_category(value),
    )


@router.get("", response_model=ProfileOut)
def get_profile(user: User = Depends(current_user), db: DbSession = Depends(get_db)):
    profile = db.get(Profile, user.id)
    if profile is None:
        return JSONResponse(status_code=404, content={"code": "no_profile"})
    return _out(profile)


@router.put("", response_model=ProfileOut)
def save_profile(
    body: ProfileIn, user: User = Depends(current_user), db: DbSession = Depends(get_db)
):
    profile = db.get(Profile, user.id) or Profile(user_id=user.id)
    profile.gender = body.gender
    profile.age = body.age
    profile.height_in = body.height_ft * 12 + body.height_in
    profile.weight_lb = body.weight_lb
    db.add(profile)
    db.flush()
    return _out(profile)
