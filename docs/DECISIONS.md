# Implementation decisions

This is the decision record, not a setup guide or a list of current tasks.
[SPECIFICATION](SPECIFICATION.md) defines current requirements; [TASKS](TASKS.md)
owns outstanding work; [implementation history](history/TASKS.md) preserves dated
validation. Historical authorizations below apply to their recorded execution,
not future inference, deployment, downloads or pushes.

## D001 — Supported toolchain baseline (2026-09-06)

**Policy superseded by the October 11 refresh below.** The original choice was
supported stable Python and Node LTS, with exact lockfiles and documented
compatibility exceptions. The September baseline and subsequent validation are
retained in implementation history. They are not current installation instructions.

### Compatibility exception — embedded SQLite 3.53.1 (T01, 2026-09-06)

The selected Python runtime embedded SQLite 3.53.1 rather than the then-current
3.53.4. The project retained the standard driver and tested its actual database
surface instead of adding another driver to hide the gap. The enforced floor is
`MIN_SQLITE_VERSION = (3, 53, 1)`. Check Python's `sqlite3.sqlite_version`, since
upgrading a standalone SQLite CLI does not update Python's linked library.
Recheck this exception when updating the runtime.

## D001 toolchain refresh — T44 (2026-10-08)

**Historical pins, superseded October 11.** This refresh advanced Node 24/Python
3.14 patch versions and retried Vitest 5. Strict type checking reproduced the
`Assertion` declaration conflict with jest-dom, so Vitest stayed on 4.1.11.
The current rationale and resolutions are in [DEPENDENCIES](DEPENDENCIES.md).

## D001 floor-only dependency refresh (2026-10-11)

The maintainer requested minimum-only `>=` requirements for every direct Python
and JavaScript dependency and tool, replacing the LTS and bounded-range policies.
Accept newer stable tool versions, including majors. Retain exact installer pins,
`packageManager`, transitive lock resolutions and container digests for
reproducibility; strict upstream peers and type checks still apply. pnpm's
`pmOnFail: ignore` lets an installed newer CLI satisfy the minimum without being
replaced by the installer pin.

The approved baselines are Python 3.15.0, Node 26.11.1, pnpm 12.11.2 and uv/uv_build
0.13.0. This refresh initially isolated development-only cfn-lint in `tools/infra`
on Python 3.14.8 because its metadata excluded 3.15. D016 supersedes that split
with one root Python project and runtime. The container builder hosts uv; the
final image receives the locked Python environment. This adds no runtime service
or deployment topology.

Python 3.15 HEIF conversion passed with pillow-heif 1.8.1 after its index artifacts
became available; the earlier 1.8.0 workaround is superseded. Application
TypeScript remains locked to 6.0.3 for TypeScript ESLint's declared support;
the isolated OpenAPI generator uses 5.9.3 for its peer contract. Vitest remains
locked to 4.1.11 because the tested Vitest 5/jest-dom declarations conflict.
Direct declarations use minimum floors; these lock exceptions do not waive peers
or type checking. Browser-model device interoperability remains unverified.

[DEPENDENCIES](DEPENDENCIES.md) owns exact resolutions and dated upstream checks;
[implementation history](history/TASKS.md) owns the actual refresh commands and
results. Reassess exceptions on the next dependency update.

## D002 — Local T00 completion (2026-09-06)

**Historical staging decision.** T00 could finish with passing local locked
installation, source/build/browser checks and configured CI, while hosted CI was
unobserved. The later initial publication authorization superseded the original
push deferral. Neither decision waives release acceptance or authorizes later
publication. D007 records the subsequent hosted container finding.

## D003 — T05 before the worker (2026-09-06)

**Superseded staging behavior.** T05 initially returned a persisted deterministic
result synchronously while retaining ownership, idempotency and version checks.
T06 replaced that transport with durable jobs and operation polling; T25/D009
made generated multi-subject tutoring primary. No synchronous compatibility route
or authored-hint fallback is required by this historical decision.

## D004 — SQLite for the initial deployment (2026-09-06)

The maintainer approved SQLite in place of the original PostgreSQL/Fargate/RDS
plan. One private household runs one API process and one separate worker on the
same host, using SQLAlchemy, Alembic and Python's standard sqlite3 driver.
PostgreSQL requires a separate decision and tested data migration if multiple
hosts, sustained write contention or availability needs justify it.

### Storage and connection contract

- Keep the database, WAL and SHM files in one private local directory shared by
  API, worker, migrations and commands. Resolve one absolute path regardless of
  working directory. Network filesystems, live cloud-sync folders and ephemeral
  container layers are unsupported database storage.
- Enable WAL, foreign keys on every connection, `busy_timeout=5000` and
  `synchronous=FULL`. Initialize PRAGMAs outside transactions and verify effective
  values. Configure explicit SQLAlchemy transaction control, including DDL and
  rollback, rather than relying on sqlite3's legacy implicit behavior.
