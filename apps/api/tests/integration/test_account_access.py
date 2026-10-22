"""T62 public account names and authenticated administrator password changes."""

from typing import Any

import pytest
from sqlalchemy import select
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session
from test_auth_sessions import (
    ADMIN_LOGIN,
    ADMIN_PASSWORD,
    TEST_ORIGIN,
    attempt_login,
    create_admin,
    login_ok,
    make_client,
)
from test_auth_sessions import anyio_backend as anyio_backend
from test_auth_sessions import db_url as db_url
from test_auth_sessions import engine as engine

from math_tutor import auth, settings
from math_tutor.adapters.db.models import Administrator, DeviceSession, Learner
from math_tutor.api.auth import CSRF_HEADER, SESSION_COOKIE, PasswordChangeRequest

PASSWORD_PATH = "/api/v1/auth/password"
ACCOUNTS_PATH = "/api/v1/auth/accounts"


@pytest.fixture(autouse=True)
def clear_rate_limits() -> None:
    auth.clear_login_rate_limit()


def change_body(**changes: Any) -> dict[str, Any]:
    return {
        "current_password": ADMIN_PASSWORD,
        "new_password": "123",
        "password_confirmation": "123",
        **changes,
    }


def add_learner(engine: Engine) -> tuple[str, str]:
    with Session(engine) as db:
        learner = Learner(alias="River", password_hash=auth.hash_password("456"))
        db.add(learner)
        db.flush()
        _, token = auth.create_learner_session(db, learner)
        db.commit()
        return "River", token


@pytest.mark.anyio
async def test_public_account_names_are_role_scoped_and_exclude_private_profile_data(
    engine: Engine,
) -> None:
    async with make_client(engine) as browser:
        for role in ("adult", "learner"):
            empty = await browser.get(ACCOUNTS_PATH, params={"role": role})
            assert empty.status_code == 200 and empty.json() == []
            assert empty.headers["Cache-Control"] == "no-store"
        create_admin(engine)
        with Session(engine) as db:
            db.add_all(
                [
                    Learner(alias="River", eligibility="minor", password_hash="private-hash"),
                    Learner(alias="Sky", password_hash="other-private-hash"),
                    Learner(alias="Disabled", enabled=False, password_hash="private-hash"),
                    Learner(
                        alias="Deleted", deleted_at=auth.utcnow(), password_hash="private-hash"
                    ),
                    Learner(alias="No password"),
                ]
            )
            db.commit()
        learners = await browser.get(ACCOUNTS_PATH, params={"role": "learner"})
        assert learners.json() == [
            {"login_name": "River", "role": "learner"},
            {"login_name": "Sky", "role": "learner"},
        ]
        adults = await browser.get(ACCOUNTS_PATH, params={"role": "adult"})
        assert adults.json() == [{"login_name": ADMIN_LOGIN, "role": "adult"}]
        for response in (learners, adults):
            assert response.status_code == 200
            assert response.headers["Cache-Control"] == "no-store"
            assert "set-cookie" not in response.headers
            assert all(set(row) == {"login_name", "role"} for row in response.json())
            for private in ("private-hash", "eligibility", "password", "_id", "settings"):
                assert private not in response.text


@pytest.mark.anyio
async def test_account_names_require_valid_role_origin_host_and_configured_authentication(
    engine: Engine, monkeypatch: pytest.MonkeyPatch
) -> None:
    create_admin(engine)
    async with make_client(engine) as browser:
        for params in ({}, {"role": "administrator"}, {"role": ""}):
            assert (await browser.get(ACCOUNTS_PATH, params=params)).status_code == 422
        for headers in (
            {"Origin": "https://evil.example"},
            {"Host": "evil.example", "X-Forwarded-Host": "127.0.0.1:8000"},
        ):
            denied = await browser.get(ACCOUNTS_PATH, params={"role": "adult"}, headers=headers)
            assert denied.status_code == 403 and ADMIN_LOGIN not in denied.text
            assert denied.headers["Cache-Control"] == "no-store"
        monkeypatch.delenv(settings.SESSION_SECRET_ENV_VAR)
        denied = await browser.get(ACCOUNTS_PATH, params={"role": "adult"})
        assert denied.status_code == 500 and ADMIN_LOGIN not in denied.text


