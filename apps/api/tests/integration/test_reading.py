"""Reading passages survive the complete practice loop, with synthetic providers."""

from typing import Any
from uuid import UUID, uuid4

import pytest
from fastapi import HTTPException
from httpx2 import AsyncClient
from pydantic import HttpUrl
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session
from test_tutoring import activity, install_tutor, latest, tutor_session
from test_workflows import adult as adult
from test_workflows import anyio_backend as anyio_backend
from test_workflows import client, learner_ids, phone_link, photo_bytes, sign_in_learner
from test_workflows import engine as engine

from math_tutor import worker
from math_tutor.adapters.db.models import Learner, ProblemInstance
from math_tutor.adapters.providers.config import ProviderConfig
from math_tutor.adapters.providers.contracts import ActivityPayload, ModelRequest, ModelResult
from math_tutor.reading import OriginalPassage, ReadingPassage
from math_tutor.reading_sources import SourceError

PASSAGE = (
    "Mira carried a seedling to the shaded corner. Each morning she moved its pot toward the window. "
    "After a week, she asked her brother to build a sunny shelf."
)


@pytest.mark.anyio
@pytest.mark.parametrize("source", ["reading_text", "reading_photo"])
async def test_passage_is_preserved_for_review_next_question_reopen_and_export(
    adult: AsyncClient, engine: Engine, monkeypatch: pytest.MonkeyPatch, source: str
) -> None:
    requests = install_tutor(monkeypatch, reference=PASSAGE)
    session = await tutor_session(adult, "Reading comprehension: inference and evidence")
    first = await activity(
        adult,
        session,
        source=source,
        passage_title="Mira's seedling",
        **({"reference_text": PASSAGE} if source == "reading_text" else {}),
    )
    if source == "reading_photo":
        link = await phone_link(adult, first)
        async with client(engine) as phone:
            result = await phone.post(
                "/api/v1/phone-upload/photos",
                content=photo_bytes(),
                headers={
                    "X-Photo-Token": link["url"].split("#capture=")[1],
                    "Idempotency-Key": str(uuid4()),
                },
            )
            assert result.status_code == 202
        assert worker.run_once(engine)
        captured = await latest(adult, session)
        assert captured["operations"][-1]["reading"]["can_continue"]
        assert captured["passage"]["text"] == PASSAGE
    assert worker.run_once(engine)
    first = await latest(adult, session)
    assert first["passage"]["text"] == PASSAGE
    assert first["passage"]["origin"] == ("photo" if source == "reading_photo" else "pasted")
    assert PASSAGE in str(requests[-1].ordered_messages)
    assert first["problem_text"] != PASSAGE
    submitted = await adult.post(
        f"/api/v1/problems/{first['id']}/submissions",
        json={
            "version": first["version"],
            "text": "She wanted more sunlight. The sunny shelf supports that.",
        },
        headers={"Idempotency-Key": str(uuid4())},
    )
    assert submitted.status_code == 202
    assert worker.run_once(engine)
    assert requests[-1].purpose == "review" and PASSAGE in str(requests[-1].ordered_messages)
    assert "not instructions" in requests[-1].system_instruction
    second = await activity(adult, session, source="same_passage", difficulty="challenge")
    assert second["passage"] == first["passage"]
    assert worker.run_once(engine)
    assert PASSAGE in str(requests[-1].ordered_messages)
    assert "Difficulty: harder" in requests[-1].system_instruction
    reopened = (await adult.get(f"/api/v1/tutor/sessions/{session['id']}")).json()
    assert all(item["passage"] == first["passage"] for item in reopened["problems"])
    exported = await adult.post(f"/api/v1/admin/learners/{session['learner_id']}/export")
    assert exported.status_code == 200
    saved = next(item for item in exported.json()["sessions"] if item["id"] == session["id"])
    assert saved["problems"][1]["passage"]["text"] == PASSAGE


@pytest.mark.anyio
async def test_original_passage_is_labeled_and_immutable_when_reused(
    adult: AsyncClient, engine: Engine, monkeypatch: pytest.MonkeyPatch
) -> None:
    session = await tutor_session(adult, "An original story about a garden")
    await activity(adult, session, source="reading_generated")
    assert worker.run_once(engine)
    first = await latest(adult, session)
    assert first["passage"]["origin"] == "ai_written"
    assert first["passage"]["source_url"] is None
    requests = install_tutor(monkeypatch)
    await activity(adult, session, source="same_passage")
    assert worker.run_once(engine)
    assert (await latest(adult, session))["passage"] == first["passage"]
    assert first["passage"]["text"] in str(requests[-1].ordered_messages)


