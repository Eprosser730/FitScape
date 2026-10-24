"""workouts

Revision ID: 0005
Revises: 0004
Create Date: 2026-10-24
"""

import sqlalchemy as sa

from alembic import op

revision = "0005"
down_revision = "0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "workouts",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column(
            "user_id", sa.Integer, sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False
        ),
        sa.Column(
            "template_id",
            sa.Integer,
            sa.ForeignKey("lifting_templates.id", ondelete="SET NULL"),
        ),
        sa.Column("title", sa.String(80), nullable=False),
        sa.Column("performed_on", sa.Date, nullable=False),
        sa.Column("notes", sa.Text),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
    )
    op.create_index("ix_workouts_user_id", "workouts", ["user_id"])
    op.create_table(
        "workout_exercises",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column(
            "workout_id",
            sa.Integer,
            sa.ForeignKey("workouts.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("position", sa.Integer, nullable=False),
        sa.Column("name", sa.String(80), nullable=False),
        sa.Column("mode", sa.String(10), nullable=False),
        sa.Column("rep_min", sa.Integer),
        sa.Column("rep_max", sa.Integer),
        sa.Column("target_seconds", sa.Integer),
    )
    op.create_index("ix_workout_exercises_workout_id", "workout_exercises", ["workout_id"])
    op.create_table(
        "workout_sets",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column(
            "exercise_id",
            sa.Integer,
            sa.ForeignKey("workout_exercises.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("set_number", sa.Integer, nullable=False),
        sa.Column("reps", sa.Integer),
        sa.Column("seconds", sa.Integer),
        sa.Column("weight_lb", sa.Numeric(6, 1)),
    )
    op.create_index("ix_workout_sets_exercise_id", "workout_sets", ["exercise_id"])


def downgrade() -> None:
    op.drop_table("workout_sets")
    op.drop_table("workout_exercises")
    op.drop_table("workouts")
