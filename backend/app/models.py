"""Database tables. Every change here needs an Alembic migration (alembic/versions)."""

from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import ARRAY, DateTime, ForeignKey, Numeric, SmallInteger, String, Text, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(String(20), unique=True)  # always lowercase
    first_name: Mapped[str] = mapped_column(String(50))
    last_name: Mapped[str] = mapped_column(String(50))
    pin_hash: Mapped[str] = mapped_column(String(255))
    failed_pin_attempts: Mapped[int] = mapped_column(default=0, server_default="0")
    locked_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class Session(Base):
    __tablename__ = "sessions"

    id: Mapped[int] = mapped_column(primary_key=True)
    # SHA-256 of the cookie token; the token itself is never stored.
    token_hash: Mapped[str] = mapped_column(String(64), unique=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class Profile(Base):
    """Personal details used for BMI (and, later, skill maths). One row per user."""

    __tablename__ = "profiles"

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    gender: Mapped[str] = mapped_column(String(20))
    age: Mapped[int]
    height_in: Mapped[int]  # total inches; the API speaks feet + inches
    weight_lb: Mapped[Decimal] = mapped_column(Numeric(5, 1))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class PrayerNote(Base):
    """One Prayer and Bible journal entry: what was read and a summary of it."""

    __tablename__ = "prayer_notes"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    read_on: Mapped[date]
    passage: Mapped[str] = mapped_column(String(120))
    summary: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class LiftingTemplate(Base):
    """A reusable training plan: which exercises, how many sets, and on which weekdays."""

    __tablename__ = "lifting_templates"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(80))
    weekdays: Mapped[list[int]] = mapped_column(ARRAY(SmallInteger))  # 0 = Monday ... 6 = Sunday
    enabled: Mapped[bool] = mapped_column(default=True, server_default="true")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    exercises: Mapped[list["TemplateExercise"]] = relationship(
        order_by="TemplateExercise.position", cascade="all, delete-orphan"
    )


class TemplateExercise(Base):
    """One exercise in a template: sets of a rep range, or sets of a timed (static) hold."""

    __tablename__ = "template_exercises"

    id: Mapped[int] = mapped_column(primary_key=True)
    template_id: Mapped[int] = mapped_column(
        ForeignKey("lifting_templates.id", ondelete="CASCADE"), index=True
    )
    position: Mapped[int]
    name: Mapped[str] = mapped_column(String(80))
    sets: Mapped[int]
    mode: Mapped[str] = mapped_column(String(10))  # "reps" or "seconds"
    rep_min: Mapped[int | None]
    rep_max: Mapped[int | None]
    seconds: Mapped[int | None]


class Run(Base):
    """One logged run: the total distance, plus optional run/walk intervals in order."""

    __tablename__ = "runs"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    ran_on: Mapped[date]
    distance_mi: Mapped[Decimal] = mapped_column(Numeric(5, 2))
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    segments: Mapped[list["RunSegment"]] = relationship(
        order_by="RunSegment.position", cascade="all, delete-orphan"
    )


class RunSegment(Base):
    __tablename__ = "run_segments"

    id: Mapped[int] = mapped_column(primary_key=True)
    run_id: Mapped[int] = mapped_column(ForeignKey("runs.id", ondelete="CASCADE"), index=True)
    position: Mapped[int]
    kind: Mapped[str] = mapped_column(String(10))  # "run" or "walk"
    seconds: Mapped[int]


class Workout(Base):
    """One logged training session. Copies names and targets so template edits never rewrite it."""

    __tablename__ = "workouts"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    template_id: Mapped[int | None] = mapped_column(
        ForeignKey("lifting_templates.id", ondelete="SET NULL")
    )
    title: Mapped[str] = mapped_column(String(80))
    performed_on: Mapped[date]
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    exercises: Mapped[list["WorkoutExercise"]] = relationship(
        order_by="WorkoutExercise.position", cascade="all, delete-orphan"
    )


class WorkoutExercise(Base):
    __tablename__ = "workout_exercises"

    id: Mapped[int] = mapped_column(primary_key=True)
    workout_id: Mapped[int] = mapped_column(
        ForeignKey("workouts.id", ondelete="CASCADE"), index=True
    )
    position: Mapped[int]
    name: Mapped[str] = mapped_column(String(80))
    mode: Mapped[str] = mapped_column(String(10))  # "reps" or "seconds"
    rep_min: Mapped[int | None]
    rep_max: Mapped[int | None]
    target_seconds: Mapped[int | None]
    sets: Mapped[list["WorkoutSet"]] = relationship(
        order_by="WorkoutSet.set_number", cascade="all, delete-orphan"
    )


class WorkoutSet(Base):
    """What was actually done: reps and weight, or seconds held (optionally weighted)."""

    __tablename__ = "workout_sets"

    id: Mapped[int] = mapped_column(primary_key=True)
    exercise_id: Mapped[int] = mapped_column(
        ForeignKey("workout_exercises.id", ondelete="CASCADE"), index=True
    )
    set_number: Mapped[int]
    reps: Mapped[int | None]
    seconds: Mapped[int | None]
    weight_lb: Mapped[Decimal | None] = mapped_column(Numeric(6, 1))
