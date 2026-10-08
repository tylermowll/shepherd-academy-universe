"""Reading passages survive the complete practice loop, with synthetic providers."""

import json
from collections.abc import AsyncIterator
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
from math_tutor.adapters.db.models import Learner, PracticeSession, ProblemInstance
from math_tutor.adapters.providers.config import ProviderConfig
from math_tutor.adapters.providers.contracts import ActivityPayload, ModelRequest, ModelResult
from math_tutor.api.practice import digest
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
                success_criteria=["Support the inference with one relevant detail."],
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
        {"source": "topic", "reading_mode": "guided"},
        {"source": "reference_text", "reference_text": PASSAGE, "section_size": "short"},
        {"source": "reading_text", "reference_text": PASSAGE, "section_index": 1},
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
    await activity(
        adult, session, source="reading_text", reference_text=full_text, reading_mode="whole"
    )
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


@pytest.mark.anyio
async def test_long_material_guided_navigation_is_saved_idempotent_and_difficulty_independent(
    adult: AsyncClient, engine: Engine, monkeypatch: pytest.MonkeyPatch
) -> None:
    paragraphs = [
        f"SOURCE_SECTION_{i}: " + ("synthetic observation " * 50) + "\n\n" for i in range(12)
    ]
    full_text = "".join(paragraphs)
    assert 8000 < len(full_text) < 50000
    requests = install_tutor(monkeypatch)
    session = await tutor_session(adult, "Science: explain the field observations")
    first = await activity(adult, session, source="reading_text", reference_text=full_text)
    assert first["material_focus"]["mode"] == "guided"
    assert first["material_focus"]["section_index"] == 0
    assert first["material_focus"]["text"] == paragraphs[0]
    assert first["material_focus"]["section_count"] == 12
    assert worker.run_once(engine)
    assert "SOURCE_SECTION_0" in str(requests[-1].ordered_messages)
    assert "SOURCE_SECTION_1" not in str(requests[-1].ordered_messages)
    first = await latest(adult, session)
    assert first["learning_goal"] == first["concept_focus"]
    assert first["success_criteria"]

    route = f"/api/v1/tutor/sessions/{session['id']}/activities"
    key = str(uuid4())
    body = {"source": "same_passage", "section_index": 3, "difficulty": "challenge"}
    moved = await adult.post(route, json=body, headers={"Idempotency-Key": key})
    repeated = await adult.post(route, json=body, headers={"Idempotency-Key": key})
    assert moved.status_code == repeated.status_code == 201
    assert moved.json()["id"] == repeated.json()["id"]
    focus = moved.json()["material_focus"]
    assert focus["section_index"] == 3 and focus["text"] == paragraphs[3]
    assert full_text[focus["start"] : focus["end"]] == focus["text"]
    assert worker.run_once(engine)
    assert "Difficulty: harder" in requests[-1].system_instruction
    assert "SOURCE_SECTION_3" in str(requests[-1].ordered_messages)
    assert "SOURCE_SECTION_4" not in str(requests[-1].ordered_messages)

    # Retrying a different question/difficulty stays on this selected source section.
    same = await activity(adult, session, source="same_passage", difficulty="introductory")
    assert same["material_focus"] == focus
    assert worker.run_once(engine)
    invalid = await adult.post(
        route,
        json={"source": "same_passage", "section_index": 999},
        headers={"Idempotency-Key": str(uuid4())},
    )
    assert invalid.status_code == 422 and "available section" in invalid.text
    unchanged = await latest(adult, session)
    assert unchanged["id"] == same["id"] and unchanged["status"] == "assigned"
    reopened = (await adult.get(f"/api/v1/tutor/sessions/{session['id']}")).json()
    assert len(reopened["problems"]) == 3
    assert reopened["problems"][-1]["passage"]["text"] == full_text
    assert reopened["problems"][-1]["material_focus"] == focus
    exported = (await adult.post(f"/api/v1/admin/learners/{session['learner_id']}/export")).json()
    saved = next(item for item in exported["sessions"] if item["id"] == session["id"])
    assert saved["problems"][-1]["material_focus"] == focus
    assert saved["problems"][-1]["passage"]["text"] == full_text