@pytest.mark.anyio
@pytest.mark.parametrize("origin", [TEST_ORIGIN, "https://tutor.example"])
async def test_administrator_password_change_revokes_old_sessions_and_keeps_replacement(
    engine: Engine, monkeypatch: pytest.MonkeyPatch, origin: str
) -> None:
    monkeypatch.setenv(settings.APP_PUBLIC_ORIGIN_ENV_VAR, origin)
    admin = create_admin(engine)
    _, learner_token = add_learner(engine)
    async with make_client(engine, origin) as first, make_client(engine, origin) as second:
        csrf = await login_ok(first)
        await login_ok(second)
        first_token, second_token = first.cookies[SESSION_COOKIE], second.cookies[SESSION_COOKIE]
        changed = await first.post(PASSWORD_PATH, json=change_body(), headers={CSRF_HEADER: csrf})
        assert changed.status_code == 200, changed.text
        body = changed.json()
        assert body == {
            "authenticated": True,
            "role": "adult",
            "login_name": ADMIN_LOGIN,
            "csrf_token": body["csrf_token"],
        }
        assert body["csrf_token"] != csrf
        assert first.cookies[SESSION_COOKIE] not in (first_token, second_token)
        assert changed.headers["Cache-Control"] == "no-store"
        assert "HttpOnly" in changed.headers["set-cookie"]
        assert ("Secure" in changed.headers["set-cookie"]) == origin.startswith("https:")
        assert (await first.get("/api/v1/auth/session")).json() == body
        assert (await second.get("/api/v1/auth/session")).json()["authenticated"] is False
        with Session(engine) as db:
            assert auth.get_valid_session(db, first_token) is None
            assert auth.get_valid_session(db, second_token) is None
            assert auth.get_valid_session(db, learner_token) is not None
            assert auth.get_valid_session(db, first.cookies[SESSION_COOKIE]) is not None
            stored = db.get(Administrator, admin.id)
            assert stored is not None and stored.local_only_password
            assert stored.password_hash.startswith("$argon2id$")
            assert auth.verify_password(stored.password_hash, "123")
            assert not auth.verify_password(stored.password_hash, ADMIN_PASSWORD)
            assert auth.authenticate_admin(db, ADMIN_LOGIN, "123") is not None
        async with make_client(engine, origin) as fresh:
            assert (await attempt_login(fresh)).status_code == 401
            assert (await attempt_login(fresh, password="123")).status_code == 200


@pytest.mark.anyio
@pytest.mark.parametrize(
    ("changes", "status"),
    [
        ({"current_password": "wrong-current"}, 403),
        ({"password_confirmation": "different-confirmation"}, 422),
        ({"new_password": "12", "password_confirmation": "12"}, 422),
        ({"new_password": "   ", "password_confirmation": "   "}, 422),
        ({"new_password": "ab\n", "password_confirmation": "ab\n"}, 422),
        ({"new_password": "x" * 257, "password_confirmation": "x" * 257}, 422),
        ({"current_password": "x" * 257}, 422),
        ({"new_password": "", "password_confirmation": ""}, 422),
        ({"new_password": None}, 422),
        ({"administrator_id": "untrusted-account"}, 422),
    ],
)
async def test_invalid_password_changes_preserve_credentials_session_and_secret_boundaries(
    engine: Engine, changes: dict[str, Any], status: int
) -> None:
    original = create_admin(engine)
    async with make_client(engine) as browser:
        csrf = await login_ok(browser)
        previous = browser.cookies[SESSION_COOKIE]
        response = await browser.post(
            PASSWORD_PATH, json=change_body(**changes), headers={CSRF_HEADER: csrf}
        )
        assert response.status_code == status, response.text
        assert "set-cookie" not in response.headers
        assert response.headers["Cache-Control"] == "no-store"
        assert browser.cookies[SESSION_COOKIE] == previous
        assert (await browser.get("/api/v1/auth/session")).json()["csrf_token"] == csrf
        assert ADMIN_PASSWORD not in response.text
        for sensitive in (
            "wrong-current",
            "different-confirmation",
            "x" * 257,
            "untrusted-account",
        ):
            assert sensitive not in response.text
        with Session(engine) as db:
            stored = db.get(Administrator, original.id)
            assert stored and stored.password_hash == original.password_hash
            assert auth.get_valid_session(db, previous) is not None
            assert len(db.scalars(select(DeviceSession)).all()) == 1