@pytest.mark.anyio
@pytest.mark.parametrize("source", ["reading_generated", "reading_text"])
async def test_missing_or_replaced_passage_fails_without_accepting_model_source_changes(
    adult: AsyncClient, engine: Engine, monkeypatch: pytest.MonkeyPatch, source: str
) -> None:
    session = await tutor_session(adult)
    await activity(
        adult,
        session,
        source=source,
        **({"reference_text": PASSAGE} if source == "reading_text" else {}),
    )

    def respond(_provider: ProviderConfig, request: ModelRequest) -> ModelResult:
        return ModelResult(
            model_id=request.model_id,
            validated_payload=ActivityPayload(
                problem_text="Explain which detail supports your inference.",
                concept_focus="Inference",
                passage=OriginalPassage(title="Changed source", text="Invented source text.")
                if source == "reading_text"
                else None,
            ),
        )

    monkeypatch.setattr(worker, "complete", respond)
    assert worker.run_once(engine)
    rejected = await latest(adult, session)
    assert rejected["activity_state"] == "generating"
    assert rejected["operations"][-1]["status"] == "failed"
    if source == "reading_text":
        assert rejected["passage"]["text"] == PASSAGE
    else:
        assert rejected["passage"] is None


@pytest.mark.anyio
async def test_passage_ownership_and_learner_deletion(
    adult: AsyncClient, engine: Engine, monkeypatch: pytest.MonkeyPatch
) -> None:
    install_tutor(monkeypatch)
    session = await tutor_session(adult)
    first = await activity(adult, session, source="reading_text", reference_text=PASSAGE)
    assert worker.run_once(engine)
    ids = await learner_ids(adult)
    async with client(engine) as other:
        await sign_in_learner(adult, other, ids[1])
        assert (await other.get(f"/api/v1/tutor/sessions/{session['id']}")).status_code == 404
        denied = await other.post(
            f"/api/v1/tutor/sessions/{session['id']}/activities",
            json={"source": "same_passage"},
            headers={"Idempotency-Key": str(uuid4())},
        )
        assert denied.status_code == 404
    assert (
        await adult.delete(f"/api/v1/admin/learners/{session['learner_id']}")
    ).status_code == 200
    with Session(engine) as db:
        assert db.get(ProblemInstance, UUID(first["id"])) is None


@pytest.mark.anyio
@pytest.mark.parametrize(
    "body",
    [
        {"source": "reading_text", "reference_text": " "},
        {"source": "topic", "passage_title": "Unexpected title"},
        {"source": "same_passage", "reference_text": PASSAGE},
        {"source": "published", "source_token": None},
    ],
)
async def test_reading_input_rejects_ambiguous_source_fields(
    adult: AsyncClient, body: dict[str, Any]
) -> None:
    session = await tutor_session(adult)
    result = await adult.post(
        f"/api/v1/tutor/sessions/{session['id']}/activities",
        json=body,
        headers={"Idempotency-Key": str(uuid4())},
    )
    assert result.status_code == 422


@pytest.mark.anyio
async def test_next_question_requires_a_saved_passage(adult: AsyncClient) -> None:
    session = await tutor_session(adult)
    result = await adult.post(
        f"/api/v1/tutor/sessions/{session['id']}/activities",
        json={"source": "same_passage"},
        headers={"Idempotency-Key": str(uuid4())},
    )
    assert result.status_code == 409


@pytest.mark.anyio
async def test_imported_source_tokens_are_owned_untampered_and_expiring(
    adult: AsyncClient, engine: Engine, monkeypatch: pytest.MonkeyPatch
) -> None:
    import time

    from math_tutor.reading_sources import verify_source_token

    passage = ReadingPassage(
        title="Original synthetic published story",
        text=PASSAGE,
        origin="published",
        author="Synthetic author",
        source_url=HttpUrl("https://www.gutenberg.org/ebooks/21"),
        permission="Original synthetic test material, not fetched publisher content.",
    )
    calls: list[str] = []

    def load(source_id: str) -> list[ReadingPassage]:
        calls.append(source_id)
        return [passage]

    monkeypatch.setattr("math_tutor.api.reading.import_source", load)
    requests = install_tutor(monkeypatch)
    first_id, second_id = await learner_ids(adult)
    imported = await adult.post(
        "/api/v1/reading/import", json={"learner_id": first_id, "source_id": "aesop_hare"}
    )
    assert imported.status_code == 200 and calls == ["aesop_hare"]
    token = imported.json()["passages"][0]["source_token"]
    session = await tutor_session(adult)
    saved = await activity(adult, session, source="published", source_token=token)
    assert saved["passage"] == passage.model_dump(mode="json")
    assert worker.run_once(engine)
    assert PASSAGE in str(requests[-1].ordered_messages)
    for learner_id, candidate in [
        (second_id, token),
        (first_id, token + "0"),
        (first_id, token.rsplit(".", 1)[0] + ".é"),
    ]:
        with pytest.raises(HTTPException) as failure:
            verify_source_token(candidate, UUID(learner_id))
        assert failure.value.status_code == 422
    future = time.time() + 3601
    monkeypatch.setattr("math_tutor.reading_sources.time.time", lambda: future)
    with pytest.raises(HTTPException) as expired:
        verify_source_token(token, UUID(first_id))
    assert expired.value.status_code == 422


