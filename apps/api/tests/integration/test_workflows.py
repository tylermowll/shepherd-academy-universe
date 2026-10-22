"""Synthetic on-disk tutor, photo delegation, worker recovery and privacy gates."""

import asyncio
import re
from collections.abc import AsyncIterator, Iterator
from datetime import timedelta
from io import BytesIO
from pathlib import Path
from typing import Any, cast
from uuid import UUID, uuid4

import pytest
from alembic import command
from alembic.config import Config
from httpx2 import ASGITransport, AsyncClient, Client, MockTransport, Response
from PIL import Image
from sqlalchemy import func, select
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session

from math_tutor import auth, backup, retention, worker
from math_tutor.adapters.db.engine import create_engine_for_url
from math_tutor.adapters.db.models import (
    DeviceSession,
    Evaluation,
    Interpretation,
    Job,
    Learner,
    ModelCall,
    PhoneUpload,
    PracticeSession,
    ProblemInstance,
    ProgressEvent,
    Submission,
    TutorTurn,
)
from math_tutor.adapters.db.types import utcnow
from math_tutor.adapters.images import delete_image, normalize, object_path
from math_tutor.adapters.providers.config import ProviderConfig
from math_tutor.adapters.providers.contracts import (
    Capabilities,
    ModelRequest,
    ModelResult,
    ProviderError,
    ReadingPayload,
)
from math_tutor.adapters.providers.transports import HTTPProvider
from math_tutor.api.app import create_app
from math_tutor.demo import DEMO_PASSWORD, seed
from math_tutor.providers import complete as provider_complete
from math_tutor.retention import sweep
from math_tutor.tutoring import make_request

ORIGIN = "http://127.0.0.1:8000"


async def phone_link(
    adult: AsyncClient, problem: dict[str, Any], key: str | None = None
) -> dict[str, Any]:
    response = await adult.post(
        f"/api/v1/problems/{problem['id']}/phone-uploads",
        json={"version": problem["version"]},
        headers={"Idempotency-Key": key or str(uuid4())},
    )
    assert response.status_code == 201, response.text
    return cast(dict[str, Any], response.json())


@pytest.mark.anyio
async def test_concurrent_phone_retry_and_changed_photo(adult: AsyncClient, engine: Engine) -> None:
    _, problem = await start(adult, (await learner_ids(adult))[0])
    link = await phone_link(adult, problem)
    headers = {"X-Photo-Token": link["url"].split("#capture=")[1], "Idempotency-Key": str(uuid4())}
    async with client(engine) as first, client(engine) as second:
        results = await asyncio.gather(
            first.post("/api/v1/phone-upload/photos", content=photo_bytes(), headers=headers),
            second.post("/api/v1/phone-upload/photos", content=photo_bytes(), headers=headers),
        )
        assert [response.status_code for response in results] == [202, 202]
        output = BytesIO()
        Image.new("RGB", (80, 60), "black").save(output, "PNG")
        response = await first.post(
            "/api/v1/phone-upload/photos", content=output.getvalue(), headers=headers
        )
        assert response.status_code == 409
    with Session(engine) as db:
        assert db.scalar(select(func.count()).select_from(Submission)) == 1
        assert db.scalar(select(func.count()).select_from(Job)) == 1


