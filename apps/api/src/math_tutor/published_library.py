"""Bounded offline import and local discovery of immutable public text units."""

from __future__ import annotations

import argparse
import hashlib
from pathlib import Path
from typing import Literal

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    HttpUrl,
    JsonValue,
    ValidationError,
    model_validator,
)
from sqlalchemy import func, select
from sqlalchemy.engine import Engine
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from math_tutor.adapters.db.engine import create_default_engine
from math_tutor.adapters.db.models import PublishedText
from math_tutor.reading import ReadingLevel, ReadingPassage

DEFAULT_MANIFEST = Path(__file__).with_name("data") / "published" / "manifest.json"
MAX_FILE_BYTES = 1_048_576
MAX_IMPORT_BYTES = 128 * MAX_FILE_BYTES
TextKind = Literal["story", "poem", "essay", "chapter", "excerpt"]
LevelFilter = ReadingLevel | Literal["unrated"]


class LibraryImportError(ValueError):
    pass


class LibraryRecord(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)
    id: str = Field(pattern=r"^[a-z0-9][a-z0-9_-]{0,99}$")
    title: str = Field(min_length=1, max_length=200)
    text: str = Field(min_length=1, max_length=50000)
    author: str = Field(min_length=1, max_length=200)
    category: str = Field(min_length=1, max_length=80)
    word_count: int | None = Field(default=None, ge=1, le=50000)
    text_kind: TextKind
    reading_level: ReadingLevel | None = None
    level_basis: str | None = Field(default=None, max_length=300)
    source_url: HttpUrl
    permission: str = Field(min_length=1, max_length=500)
    excerpt: bool = False
    source_book_id: str = Field(min_length=1, max_length=100)
    source_book_title: str = Field(min_length=1, max_length=200)
    content_sha256: str = Field(pattern=r"^[a-f0-9]{64}$")

    @model_validator(mode="after")
    def validate_content(self) -> LibraryRecord:
        if self.id == "nasa_news":
            raise ValueError("The live-news identifier is reserved.")
        if any(
            not value.strip()
            for value in (
                self.title,
                self.text,
                self.author,
                self.category,
                self.permission,
                self.source_book_id,
                self.source_book_title,
            )
        ):
            raise ValueError("Library content and attribution must be nonblank.")
        if (
            self.source_url.scheme != "https"
            or self.source_url.username
            or self.source_url.password
        ):
            raise ValueError("Published source links require HTTPS without credentials.")
        if self.reading_level and not (self.level_basis or "").strip():
            raise ValueError("An approximate reading level requires its stated basis.")
        if self.level_basis is not None and not self.level_basis.strip():
            raise ValueError("A supplied reading-level basis must be nonblank.")
        if hashlib.sha256(self.text.encode()).hexdigest() != self.content_sha256:
            raise ValueError("The text does not match its content hash.")
        if self.word_count is not None and self.word_count != len(self.text.split()):
            raise ValueError("The word count does not match whitespace-delimited text words.")
        return self

    def stored_values(self) -> dict[str, str | int | bool | None]:
        values = self.model_dump(mode="json")
        values["word_count"] = len(self.text.split())
        values["search_text"] = "\n".join(
            [self.title, self.author, self.source_book_title, self.text]
        ).casefold()
        return values


class CorpusFile(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)
    path: str = Field(min_length=1, max_length=200)
    sha256: str = Field(pattern=r"^[a-f0-9]{64}$")


class CorpusManifest(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)
    schema_version: Literal[1]
    source_policy: str = Field(min_length=1, max_length=4000)
    sources: list[dict[str, JsonValue]] = Field(default_factory=list, max_length=100)
    records: list[CorpusFile] = Field(min_length=1, max_length=2000)


class LibraryImportReceipt(BaseModel):
    added: int
    unchanged: int
    total: int


class SourceChoice(BaseModel):
    id: str
    title: str
    author: str
    category: str
    word_count: int
    text_kind: TextKind
    reading_level: ReadingLevel | None = None
    level_basis: str | None = None


class LiveSourceChoice(BaseModel):
    id: Literal["nasa_news"] = "nasa_news"
    title: str = "NASA — Recent science and space news (loads from the Internet)"


class SourceCatalogPublic(BaseModel):
    items: list[SourceChoice]
    total: int
    offset: int
    limit: int
    categories: list[str]
    live_sources: list[LiveSourceChoice]


