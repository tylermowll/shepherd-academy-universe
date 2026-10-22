"""Account identity, reset races, authorization, and private credential boundaries."""

from typing import Any, Literal
from uuid import UUID, uuid4

import pytest
from httpx2 import AsyncClient
from sqlalchemy import select
from sqlalchemy.engine import Engine
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from test_provider_connections import add, record_probes
from test_workflows import adult as adult
from test_workflows import anyio_backend as anyio_backend
from test_workflows import client, read_problem, send, start
from test_workflows import engine as engine

from math_tutor import auth, worker
from math_tutor.adapters.db.models import DeviceSession, Job, Learner, PracticeSession, Submission
from math_tutor.adapters.providers.transports import MockProvider
from math_tutor.api.auth import SESSION_COOKIE
from math_tutor.demo import DEMO_PASSWORD

PASSWORD = "synthetic-learner-password"
REPLACEMENT = "synthetic-replacement-password"


async def create(adult: AsyncClient, name: str = "River") -> dict[str, Any]:
    response = await adult.post(
        "/api/v1/admin/learners", json={"alias": name, "password": PASSWORD, "eligibility": "minor"}
    )
    assert response.status_code == 201, response.text
    return dict(response.json())


async def login(
    browser: AsyncClient,
    name: str,
    password: str,
    role: Literal["adult", "learner"] = "learner",
) -> Any:
    browser.headers["X-CSRF-Token"] = (await browser.get("/api/v1/auth/session")).json()[
        "csrf_token"
    ]
    response = await browser.post(
        "/api/v1/auth/login", json={"login_name": name, "password": password, "role": role}
    )
    if response.status_code == 200:
        browser.headers["X-CSRF-Token"] = response.json()["csrf_token"]
    return response


@pytest.mark.anyio
@pytest.mark.parametrize("current_role", ["adult", "learner"])
async def test_role_bound_sign_in_preserves_session_until_matching_credentials_succeed(
    adult: AsyncClient, engine: Engine, current_role: Literal["adult", "learner"]
) -> None:
    await create(adult)
    credentials = {"adult": ("demo", DEMO_PASSWORD), "learner": ("River", PASSWORD)}
    target_role: Literal["adult", "learner"] = "learner" if current_role == "adult" else "adult"
    async with client(engine) as browser:
        assert (await login(browser, *credentials[current_role], current_role)).status_code == 200
        previous_cookie = browser.cookies[SESSION_COOKIE]
        previous_status = (await browser.get("/api/v1/auth/session")).json()
        with Session(engine) as db:
            previous_sessions = set(db.scalars(select(DeviceSession.id)))

        rejected = await login(browser, *credentials[target_role], current_role)
        destination = "Administrator" if target_role == "adult" else "Learner"
        assert rejected.status_code == 403
        assert rejected.json() == {"detail": f"Use {destination} sign-in for this account."}
        assert "set-cookie" not in rejected.headers
        assert browser.cookies[SESSION_COOKIE] == previous_cookie
        assert (await browser.get("/api/v1/auth/session")).json() == previous_status
        with Session(engine) as db:
            assert set(db.scalars(select(DeviceSession.id))) == previous_sessions
            assert auth.get_valid_session(db, previous_cookie) is not None

        incorrect = await login(
            browser, credentials[target_role][0], "wrong-password", current_role
        )
        assert incorrect.status_code == 401
        assert incorrect.json() == {"detail": "Invalid login name or password."}
        assert "set-cookie" not in incorrect.headers
        assert browser.cookies[SESSION_COOKIE] == previous_cookie
        assert (await browser.get("/api/v1/auth/session")).json() == previous_status

        accepted = await login(browser, *credentials[target_role], target_role)
        assert accepted.status_code == 200 and accepted.json()["role"] == target_role
        assert browser.cookies[SESSION_COOKIE] != previous_cookie
        assert accepted.json()["csrf_token"] != previous_status["csrf_token"]
        with Session(engine) as db:
            assert auth.get_valid_session(db, previous_cookie) is None
            assert auth.get_valid_session(db, browser.cookies[SESSION_COOKIE]) is not None
        assert (await browser.get("/api/v1/admin/learners")).status_code == (
            200 if target_role == "adult" else 403
        )


