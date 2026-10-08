"""Represent historical teaching observations as unknown without inventing evidence."""

from alembic import op

revision = "0019_teaching_observations"
down_revision = "0018_reading_passages"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        "UPDATE tutor_turn SET feedback = json_set(feedback, "
        "'$.teaching_action', NULL, '$.learning_observation', NULL) "
        "WHERE json_type(feedback) = 'object'"
    )


def downgrade() -> None:
    op.execute(
        "UPDATE tutor_turn SET feedback = json_remove(feedback, "
        "'$.teaching_action', '$.learning_observation', '$.evidence_link') "
        "WHERE json_type(feedback) = 'object'"
    )
