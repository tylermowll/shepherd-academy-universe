UV ?= uv
PNPM ?= pnpm
ENV_FILE ?= $(if $(UV_ENV_FILE),$(UV_ENV_FILE),$(CURDIR)/.env)
# Only operator commands load settings, through captured/redacted uv diagnostics.
LOCAL_COMMAND = $(UV) run --locked --no-env-file python -m math_tutor.local_start --env-file "$(ENV_FILE)" --uv "$(UV)"

.PHONY: bootstrap setup toolchain-check lock lock-check db migrate admin dev-api dev-web test \
	test-integration lint format format-check typecheck build check hooks-install \
	hooks-check hooks-files-check pre-commit-check smoke smoke-built verify-local

bootstrap: toolchain-check
	$(UV) sync --locked
	$(PNPM) install --frozen-lockfile

toolchain-check:
	@command -v node >/dev/null || { echo "Install Node.js from .node-version first (see README)."; exit 1; }
	node scripts/check-toolchain.mjs

hooks-install:
	$(UV) run --locked --no-env-file pre-commit install

hooks-check:
	$(UV) run --locked --no-env-file pre-commit run --all-files

# CI runs the project gate separately; skip only that duplicate hook.
hooks-files-check:
	SKIP=project-check $(UV) run --locked --no-env-file pre-commit run --all-files

lock:
	$(UV) lock
	$(PNPM) install --lockfile-only

lock-check:
	$(UV) lock --check
	$(PNPM) install --lockfile-only --frozen-lockfile --ignore-scripts

db:
	$(LOCAL_COMMAND) --command db

migrate:
	@echo "Stop API/worker writes before migrating."
	$(LOCAL_COMMAND) --command migrate

.PHONY: library-import
library-import:
	$(LOCAL_COMMAND) --command library-import

admin:
	$(LOCAL_COMMAND) --command admin

setup:
	$(UV) run --locked --no-env-file python -m math_tutor.cli setup

dev-api:
	$(UV) run --locked --no-env-file uvicorn math_tutor.api.app:app --reload --no-proxy-headers

dev-web:
	$(PNPM) dev:web

test:
	$(UV) run --locked --no-env-file pytest apps/api/tests/unit
	$(PNPM) test

test-integration:
	$(UV) run --locked --no-env-file pytest apps/api/tests/integration

lint:
	$(UV) run --locked --no-env-file ruff check apps/api
	$(PNPM) lint

format:
	$(UV) run --locked --no-env-file ruff format apps/api
	$(PNPM) format

format-check:
	$(UV) run --locked --no-env-file ruff format --check apps/api
	$(PNPM) format:check

typecheck:
	$(UV) run --locked --no-env-file mypy apps/api/src apps/api/tests
	$(PNPM) typecheck

build:
	$(UV) build
	$(PNPM) build

pre-commit-check: toolchain-check lock-check lint format-check typecheck test

check: pre-commit-check build contracts-check secret-check infra-check

# Keep the application release gate local by default. Recursive invocations
# preserve build-before-browser ordering even when the caller passes -j.
verify-local:
	$(MAKE) hooks-files-check
	$(MAKE) check
	$(MAKE) test-integration
	$(MAKE) smoke-built
	$(MAKE) eval-mock
	$(MAKE) audit

smoke: build

# CI already built the app in `check`; standalone `smoke` still builds first.
smoke smoke-built:
	$(PNPM) smoke

.PHONY: contracts contracts-check secret-check audit eval-mock eval-live eval-reading-mock eval-reading-live eval-teaching-mock eval-teaching-live eval-teaching-adversarial-mock start dev serve demo worker test-e2e infra-check backup restore

contracts:
	$(UV) run --locked --no-env-file python scripts/export-contracts.py --output contracts/openapi.json
	$(PNPM) --filter @math-tutor/contracts generate
	$(PNPM) exec prettier --write apps/web/src/generated/api.d.ts