@pytest.mark.anyio
async def test_password_changes_require_administrator_session_csrf_origin_and_host(
    engine: Engine,
) -> None:
    original = create_admin(engine)
    name, learner_token = add_learner(engine)
    async with make_client(engine) as browser:
        assert (await browser.post(PASSWORD_PATH, json=change_body())).status_code == 401
        learner_login = await attempt_login(browser, login=name, password="456", role="learner")
        assert learner_login.status_code == 200
        rejected = await browser.post(
            PASSWORD_PATH,
            json=change_body(),
            headers={CSRF_HEADER: learner_login.json()["csrf_token"]},
        )
        assert rejected.status_code == 403
    async with make_client(engine) as browser:
        csrf = await login_ok(browser)
        for headers in (
            {},
            {CSRF_HEADER: "forged-token"},
            {CSRF_HEADER: csrf, "Origin": "https://evil.example"},
            {CSRF_HEADER: csrf, "Host": "evil.example", "X-Forwarded-Host": "127.0.0.1:8000"},
        ):
            rejected = await browser.post(PASSWORD_PATH, json=change_body(), headers=headers)
            assert rejected.status_code == 403
            assert "set-cookie" not in rejected.headers
        assert (await browser.get("/api/v1/auth/session")).json()["csrf_token"] == csrf
    with Session(engine) as db:
        stored = db.get(Administrator, original.id)
        assert stored and stored.password_hash == original.password_hash
        assert auth.get_valid_session(db, learner_token) is not None


@pytest.mark.anyio
async def test_password_change_current_password_guesses_are_rate_limited(engine: Engine) -> None:
    original = create_admin(engine)
    async with make_client(engine) as browser:
        csrf = await login_ok(browser)
        for _ in range(auth.LOGIN_RATE_LIMIT):
            response = await browser.post(
                PASSWORD_PATH,
                json=change_body(current_password="wrong-current"),
                headers={CSRF_HEADER: csrf},
            )
            assert response.status_code == 403
        denied = await browser.post(PASSWORD_PATH, json=change_body(), headers={CSRF_HEADER: csrf})
        assert denied.status_code == 429 and int(denied.headers["Retry-After"]) > 0
        assert (await browser.get("/api/v1/auth/session")).json()["authenticated"] is True
        with Session(engine) as db:
            stored = db.get(Administrator, original.id)
            assert stored and stored.password_hash == original.password_hash


@pytest.mark.anyio
@pytest.mark.parametrize("concurrent_change", ["hash", "revocation", "reset"])
async def test_concurrent_password_or_session_change_cannot_be_overwritten(
    engine: Engine, monkeypatch: pytest.MonkeyPatch, concurrent_change: str
) -> None:
    original = create_admin(engine)
    async with make_client(engine) as browser:
        csrf = await login_ok(browser)
        previous = browser.cookies[SESSION_COOKIE]
        verify = auth.verify_password

        def verify_then_change(password_hash: str, password: str) -> bool:
            valid = verify(password_hash, password)
            if password_hash == original.password_hash and password == ADMIN_PASSWORD:
                with Session(engine) as writer:
                    if concurrent_change == "reset":
                        auth.create_or_reset_admin(writer, ADMIN_LOGIN, "concurrent-reset")
                    elif concurrent_change == "hash":
                        admin = writer.get(Administrator, original.id)
                        assert admin
                        admin.password_hash = auth.hash_password("concurrent-reset")
                    else:
                        row = auth.get_valid_session(writer, previous)
                        assert row
                        auth.revoke_session(writer, row)
                    writer.commit()
            return valid

        monkeypatch.setattr(auth, "verify_password", verify_then_change)
        denied = await browser.post(PASSWORD_PATH, json=change_body(), headers={CSRF_HEADER: csrf})
        assert denied.status_code == 401 and "set-cookie" not in denied.headers
        with Session(engine) as db:
            stored = db.get(Administrator, original.id)
            assert stored
            assert verify(
                stored.password_hash,
                ADMIN_PASSWORD if concurrent_change == "revocation" else "concurrent-reset",
            )
            assert not verify(stored.password_hash, "123")
            assert len(db.scalars(select(DeviceSession)).all()) == 1


def test_password_change_request_representation_redacts_every_secret() -> None:
    request = PasswordChangeRequest(**change_body())
    for secret in (ADMIN_PASSWORD, "123"):
        assert secret not in repr(request)
        assert secret not in request.model_dump_json()