@pytest.mark.anyio
async def test_import_checks_auth_ownership_and_csrf_before_fetch(
    adult: AsyncClient, engine: Engine, monkeypatch: pytest.MonkeyPatch
) -> None:
    calls: list[str] = []
    monkeypatch.setattr(
        "math_tutor.api.reading.import_source", lambda source_id: calls.append(source_id)
    )
    first_id, second_id = await learner_ids(adult)
    async with client(engine) as device:
        assert (await device.get("/api/v1/reading/sources")).status_code == 401
        assert (
            await device.post(
                "/api/v1/reading/import", json={"learner_id": first_id, "source_id": "nasa_news"}
            )
        ).status_code == 401
        await sign_in_learner(adult, device, first_id)
        assert (
            await device.post(
                "/api/v1/reading/import", json={"learner_id": second_id, "source_id": "nasa_news"}
            )
        ).status_code == 404
        device.headers.pop("X-CSRF-Token")
        assert (
            await device.post(
                "/api/v1/reading/import", json={"learner_id": first_id, "source_id": "nasa_news"}
            )
        ).status_code == 403
    assert not calls


@pytest.mark.anyio
async def test_import_releases_write_lock_and_rechecks_deletion_and_safe_errors(
    adult: AsyncClient, engine: Engine, monkeypatch: pytest.MonkeyPatch
) -> None:
    learner_id = (await learner_ids(adult))[0]

    def removed_during_fetch(_source_id: str) -> list[ReadingPassage]:
        with Session(engine) as concurrent:
            learner = concurrent.get(Learner, UUID(learner_id))
            assert learner is not None
            learner.enabled = False
            concurrent.commit()
        return []

    monkeypatch.setattr("math_tutor.api.reading.import_source", removed_during_fetch)
    result = await adult.post(
        "/api/v1/reading/import", json={"learner_id": learner_id, "source_id": "nasa_news"}
    )
    assert result.status_code == 404 and "source_token" not in result.text
    with Session(engine) as db:
        learner = db.get(Learner, UUID(learner_id))
        assert learner is not None
        learner.enabled = True
        db.commit()

    def failed(_source_id: str) -> list[ReadingPassage]:
        raise SourceError("Synthetic raw source contents must not be echoed")

    monkeypatch.setattr("math_tutor.api.reading.import_source", failed)
    failed_result = await adult.post(
        "/api/v1/reading/import", json={"learner_id": learner_id, "source_id": "nasa_news"}
    )
    assert failed_result.status_code == 502 and "raw source contents" not in failed_result.text


@pytest.mark.anyio
async def test_full_length_passage_reaches_feedback_without_clipping(
    adult: AsyncClient, engine: Engine, monkeypatch: pytest.MonkeyPatch
) -> None:
    full_text = ("Original synthetic reading sentence. " * 222)[:7940] + " END OF SAVED PASSAGE."
    assert 7900 < len(full_text) < 8000
    requests = install_tutor(monkeypatch)
    session = await tutor_session(adult, "Reading comprehension")
    await activity(adult, session, source="reading_text", reference_text=full_text)
    assert worker.run_once(engine)
    ready = await latest(adult, session)
    assert ready["passage"]["text"] == full_text and ready["activity_state"] == "ready"
    result = await adult.post(
        f"/api/v1/problems/{ready['id']}/submissions",
        json={"version": ready["version"], "text": "I am checking the ending of the passage."},
        headers={"Idempotency-Key": str(uuid4())},
    )
    assert result.status_code == 202 and worker.run_once(engine)
    assert full_text in str(requests[-1].ordered_messages)