@pytest.mark.anyio
async def test_phone_photo_to_computer_automatic_reading(
    adult: AsyncClient,
    engine: Engine,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    session_id, problem = await start(adult, (await learner_ids(adult))[0])
    set_example(engine, problem["id"])
    key = str(uuid4())
    link = await phone_link(adult, problem, key)
    assert await phone_link(adult, problem, key) == link  # lost create acknowledgement
    secret = link["url"].split("#capture=")[1]
    assert "?" not in link["url"]
    with Session(engine) as db:
        grant = db.get(PhoneUpload, UUID(link["id"]))
        assert grant is not None and grant.token_hash == auth.hash_opaque_token(secret)
        assert grant.token_hash != secret
        assert (
            timedelta(hours=2) - timedelta(seconds=5)
            < grant.expires_at - utcnow()
            <= timedelta(hours=2)
        )
    async with client(engine) as phone:
        phone.headers["X-Photo-Token"] = secret
        info = await phone.get("/api/v1/phone-upload")
        assert info.status_code == 200 and info.json()["problem_text"] == "1/2 + 1/3"
        assert "5/6" not in info.text
        assert info.headers["Cache-Control"] == "no-store"
        assert (await phone.get(f"/api/v1/tutor/sessions/{session_id}")).status_code == 401
        assert (await phone.get("/api/v1/admin/providers")).status_code == 401
        preview = await phone.post("/api/v1/phone-upload/preview", content=photo_bytes())
        assert preview.status_code == 200 and preview.content.startswith(b"\xff\xd8")
        assert preview.headers["content-type"] == "image/jpeg"
        headers = {"Idempotency-Key": str(uuid4())}
        first = await phone.post(
            "/api/v1/phone-upload/photos", content=preview.content, headers=headers
        )
        assert first.status_code == 202 and first.json() == {"received": True}
        duplicate = await phone.post(
            "/api/v1/phone-upload/photos", content=preview.content, headers=headers
        )
        assert duplicate.status_code == 202 and duplicate.json() == first.json()
        assert (
            await phone.post(
                "/api/v1/phone-upload/photos",
                content=preview.content,
                headers={"Idempotency-Key": str(uuid4())},
            )
        ).status_code == 409
        assert (
            await phone.post("/api/v1/phone-upload/preview", content=photo_bytes())
        ).status_code == 409
        assert (await phone.get("/api/v1/phone-upload")).json()["problem_text"] == ""

        def read_handwriting(_provider: ProviderConfig, request: ModelRequest) -> ModelResult:
            if request.purpose != "read":
                return original_complete(_provider, request)
            assert request.stage == "vision" and request.private_image_bytes
            assert "5/6" not in str(request.ordered_messages)
            return ModelResult(
                model_id=request.model_id,
                validated_payload=ReadingPayload(
                    transcription="1/2 + 1/3 = 5/6",
                    quality="clear",
                    confidence=0.99,
                    ambiguities=[],
                    organization_feedback=[],
                    rejection_reason=None,
                ),
            )

        original_complete = provider_complete
        monkeypatch.setattr(worker, "complete", read_handwriting)
        assert worker.run_once(engine)
        result = (await read_problem(adult, session_id))["operations"][0]
        assert result["status"] == "queued" and result["verdict"] is None
        assert result["reading"]["can_continue"]
        assert worker.run_once(engine)
        completed = (await read_problem(adult, session_id))["operations"][0]
        assert completed["status"] == "completed" and completed["feedback"]
        assert completed["verdict"] is None
        assert (
            await phone.post(
                "/api/v1/phone-upload/photos", content=preview.content, headers=headers
            )
        ).status_code == 202
        with Session(engine) as db:
            assert db.scalar(select(func.count()).select_from(Submission)) == 1
            assert db.scalar(select(func.count()).select_from(Job)) == 1
            assert db.scalar(select(func.count()).select_from(ProgressEvent)) == 0


@pytest.mark.anyio
@pytest.mark.parametrize(
    "change",
    ["expire", "logout", "version", "next_activity", "finish", "delete", "replace", "cancel"],
)
async def test_phone_link_invalidation(adult: AsyncClient, engine: Engine, change: str) -> None:
    learner = (await learner_ids(adult))[0]
    session_id, problem = await start(adult, learner)
    link = await phone_link(adult, problem)
    if change == "logout":
        assert (await adult.post("/api/v1/auth/logout")).status_code == 200
    elif change == "next_activity":
        assert (
            await adult.post(
                f"/api/v1/tutor/sessions/{session_id}/activities",
                json={"source": "topic"},
                headers={"Idempotency-Key": str(uuid4())},
            )
        ).status_code == 201
    elif change == "finish":
        assert (await adult.post(f"/api/v1/sessions/{session_id}/finish")).status_code == 200
    elif change == "delete":
        assert (await adult.delete(f"/api/v1/admin/learners/{learner}")).status_code == 200
    elif change == "replace":
        await phone_link(adult, problem)
    elif change == "cancel":
        assert (await adult.delete(f"/api/v1/phone-uploads/{link['id']}")).status_code == 200
    else:
        with Session(engine) as db:
            if change == "expire":
                grant = db.get(PhoneUpload, UUID(link["id"]))
                assert grant is not None
                grant.created_at -= timedelta(minutes=10)
                grant.expires_at = utcnow() - timedelta(seconds=1)
            else:
                row = db.get(ProblemInstance, UUID(problem["id"]))
                assert row is not None
                row.version += 1
            db.commit()
    async with client(engine) as phone:
        phone.headers["X-Photo-Token"] = link["url"].split("#capture=")[1]
        assert (await phone.get("/api/v1/phone-upload")).status_code in {404, 409, 410}
        assert (
            await phone.post(
                "/api/v1/phone-upload/photos",
                content=photo_bytes(),
                headers={"Idempotency-Key": str(uuid4())},
            )
        ).status_code in {404, 409, 410}
    with Session(engine) as db:
        assert (
            db.scalar(
                select(func.count())
                .select_from(Submission)
                .where(Submission.problem_id == UUID(problem["id"]))
            )
            == 0
        )
    if change == "expire":
        sweep(engine)
        with Session(engine) as db:
            assert db.get(PhoneUpload, UUID(link["id"])) is None


@pytest.mark.anyio
async def test_phone_permission_ownership_origin_and_body_limits(
    adult: AsyncClient, engine: Engine
) -> None:
    first, second = await learner_ids(adult)
    _, problem = await start(adult, second)
    link = await phone_link(adult, problem)
    async with client(engine) as stranger:
        path = f"/api/v1/problems/{problem['id']}/phone-uploads"
        assert (await stranger.post(path, json={"version": 1})).status_code == 401
        assert (
            await stranger.post("/api/v1/phone-upload/preview", content=b"invalid")
        ).status_code == 401
        await sign_in_learner(adult, stranger, first)
        assert (
            await stranger.post(
                path, json={"version": 1}, headers={"Idempotency-Key": str(uuid4())}
            )
        ).status_code == 404
        assert (await stranger.delete(f"/api/v1/phone-uploads/{link['id']}")).status_code == 404
        stranger.headers["X-Photo-Token"] = link["url"].split("#capture=")[1]
        assert (
            await stranger.post(
                "/api/v1/phone-upload/preview",
                content=photo_bytes(),
                headers={"Origin": "https://evil.invalid"},
            )
        ).status_code == 403
        assert (
            await stranger.post("/api/v1/phone-upload/preview", content=b"GIF89a")
        ).status_code == 422
        assert (
            await stranger.post(
                "/api/v1/phone-upload/photos",
                content=b"x" * (8 * 1024 * 1024 + 1),
                headers={"Idempotency-Key": str(uuid4())},
            )
        ).status_code == 413


@pytest.mark.anyio
@pytest.mark.parametrize("change", ["version", "logout", "policy", "mode"])
async def test_phone_rechecks_after_decode(
    adult: AsyncClient, engine: Engine, monkeypatch: pytest.MonkeyPatch, change: str
) -> None:
    from math_tutor.api import photos

    _, problem = await start(adult, (await learner_ids(adult))[0])
    link = await phone_link(adult, problem)

    def concurrent_change(data: bytes) -> bytes:
        result = normalize(data)
        with Session(engine) as db:
            grant = db.get(PhoneUpload, UUID(link["id"]))
            assert grant is not None
            if change == "logout":
                issuer = db.get(DeviceSession, grant.issuer_id)
                assert issuer is not None
                issuer.revoked_at = utcnow()
            elif change == "version":
                row = db.get(ProblemInstance, grant.problem_id)
                assert row is not None
                row.version += 1
            elif change == "policy":
                monkeypatch.setenv("APP_AUDIENCE", "adult_only")
            else:
                monkeypatch.setenv("APP_MODE", "demo")
            db.commit()
        return result

    monkeypatch.setattr(photos, "normalize", concurrent_change)
    async with client(engine) as phone:
        response = await phone.post(
            "/api/v1/phone-upload/photos",
            content=photo_bytes(),
            headers={
                "X-Photo-Token": link["url"].split("#capture=")[1],
                "Idempotency-Key": str(uuid4()),
            },
        )
    assert response.status_code in {403, 409, 410}
    with Session(engine) as db:
        assert db.scalar(select(func.count()).select_from(Submission)) == 0


@pytest.mark.anyio
async def test_malformed_provider_does_not_stop_following_jobs(
    adult: AsyncClient, engine: Engine, monkeypatch: pytest.MonkeyPatch
) -> None:
    learner = (await learner_ids(adult))[0]
    _, photo_problem = await start(adult, learner)
    photo = await adult.post(
        f"/api/v1/problems/{photo_problem['id']}/photos?version=1",
        content=photo_bytes(),
        headers={"Idempotency-Key": str(uuid4())},
    )
    assert photo.status_code == 202, photo.text
    session_id, typed_problem = await start(adult, learner)
    set_example(engine, typed_problem["id"])
    await send(adult, typed_problem)

    original_complete = provider_complete

    def malformed(_provider: ProviderConfig, request: ModelRequest) -> ModelResult:
        if request.purpose != "read":
            return original_complete(_provider, request)
        config = ProviderConfig(
            adapter="compatible",
            model=request.model_id,
            enabled=True,
            base_url="http://127.0.0.1:11434",
            eligibility_record="Synthetic fixture",
            capabilities=Capabilities(image_input=True),
        )
        with Client(
            transport=MockTransport(
                lambda _: Response(
                    200,
                    json={"choices": [{"finish_reason": "stop", "message": None}]},
                )
            )
        ) as transport:
            return HTTPProvider(config, transport).complete(request)

    monkeypatch.setattr(worker, "complete", malformed)
    assert worker.run_once(engine)
    with Session(engine) as db:
        row = db.get(Submission, UUID(photo.json()["id"]))
        assert row is not None and row.status == "failed"
        assert db.scalar(select(func.count()).select_from(Evaluation)) == 0
    assert worker.run_once(engine)
    result = (await read_problem(adult, session_id))["operations"][0]
    assert result["status"] == "completed" and result["feedback"] is not None
    assert result["verdict"] is None
    assert not worker.run_once(engine)


@pytest.fixture
def anyio_backend() -> str:
    return "asyncio"


@pytest.fixture
def engine(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Iterator[Engine]:
    url = f"sqlite+pysqlite:///{tmp_path / 'work.sqlite3'}"
    monkeypatch.setenv("DATABASE_URL", url)
    monkeypatch.setenv("SESSION_SECRET", "synthetic-secret-for-workflow-tests-1234567890")
    monkeypatch.setenv("APP_PUBLIC_ORIGIN", ORIGIN)
    monkeypatch.setenv("ALLOW_CLOUD_INFERENCE", "false")
    monkeypatch.setenv("APP_AUDIENCE", "mixed")
    monkeypatch.setenv("APP_MODE", "private")
    monkeypatch.delenv("PROVIDER_CONFIG", raising=False)
    auth.clear_login_rate_limit()
    config = Config()
    config.set_main_option(
        "script_location", str(Path(__file__).resolve().parents[2] / "migrations")
    )
    command.upgrade(config, "head")
    result = create_engine_for_url(url)
    seed(result)
    yield result
    result.dispose()
    auth.clear_login_rate_limit()


def client(engine: Engine) -> AsyncClient:
    return AsyncClient(transport=ASGITransport(app=create_app(engine)), base_url=ORIGIN)


@pytest.fixture
async def adult(engine: Engine) -> AsyncIterator[AsyncClient]:
    async with client(engine) as result:
        bootstrap = await result.get("/api/v1/auth/session")
        result.headers["X-CSRF-Token"] = bootstrap.json()["csrf_token"]
        response = await result.post(
            "/api/v1/auth/login",
            json={"login_name": "demo", "password": DEMO_PASSWORD, "role": "adult"},
        )
        assert response.status_code == 200, response.text
        result.headers["X-CSRF-Token"] = response.json()["csrf_token"]
        yield result


async def learner_ids(adult: AsyncClient) -> list[str]:
    return [row["id"] for row in (await adult.get("/api/v1/admin/learners")).json()]


async def start(adult: AsyncClient, learner_id: str) -> tuple[str, dict[str, Any]]:
    """Ready synthetic activity for persistence/security tests, without provider generation."""
    response = await adult.post(
        "/api/v1/tutor/sessions",
        json={"learner_id": learner_id, "topic": "Fraction reasoning"},
        headers={"Idempotency-Key": str(uuid4())},
    )
    assert response.status_code == 201, response.text
    session_id = response.json()["id"]
    fixture_engine = cast(Any, adult._transport).app.state.engine
    with Session(fixture_engine) as db:
        db.add(
            ProblemInstance(
                session_id=UUID(session_id),
                template_id="ai-activity-v1",
                template_version=1,
                skill_id="open.subject",
                seed=0,
                position=0,
                problem_text="1/2 + 1/3",
                parameters={
                    "activity_state": "ready",
                    "concept_focus": "Equal-sized parts",
                    "success_criteria": ["Explain why parts must be equal-sized."],
                },
                expected_result={},
                format_constraints=None,
            )
        )
        db.commit()
    return session_id, await read_problem(adult, session_id)


def set_example(engine: Engine, problem_id: str) -> None:
    with Session(engine) as db:
        row = db.get(ProblemInstance, UUID(problem_id))
        assert row is not None
        row.problem_text = "1/2 + 1/3"
        row.expected_result = {"value": "5/6"}
        row.parameters = {**row.parameters, "a": 1, "b": 2, "c": 1, "d": 3}
        db.commit()


async def send(
    adult: AsyncClient,
    problem: dict[str, Any],
    text: str = "5/6",
    kind: str = "answer",
    help_level: int = 0,
    key: str | None = None,
) -> dict[str, Any]:
    response = await adult.post(
        f"/api/v1/problems/{problem['id']}/submissions",
        json={"version": problem["version"], "kind": kind, "text": text, "help_level": help_level},
        headers={"Idempotency-Key": key or str(uuid4())},
    )
    assert response.status_code == 202, response.text
    return cast(dict[str, Any], response.json())


async def read_problem(adult: AsyncClient, session_id: str) -> dict[str, Any]:
    return cast(
        dict[str, Any],
        (await adult.get(f"/api/v1/tutor/sessions/{session_id}")).json()["problems"][0],
    )


async def sign_in_learner(adult: AsyncClient, device: AsyncClient, learner_id: str) -> None:
    rows = (await adult.get("/api/v1/admin/learners")).json()
    learner = next(row for row in rows if row["id"] == learner_id)
    if not learner["has_password"]:
        assert (
            await adult.patch(
                f"/api/v1/admin/learners/{learner_id}/account",
                json={"alias": learner["alias"], "password": DEMO_PASSWORD},
            )
        ).status_code == 200
    token = (await device.get("/api/v1/auth/session")).json()["csrf_token"]
    device.headers["X-CSRF-Token"] = token
    response = await device.post(
        "/api/v1/auth/login",
        json={"login_name": learner["alias"], "password": DEMO_PASSWORD, "role": "learner"},
    )
    assert response.status_code == 200, response.text
    status = response.json()
    assert status["role"] == "learner" and status["learner_id"] == learner_id
    device.headers["X-CSRF-Token"] = status["csrf_token"]


@pytest.mark.anyio
async def test_learner_sign_in_is_revocable_and_isolated(
    adult: AsyncClient, engine: Engine
) -> None:
    first, second = await learner_ids(adult)
    session_id, problem = await start(adult, second)
    async with client(engine) as device, client(engine) as stranger:
        await sign_in_learner(adult, device, first)
        assert (await stranger.get("/api/v1/auth/session")).json()["authenticated"] is False
        assert (await device.post("/api/v1/pairing/requests")).status_code == 404
        for path in (
            "/admin/learners",
            "/admin/providers",
            "/admin/usage",
        ):
            assert (await device.get("/api/v1" + path)).status_code == 403
        assert (await device.get(f"/api/v1/tutor/sessions/{session_id}")).status_code == 404
        assert (await device.get(f"/api/v1/learners/{second}/features")).status_code == 404
        assert (
            await device.post(
                f"/api/v1/problems/{problem['id']}/submissions",
                json={"version": 1, "text": "Owned work"},
                headers={"Idempotency-Key": str(uuid4())},
            )
        ).status_code == 404
        assert (
            await device.post(
                "/api/v1/tutor/sessions",
                json={"learner_id": second, "topic": "Science"},
                headers={"Idempotency-Key": str(uuid4())},
            )
        ).status_code == 404
        assert (await adult.post(f"/api/v1/admin/learners/{first}/revoke")).status_code == 200
        assert (await device.get("/api/v1/tutor/sessions")).status_code == 401


@pytest.mark.anyio
async def test_learner_session_expiration_blocks_access(adult: AsyncClient, engine: Engine) -> None:
    learner = (await learner_ids(adult))[0]
    async with client(engine) as device:
        await sign_in_learner(adult, device, learner)
        with Session(engine) as db:
            row = db.scalar(select(DeviceSession).where(DeviceSession.learner_id == UUID(learner)))
            assert row is not None
            row.created_at = utcnow() - timedelta(minutes=10)
            row.expires_at = utcnow() - timedelta(minutes=5)
            db.commit()
        assert (await device.get("/api/v1/auth/session")).json()["authenticated"] is False
        assert (await device.get("/api/v1/tutor/sessions")).status_code == 401


@pytest.mark.anyio
async def test_duplicate_canonical_payload_and_stale_versions(
    adult: AsyncClient, engine: Engine
) -> None:
    learner = (await learner_ids(adult))[0]
    session_id, problem = await start(adult, learner)
    set_example(engine, problem["id"])
    key = str(uuid4())
    op = await send(adult, problem, key=key)
    assert (await send(adult, problem, key=key))["id"] == op["id"]
    conflict = await adult.post(
        f"/api/v1/problems/{problem['id']}/submissions",
        json={"version": 1, "text": "2/5"},
        headers={"Idempotency-Key": key},
    )
    assert conflict.status_code == 409
    concurrent = await adult.post(
        f"/api/v1/problems/{problem['id']}/submissions",
        json={"version": 1, "text": "Concurrent work"},
        headers={"Idempotency-Key": str(uuid4())},
    )
    assert concurrent.status_code == 409
    assert worker.run_once(engine)
    current = await read_problem(adult, session_id)
    assert current["status"] == "assigned" and current["version"] == 2
    assert current["operations"][0]["verdict"] is None
    assert current["operations"][0]["feedback"] is not None
    assert "expected_result" not in str(current) and "parameters" not in str(current)
    with Session(engine) as db:
        assert db.scalar(select(func.count()).select_from(ProgressEvent)) == 0
        assert db.scalar(select(func.count()).select_from(Evaluation)) == 0
    assert not worker.run_once(engine)


@pytest.mark.anyio
@pytest.mark.parametrize("expiry_stage", ["before_preparation", "during_preparation"])
async def test_expired_worker_cannot_start_inference_or_fail_reclaimable_work(
    adult: AsyncClient, engine: Engine, monkeypatch: pytest.MonkeyPatch, expiry_stage: str
) -> None:
    _, problem = await start(adult, (await learner_ids(adult))[0])
    await send(adult, problem)
    work = worker.claim(engine)
    assert work is not None
    with Session(engine) as db:
        job = db.get(Job, work.job_id)
        assert job is not None and job.lease_expires_at is not None
        expired_at = job.lease_expires_at + timedelta(seconds=1)
    now = expired_at if expiry_stage == "before_preparation" else utcnow()
    monkeypatch.setattr(worker, "utcnow", lambda: now)

    with monkeypatch.context() as patch:
        patch.setattr(worker, "claim", lambda _engine: work)
        if expiry_stage == "during_preparation":

            def expire_while_preparing(*args: Any, **kwargs: Any) -> ModelRequest:
                nonlocal now
                request = make_request(*args, **kwargs)
                now = expired_at
                return request

            patch.setattr(worker, "make_request", expire_while_preparing)

        def forbidden(*_args: object) -> None:
            pytest.fail("An expired worker must not start a provider request")

        patch.setattr(worker, "complete", forbidden)
        assert worker.run_once(engine)
    with Session(engine) as db:
        job = db.get(Job, work.job_id)
        assert job is not None and job.state == "running" and job.call_count == 0
        assert db.scalar(select(func.count()).select_from(ModelCall)) == 0
        assert db.scalar(select(func.count()).select_from(TutorTurn)) == 0

    assert worker.run_once(engine)
    with Session(engine) as db:
        job = db.get(Job, work.job_id)
        submitted = db.get(Submission, work.submission_id)
        assert job is not None and job.state == "completed" and job.call_count == 1
        assert submitted is not None and submitted.status == "completed"
        assert db.scalar(select(func.count()).select_from(TutorTurn)) == 1


@pytest.mark.anyio
async def test_worker_expired_lease_cannot_publish_twice(
    adult: AsyncClient, engine: Engine
) -> None:
    _, problem = await start(adult, (await learner_ids(adult))[0])
    set_example(engine, problem["id"])
    await send(adult, problem)
    first = worker.claim(engine)
    assert first is not None
    assert worker.claim(engine) is None
    with Session(engine) as db:
        row = db.get(Job, first.job_id)
        assert row is not None
        row.lease_expires_at = utcnow() - timedelta(seconds=1)
        db.commit()
    second = worker.claim(engine)
    assert second is not None
    assert first.token != second.token
    assert not worker.finish(engine, first)
    assert finish_claim(engine, second)
    assert not worker.finish(engine, second)
    with Session(engine) as db:
        assert db.scalar(select(func.count()).select_from(ProgressEvent)) == 0
        assert db.scalar(select(func.count()).select_from(TutorTurn)) == 1
        submitted = db.get(Submission, second.submission_id)
        assert submitted is not None and submitted.status == "completed"


@pytest.mark.anyio
async def test_deletion_during_work_prevents_resurrection_and_restore(
    adult: AsyncClient, engine: Engine, tmp_path: Path
) -> None:
    learner = (await learner_ids(adult))[0]
    _, problem = await start(adult, learner)
    await send(adult, problem)
    work = worker.claim(engine)
    assert work is not None
    encrypted = tmp_path / "backup.mtp"
    backup.backup(encrypted, "synthetic-backup-passphrase")
    assert b"Orbit" not in encrypted.read_bytes()
    response = await adult.delete(f"/api/v1/admin/learners/{learner}")
    assert response.status_code == 200, response.text
    assert not worker.finish(engine, work)
    restored = tmp_path / "restored"
    backup.restore(encrypted, restored, "synthetic-backup-passphrase", tmp_path / "deletions.jsonl")
    import sqlite3

    with sqlite3.connect(restored / "math_tutor.sqlite3") as db:
        assert db.execute("SELECT id FROM learner WHERE id=?", (learner,)).fetchone() is None
        assert db.execute("SELECT count(*) FROM device_session").fetchone()[0] == 0
        assert db.execute("PRAGMA integrity_check").fetchone()[0] == "ok"
    with pytest.raises(ValueError):
        backup.restore(
            encrypted, restored, "synthetic-backup-passphrase", tmp_path / "deletions.jsonl"
        )


def photo_bytes() -> bytes:
    output = BytesIO()
    Image.new("RGB", (80, 60), "white").save(output, "PNG")
    return output.getvalue()


@pytest.mark.anyio
async def test_completed_photo_question_is_purged_without_grading(
    adult: AsyncClient, engine: Engine, monkeypatch: pytest.MonkeyPatch
) -> None:
    install_clear_reading(monkeypatch)
    _, problem = await start(adult, (await learner_ids(adult))[0])
    response = await adult.post(
        f"/api/v1/problems/{problem['id']}/photos?version=1&kind=question",
        content=photo_bytes(),
        headers={"Idempotency-Key": str(uuid4())},
    )
    assert response.status_code == 202, response.text
    operation = response.json()["id"]
    assert worker.run_once(engine)
    with Session(engine) as db:
        row = db.get(Submission, UUID(operation))
        assert row is not None and row.image_key is not None
        image = object_path(row.image_key)
    assert worker.run_once(engine)
    result = (await adult.get(f"/api/v1/operations/{operation}")).json()
    assert result["status"] == "completed" and result["verdict"] is None
    assert not image.exists()
    assert (await adult.get(f"/api/v1/submissions/{operation}/image")).status_code == 404


@pytest.mark.anyio
@pytest.mark.parametrize("failure", ["storage", "crash_before_delete", "crash_after_delete"])
async def test_completed_photo_cleanup_recovers_after_failure(
    adult: AsyncClient, engine: Engine, monkeypatch: pytest.MonkeyPatch, failure: str
) -> None:
    install_clear_reading(monkeypatch)
    _, problem = await start(adult, (await learner_ids(adult))[0])
    set_example(engine, problem["id"])
    response = await adult.post(
        f"/api/v1/problems/{problem['id']}/photos?version=1",
        content=photo_bytes(),
        headers={"Idempotency-Key": str(uuid4())},
    )
    assert response.status_code == 202, response.text
    operation = UUID(response.json()["id"])
    assert worker.run_once(engine)
    with Session(engine) as db:
        row = db.get(Submission, operation)
        assert row is not None and row.image_key is not None
        image = object_path(row.image_key)

    def interrupted_delete(key: str) -> None:
        # Completion must be independently visible before irreversible storage deletion.
        with Session(engine) as reader:
            completed = reader.get(Submission, operation)
            assert completed is not None and completed.status == "completed"
        if failure == "storage":
            raise OSError("Synthetic storage outage")
        delete_image(key)
        raise SystemExit("Synthetic crash after unlink, before clearing the reference")

    def interrupted_cleanup(_engine: Engine, _operation: UUID) -> None:
        raise SystemExit("Synthetic crash after completion, before cleanup")

    with monkeypatch.context() as patch:
        if failure == "crash_before_delete":
            patch.setattr(worker, "purge_completed_photo", interrupted_cleanup)
        else:
            patch.setattr(retention, "delete_image", interrupted_delete)
        if failure == "storage":
            assert worker.run_once(engine)
            sweep(engine)  # An unavailable file must remain discoverable for another sweep.
        else:
            with pytest.raises(SystemExit, match="Synthetic crash"):
                worker.run_once(engine)
    with Session(engine) as db:
        row = db.get(Submission, operation)
        assert row is not None and row.status == "completed" and row.image_key is not None
        assert db.scalar(select(func.count()).select_from(ProgressEvent)) == 0
    assert image.exists() is (failure != "crash_after_delete")
    assert (await adult.get(f"/api/v1/submissions/{operation}/image")).status_code == 404
    sweep(engine)
    sweep(engine)
    assert not image.exists()
    with Session(engine) as db:
        row = db.get(Submission, operation)
        assert row is not None and row.image_key is None
        assert db.scalar(select(func.count()).select_from(ProgressEvent)) == 0


@pytest.mark.anyio
@pytest.mark.parametrize("failed", [False, True])
async def test_unclear_and_failed_photos_retain_only_until_ttl(
    adult: AsyncClient, engine: Engine, monkeypatch: pytest.MonkeyPatch, failed: bool
) -> None:

    _, problem = await start(adult, (await learner_ids(adult))[0])
    response = await adult.post(
        f"/api/v1/problems/{problem['id']}/photos?version=1",
        content=photo_bytes(),
        headers={"Idempotency-Key": str(uuid4())},
    )
    assert response.status_code == 202, response.text
    operation = UUID(response.json()["id"])

    def unavailable(*_args: object) -> None:
        raise ProviderError("timeout", True)

    if failed:
        monkeypatch.setattr(worker, "complete", unavailable)
    assert worker.run_once(engine)
    sweep(engine)
    with Session(engine) as db:
        row = db.get(Submission, operation)
        assert row is not None and row.image_key is not None
        assert row.status == "failed"
        image = object_path(row.image_key)
        row.created_at = utcnow() - timedelta(hours=25)
        db.commit()
    assert image.exists()
    sweep(engine)
    assert not image.exists()
    assert (await adult.get(f"/api/v1/submissions/{operation}/image")).status_code == 404


@pytest.mark.anyio
async def test_failed_provider_retry_budget_and_stale_retry(
    adult: AsyncClient, engine: Engine, monkeypatch: pytest.MonkeyPatch
) -> None:

    session_id, problem = await start(adult, (await learner_ids(adult))[0])

    def unavailable(*_args: object) -> None:
        raise ProviderError("timeout", True)

    monkeypatch.setattr(worker, "complete", unavailable)
    op = await send(adult, problem, "Why use a common denominator?", "question", 2)
    assert worker.run_once(engine)
    result = (await adult.get(f"/api/v1/operations/{op['id']}")).json()
    assert result["status"] == "failed" and result["verdict"] is None
    assert result["retryable"] is True
    with Session(engine) as db:
        job = db.scalar(select(Job).where(Job.submission_id == UUID(op["id"])))
        assert job is not None
        assert job.call_count == 1 and job.retryable
        assert db.scalar(select(func.count()).select_from(ProgressEvent)) == 0
    problem = await read_problem(adult, session_id)
    await send(adult, problem, "", "hint", 1)
    during = (await adult.get(f"/api/v1/operations/{op['id']}")).json()
    assert during["retryable"] is False
    assert (await adult.post(f"/api/v1/operations/{op['id']}/retry")).status_code == 409
    monkeypatch.undo()
    worker.run_once(engine)
    stale = (await adult.get(f"/api/v1/operations/{op['id']}")).json()
    assert stale["retryable"] is False
    assert (await adult.post(f"/api/v1/operations/{op['id']}/retry")).status_code == 409


@pytest.mark.anyio
@pytest.mark.parametrize("reason", ["finished", "moved_on", "attempts", "calls", "job_state"])
async def test_retry_affordance_matches_closed_or_exhausted_operation(
    adult: AsyncClient, engine: Engine, monkeypatch: pytest.MonkeyPatch, reason: str
) -> None:
    session_id, problem = await start(adult, (await learner_ids(adult))[0])

    def unavailable(*_args: object) -> None:
        raise ProviderError("timeout", True)

    monkeypatch.setattr(worker, "complete", unavailable)
    operation = await send(adult, problem, "Explain the idea.", "question", 0)
    assert worker.run_once(engine)
    path = f"/api/v1/operations/{operation['id']}"
    assert (await adult.get(path)).json()["retryable"] is True
    if reason == "finished":
        assert (await adult.post(f"/api/v1/sessions/{session_id}/finish")).status_code == 200
    elif reason == "moved_on":
        response = await adult.post(
            f"/api/v1/tutor/sessions/{session_id}/activities",
            json={"source": "topic"},
            headers={"Idempotency-Key": str(uuid4())},
        )
        assert response.status_code == 201
    else:
        with Session(engine) as db:
            job = db.scalar(select(Job).where(Job.submission_id == UUID(operation["id"])))
            assert job is not None
            if reason == "attempts":
                job.attempts = 6
            elif reason == "calls":
                job.call_count = 6
            else:
                job.state = "canceled"
            db.commit()
    assert (await adult.get(path)).json()["retryable"] is False
    assert (await adult.post(path + "/retry")).status_code == 409


@pytest.mark.anyio
async def test_crash_after_provider_response_recovers_one_visible_result(
    adult: AsyncClient, engine: Engine
) -> None:
    _, problem = await start(adult, (await learner_ids(adult))[0])
    op = await send(adult, problem, "How do equal parts help?", "question", 2)
    first = worker.claim(engine)
    assert first is not None
    prepared = worker.prepare(engine, first)
    assert prepared is not None
    from math_tutor.providers import complete

    result = complete(prepared.provider, prepared.request)
    with Session(engine) as db:
        row = db.get(Job, first.job_id)
        assert row is not None
        row.lease_expires_at = utcnow() - timedelta(seconds=1)
        db.commit()
    assert worker.run_once(engine)
    assert not worker.finish(engine, first, result, prepared.source)
    read = (await adult.get(f"/api/v1/operations/{op['id']}")).json()
    assert read["status"] == "completed" and read["verdict"] is None
    with Session(engine) as db:
        row = db.get(Job, first.job_id)
        assert row is not None
        assert row.call_count == 2
        from math_tutor.adapters.db.models import TutorTurn

        assert db.scalar(select(func.count()).select_from(TutorTurn)) == 1


@pytest.mark.anyio
async def test_policy_change_never_replays_to_new_route(
    adult: AsyncClient, engine: Engine, monkeypatch: pytest.MonkeyPatch
) -> None:
    _, problem = await start(adult, (await learner_ids(adult))[0])
    op = await send(adult, problem, "Why?", "question", 2)
    monkeypatch.setenv("APP_AUDIENCE", "adult_only")

    def forbidden(*_args: object) -> None:
        raise AssertionError("Provider must not be contacted after policy changes")

    monkeypatch.setattr(worker, "complete", forbidden)
    assert worker.run_once(engine)
    result = (await adult.get(f"/api/v1/operations/{op['id']}")).json()
    assert result["status"] == "failed" and "policy changed" in result["safe_error"]


@pytest.mark.anyio
async def test_csrf_and_chunked_body_limits(adult: AsyncClient) -> None:
    assert (
        await adult.post(
            "/api/v1/admin/learners", json={"alias": "No CSRF"}, headers={"X-CSRF-Token": "wrong"}
        )
    ).status_code == 403

    async def chunks() -> AsyncIterator[bytes]:
        yield b'{"alias":"'
        yield b"x" * 17000
        yield b'"}'

    response = await adult.post(
        "/api/v1/admin/learners", content=chunks(), headers={"Content-Type": "application/json"}
    )
    assert response.status_code == 413


def test_backup_authentication_fails_before_extracting(engine: Engine, tmp_path: Path) -> None:
    from cryptography.exceptions import InvalidTag

    encrypted = tmp_path / "encrypted.mtp"
    backup.backup(encrypted, "synthetic-backup-passphrase")
    ledger = tmp_path / "empty-ledger"
    ledger.write_text("")
    with pytest.raises(InvalidTag):
        backup.restore(encrypted, tmp_path / "bad-password", "different-long-passphrase", ledger)
    assert not (tmp_path / "bad-password").exists()
    content = bytearray(encrypted.read_bytes())
    content[-20] ^= 1
    encrypted.write_bytes(content)
    with pytest.raises(InvalidTag):
        backup.restore(encrypted, tmp_path / "tampered", "synthetic-backup-passphrase", ledger)
    assert not (tmp_path / "tampered").exists()


@pytest.mark.anyio
async def test_final_answer_is_separate_from_invalid_visible_reasoning(
    adult: AsyncClient, engine: Engine
) -> None:
    session_id, problem = await start(adult, (await learner_ids(adult))[0])
    set_example(engine, problem["id"])
    response = await adult.post(
        f"/api/v1/problems/{problem['id']}/submissions",
        json={
            "version": 1,
            "kind": "answer",
            "text": "5/6",
            "work_text": "1+1=8, then I guessed 5/6.",
        },
        headers={"Idempotency-Key": str(uuid4())},
    )
    assert response.status_code == 202, response.text
    worker.run_once(engine)
    result = (await read_problem(adult, session_id))["operations"][0]
    assert result["verdict"] is None
    assert result["feedback"] is not None
    assert result["work_text"] == "1+1=8, then I guessed 5/6."


@pytest.mark.anyio
async def test_simultaneous_workers_claim_once(adult: AsyncClient, engine: Engine) -> None:
    from concurrent.futures import ThreadPoolExecutor
    from threading import Barrier

    _, problem = await start(adult, (await learner_ids(adult))[0])
    await send(adult, problem)
    barrier = Barrier(2)

    def compete() -> worker.Claim | None:
        barrier.wait(timeout=5)
        return worker.claim(engine)

    with ThreadPoolExecutor(max_workers=2) as pool:
        pending = [pool.submit(compete) for _ in range(2)]
        claims = [future.result(timeout=10) for future in pending]
    claimed = [item for item in claims if item is not None]
    assert len(claimed) == 1
    assert finish_claim(engine, claimed[0])
    with Session(engine) as db:
        assert db.scalar(select(func.count()).select_from(ProgressEvent)) == 0
        assert db.scalar(select(func.count()).select_from(TutorTurn)) == 1
        submitted = db.get(Submission, claimed[0].submission_id)
        assert submitted is not None and submitted.status == "completed"


@pytest.mark.anyio
async def test_logout_reserves_writer_before_session_read(
    adult: AsyncClient, engine: Engine, monkeypatch: pytest.MonkeyPatch
) -> None:
    import sqlite3
    from contextlib import closing

    original = auth.get_valid_session
    checked = False

    def read_while_worker_contends(db: Session, token: str) -> DeviceSession | None:
        nonlocal checked
        row = original(db, token)
        # A competing worker must wait rather than invalidate logout's read snapshot.
        with (
            closing(sqlite3.connect(str(engine.url.database), timeout=0)) as contender,
            pytest.raises(sqlite3.OperationalError, match="locked"),
        ):
            contender.execute("BEGIN IMMEDIATE")
        checked = True
        return row

    monkeypatch.setattr(auth, "get_valid_session", read_while_worker_contends)
    response = await adult.post("/api/v1/auth/logout")
    assert response.status_code == 200
    assert checked
    monkeypatch.setattr(auth, "get_valid_session", original)
    assert not (await adult.get("/api/v1/auth/session")).json()["authenticated"]


@pytest.mark.anyio
async def test_upload_rechecks_assignment_after_decode(
    adult: AsyncClient, engine: Engine, monkeypatch: pytest.MonkeyPatch
) -> None:
    from math_tutor.api import photos

    _, problem = await start(adult, (await learner_ids(adult))[0])
    original = normalize

    def concurrent_edit(data: bytes) -> bytes:
        normalized = original(data)
        with Session(engine) as competing:
            current = competing.get(ProblemInstance, UUID(problem["id"]))
            assert current is not None
            current.version += 1
            competing.commit()
        return normalized

    monkeypatch.setattr(photos, "normalize", concurrent_edit)
    response = await adult.post(
        f"/api/v1/problems/{problem['id']}/photos?version={problem['version']}",
        content=photo_bytes(),
        headers={"Idempotency-Key": str(uuid4())},
    )
    assert response.status_code == 409
    with Session(engine) as db:
        assert db.scalar(select(func.count()).select_from(Submission)) == 0


@pytest.mark.anyio
async def test_mutation_commits_before_success_response_headers(
    adult: AsyncClient, engine: Engine
) -> None:
    from starlette.types import Message, Receive, Scope, Send

    application = create_app(engine)
    checked = False

    async def observe(scope: Scope, receive: Receive, send_response: Send) -> None:
        async def inspect_response(message: Message) -> None:
            nonlocal checked
            if message["type"] == "http.response.start" and message["status"] == 201:
                # This connection represents a fast browser's next request.
                with Session(engine) as reader:
                    assert (
                        reader.scalar(
                            select(Learner.id).where(Learner.alias == "Synthetic commit boundary")
                        )
                        is not None
                    )
                checked = True
            await send_response(message)

        await application(scope, receive, inspect_response)

    async with AsyncClient(
        transport=ASGITransport(app=observe),
        base_url=ORIGIN,
        cookies=adult.cookies,
        headers=adult.headers,
    ) as browser:
        response = await browser.post(
            "/api/v1/admin/learners",
            json={
                "alias": "Synthetic commit boundary",
                "eligibility": "unknown",
                "password": DEMO_PASSWORD,
            },
        )
    assert response.status_code == 201
    assert checked


def install_clear_reading(monkeypatch: pytest.MonkeyPatch) -> None:
    original = provider_complete

    def respond(provider: ProviderConfig, request: ModelRequest) -> ModelResult:
        if request.purpose != "read":
            return original(provider, request)
        return ModelResult(
            model_id=request.model_id,
            validated_payload=ReadingPayload(
                transcription="I compared the equal-sized parts.",
                quality="clear",
                confidence=0.99,
                ambiguities=[],
                organization_feedback=[],
                rejection_reason=None,
            ),
        )

    monkeypatch.setattr(worker, "complete", respond)


def finish_claim(engine: Engine, claim: worker.Claim) -> bool:
    prepared = worker.prepare(engine, claim)
    assert prepared is not None
    return worker.finish(
        engine, claim, provider_complete(prepared.provider, prepared.request), prepared.source
    )


@pytest.mark.anyio
@pytest.mark.parametrize(
    "method,path",
    [
        ("GET", "/api/v1/catalog"),
        ("POST", "/api/v1/problems/{id}/skip"),
        ("GET", "/api/v1/sessions"),
        ("POST", "/api/v1/sessions"),
        ("GET", "/api/v1/sessions/{id}"),
        ("POST", "/api/v1/sessions/{id}/problems"),
        ("POST", "/api/v1/sessions/{id}/external-problem"),
        ("GET", "/api/v1/tutor-profiles"),
        ("GET", "/api/v1/admin/tutor-profiles"),
        ("POST", "/api/v1/admin/tutor-profiles"),
        ("POST", "/api/v1/admin/tutor-profiles/preview"),
        ("GET", "/api/v1/learners/{id}/progress"),
        ("POST", "/api/v1/submissions/{id}/confirm-interpretation"),
    ],
)
async def test_retired_catalog_endpoints_are_absent(
    adult: AsyncClient, engine: Engine, monkeypatch: pytest.MonkeyPatch, method: str, path: str
) -> None:
    monkeypatch.setenv("ENABLE_EXTERNAL_PROBLEMS", "true")
    actual_path = path.replace("{id}", str(uuid4()))
    response = await adult.request(method, actual_path, json={})
    assert response.status_code == 404, response.text
    published_paths = {
        re.sub(r"\{[^}]+\}", "{id}", item) for item in create_app(engine).openapi()["paths"]
    }
    assert path not in published_paths


@pytest.mark.anyio
async def test_retained_catalog_data_exports_but_cannot_resume(
    adult: AsyncClient, engine: Engine, monkeypatch: pytest.MonkeyPatch
) -> None:
    learner = (await learner_ids(adult))[0]
    session_id, problem = await start(adult, learner)
    with Session(engine) as db:
        historical = db.get(PracticeSession, UUID(session_id))
        assert historical is not None
        historical.mode = "built_in"
        historical.profile_settings = {
            "name": "Historical profile",
            "solution_policy": "on_request",
        }
        saved = db.get(ProblemInstance, UUID(problem["id"]))
        assert saved is not None
        saved.template_id = "fractions.add"
        saved.expected_result = {"value": "5/6"}
        operation = Submission(
            learner_id=UUID(learner),
            problem_id=saved.id,
            request_key=str(uuid4()),
            payload_hash="synthetic",
            text="Historical work",
            kind="answer",
            assignment_version=1,
        )
        db.add(operation)
        db.flush()
        completed = Submission(
            learner_id=UUID(learner),
            problem_id=saved.id,
            request_key=str(uuid4()),
            payload_hash="historical-result",
            text="A prior attempt",
            kind="answer",
            assignment_version=1,
            status="completed",
        )
        db.add(completed)
        db.flush()
        db.add(
            Evaluation(
                submission_id=completed.id, answer_status="incorrect", format_status="satisfied"
            )
        )
        db.add(
            TutorTurn(
                submission_id=completed.id,
                message="Historical guidance",
                source="built-in explanation",
                assistance_level=1,
            )
        )
        db.add(
            Interpretation(
                submission_id=completed.id,
                version=1,
                transcription="Prior written work",
                ambiguities=[],
                confirmed_at=utcnow(),
            )
        )
        db.add(Job(submission_id=operation.id, stage="checking", policy_digest="historical"))
        operation_id = operation.id
        db.commit()
    async with client(engine) as device:
        await sign_in_learner(adult, device, learner)
        response = await device.post(
            f"/api/v1/problems/{problem['id']}/submissions",
            json={"version": 1, "text": "5/6"},
            headers={"Idempotency-Key": str(uuid4())},
        )
        assert response.status_code == 409
        assert (await device.post(f"/api/v1/admin/learners/{learner}/export")).status_code == 403
    exported = await adult.post(f"/api/v1/admin/learners/{learner}/export")
    assert exported.status_code == 200, exported.text
    assert exported.json()["sessions"][0]["profile"]["name"] == "Historical profile"
    assert "Historical work" in exported.text
    prior = next(
        op
        for op in exported.json()["sessions"][0]["problems"][0]["operations"]
        if op["text"] == "A prior attempt"
    )
    assert prior["verdict"]["answer_status"] == "incorrect"
    assert prior["message"] == "Historical guidance"
    assert prior["interpretation"] == "Prior written work"
    assert "expected_result" not in exported.text and '"5/6"' not in exported.text

    def forbidden(*_args: object) -> None:
        raise AssertionError("Historical work must not reach a provider")

    monkeypatch.setattr(worker, "complete", forbidden)
    assert worker.run_once(engine)
    operation = (await adult.get(f"/api/v1/operations/{operation_id}")).json()
    assert operation["status"] == "failed" and not operation["retryable"]
    assert "read-only" in operation["safe_error"]
    assert (await adult.post(f"/api/v1/operations/{operation_id}/retry")).status_code == 409
    with Session(engine) as db:
        assert db.get(PracticeSession, UUID(session_id)) is not None
        assert db.get(ProblemInstance, UUID(problem["id"])) is not None