@pytest.mark.anyio
async def test_unique_normalized_names_include_admin_and_unicode(
    adult: AsyncClient, engine: Engine
) -> None:
    row = await create(adult, "  River   Blue  ")
    assert row["alias"] == "River Blue" and row["has_password"]
    for duplicate in ["river blue", "Ｒｉｖｅｒ　Ｂｌｕｅ", "DEMO"]:
        response = await adult.post(
            "/api/v1/admin/learners", json={"alias": duplicate, "password": PASSWORD}
        )
        assert response.status_code == 409
    with Session(engine) as db:
        db.add(Learner(alias="RIVER BLUE"))
        with pytest.raises(IntegrityError):
            db.flush()
    with Session(engine) as db, pytest.raises(ValueError, match="administrator already exists"):
        auth.create_or_reset_admin(db, "another-admin", PASSWORD)


@pytest.mark.anyio
async def test_password_is_write_only_and_reset_revokes_sign_ins(
    adult: AsyncClient, engine: Engine
) -> None:
    row = await create(adult)
    with Session(engine) as db:
        stored = db.get(Learner, UUID(row["id"]))
        assert stored and stored.password_hash and stored.password_hash != PASSWORD
        assert auth.verify_password(stored.password_hash, PASSWORD)
    for path in ["/api/v1/admin/learners", f"/api/v1/admin/learners/{row['id']}/export"]:
        response = await (adult.get(path) if path.endswith("learners") else adult.post(path))
        assert "password_hash" not in response.text and PASSWORD not in response.text
    async with client(engine) as browser:
        assert (await login(browser, "river", "wrong-password")).status_code == 401
        signed = await login(browser, " RIVER ", PASSWORD)
        assert signed.status_code == 200
        assert signed.json()["role"] == "learner" and signed.json()["learner_id"] == row["id"]
        assert (await browser.get("/api/v1/admin/learners")).status_code == 403
        assert (
            await browser.patch(
                f"/api/v1/admin/learners/{row['id']}/account",
                json={"alias": "River", "password": REPLACEMENT},
            )
        ).status_code == 403
        devices = (await adult.get(f"/api/v1/admin/learners/{row['id']}/devices")).json()
        assert len(devices) == 1 and set(devices[0]) == {"id", "created_at", "expires_at"}
        reset = await adult.patch(
            f"/api/v1/admin/learners/{row['id']}/account",
            json={"alias": "River", "password": REPLACEMENT},
        )
        assert reset.status_code == 200
        assert (await browser.get("/api/v1/auth/session")).json()["authenticated"] is False
        assert (await login(browser, "River", PASSWORD)).status_code == 401
        assert (await login(browser, "River", REPLACEMENT)).status_code == 200
        own = (await adult.get(f"/api/v1/admin/learners/{row['id']}/devices")).json()[0]
        other = await create(adult, "Sky")
        assert (
            await adult.delete(f"/api/v1/admin/learners/{other['id']}/devices/{own['id']}")
        ).status_code == 404
        assert (
            await adult.delete(f"/api/v1/admin/learners/{row['id']}/devices/{own['id']}")
        ).status_code == 200
        assert (await browser.get("/api/v1/tutor/sessions")).status_code == 401


@pytest.mark.anyio
async def test_reset_during_password_verification_prevents_stale_login(
    adult: AsyncClient, engine: Engine, monkeypatch: pytest.MonkeyPatch
) -> None:
    row = await create(adult)
    authenticate = auth.authenticate_learner

    def verify_then_reset(db: Session, name: str, password: str) -> Learner | None:
        result = authenticate(db, name, password)
        with Session(engine) as writer:
            learner = writer.get(Learner, UUID(row["id"]))
            assert learner
            learner.password_hash = auth.hash_password(REPLACEMENT)
            writer.commit()
        return result

    monkeypatch.setattr(auth, "authenticate_learner", verify_then_reset)
    async with client(engine) as browser:
        assert (await login(browser, "River", PASSWORD)).status_code == 401
        assert (await browser.get("/api/v1/auth/session")).json()["authenticated"] is False


