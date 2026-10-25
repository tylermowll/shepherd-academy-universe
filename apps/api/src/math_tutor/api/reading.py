"""Explicit source loading, separate from model inference and private work."""

from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, Request
from pydantic import BaseModel, ConfigDict, Field

from math_tutor.api.access import Database, Principal, owned_learner, principal
from math_tutor.published_library import (
    LevelFilter,
    LibraryImportError,
    SourceCatalogPublic,
    catalog,
    local_passage,
)
from math_tutor.reading_sources import (
    ImportedPassage,
    SourceError,
    import_source,
    sign_source,
)

router = APIRouter(prefix="/api/v1/reading", tags=["reading"])


class SourceImportInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    learner_id: UUID
    source_id: str = Field(min_length=1, max_length=100, pattern=r"^[a-z0-9][a-z0-9_-]*$")


class SourceImportPublic(BaseModel):
    passages: list[ImportedPassage]


@router.get("/sources", response_model=SourceCatalogPublic)
def sources(
    db: Database,
    actor: Principal,
    q: str = Query(default="", max_length=120),
    category: str | None = Query(default=None, max_length=80),
    min_words: int | None = Query(default=None, ge=0, le=50000),
    max_words: int | None = Query(default=None, ge=0, le=50000),
    reading_level: LevelFilter | None = None,
    offset: int = Query(default=0, ge=0, le=2_147_483_647),
    limit: int = Query(default=12, ge=1, le=50),
) -> SourceCatalogPublic:
    if min_words is not None and max_words is not None and min_words > max_words:
        raise HTTPException(422, "Minimum words must not exceed maximum words.")
    return catalog(
        db,
        q=q,
        category=category,
        min_words=min_words,
        max_words=max_words,
        reading_level=reading_level,
        offset=offset,
        limit=limit,
    )


@router.post("/import", response_model=SourceImportPublic)
def load_source(
    body: SourceImportInput, request: Request, db: Database, actor: Principal
) -> SourceImportPublic:
    from math_tutor.api.tutoring import private_tutoring

    private_tutoring()
    owned_learner(db, actor, body.learner_id)
    if body.source_id != "nasa_news":
        try:
            passage = local_passage(db, body.source_id)
        except LibraryImportError:
            raise HTTPException(
                503, "This saved published text is unavailable. Choose another text."
            ) from None
        if passage is None:
            raise HTTPException(404, "This published text is not in the local library.")
        return SourceImportPublic(passages=[sign_source(passage, body.learner_id)])
    # Release the write transaction before network I/O. Revalidate sign-in and
    # ownership afterwards so revocation/deletion during a fetch cannot issue a token.
    db.commit()
    try:
        passages = import_source(body.source_id)
    except SourceError:
        raise HTTPException(
            502,
            "The published source could not be loaded. Try again or paste a passage you have permission to use.",
        ) from None
    # Dependency sessions retain objects across commit. Refresh the original
    # principal before rechecking a revocation made while fetching the source.
    db.expire_all()
    current = principal(request, db)
    owned_learner(db, current, body.learner_id)
    return SourceImportPublic(
        passages=[sign_source(passage, body.learner_id) for passage in passages]
    )
