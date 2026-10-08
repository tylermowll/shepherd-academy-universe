"""Keep immutable passage snapshots independently of generated questions."""

import sqlalchemy as sa
from alembic import op

revision = "0018_reading_passages"
down_revision = "0017_learner_accounts"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("problem_instance", sa.Column("passage", sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column("problem_instance", "passage")