@pytest.mark.anyio
async def test_existing_profile_requires_explicit_password_and_rename_keeps_identity(
    adult: AsyncClient, engine: Engine
) -> None:
    with Session(engine) as db:
        learner = Learner(alias="Prior profile")
        db.add(learner)
        db.commit()
        identifier = str(learner.id)
    rows = (await adult.get("/api/v1/admin/learners")).json()
    assert next(row for row in rows if row["id"] == identifier)["has_password"] is False
    async with client(engine) as browser:
        assert (await login(browser, "Prior profile", PASSWORD)).status_code == 401
        response = await adult.patch(
            f"/api/v1/admin/learners/{identifier}/account",
            json={"alias": "Renamed profile", "password": PASSWORD},
        )
        assert response.status_code == 200 and response.json()["id"] == identifier
        assert (await login(browser, "Prior profile", PASSWORD)).status_code == 401
        assert (await login(browser, "Renamed profile", PASSWORD)).json()[
            "learner_id"
        ] == identifier


@pytest.mark.anyio
@pytest.mark.parametrize("eligibility", ["adult", "minor", "unknown"])
async def test_age_correction_preserves_password_session_and_saved_work(
    adult: AsyncClient, engine: Engine, eligibility: str
) -> None:
    row = await create(adult)
    session_id, problem = await start(adult, row["id"])
    completed = await send(adult, problem, "I compared the equal-sized parts.")
    assert worker.run_once(engine)
    with Session(engine) as db:
        learner = db.get(Learner, UUID(row["id"]))
        assert learner
        old_hash = learner.password_hash
        # Exercise adult -> minor/unknown as well as minor -> adult.
        learner.eligibility = "minor" if eligibility == "adult" else "adult"
        db.commit()
    async with client(engine) as browser:
        assert (await login(browser, "River", PASSWORD)).status_code == 200
        changed = await adult.patch(
            f"/api/v1/admin/learners/{row['id']}/account",
            json={"alias": "River", "eligibility": eligibility},
        )
        assert changed.status_code == 200, changed.text
        assert changed.json()["eligibility"] == eligibility
        assert changed.json()["id"] == row["id"]
        assert (await browser.get("/api/v1/auth/session")).json()["authenticated"]
        saved = (await read_problem(browser, session_id))["operations"][0]
        assert saved["id"] == completed["id"] and saved["status"] == "completed"
        assert saved["feedback"]
    with Session(engine) as db:
        learner = db.get(Learner, UUID(row["id"]))
        submission = db.get(Submission, UUID(completed["id"]))
        session = db.get(PracticeSession, UUID(session_id))
        assert learner and learner.password_hash == old_hash
        assert submission and submission.learner_id == learner.id
        assert submission.text == "I compared the equal-sized parts."
        assert session and session.learner_id == learner.id


@pytest.mark.anyio
async def test_only_administrator_can_correct_age_and_invalid_values_leave_it_unchanged(
    adult: AsyncClient, engine: Engine
) -> None:
    row = await create(adult)
    other = await create(adult, "Sky")
    async with client(engine) as learner, client(engine) as guest:
        assert (await login(learner, "River", PASSWORD)).status_code == 200
        for target in (row, other):
            assert (
                await learner.patch(
                    f"/api/v1/admin/learners/{target['id']}/account",
                    json={"alias": target["alias"], "eligibility": "adult"},
                )
            ).status_code == 403
        assert (
            await guest.patch(
                f"/api/v1/admin/learners/{row['id']}/account",
                json={"alias": "River", "eligibility": "adult"},
            )
        ).status_code == 401
    assert (
        await adult.patch(
            f"/api/v1/admin/learners/{row['id']}/account",
            json={"alias": "River", "eligibility": "unrestricted"},
        )
    ).status_code == 422
    assert (
        await adult.patch(
            f"/api/v1/admin/learners/{uuid4()}/account",
            json={"alias": "Missing", "eligibility": "adult"},
        )
    ).status_code == 404
    with Session(engine) as db:
        for item in (row, other):
            stored = db.get(Learner, UUID(item["id"]))
            assert stored and stored.eligibility == "minor"


