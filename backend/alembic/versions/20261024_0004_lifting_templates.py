"""lifting templates

Revision ID: 0004
Revises: 0003
Create Date: 2026-10-24
"""

import sqlalchemy as sa

from alembic import op

revision = "0004"
down_revision = "0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "lifting_templates",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column(
            "user_id", sa.Integer, sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False
        ),
        sa.Column("title", sa.String(80), nullable=False),
        sa.Column("weekdays", sa.ARRAY(sa.SmallInteger), nullable=False),
        sa.Column("enabled", sa.Boolean, nullable=False, server_default=sa.true()),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
    )
    op.create_index("ix_lifting_templates_user_id", "lifting_templates", ["user_id"])
    op.create_table(
        "template_exercises",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column(
            "template_id",
            sa.Integer,
            sa.ForeignKey("lifting_templates.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("position", sa.Integer, nullable=False),
        sa.Column("name", sa.String(80), nullable=False),
        sa.Column("sets", sa.Integer, nullable=False),
        sa.Column("mode", sa.String(10), nullable=False),
        sa.Column("rep_min", sa.Integer),
        sa.Column("rep_max", sa.Integer),
        sa.Column("seconds", sa.Integer),
    )
    op.create_index("ix_template_exercises_template_id", "template_exercises", ["template_id"])


def downgrade() -> None:
    op.drop_table("template_exercises")
    op.drop_table("lifting_templates")
