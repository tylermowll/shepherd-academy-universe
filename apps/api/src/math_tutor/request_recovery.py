"""Server-owned exclusion of delayed tutor commands after explicit resolution."""

from uuid import UUID

from fastapi import HTTPException
from sqlalchemy.orm import Session

from math_tutor.adapters.db.models import CancelledTutorRequest


def require_uncancelled(db: Session, learner_id: UUID, key: str) -> None:
    # Mutations hold BEGIN IMMEDIATE, so resolution and acceptance are serialized.
    if db.get(CancelledTutorRequest, (learner_id, key)) is not None:
        raise HTTPException(409, "This request was closed during recovery. Start a new request.")
