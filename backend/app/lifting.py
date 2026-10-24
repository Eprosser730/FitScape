"""Lifting: workout templates (and, next, logged workouts)."""

from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel, Field, StringConstraints, field_validator, model_validator
from sqlalchemy import select
from sqlalchemy.orm import Session as DbSession
from sqlalchemy.orm import selectinload

from app.auth import current_user
from app.db import get_db
from app.models import LiftingTemplate, TemplateExercise, User

router = APIRouter(prefix="/api/lifting")

Name = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=80)]


class ExerciseIn(BaseModel):
    name: Name
    sets: Annotated[int, Field(ge=1, le=20)]
    mode: Literal["reps", "seconds"]
    rep_min: Annotated[int, Field(ge=1, le=100)] | None = None
    rep_max: Annotated[int, Field(ge=1, le=100)] | None = None
    seconds: Annotated[int, Field(ge=1, le=3600)] | None = None

    @model_validator(mode="after")
    def target_matches_mode(self) -> "ExerciseIn":
        # Rep exercises need a range; static holds need a time. Clear whichever does not apply.
        if self.mode == "reps":
            if self.rep_min is None or self.rep_max is None:
                raise ValueError("rep exercises need rep_min and rep_max")
            if self.rep_min > self.rep_max:
                raise ValueError("rep_min cannot be more than rep_max")
            self.seconds = None
        else:
            if self.seconds is None:
                raise ValueError("static exercises need seconds")
            self.rep_min = self.rep_max = None
        return self


class TemplateIn(BaseModel):
    title: Name
    weekdays: Annotated[list[Annotated[int, Field(ge=0, le=6)]], Field(min_length=1, max_length=7)]
    enabled: bool = True
    exercises: Annotated[list[ExerciseIn], Field(min_length=1, max_length=30)]

    @field_validator("weekdays")
    @classmethod
    def unique_sorted(cls, days: list[int]) -> list[int]:
        return sorted(set(days))


class TemplateOut(TemplateIn):
    id: int


class EnabledIn(BaseModel):
    enabled: bool


def _owned_template(db: DbSession, template_id: int, user: User) -> LiftingTemplate:
    template = db.get(LiftingTemplate, template_id)
    # Another user's template looks exactly like a missing one.
    if template is None or template.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "template not found")
    return template


def _exercises(body: TemplateIn) -> list[TemplateExercise]:
    return [TemplateExercise(position=i, **e.model_dump()) for i, e in enumerate(body.exercises)]


@router.get("/templates", response_model=list[TemplateOut])
def list_templates(user: User = Depends(current_user), db: DbSession = Depends(get_db)):
    return db.scalars(
        select(LiftingTemplate)
        .where(LiftingTemplate.user_id == user.id)
        .options(selectinload(LiftingTemplate.exercises))
        .order_by(LiftingTemplate.title, LiftingTemplate.id)
    ).all()


@router.post("/templates", response_model=TemplateOut, status_code=201)
def create_template(
    body: TemplateIn, user: User = Depends(current_user), db: DbSession = Depends(get_db)
):
    template = LiftingTemplate(
        user_id=user.id,
        title=body.title,
        weekdays=body.weekdays,
        enabled=body.enabled,
        exercises=_exercises(body),
    )
    db.add(template)
    db.flush()
    return template


@router.put("/templates/{template_id}", response_model=TemplateOut)
def replace_template(
    template_id: int,
    body: TemplateIn,
    user: User = Depends(current_user),
    db: DbSession = Depends(get_db),
):
    template = _owned_template(db, template_id, user)
    template.title = body.title
    template.weekdays = body.weekdays
    template.enabled = body.enabled
    template.exercises = _exercises(body)  # delete-orphan swaps the old rows out
    db.flush()
    return template


@router.patch("/templates/{template_id}", response_model=TemplateOut)
def set_enabled(
    template_id: int,
    body: EnabledIn,
    user: User = Depends(current_user),
    db: DbSession = Depends(get_db),
):
    template = _owned_template(db, template_id, user)
    template.enabled = body.enabled
    db.flush()
    return template


@router.delete("/templates/{template_id}", status_code=204)
def remove_template(
    template_id: int, user: User = Depends(current_user), db: DbSession = Depends(get_db)
):
    db.delete(_owned_template(db, template_id, user))
    return Response(status_code=204)