contracts-check:
	$(UV) run --locked --no-env-file python scripts/check-contracts.py

secret-check:
	$(UV) run --locked --no-env-file python scripts/scan-secrets.py

audit:
	UV="$(UV)" sh scripts/audit-python.sh
	$(PNPM) audit

infra-check:
	$(UV) run --locked --no-env-file cfn-lint infra/aws/household.json

eval-mock:
	$(UV) run --locked --no-env-file python -m math_tutor.evaluation --fixtures evals/fixtures/rational-v1.json --output evals/reports/deterministic.json
	$(MAKE) eval-reading-mock
	$(MAKE) eval-teaching-mock
	$(MAKE) eval-teaching-adversarial-mock

eval-reading-mock:
	$(UV) run --locked --no-env-file python -m math_tutor.reading_evaluation --fixtures evals/fixtures/reading-v1.json --output evals/reports/reading-mock.json

eval-reading-live:
	@test -n "$(PROVIDER)" || { echo "Set PROVIDER to an explicitly configured provider ID."; exit 1; }
	$(UV) run --locked --no-env-file python -m math_tutor.reading_evaluation --fixtures evals/fixtures/reading-v1.json --output /tmp/shepherd-reading-live.json --live-provider "$(PROVIDER)" --authorize-synthetic-calls --max-calls $(if $(MAX_CALLS),$(MAX_CALLS),3)

eval-teaching-mock:
	$(UV) run --locked --no-env-file python -m math_tutor.reading_evaluation --fixtures evals/fixtures/teaching-v1.json --output evals/reports/teaching-mock.json

eval-teaching-adversarial-mock:
	$(UV) run --locked --no-env-file python -m math_tutor.reading_evaluation --fixtures evals/fixtures/teaching-adversarial-v2.json --output evals/reports/teaching-adversarial-mock.json

eval-teaching-live:
	$(UV) run --locked --no-env-file python -m math_tutor.reading_evaluation --fixtures evals/fixtures/teaching-v1.json --output /tmp/shepherd-teaching-live.json --live-active-tutor --authorize-synthetic-calls --max-calls $(if $(MAX_CALLS),$(MAX_CALLS),3)

eval-live:
	@test -n "$(PROVIDER)" || { echo "Set PROVIDER to an explicitly configured provider ID."; exit 1; }
	$(UV) run --locked --no-env-file python -m math_tutor.evaluation --fixtures evals/fixtures/rational-v1.json --output evals/reports/live-synthetic.json --live-provider "$(PROVIDER)" --authorize-synthetic-calls --max-calls 3

start:
	$(LOCAL_COMMAND) --make "$(MAKE)"

dev:
	$(LOCAL_COMMAND) --make "$(MAKE)" --loopback

# A separately configured HTTPS gateway forwards to loopback port 8000.
serve:
	$(LOCAL_COMMAND) --make "$(MAKE)" --gateway

demo: build
	$(UV) run --locked --no-env-file python scripts/serve-demo.py --port 8000

worker:
	$(LOCAL_COMMAND) --command worker

test-e2e: smoke

backup:
	@test -n "$(OUTPUT)" || { echo "Set OUTPUT to a new encrypted backup path; stop writes first."; exit 1; }
	$(LOCAL_COMMAND) --command backup --output "$(OUTPUT)" --writes-stopped

restore:
	@test -n "$(INPUT)" -a -n "$(OUTPUT)" -a -n "$(LEDGER)" || { echo "Set INPUT, a new OUTPUT directory, and the current LEDGER path; stop writes first."; exit 1; }
	$(LOCAL_COMMAND) --command restore --input "$(INPUT)" --output "$(OUTPUT)" --ledger "$(LEDGER)" --writes-stopped

.PHONY: seed-demo down
seed-demo:
	$(UV) run --locked --no-env-file python -m math_tutor.demo

down:
	docker compose -f infra/docker/compose.yaml down
