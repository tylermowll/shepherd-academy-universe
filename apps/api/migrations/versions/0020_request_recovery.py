"""Make explicit lost-acknowledgement recovery exclude delayed acceptance."""

import sqlalchemy as sa
from alembic import op

from math_tutor.adapters.db.types import UTCDateTime, UUIDType

revision = "0020_request_recovery"
down_revision = "0019_teaching_observations"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "cancelled_tutor_request",
        sa.Column("learner_id", UUIDType(), nullable=False),
        sa.Column("request_key", sa.String(128), nullable=False),
        sa.Column("created_at", UTCDateTime(), nullable=False),
        sa.ForeignKeyConstraint(["learner_id"], ["learner.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("learner_id", "request_key"),
    )


def downgrade() -> None:
    op.drop_table("cancelled_tutor_request")
