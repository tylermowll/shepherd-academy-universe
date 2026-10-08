"""Explicit source loading, separate from model inference and private work."""

from uuid import UUID

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, ConfigDict

from math_tutor.api.access import Database, Principal, owned_learner, principal
from math_tutor.reading_sources import (
    SOURCES,
    ImportedPassage,
    SourceChoice,
    SourceError,
    SourceId,
    import_source,
    sign_source,
)

router = APIRouter(prefix="/api/v1/reading", tags=["reading"])


class SourceImportInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    learner_id: UUID
    source_id: SourceId


class SourceImportPublic(BaseModel):
    passages: list[ImportedPassage]


@router.get("/sources", response_model=list[SourceChoice])
def sources(actor: Principal) -> list[SourceChoice]:
    return [
        SourceChoice.model_validate({"id": key, "title": title}) for key, title in SOURCES.items()
    ]


@router.post("/import", response_model=SourceImportPublic)
def load_source(
    body: SourceImportInput, request: Request, db: Database, actor: Principal
) -> SourceImportPublic:
    from math_tutor.api.tutoring import private_tutoring

    private_tutoring()
    owned_learner(db, actor, body.learner_id)
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
    current = principal(request, db)
    owned_learner(db, current, body.learner_id)
    return SourceImportPublic(
        passages=[sign_source(passage, body.learner_id) for passage in passages]
    )
