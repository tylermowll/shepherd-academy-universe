"""Store the shared public reading library separately from learner snapshots."""

import sqlalchemy as sa
from alembic import op

from math_tutor.adapters.db.types import UTCDateTime

revision = "0021_published_library"
down_revision = "0020_request_recovery"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "published_text",
        sa.Column("id", sa.String(100), nullable=False),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column("author", sa.String(200), nullable=False),
        sa.Column("category", sa.String(80), nullable=False),
        sa.Column("word_count", sa.Integer(), nullable=False),
        sa.Column("text_kind", sa.String(16), nullable=False),
        sa.Column("reading_level", sa.String(16), nullable=True),
        sa.Column("level_basis", sa.String(300), nullable=True),
        sa.Column("source_url", sa.String(2048), nullable=False),
        sa.Column("permission", sa.Text(), nullable=False),
        sa.Column("excerpt", sa.Boolean(), nullable=False),
        sa.Column("source_book_id", sa.String(100), nullable=False),
        sa.Column("source_book_title", sa.String(200), nullable=False),
        sa.Column("content_sha256", sa.String(64), nullable=False),
        sa.Column("search_text", sa.Text(), nullable=False),
        sa.Column("imported_at", UTCDateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.CheckConstraint("length(id) BETWEEN 1 AND 100", name="ck_published_text_id"),
        sa.CheckConstraint("length(text) BETWEEN 1 AND 50000", name="ck_published_text_length"),
        sa.CheckConstraint("word_count BETWEEN 1 AND 50000", name="ck_published_text_word_count"),
        sa.CheckConstraint(
            "text_kind IN ('story', 'poem', 'essay', 'chapter', 'excerpt')",
            name="ck_published_text_kind",
        ),
        sa.CheckConstraint(
            "reading_level IS NULL OR reading_level IN "
            "('grades_k_2', 'grades_3_5', 'grades_6_8', 'grades_9_12', 'adult')",
            name="ck_published_text_reading_level",
        ),
        sa.CheckConstraint(
            "reading_level IS NULL OR (level_basis IS NOT NULL AND length(trim(level_basis)) > 0)",
            name="ck_published_text_level_basis",
        ),
        sa.CheckConstraint("length(content_sha256) = 64", name="ck_published_text_content_hash"),
    )
    op.create_index(
        "ix_published_text_category_words", "published_text", ["category", "word_count"]
    )
    op.create_index("ix_published_text_reading_level", "published_text", ["reading_level"])
    op.create_index("ix_published_text_title_id", "published_text", ["title", "id"])


def downgrade() -> None:
    op.drop_index("ix_published_text_title_id", table_name="published_text")
    op.drop_index("ix_published_text_reading_level", table_name="published_text")
    op.drop_index("ix_published_text_category_words", table_name="published_text")
    op.drop_table("published_text")