async def adult_only_tutor(
    adult: AsyncClient, engine: Engine, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setenv("APP_AUDIENCE", "adult_only")
    await add(adult, "age-restricted", audience="adult_only")
    record_probes(engine, "age-restricted")
    response = await adult.post(
        "/api/v1/admin/providers/routes",
        json={"tutor": "age-restricted", "vision": "demo", "acknowledge_data_boundary": True},
    )
    assert response.status_code == 200, response.text


@pytest.mark.anyio
@pytest.mark.parametrize("eligibility", ["minor", "unknown"])
@pytest.mark.parametrize("phase", ["queued", "prepared"])
async def test_age_change_stops_pending_work_and_discards_late_results(
    adult: AsyncClient,
    engine: Engine,
    monkeypatch: pytest.MonkeyPatch,
    eligibility: str,
    phase: str,
) -> None:
    row = await create(adult)
    changed = await adult.patch(
        f"/api/v1/admin/learners/{row['id']}/account",
        json={"alias": "River", "eligibility": "adult"},
    )
    assert changed.status_code == 200
    session_id, problem = await start(adult, row["id"])
    other = await create(adult, "Sky")
    _, other_problem = await start(adult, other["id"])
    assert (
        await adult.patch(
            f"/api/v1/admin/learners/{other['id']}/account",
            json={"alias": "Sky", "eligibility": "adult"},
        )
    ).status_code == 200
    await adult_only_tutor(adult, engine, monkeypatch)
    pending = await send(adult, problem, "A synthetic pending explanation.")
    # Saving the same age group must leave existing requests untouched.
    assert (
        await adult.patch(
            f"/api/v1/admin/learners/{row['id']}/account",
            json={"alias": "River", "eligibility": "adult"},
        )
    ).status_code == 200
    assert (await read_problem(adult, session_id))["operations"][0]["status"] == "queued"
    claim = worker.claim(engine) if phase == "prepared" else None
    if phase == "prepared":
        assert claim is not None
    prepared = worker.prepare(engine, claim) if claim else None
    # The other learner's queued work must be preserved by the correction.
    other_pending = await send(adult, other_problem, "Another learner's explanation.")
    changed = await adult.patch(
        f"/api/v1/admin/learners/{row['id']}/account",
        json={"alias": "River", "eligibility": eligibility},
    )
    assert changed.status_code == 200
    if claim and prepared:
        late_result = MockProvider().complete(prepared.request)
        assert worker.finish(engine, claim, late_result, prepared.source) is False
    with Session(engine) as db:
        job = db.scalar(select(Job).where(Job.submission_id == UUID(pending["id"])))
        submission = db.get(Submission, UUID(pending["id"]))
        untouched = db.get(Submission, UUID(other_pending["id"]))
        assert job and job.state == "canceled" and job.lease_token is None
        assert job.lease_expires_at is None and not job.retryable
        assert submission and submission.status == "canceled" and submission.safe_error
        assert submission.text == "A synthetic pending explanation."
        assert untouched and untouched.status == "queued"
    blocked = await adult.post(
        "/api/v1/tutor/sessions",
        json={"learner_id": row["id"], "topic": "Scientific evidence"},
        headers={"Idempotency-Key": str(uuid4())},
    )
    assert blocked.status_code == 422 and blocked.json()["code"] == "audience_blocked"


@pytest.mark.anyio
async def test_correcting_age_to_adult_allows_the_existing_account_to_use_adult_route(
    adult: AsyncClient, engine: Engine, monkeypatch: pytest.MonkeyPatch
) -> None:
    row = await create(adult)
    await adult_only_tutor(adult, engine, monkeypatch)
    body = {"learner_id": row["id"], "topic": "Scientific evidence"}
    blocked = await adult.post(
        "/api/v1/tutor/sessions", json=body, headers={"Idempotency-Key": str(uuid4())}
    )
    assert blocked.status_code == 422 and blocked.json()["code"] == "audience_blocked"
    assert (
        await adult.patch(
            f"/api/v1/admin/learners/{row['id']}/account",
            json={"alias": "River", "eligibility": "adult"},
        )
    ).status_code == 200
    allowed = await adult.post(
        "/api/v1/tutor/sessions", json=body, headers={"Idempotency-Key": str(uuid4())}
    )
    assert allowed.status_code == 201, allowed.text
    assert allowed.json()["learner_id"] == row["id"]