@pytest.mark.anyio
async def test_returning_to_earlier_section_excludes_future_and_other_source_discussion(
    adult: AsyncClient, engine: Engine, monkeypatch: pytest.MonkeyPatch
) -> None:
    requests = install_tutor(monkeypatch)
    session = await tutor_session(adult, "Study a historical account")
    await activity(adult, session, source="reading_text", reference_text="UNRELATED_SOURCE_SECRET")
    assert worker.run_once(engine)
    previous = await latest(adult, session)
    submitted = await adult.post(
        f"/api/v1/problems/{previous['id']}/submissions",
        json={"version": previous["version"], "text": "UNRELATED_DISCUSSION_SECRET"},
        headers={"Idempotency-Key": str(uuid4())},
    )
    assert submitted.status_code == 202 and worker.run_once(engine)

    material = "\n\n".join(f"SECTION_{i} " + "historical evidence " * 65 for i in range(6))
    await activity(adult, session, source="reading_text", reference_text=material)
    assert worker.run_once(engine)
    assert "UNRELATED_SOURCE_SECRET" not in str(requests[-1].ordered_messages)
    assert "UNRELATED_DISCUSSION_SECRET" not in str(requests[-1].ordered_messages)
    await activity(adult, session, source="same_passage", section_index=4)
    assert worker.run_once(engine)
    future = await latest(adult, session)
    submitted = await adult.post(
        f"/api/v1/problems/{future['id']}/submissions",
        json={"version": future["version"], "text": "FUTURE_DISCUSSION_SECRET"},
        headers={"Idempotency-Key": str(uuid4())},
    )
    assert submitted.status_code == 202 and worker.run_once(engine)
    await activity(adult, session, source="same_passage", section_index=0)
    assert worker.run_once(engine)
    context = str(requests[-1].ordered_messages)
    assert "SECTION_0" in context
    assert "SECTION_4" not in context and "FUTURE_DISCUSSION_SECRET" not in context
    assert "UNRELATED_DISCUSSION_SECRET" not in context


@pytest.mark.anyio
async def test_material_mode_and_size_changes_preserve_source_and_relevant_position(
    adult: AsyncClient, engine: Engine, monkeypatch: pytest.MonkeyPatch
) -> None:
    install_tutor(monkeypatch)
    session = await tutor_session(adult, "Understand a scientific explanation")
    text = "One synthetic explanatory sentence. " * 150
    await activity(adult, session, source="reading_text", reference_text=text, section_size="short")
    assert worker.run_once(engine)
    moved = await activity(adult, session, source="same_passage", section_index=3)
    assert worker.run_once(engine)
    resized = await activity(adult, session, source="same_passage", section_size="long")
    assert (
        resized["material_focus"]["start"]
        <= moved["material_focus"]["start"]
        < resized["material_focus"]["end"]
    )
    assert resized["material_focus"]["section_size"] == "long"
    assert worker.run_once(engine)
    whole = await activity(adult, session, source="same_passage", reading_mode="whole")
    assert whole["material_focus"]["text"] == text
    assert whole["material_focus"]["section_index"] == 0
    assert whole["material_focus"]["section_count"] == 1
    assert whole["passage"] == moved["passage"]


@pytest.mark.anyio
async def test_oversized_whole_material_fails_without_clipping_and_can_recover_in_sections(
    adult: AsyncClient, engine: Engine, monkeypatch: pytest.MonkeyPatch
) -> None:
    requests = install_tutor(monkeypatch)
    session = await tutor_session(adult, "Study a long scientific explanation")
    text = ("Original synthetic science observation. " * 1300)[:50000]
    await activity(adult, session, source="reading_text", reference_text=text, reading_mode="whole")
    assert worker.run_once(engine)
    failed = await latest(adult, session)
    assert failed["passage"]["text"] == text and not requests
    assert failed["operations"][-1]["status"] == "failed"
    assert "context" in failed["operations"][-1]["safe_error"].lower()
    assert "guided" in failed["operations"][-1]["safe_error"].lower()
    await activity(adult, session, source="same_passage", reading_mode="guided")
    assert worker.run_once(engine)
    recovered = await latest(adult, session)
    assert recovered["activity_state"] == "ready"
    assert recovered["passage"]["text"] == text
    assert recovered["material_focus"]["text"] in str(requests[-1].ordered_messages)


@pytest.mark.anyio
async def test_long_unicode_material_passes_both_creation_routes_and_request_bounds_remain(
    adult: AsyncClient, engine: Engine, monkeypatch: pytest.MonkeyPatch
) -> None:
    install_tutor(monkeypatch)
    text = "原創科學觀察🌱 " * 5000
    assert 16000 < len(text) <= 50000
    created = await adult.post(
        "/api/v1/tutor/sessions",
        content=json.dumps(
            {
                "learner_id": (await learner_ids(adult))[0],
                "topic": "Understand scientific notes",
                "initial_activity": {"source": "reading_text", "reference_text": text},
            }
        ).encode(),
        headers={"Idempotency-Key": str(uuid4()), "Content-Type": "application/json"},
    )
    assert created.status_code == 201, created.text
    session = created.json()
    assert session["problems"][0]["passage"]["text"] == text
    assert worker.run_once(engine)
    # Keep complete Unicode source in storage even if its model byte budget is smaller.
    another = await activity(adult, session, source="reading_text", reference_text=text)
    assert another["passage"]["text"] == text

    async def chunks() -> AsyncIterator[bytes]:
        for _ in range(65):
            yield b" " * 16384

    for path, headers in [
        ("/api/v1/tutor/sessions", {}),
        (f"/api/v1/tutor/sessions/{session['id']}/activities", {"Content-Length": "1"}),
    ]:
        too_large = await adult.post(
            path,
            content=chunks(),
            headers={"Content-Type": "application/json", **headers},
        )
        assert too_large.status_code == 413
    unrelated = await adult.post(
        f"/api/v1/tutor/sessions/{session['id']}/settings",
        content=b" " * 16385,
        headers={"Content-Type": "application/json"},
    )
    assert unrelated.status_code == 413


