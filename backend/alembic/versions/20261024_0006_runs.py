"""runs

Revision ID: 0006
Revises: 0005
Create Date: 2026-10-24
"""

import sqlalchemy as sa

from alembic import op

revision = "0006"
down_revision = "0005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "runs",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column(
            "user_id", sa.Integer, sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False
        ),
        sa.Column("ran_on", sa.Date, nullable=False),
        sa.Column("distance_mi", sa.Numeric(5, 2), nullable=False),
        sa.Column("notes", sa.Text),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
    )
    op.create_index("ix_runs_user_id", "runs", ["user_id"])
    op.create_table(
        "run_segments",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column(
            "run_id", sa.Integer, sa.ForeignKey("runs.id", ondelete="CASCADE"), nullable=False
        ),
        sa.Column("position", sa.Integer, nullable=False),
        sa.Column("kind", sa.String(10), nullable=False),
        sa.Column("seconds", sa.Integer, nullable=False),
    )
    op.create_index("ix_run_segments_run_id", "run_segments", ["run_id"])


def downgrade() -> None:
    op.drop_table("run_segments")
    op.drop_table("runs")