- Keep write transactions short. Bound lock waits/retries and perform external
  inference outside transactions. Store consistent text UUIDs and aware UTC
  timestamps through the tested adapter; reject naive timestamps. Versioned JSON
  is schema-validated text and does not replace relational ownership constraints.
- Use the same engine and connection behavior in development, tests and deployment.
  Restrict file permissions and block private database files from Git. D001 records
  the embedded SQLite compatibility floor.

### Migrations, worker, and recovery

Use real Alembic migrations and temporary on-disk integration fixtures. Test
empty upgrade, current constraints, rollback, reopen/persistence, UTC round trips
and public serialization. Batch table rebuilds preserve named constraints and
retained data and finish with foreign-key checks. Stop API/worker writes before
controlled upgrades.

Claim work inside a short `BEGIN IMMEDIATE` transaction, then commit before
inference. Completion checks the lease token and expiry. There is no
`FOR UPDATE SKIP LOCKED`. Keep independent-connection/process tests for competing
claims, expired leases, duplicate submissions, crashes and deletion races.
The current lease and call budgets are specified in
[specification section 5](SPECIFICATION.md#5-application-architecture).

Back up through SQLite's backup API or the documented quiesced procedure; never
copy only the main file from a live WAL database. Restore checks integrity,
foreign keys, retained objects and deletion tombstones. Operator settings and
secrets have a separate secure recovery process.

### Hosting and future changes

Native setup needs no database daemon or Docker. Optional Compose packaging uses
one host and shared private local storage. The AWS reference design uses one EC2
host with persistent encrypted EBS, gateway/API/worker and scoped instance-role
access; it provides neither horizontal scaling nor automatic failover. Phone
access uses the private HTTPS gateway. See [RUNBOOK](RUNBOOK.md) for operation.

## D005 — Pre-production hard cutovers (2026-09-06)

The maintainer prefers one current implementation without legacy compatibility
code or development-schema bridges. Initial migrations may be corrected and
disposable development databases recreated; real migrations, named constraints,
explicit transactions, rollback tests and private-data protection still apply.
This is not permission to destroy retained learner data.

The original T01/T02 review-only upgrade bridge was removed and its constraints
folded into migration 0002. That old development state is unsupported. Follow the
current stopped-write migration/backup procedure for retained installations and
revisit compatibility guarantees before a production release.

## D006 — Finish the roadmap implementation, defer external evidence (2026-09-06)

The maintainer authorized the original roadmap batch and MIT license while
explicitly deferring checks requiring private accounts or physical devices.
**That batch exception is historical**; the repository's current bounded-task
workflow applies. External quality/device/recovery acceptance remains in
[ACCEPTANCE](ACCEPTANCE.md), not implied by completed implementation tasks.

Surviving implementation choices are one typed submission command with `kind`,
separately bounded raw photo endpoints, authenticated no-store exports, and fixed
server inference budgets. Generated OpenAPI defines the wire contract. Exports
cannot revoke copies already downloaded by an administrator. Provider calls have
at most six operation calls, a 90-second deadline, one image and no automatic
schema-repair retry. D009 supersedes the old photo-confirmation semantics.

OpenAPI generation has an isolated TypeScript workspace to satisfy upstream peers.
The optional WebLLM prototype uses a narrow runtime-checked ESM adapter because
its distributed declarations were incompatible; real-device acceptance is still
open. Encrypted backups require the current deletion ledger and separately
retained settings/secrets. Restore checkpoints the validated database before
copying it so tombstones and session revocations survive WAL handling.

## D007 — Minimal immutable container runtime (2026-09-06)

The first hosted image scan found HIGH/CRITICAL packages and unused installer
components in the original runtime. Use the digest-pinned Distroless Debian 13
nonroot runtime with the tested uv-managed Python, locked application environment
and built public UI. Remove unused interpreter installer code and ensurepip
wheels, preserving actual dependency metadata and strict vulnerability scanning.

The runtime has no shell or package manager and runs as UID/GID 10001. Operations
use explicit Python/CLI entrypoints; dependency changes require rebuilding.
Container checks exercise HEIF conversion, cryptography and absence of unused
pip/setuptools. [DEPENDENCIES](DEPENDENCIES.md) owns current image pins.

## D008 — Bounded provider I/O and destination validation (2026-09-07)

A synthetic slow-response server demonstrated that socket timeouts did not bound
whole-call duration. Keep one persistent worker, but run each live invocation in
a short-lived spawned child without a database connection. The parent deadline
covers startup, DNS, SDK setup and response handling, followed by termination and
reaping (up to 2.1 seconds of cleanup). A child expiry timer also bounds calls if
the parent dies. Mock/domain work stays in process. Worker jobs and administrator
probes use the same boundary. Killing the child cannot guarantee remote
cancellation or prevent provider billing.

Configured HTTP destinations reject metadata names, link-local/metadata,
unspecified and multicast addresses, including mapped IPv6. Resolve once, reject
the entire answer set if any address is forbidden, then connect only to validated
IPs while preserving Host and TLS server name. Try another validated address only
if connection setup failed before HTTP transmission; do not retry response/read
failures. Redirects and environment proxies are disabled. The operator still
identifies network ownership and selects the correct data boundary.

Validate every consumed nested response field while ignoring unused vendor
metadata. Malformed envelopes produce safe typed failures rather than terminating
the worker. Bedrock request schemas are checked against the installed SDK,
including optional cache-usage metadata. Contract tests do not establish live
provider readiness; [PROVIDER_STATUS](PROVIDER_STATUS.md) owns that evidence.

## D009 — AI tutoring is the primary product (2026-09-07)

The maintainer replaced the catalog-first scope with topic → generated activity →
work → reading → guidance → revision/discussion → next activity across subjects,
without a required grade level or exact verifier.

Assignments are reference-only: explain concepts and generate distinct analogous
practice. Do not give the active task's answer, finish an essay or claim access
to a book from its title. Learner/model/image instructions cannot override these
rules. Initiative is learner-led, balanced or tutor-led; recent owned work informs
follow-ups without certifying mastery.

Persist and show photo interpretation before guidance. The worker continues when
quality is clear, confidence is at least 0.85, task-relevant text is nonempty,
no blocking reason exists and operation/version checks pass. Incidental uncertainty
is qualified without blocking useful feedback. Essential unreadable content gets
specific clarification/retake advice. There is no approval or browser acknowledgment
gate. Confidence is a model routing heuristic, not calibrated accuracy.

Model guidance is fallible AI assessment, never a verified grade. Exact domain
checks remain optional evidence; no fixed-template catalog or authored-hint fallback
belongs in the tutor. Backend code owns permissions, state and persistence.
Historical T00–T24 results describe earlier workflows. Actual-model review is
required for answer leakage, false correction, handwriting and teaching quality;
schemas and mocks cannot prove these properties.

## D010 — Browser-managed AI connections and persistent local startup (2026-09-07)

The administrator manages model access through Settings, replacing the original
file-preconfiguration-only restriction. Keep the existing transports and SQLite
architecture. Browser-managed definitions and encrypted credentials live in the
private database; file-managed connections stay read-only.

Credential inputs are write-only. Encrypt using a purpose-derived key from the
deployment secret and expose only configured status. A database-only copy remains
protected; a host compromise with both secret and database does not. Backups need
the original secret; replacing it requires re-entering provider keys.

Save, synthetic test and active-role selection are separate. Saving makes no
model request. Tests require explicit authorization and disclose possible cost;
configuration/key changes invalidate relevant capability evidence and pending
operation fingerprints. Saved cloud/audience policy remains subject to deployment
environment restrictions; demo mode cannot enable live inference.

The launcher may load settings at application runtime without shell evaluation;
coding agents may not inspect private settings or data. Generate missing settings
exclusively and preserve existing accounts/data. No model installation, secret
return endpoint, extra service or local-to-cloud fallback is introduced.
D011/D014 supersede this decision's original CLI-only first-account detail.

## D011 — Browser-first owner setup and loopback password policy (2026-09-07)

The maintainer replaced CLI-only first setup with a private one-use owner link
printed by native startup or issued over the Docker API's owner-only Unix socket.
An unopened link expires in thirty minutes; renewal replaces it only while no
administrator exists. There is no HTTP endpoint for issuing setup authority.
Concurrent claims serialize and cannot reset or add an administrator.

**Token handling is superseded by D014:** exchange the link for scoped browser
permission rather than keeping the owner token until form submission. Docker
issuance uses owner-only tmpfs and checks the first-account condition under the
same database lock. PWA updates defer refresh during setup.

**Amended by T53 (2026-10-18):** The maintainer replaced the original
origin-dependent password minimum and local-only account restriction with one
6–256-character policy for administrator and learner accounts on both loopback
HTTP and HTTPS, without composition rules. Existing accounts with passwords of
at least six characters work over HTTPS without a reset; the change does not
rewrite stored credentials. The separate backup passphrase policy is unchanged.
An explicit operator administrator reset can change or recover the existing
account; no anonymous web reset is added. The six-character minimum is a
convenience tradeoff, not a claim of strong password protection. Restarts preserve
accounts, settings, encryption and access policy.

## D012 — Operator-selected audience for Meta-hosted inference (2026-09-07)

The maintainer rejected a hard-coded Meta age gate in favor of a disclosure and
operator-selected, attested audience. The hosted `meta` adapter remains cloud-only;
local Llama uses Ollama or vLLM. The backend enforces the configured audience,
cloud permission, ownership and successful capability tests. Saving calls no model.

The operator must review the terms and jurisdiction applying to their account;
the app neither certifies eligibility nor treats API compatibility as permission.
The connection editor discloses provider-specific terms and requires acknowledgment.
Meta's [hosted terms](https://llama.developer.meta.com/legal/terms-of-service) and
locally hosted model licenses are separate agreements. Current integration and
verification limits belong in [PROVIDER_STATUS](PROVIDER_STATUS.md).

## D013 — Administrator-managed learner accounts (2026-09-08)

One administrator manages distinct learner usernames and passwords. Learner
sessions access only their owned Practice and History; administrator navigation
is Learners, Settings and Help, with synthetic connection testing in Settings.
Administrators who study use a separate learner account. No public signup,
external identity service or email recovery is added.

Use Argon2id, opaque cookies, CSRF/origin checks, bounded sessions and rate limits.
Passwords are write-only and excluded from lists/exports. Resets revoke learner
sessions. Normalized case-insensitive username keys are unique in SQLite and
cannot conflict with the administrator's login.

This superseded profile-only learners and device pairing. The cutover migration
preserved IDs/work, suffixed conflicting old names deterministically and required
administrator-set passwords rather than shared defaults. Pairing requests and
endpoints were retired. Photo-camera delegation remains a separate limited
capability, never a learner sign-in.

**T60 clarification (2026-10-21):** Management and Learning have separate
navigation and standalone **Administrator sign-in** and **Learner sign-in**
screens. The anonymous app opens at Learner sign-in. Each sign-in screen offers
Help and a link to the other screen. Management's learner-list actions explicitly
say **Manage account** and retain the administrator session.

Login requests require the intended account role. The backend rejects credentials
for a different role before revoking or replacing the current session. Opening,
failing or canceling the other sign-in preserves the current account and unsent
work; the current role's sign-in link returns to that workspace. A successful
sign-in for the requested role replaces the session and clears prior-account
browser content. Account ownership and permissions continue to follow the
authenticated role.

## D014 — Browser permission for completing setup (2026-09-08)

Opening an unexpired owner link exchanges it once for a signed HttpOnly cookie
scoped to `/api/v1/auth/setup`. It uses SameSite=Strict, Secure on HTTPS and an
absolute eight-hour lifetime. Its signature binds it to setup and the configured
origin; it survives refreshes and API restart with the same deployment secret but
cannot authenticate normal requests. Discard the original owner token after
exchange. Renewing an unopened link does not revoke already exchanged permission.

Creation still checks CSRF, rate limits, origin and the serialized first-account
condition in SQLite. Existing accounts close setup regardless of cookie state.
Success or cancellation clears the cookie. Refresh anonymous CSRF before form
submission. No password, owner token or setup cookie enters localStorage or
sessionStorage; no alternate account-creation protocol or setup table is added.

## D015 — Retire catalog-era runtime workflows (2026-10-17)

The maintainer authorized removing the legacy bloat identified after T45.
Complete D009's product cutover by removing the catalog-only APIs, authored
answer delivery, manual photo confirmation and old model payload/worker branches.
Current tutoring keeps its ownership, automatic reading, retry and recovery
contracts; exact arithmetic remains independent domain/evaluation support.

Keep existing migrations and stored historical records. Administrator exports
retain historical work and recorded verdicts; old practice cannot accept new
work or invoke a provider. This avoids destructive data changes while removing
the second teaching implementation. No compatibility route, schema bridge or
new infrastructure is introduced. Explicitly optional browser-model research
remains outside learner navigation.

## D016 — One Python project and runtime (2026-10-17)

The maintainer explicitly selected one root `pyproject.toml`, `uv.lock`,
`.python-version` and `.venv` for the application and development tools, all on
Python 3.15. Application source, migrations and tests remain under `apps/api`;
Make, CI, native startup and container builds use the root project. Remove the
separate infrastructure project and Python 3.14 pin.

cfn-lint 1.57.2's [published Python upper bound](https://pypi.org/pypi/cfn-lint/1.57.2/json)
lags its [merged Python 3.15 decoder fix](https://github.com/aws-cloudformation/cfn-lint/pull/4717).
uv's [documented resolver behavior](https://docs.astral.sh/uv/concepts/resolution/#requires-python)
ignores dependency Python upper bounds; normal installation and locking succeed
without metadata overrides. The checked released CLI accepts valid JSON/YAML and
the household template on 3.15, and rejects an invalid template with E3030.
This is tested project compatibility, not a claim of formal upstream support.

The consolidated lock extends the prior 90-package application resolution to
97 packages, retaining every existing version and adding the seven validator
packages from the former infrastructure lock. Keep exact lock resolutions and
repeat installation, validation and audit checks when dependencies change.
