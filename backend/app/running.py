"""Running log: total distance per run, optional run/walk intervals, and notes."""

from datetime import date
from decimal import Decimal
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel, Field, StringConstraints, field_validator
from sqlalchemy import select
from sqlalchemy.orm import Session as DbSession
from sqlalchemy.orm import selectinload

from app.auth import current_user
from app.db import get_db
from app.models import Run, RunSegment, User

router = APIRouter(prefix="/api/running/runs")

# Shortcut: the newest 500 runs only (weekly totals and the archive use them); page when needed.
MAX_RUNS = 500


class SegmentIn(BaseModel):
    kind: Literal["run", "walk"]
    seconds: Annotated[int, Field(ge=1, le=36_000)]


class RunIn(BaseModel):
    ran_on: date
    distance_mi: Annotated[Decimal, Field(gt=0, le=200, decimal_places=2)]
    notes: Annotated[str, StringConstraints(strip_whitespace=True, max_length=2000)] | None = None
    segments: Annotated[list[SegmentIn], Field(max_length=50)] = []

    @field_validator("distance_mi")
    @classmethod
    def two_decimals(cls, d: Decimal) -> Decimal:
        # Echo 3 as 3.00, the same as the database column returns it.
        return d.quantize(Decimal("0.01"))


class RunOut(RunIn):
    id: int


@router.get("", response_model=list[RunOut])
def list_runs(user: User = Depends(current_user), db: DbSession = Depends(get_db)):
    return db.scalars(
        select(Run)
        .where(Run.user_id == user.id)
        .options(selectinload(Run.segments))
        .order_by(Run.ran_on.desc(), Run.id.desc())
        .limit(MAX_RUNS)
    ).all()


@router.post("", response_model=RunOut, status_code=201)
def log_run(body: RunIn, user: User = Depends(current_user), db: DbSession = Depends(get_db)):
    run = Run(
        user_id=user.id,
        ran_on=body.ran_on,
        distance_mi=body.distance_mi,
        notes=body.notes or None,
        segments=[RunSegment(position=i, **s.model_dump()) for i, s in enumerate(body.segments)],
    )
    db.add(run)
    db.flush()
    return run


@router.delete("/{run_id}", status_code=204)
def remove_run(run_id: int, user: User = Depends(current_user), db: DbSession = Depends(get_db)):
    run = db.get(Run, run_id)
    # Someone else's run looks exactly like a missing one.
    if run is None or run.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "run not found")
    db.delete(run)
    return Response(status_code=204)