def read_corpus(manifest: Path) -> list[LibraryRecord]:
    """Read only manifest-listed local JSON files, validating everything before writes."""
    try:
        if manifest.stat().st_size > MAX_FILE_BYTES:
            raise LibraryImportError("The library manifest exceeds its size limit.")
        document = CorpusManifest.model_validate_json(manifest.read_bytes())
        root = manifest.resolve().parent
        records: list[LibraryRecord] = []
        seen_paths: set[Path] = set()
        seen_ids: set[str] = set()
        total_bytes = 0
        for entry in document.records:
            relative = Path(entry.path)
            if relative.is_absolute() or ".." in relative.parts or relative.suffix != ".json":
                raise LibraryImportError("The manifest contains an unsafe local file path.")
            path = (root / relative).resolve(strict=True)
            if not path.is_relative_to(root) or not path.is_file() or path in seen_paths:
                raise LibraryImportError(
                    "Library record paths must be unique files inside the corpus."
                )
            seen_paths.add(path)
            size = path.stat().st_size
            total_bytes += size
            if size > MAX_FILE_BYTES or total_bytes > MAX_IMPORT_BYTES:
                raise LibraryImportError("The library import exceeds its size limit.")
            raw = path.read_bytes()
            if hashlib.sha256(raw).hexdigest() != entry.sha256:
                raise LibraryImportError("A library file does not match its manifest checksum.")
            record = LibraryRecord.model_validate_json(raw)
            if record.id in seen_ids:
                raise LibraryImportError("Library record identifiers must be unique.")
            seen_ids.add(record.id)
            records.append(record)
        return records
    except OSError, ValidationError:
        raise LibraryImportError("The local library files are unavailable or invalid.") from None


def import_library(engine: Engine, manifest: Path = DEFAULT_MANIFEST) -> LibraryImportReceipt:
    records = read_corpus(manifest)
    added = 0
    unchanged = 0
    # A bounded public corpus is validated before taking this short write lock.
    # One transaction keeps an import atomic, including conflicts with saved IDs.
    with Session(engine) as db:
        db.connection(execution_options={"sqlite_begin_immediate": True})
        for record in records:
            values = record.stored_values()
            previous = db.get(PublishedText, record.id)
            if previous is not None:
                if any(getattr(previous, key) != value for key, value in values.items()):
                    raise LibraryImportError(
                        "A saved library identifier has different content or metadata. Use a new identifier."
                    )
                unchanged += 1
            else:
                db.add(PublishedText(**values))
                added += 1
        db.flush()
        total = db.scalar(select(func.count()).select_from(PublishedText)) or 0
        db.commit()
    return LibraryImportReceipt(added=added, unchanged=unchanged, total=total)


def catalog(
    db: Session,
    *,
    q: str = "",
    category: str | None = None,
    min_words: int | None = None,
    max_words: int | None = None,
    reading_level: LevelFilter | None = None,
    offset: int = 0,
    limit: int = 12,
) -> SourceCatalogPublic:
    query = select(PublishedText)
    if q.strip():
        query = query.where(
            PublishedText.search_text.contains(q.strip().casefold(), autoescape=True)
        )
    if category:
        query = query.where(PublishedText.category == category)
    if min_words is not None:
        query = query.where(PublishedText.word_count >= min_words)
    if max_words is not None:
        query = query.where(PublishedText.word_count <= max_words)
    if reading_level is not None:
        query = query.where(
            PublishedText.reading_level.is_(None)
            if reading_level == "unrated"
            else PublishedText.reading_level == reading_level
        )
    total = db.scalar(select(func.count()).select_from(query.subquery())) or 0
    selected = (
        query.with_only_columns(
            PublishedText.id,
            PublishedText.title,
            PublishedText.author,
            PublishedText.category,
            PublishedText.word_count,
            PublishedText.text_kind,
            PublishedText.reading_level,
            PublishedText.level_basis,
        )
        .order_by(PublishedText.title, PublishedText.id)
        .offset(offset)
        .limit(limit)
    )
    return SourceCatalogPublic(
        items=[SourceChoice.model_validate(dict(row)) for row in db.execute(selected).mappings()],
        total=total,
        offset=offset,
        limit=limit,
        categories=list(
            db.scalars(select(PublishedText.category).distinct().order_by(PublishedText.category))
        ),
        live_sources=[LiveSourceChoice()],
    )


def local_passage(db: Session, source_id: str) -> ReadingPassage | None:
    row = db.get(PublishedText, source_id)
    if row is None:
        return None
    if hashlib.sha256(row.text.encode()).hexdigest() != row.content_sha256:
        raise LibraryImportError("The saved published text failed its content-integrity check.")
    return ReadingPassage(
        title=row.title,
        text=row.text,
        origin="published",
        author=row.author,
        source_url=HttpUrl(row.source_url),
        permission=row.permission,
        excerpt=row.excerpt,
    )


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Import a reviewed local public-text corpus without network or inference."
    )
    parser.add_argument("action", choices=["import"])
    parser.add_argument("--manifest", type=Path, default=DEFAULT_MANIFEST)
    args = parser.parse_args()
    engine = create_default_engine()
    try:
        receipt = import_library(engine, args.manifest)
        print(receipt.model_dump_json())
        return 0
    except LibraryImportError, SQLAlchemyError:
        parser.exit(
            1,
            "Library import failed. Check the reviewed corpus files, checksums and current schema.\n",
        )
    finally:
        engine.dispose()


if __name__ == "__main__":
    raise SystemExit(main())
