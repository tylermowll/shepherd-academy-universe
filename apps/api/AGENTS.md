# Backend instructions

Apply the root instructions. Backend contracts that need particular care:

- Keep exact mathematics and immutable domain objects independent of FastAPI,
  database models, and provider clients. Never evaluate learner text as code.
- Public Pydantic schemas must be separate from private persistence/domain objects.
  Prove with serialization tests that expected answers and secrets cannot leak.
- SQLite is the supported database (D004). Use SQLAlchemy/Alembic with Python's
  sqlite3 driver. Test migrations and transactional invariants against temporary
  on-disk databases with the production connection settings, not mocked SQL or
  in-memory-only fixtures. Check the library version loaded by Python.
- Enable WAL, foreign keys on every connection, bounded lock waits, and explicit
  transaction control. Keep writes short; inference happens after commit. API and
  worker share one local directory on one host; no network-mounted database.
- Apply learner ownership and adult authorization in backend services on every
  relevant operation; an opaque UUID is not authorization.
- Public API schema changes use `make contracts` to regenerate OpenAPI and frontend
  types, then `make contracts-check` to check drift.
- For persistence changes, run the affected migration/rollback and integration
  checks on disposable on-disk SQLite. No database daemon or Docker is required.
