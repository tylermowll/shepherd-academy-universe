"""Synthetic data only; refuse to seed an existing administrator database."""

from sqlalchemy import select
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session

from math_tutor import auth
from math_tutor.adapters.db.models import Administrator, Learner

DEMO_PASSWORD = "synthetic-demo-password-only"


def seed(engine: Engine) -> None:
    with Session(engine) as db:
        if (
            db.scalar(select(Administrator.id)) is not None
            or db.scalar(select(Learner.id)) is not None
        ):
            raise ValueError("Synthetic seed requires an empty database.")
        auth.create_or_reset_admin(db, "demo", DEMO_PASSWORD)
        db.add_all(
            [
                Learner(
                    alias="Orbit",
                    eligibility="unknown",
                    password_hash=auth.hash_password(DEMO_PASSWORD),
                ),
                Learner(
                    alias="Delta",
                    eligibility="minor",
                    password_hash=auth.hash_password(DEMO_PASSWORD),
                ),
            ]
        )
        db.commit()


def main() -> None:
    import os

    from math_tutor.adapters.db.engine import create_default_engine

    if not os.getenv("DATABASE_URL") or os.getenv("APP_MODE") != "demo":
        raise SystemExit(
            "Set an explicit DATABASE_URL and APP_MODE=demo; only an empty migrated database can be seeded."
        )
    engine = create_default_engine()
    try:
        seed(engine)
    finally:
        engine.dispose()
    print("Created synthetic demo aliases and administrator. See README for the public demo login.")


if __name__ == "__main__":
    main()