@pytest.mark.anyio
async def test_long_material_can_continue_past_one_hundred_activities(
    adult: AsyncClient, engine: Engine, monkeypatch: pytest.MonkeyPatch
) -> None:
    install_tutor(monkeypatch)
    text = ("A synthetic source paragraph. " * 16 + "\n\n") * 100
    session = await tutor_session(adult, "Read a long source in short sections")
    first = await activity(
        adult, session, source="reading_text", reference_text=text, section_size="short"
    )
    assert worker.run_once(engine)
    with Session(engine) as db:
        source = db.get(ProblemInstance, UUID(first["id"]))
        assert source is not None
        source.status = "completed"
        for position in range(1, 101):
            db.add(
                ProblemInstance(
                    session_id=source.session_id,
                    template_id=source.template_id,
                    template_version=source.template_version,
                    skill_id=source.skill_id,
                    seed=0,
                    position=position,
                    parameters={**source.parameters, "section_index": 0},
                    problem_text="Synthetic earlier activity.",
                    expected_result={},
                    status="completed",
                    passage=source.passage,
                )
            )
        db.commit()
    moved = await activity(adult, session, source="same_passage", section_index=99)
    with Session(engine) as db:
        saved = db.get(ProblemInstance, UUID(moved["id"]))
        assert saved is not None and saved.position == 101
    assert moved["material_focus"]["section_index"] == 99
    assert moved["material_focus"]["end"] == len(text)


def previous_activity_payload() -> dict[str, Any]:
    """The serialized request contract saved before section controls existed."""
    return {
        "difficulty": None,
        "source": "reading_text",
        "reference_text": PASSAGE,
        "passage_title": None,
        "source_token": None,
    }


@pytest.mark.anyio
async def test_pre_section_activity_retry_keeps_identity_and_whole_source_focus(
    adult: AsyncClient, engine: Engine, monkeypatch: pytest.MonkeyPatch
) -> None:
    install_tutor(monkeypatch)
    session = await tutor_session(adult)
    path = f"/api/v1/tutor/sessions/{session['id']}/activities"
    key = str(uuid4())
    body = {"source": "reading_text", "reference_text": PASSAGE}
    initial = await adult.post(path, json=body, headers={"Idempotency-Key": key})
    assert initial.status_code == 201
    with Session(engine) as db:
        saved = db.get(ProblemInstance, UUID(initial.json()["id"]))
        assert saved is not None
        saved.parameters = {
            field: value
            for field, value in saved.parameters.items()
            if field not in {"material_mode", "section_size", "section_index"}
        } | {"request_digest": digest(previous_activity_payload())}
        db.commit()

    repeated = await adult.post(path, json=body, headers={"Idempotency-Key": key})
    assert repeated.status_code == 201, repeated.text
    assert repeated.json()["id"] == initial.json()["id"]
    assert repeated.json()["material_focus"]["mode"] == "whole"
    changed = await adult.post(
        path,
        json={**body, "reading_mode": "guided"},
        headers={"Idempotency-Key": key},
    )
    assert changed.status_code == 409
    assert worker.run_once(engine)
    following = await activity(adult, session, source="same_passage", difficulty="challenge")
    assert following["material_focus"] == repeated.json()["material_focus"]
    assert following["passage"] == repeated.json()["passage"]
    reopened = (await adult.get(f"/api/v1/tutor/sessions/{session['id']}")).json()
    assert len(reopened["problems"]) == 2


@pytest.mark.anyio
async def test_pre_section_initial_session_retry_keeps_saved_request_identity(
    adult: AsyncClient, engine: Engine
) -> None:
    learner_id = (await learner_ids(adult))[0]
    key = str(uuid4())
    body: dict[str, Any] = {
        "learner_id": learner_id,
        "topic": "Read the seedling notes",
        "initial_activity": {"source": "reading_text", "reference_text": PASSAGE},
    }
    initial = await adult.post(
        "/api/v1/tutor/sessions", json=body, headers={"Idempotency-Key": key}
    )
    assert initial.status_code == 201
    with Session(engine) as db:
        saved = db.get(PracticeSession, UUID(initial.json()["id"]))
        assert saved is not None
        saved.payload_hash = digest(
            {
                "learner_id": UUID(learner_id),
                "topic": body["topic"],
                "initiative": "balanced",
                "difficulty": "standard",
                "initial_activity": previous_activity_payload(),
            }
        )
        db.commit()
    repeated = await adult.post(
        "/api/v1/tutor/sessions", json=body, headers={"Idempotency-Key": key}
    )
    assert repeated.status_code == 201, repeated.text
    assert repeated.json()["id"] == initial.json()["id"]
    assert len(repeated.json()["problems"]) == 1
    assert repeated.json()["problems"][0]["id"] == initial.json()["problems"][0]["id"]
    changed = await adult.post(
        "/api/v1/tutor/sessions",
        json={**body, "initial_activity": {**body["initial_activity"], "section_size": "short"}},
        headers={"Idempotency-Key": key},
    )
    assert changed.status_code == 409
