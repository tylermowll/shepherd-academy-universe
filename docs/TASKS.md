# Implementation tasks

This file owns the current work queue and completion evidence. The
[specification](SPECIFICATION.md) defines product requirements;
[implementation history](history/TASKS.md) preserves T00–T44 and the October 11
dependency refresh. Superseded workflows in that archive are historical evidence.
A task is complete only after its requirements and exit checks pass.

## Current checkpoint

The application is implemented through T44, with the October 11 dependency
refresh, T45 documentation consolidation, T46 legacy cleanup and T47 root Python
project consolidation. T48 reviewed documentation and help wording; T49
closed process gaps found in the subsequent flow review. T50 records the
independent adversarial review and its bounded corrections. T51 records the
initial October 18 deployment; T52 links learning/administration and deploys the
maintainer's subsequent lock update. T53 applies the maintainer's six-character
account password minimum on both HTTP and HTTPS. T54 records the subsequent
source-only dependency refresh; T55 reviews and publishes the reconciled October
19 lock. T56 updates the persistent development tools and project dependencies.
T57 repairs the maintainer workstation's missing JavaScript toolchain and checks
the subsequent Python lock refresh. T58 upgrades the available development tools
and compatible dependencies, publishes them and updates the private local app.
T59 removes the oversized page-heading focus box while preserving accessible
focus management and visible keyboard focus on controls, and deploys the fix.
T60 separates Management and Learning with role-specific sign-in, deployment-relative
links and explicit learner-account management actions, and deploys the result.
T61 clarifies the selected sign-in role, makes role-specific password recovery
discoverable and deploys the checked UI/help changes. T62 simplifies household
account access with the maintainer-approved three-character password minimum,
sign-in account names and portal password changes; see its status below. T63 adds
a repository-specific UI/UX review skill spanning learner and administrator
workflows; it does not establish that those workflows passed a new audit. T64
validates and publishes the remaining account/skill changes with the maintainer's
latest root lockfile update.
The schema head is `0020_request_recovery`. The latest private deployment uses
the frozen T62 source snapshot `3845f8c`, Python 3.15.0, FastAPI 0.159.1 and
pillow-heif 1.8.1, verified on **October 22, 2026**. T62 below records the
immutable image, encrypted backup/isolated restore, served assets, browser and
authorization checks. The last published runtime source remains `6171f22`. The earlier installation
is preserved in the [October 11 release record](history/TASKS.md#release-publication-2026-10-11).
This is dated evidence; current provider selections and live teaching quality
have not been verified.

The maintainer refreshed the former `apps/api/uv.lock` before T46 publication.
T47 preserves those versions and artifacts in the root `uv.lock`, adding the
CloudFormation validator. T51–T53 and T58 verify the consolidated project's current
container packaging and private installation; October 11's evidence is historical.

The remaining release work is in [ACCEPTANCE](ACCEPTANCE.md#items-requiring-the-maintainer).
T47 records the Python project consolidation. T46 records the earlier cleanup
and publication checks. Browser-model research and AWS hosting remain optional.

## T64 — Publish pending account, review-skill and lock updates (2026-10-22)

**Status:** Validation complete; Git publication is pending. The maintainer
authorized pushing to `main` with their `uv.lock` updates and all other pending
repository changes included.

**Scope and contracts:** Publish the existing T62 account behavior and generated
schemas, T63 review skill and references, associated documentation/tests, and the
maintainer's exact lockfile. SPECIFICATION sections 3, 12, 13 and 18 and the root
Makefile govern verification. Preserve unrelated work and private-data boundaries.
No deployment, paid provider inference, model download or product-policy change
is part of this publication.

**Lockfile:** The supplied `uv.lock` has SHA-256
`95bbc12a27fa194c35aecc20d9d8e5d41c244c942b43841d6319d95fad121cdb`.
It updates boto3/botocore 1.43.117 → 1.43.118, FastAPI 0.159.1 → 0.161.0,
pycparser 3.11 → 3.12 and Ruff 0.17.1 → 0.17.2. Validate it without regenerating
or replacing the maintainer's dependency selections.

**Plan and gates:** Review the combined source diff and ensure only public source,
synthetic fixtures and documentation are included. Run targeted auth/account
checks, `make check`, `make test-integration`, the built desktop/mobile browser
suite, skill validation and repository file checks, sequentially where they share
build/server outputs. Record actual failures and outcomes. Commit using normal
hooks, push without force, and verify remote `main` and a clean working tree.

**Validation:** Commands use `/tmp/shepherd-t64/run`, which passes a
small explicit environment allowlist, clears inherited operator/provider settings,
disables environment-file loading and uses a temporary uv cache. No live private
settings or data are read.

- `git fetch origin`: passed; local and remote `main` both started at `9b43820`.
- Focused `test_auth_secrets.py` and `test_account_access.py`: **48 passed in
  4.18s**. Focused SignInAccounts/AdministratorAccount components: **8 passed**.
- `make check`: **329 backend unit, 11 toolchain and 246 component tests passed**;
  locked resolution, lint/format, strict types, production builds, generated API
  drift, credential scan and infrastructure checks passed. Existing build-system
  upper-bound and bundle-size warnings remain.
- `make test-integration`: **403 passed in 71.41s**, using temporary on-disk
  databases and synthetic data.
- `make audit`: Python and JavaScript audits both reported **no known
  vulnerabilities** in the supplied locked dependencies.
- Skill validator and six-file Markdown formatting passed; **133 local skill
  links resolve**. `git diff --check HEAD` passed. The supplied lockfile hash
  remains unchanged after validation.
- Independent backend and frontend source reviews found **no publication
  blocker**. The T63 administrator-draft concern remains a separate follow-up.
  A frontend reviewer also noted that a prior learner notice can remain visible
  when selecting administrator management; the broader notice carryover predates
  this change and remains a bounded UI review follow-up.

`make smoke-built`: **96 desktop/mobile Chromium cases passed in 15.3 minutes**,
with one worker and zero retries. Existing login throttles remained in force.
No application implementation or test requirement was changed for publication.

`make hooks-files-check secret-check`: **passed** on the complete staged set,
including the six new skill files. All applicable repository file hooks passed;
the file-only target skips only the project gate already run above. The tracked
credential scan and `git diff --cached --check` passed. The explicit publication
manifest contains **38 files**; the staged lockfile matches the recorded supplied
hash. Commit and push outcomes will be recorded after publication.

Live-provider evaluations, paid inference, model downloads, physical-device/manual
accessibility checks, container rebuild/deployment and hosted CI were not run as
part of the local pre-publication checks. Existing release-acceptance limits remain.

## T63 — Add a whole-application UI/UX review skill (2026-10-22)

**Status:** Complete; structural, file and independent behavioral validation
finished. The maintainer authorized adapting the design critique, accessibility
and UX writing approach into a repository skill, including administrator and
other application workflows. This task creates the review capability; it does
not claim a completed application audit.

**Scope and contracts:** Agent instructions and review references only;
SPECIFICATION sections 2–4, 8, 10–14 and 18; existing ACCEPTANCE gaps; current
Makefile and isolated synthetic Playwright harness. Cover setup, role access,
account administration, providers/privacy, learning/materials, phone/photos,
history, Help and interruption/PWA recovery. Preserve current product contracts,
private-data boundaries and unrelated T62 edits. No application behavior,
generated contracts, dependencies or deployment changes are required.

**Plan:** Add one discoverable `ui-ux-review` skill with a workflow inventory and
separate design, WCAG 2.2 AA accessibility and writing references. Adapt the
approach in original repository-specific prose and record pinned upstream
sources. Require scoped coverage, reproducible findings and explicit evidence
limits. Reuse the existing browser harness rather than introducing a tour stack.

**Validation plan:** Run the skill-creator validator, Markdown formatting and
local-link checks, scoped repository file hooks and `git diff --check`. Exercise
the skill independently on realistic source-only requests, keeping generated
evaluation artifacts outside the worktree. Runtime suites are not required for
this instruction-only task; application UI, real devices, screen readers and
providers remain unaudited by this change.

**Implementation:** `.agents/skills/ui-ux-review/SKILL.md` defines scope, coverage
statuses, evidence collection and findings. Five references map **23 current
journeys** to source/tests, provide the three review lenses and record upstream
provenance. Optional research, specification-only surfaces and dated acceptance
gaps are distinguished from implemented journeys and new observations. Focused
requests retain their scope; whole-app reviews include account administration,
all four Settings sections and transitions between administrator/learner roles.

The guidance is original repository-specific prose informed by Anthropic's
`knowledge-work-plugins` commit `33d3dea41a341b341d4f5da2e8801ae0c89be2b8`.
Its README calls the copy skill `ux-writing`, while the actual source is `ux-copy`;
the source reference records that inconsistency. The accessibility reference uses
the project's WCAG 2.2 AA target and correctly separates 2.5.8 minimum target size
from 2.5.5 AAA enhanced size. No upstream text, scripts or templates were vendored.

**Structural and file validation:**

- `UV_CACHE_DIR=/tmp/shepherd-ui-ux-uv-cache uv run --locked --no-env-file python /home/mowll/.codex/skills/.system/skill-creator/scripts/quick_validate.py .agents/skills/ui-ux-review`:
  **passed**, `Skill is valid!`.
- `pnpm exec prettier --check .agents/skills/ui-ux-review/SKILL.md .agents/skills/ui-ux-review/references/*.md`:
  **passed**, all six Markdown files formatted.
- An explicit local Markdown-link check resolved **133 repository-relative
  links across all six skill files**, with zero missing destinations.
- `SKIP=project-check UV_CACHE_DIR=/tmp/shepherd-ui-ux-uv-cache uv run --locked --no-env-file pre-commit run --files`
  with the six skill files and `docs/TASKS.md`: applicable private-key, file-size,
  merge-marker, filename-case, final-newline and trailing-whitespace hooks
  **passed**; the unrelated runtime project gate was deliberately skipped for
  this instruction-only change.
- `git diff --check`: **passed**.

Initial directory creation and newline-hook attempts encountered the sandbox's
read-only `.agents` mount. The skill was prepared in `/tmp`, then installed with
a narrow authorized filesystem escalation; the same scoped hooks passed with
escalation. No hook or content requirement was relaxed.

**Independent behavioral validation:** Two fresh agent contexts used the installed
skill on realistic requests, without application execution or repository edits.
Their actual reports were inspected:

- Whole-app source-only review: produced a **23-journey coverage matrix**, marked
  source-only evidence honestly, traced administrator password changes and
  learner text practice/finish/History, and kept existing acceptance gaps separate.
  Report: `/tmp/shepherd-ui-ux-whole-app-evaluation.md`.
- Focused administrator password-recovery wording review: inspected only relevant
  Help/sign-in copy and public recovery implementation, retained the requested
  source-only scope, and found no actionable wording mismatch.
  Report: `/tmp/shepherd-ui-ux-copy-evaluation.md`.

The focused trial identified an instruction ambiguity: the inventory's shared
checklist could imply all review lenses even for a copy-only request. Both the
opening and cross-cutting section now qualify checks by requested lens and
available evidence; the independent reviewer inspected the revision and confirmed
the ambiguity was resolved. These trials establish observable skill behavior,
not application correctness or usability.

The whole-app trial also identified a **source-based product concern**: the
administrator panel remounts on page changes while Help broadly promises draft
preservation. It was not reproduced in a browser or fixed in this task. The next
bounded product action is to verify administrator form drafts and completion
messages across Help/Settings navigation with synthetic account fixtures, then
reconcile behavior and wording against the product contract.

**Changed files:** `.agents/skills/ui-ux-review/SKILL.md` and its five references
(`workflows.md`, `design-critique.md`, `accessibility.md`, `ux-writing.md`,
`sources.md`); this task record. Existing application and staged changes were
preserved. Evaluation artifacts stayed under `/tmp`.

No skill-validation failure remains. Application unit/component/integration and
browser suites, live-provider tests, real-device/screen-reader checks, paid
inference, model downloads, deployment, Git commit and push were not run for this
instruction-only change. Existing release acceptance work remains unchanged.

## T62 — Simplify household account access (2026-10-22)

**Status:** Complete; source, project, integration, focused browser, container
and private-update checks passed. The maintainer authorized a three-character
minimum for administrator and learner passwords, resetting the existing
administrator password, listing account names on sign-in screens, and
administrator-portal password changes. The requested live reset was performed
with hidden terminal input; no credential value is stored in this record.
No Git publication or provider inference was performed.

**Scope and contracts:** SPECIFICATION sections 3 and 12; D011/D013 amended by
D017; shared credential validation, browser setup, learner creation/reset,
role-specific sign-in account names, and authenticated administrator password
changes. Public sign-in entries contain only username and role. Keep learner
ownership, administrator authorization, password hashing, maximum length,
CSRF/origin/Host checks, rate limits, and session revocation. No migration,
password defaults, private-data export, or additional administrator is required.

**Plan:** Set the shared password minimum to three, reject two characters,
retain existing stored passwords, and show selectable account names on the
matching sign-in screen. List the administrator beside learner management and
provide current/new/confirmation password fields. A successful administrator
change revokes prior sessions and replaces the presenting session. Existing
learner password reset remains available. Use supported backend recovery to
reset the private installation without putting its credential into source,
arguments, logs, or this record.

**Validation plan:** Synthetic HTTP/HTTPS boundary tests; directory projection
and disabled/deleted exclusion; administrator-only password change, current
password verification, confirmation, CSRF/origin checks, reset race and session
replacement; component tests and focused desktop/mobile browser journeys.
Regenerate OpenAPI/TypeScript, run targeted checks, `make check`, and
`make test-integration` sequentially with browser builds. Validate the isolated
container before updating the private installation; stop both writers, take an
encrypted backup and verify an isolated restore, retain the previous image,
then verify readiness, served assets, and the requested reset without reading
private learner content or provider configuration. Record actual evidence below.

**Source validation:** Commands use `/tmp/shepherd-t62/run`, which clears
operator/provider environment variables and disables environment-file loading.
Python is 3.15.0 and embedded SQLite is 3.53.1. `make contracts` regenerated
OpenAPI and TypeScript; no generated file was edited manually.

- Focused backend authentication/setup/learner/CLI checks: **161 passed in
  21.65s**. Sandbox ASGI attempts stalled and were interrupted; the same cleared
  synthetic tests passed outside sandbox restrictions.
- Focused chooser/password/account/setup/App component checks: **88 passed**;
  scoped ESLint and strict TypeScript checks passed.
- `make check`: **329 backend unit, 11 toolchain, and 246 component tests passed**,
  with lint, format, strict types, lock checks, production build, contract drift,
  credential scan and infrastructure validation. Existing build-system
  upper-bound and bundle-size warnings remain.
- Independent review found no actionable authorization, stale-response,
  rotated-session, directory-projection, or current-documentation defect.
- `docker build` succeeded from a frozen **288-file source-only snapshot**,
  SHA-256 `3845f8cf0e1ff53bb368ebc2585d976291d60002cc2ab34eee772bfec65821b8`.
  Private settings/data were not in the context. Candidate:
  `math-practice-tutor:t62-3845f8c`.
- `sh scripts/container-smoke.sh math-practice-tutor:t62-3845f8c`: passed on
  disposable storage, including SQLite migrations, non-root runtime, HEIF,
  worker readiness, built UI, disabled-provider rejection, setup renewal,
  stale-link rejection and first-account claiming. No inference was used.

**Final gates:** `make test-integration` passed **403 tests in 71.93s**.
`pnpm exec playwright test tests/smoke/accounts.spec.ts tests/smoke/setup.spec.ts tests/smoke/navigation.spec.ts tests/smoke/workspace-navigation.spec.ts`
passed **30 desktop/mobile cases in 4.1 minutes**, with one worker and zero
retries. Production login throttles remained in force. These journeys cover
setup/create/reset two-versus-three-character boundaries, matching-role
name selection and password focus, keyboard access, wrong-current-password and
confirmation errors, successful administrator password change, preserved current
browser and revoked other browsers, old-password rejection/new-password access,
restored synthetic fixture credentials, Help and account-switch drafts.
No full browser suite or live-provider evaluation was needed for this bounded
authentication change.

**Private update:** The installed immutable image is
`sha256:75e68667c1a8d2d1a9fbe72d8d6408175ebebc42a8a19f8c5ddc814099bce50a`.
The candidate used the recorded frozen source-only worktree snapshot in place of
the runbook's usual committed archive; this local update was requested before
Git publication. Repository changes remain uncommitted. Runtime-source hashes
were rechecked against the snapshot before cutover.

The reviewed helper retained `math-practice-tutor:rollback-20261022-t62`, stopped
both API and worker, and mounted existing data read-only for the application's
encrypted backup and isolated restore. Integrity, foreign keys, retained-object
checksums, current deletion handling and restored-session/job cleanup passed.
Backup: `backups/deploy-20261022-t62-3845f8c/snapshot.enc`; SHA-256:
`3597820404f6da3c01fd71da96e31525853d4c5475e7175c510202f987061ed9`.
A generated passphrase is held separately under the operator's private
`~/.local/share/shepherd-academy-universe/backup-keys/deploy-20261022-t62-3845f8c/`
directory. Its value was never printed or put in arguments/environment; new
directories/files use 700/600. No live database was restored or replaced.

With both writers stopped, the supported `auth.create_or_reset_admin` recovery
operation reset the single existing administrator using hidden `getpass` input.
Credential verification passed and all prior administrator sessions were revoked.
Learner credentials and work were preserved. Both services then restarted with
the exact candidate image and original data mount; the schema stays
`0020_request_recovery`. Verification passed readiness through the configured
Host on loopback, a heartbeat newer than the replacement worker's start time,
running worker with zero restarts, the 3–256 policy, role/name-only no-store
sign-in directories, three anonymous protected-route rejections, three disabled
API-documentation routes, and both directly referenced served asset hashes.
The prior image and encrypted backup remain available.

**Changed files:** Backend `auth.py`, `api/auth.py`, `test_auth_secrets.py`,
`test_auth_sessions.py`, `test_browser_setup.py`, `test_local_setup.py`, and new
`test_account_access.py`; web `App.tsx`, `AdultPanel.tsx`, `LearnerAccounts.tsx`,
`Help.tsx`, new `SignInAccounts.tsx`/`AdministratorAccount.tsx`, their new tests,
and existing App/AdultPanel/LearnerAccounts/Setup tests; regenerated
`contracts/openapi.json` and `apps/web/src/generated/api.d.ts`; browser
`accounts.spec.ts`, `setup.spec.ts`, `navigation.spec.ts`; README,
SPECIFICATION, DECISIONS, THREAT_MODEL, PHONE_SETUP, RUNBOOK and this task record.
No migration, dependency, provider, or deployment-infrastructure source changed.

No gate failure remains. The sandbox-only ASGI hangs were resolved by the
successful outside-sandbox synthetic run. Existing packaging/bundle warnings
remain as recorded above. Provider evaluations, paid inference, physical-device
checks, hosted CI, Git commit and push were not run. Refresh the app or choose
**Refresh when ready** to load the updated public assets.

## T61 — Clarify sign-in roles and password recovery (2026-10-21)

**Status:** Complete; the approved UI/help changes passed targeted browser,
project, integration, image and private-deployment checks and were published to
main. The deliberately stopped broad browser run is recorded separately below.

**Scope and contracts:** SPECIFICATION sections 3, 12 and 18; D011/D013 account
recovery policy; standalone learner/administrator sign-in, contextual Help,
deployment-relative links, accessible focus and preserved account-switch drafts.
Administrator recovery remains operator-managed; learner recovery remains
administrator-managed. Authentication, permissions, API schemas and the database
remain unchanged. Preserve the unrelated working-tree `uv.lock` modification.

**Plan:** Make the selected account role and counterpart switch visibly distinct.
Give each role an immediately discoverable password-help link and appropriate
account guidance. Add a directly addressable Sign-in & passwords Help topic;
separate first-account setup from existing-account recovery and document native
versus Docker operator recovery accurately. Keep existing Help navigation usable.

**Validation plan:** Extend component and desktop/mobile browser coverage for both
role-switch directions, role-specific recovery content and destinations, Help
reload/Back/copied links, keyboard focus and existing-session/draft preservation.
Use synthetic accounts and mock providers. Run targeted checks, `make check`,
`make test-integration` and the browser gate, then independently review the diff.
Publish with normal hooks and deploy a checked immutable image using encrypted
backup, isolated restore, rollback retention and served-build/readiness checks.
Record actual outcomes below; provider evaluations remain outside this task.

**Implementation and review:** The sign-in form now labels its selected account
role with text and a modest role-specific accent; the counterpart link has a
visible switch treatment. Both roles have a visible Forgot password? link to
Sign-in & passwords. Learner guidance points to the existing administrator reset
workflow; administrator guidance separates operator recovery from first setup
and distinguishes native from Docker commands. Existing Help routing, requested
role enforcement, session replacement and draft handling remain intact.
Independent review found no runtime issue and strengthened the learner test's
exclusion of first-time setup links. The runbook now resolves the earlier
build/backup wording conflict: isolated image validation may precede downtime;
backup precedes migration or replacement of running services.

**Validation so far:** Commands use the cleared no-env-file
`/tmp/shepherd-t58/run` runner with `UV_CACHE_DIR=/tmp/shepherd-t61/uv-cache`.
Focused App/navigation Vitest passed **41 tests**. `make check` passed **329
backend unit, 11 toolchain and 237 component tests**, strict types/lint/format,
lock checks, production build, generated-contract consistency, credential scan
and infrastructure validation. Existing build upper-bound/chunk-size warnings
remain. Initial new test type/text mismatches were corrected before this gate.
The first integration run had **382 passed and one fixture error** because a
concurrent browser setup build temporarily removed `dist/assets`; it is not a
successful integration gate. Serial integration and browser outcomes follow.

- The serial `make test-integration` rerun passed **383 tests in 69.29s**.
- `pnpm exec playwright test tests/smoke/navigation.spec.ts tests/smoke/workspace-navigation.spec.ts tests/smoke/accounts.spec.ts tests/smoke/setup.spec.ts`:
  **28 desktop/mobile tests passed in 3.1 minutes**, including both recovery
  entry points, keyboard focus, copied URLs, setup, account-switch drafts and
  the existing synthetic learner-password-reset journey.

The frozen full browser gate, image checks and deployment evidence follow.

**Rendered accessibility refinement:** Inspection of synthetic desktop/mobile
previews found that the new recovery link needed a clearer link treatment and
touch target. It is now underlined with a minimum 44-pixel target; browser
coverage checks both. The first full browser run was deliberately interrupted
for that refinement after **17 passes**, with **one interrupted** and **76 not
run**; it is not a completed gate. The earlier `54e32e2` candidate passed image
smoke/scanning but is superseded by the final source and image recorded below.

**Final source and proportionate validation:** The accessibility refinement
repeated `make check` successfully with the same **329 backend unit, 11
toolchain and 237 component tests**. Focused recovery Playwright cases passed
**4/4 in 2.9s**, checking the visible underline and 44-pixel touch target for
both roles on desktop/mobile. The anonymous deployment probe also passed
against disposable synthetic storage with zero mutating, external, unexpected
API, redirect or WebSocket requests.

The maintainer questioned whether the broad browser gate was proportionate to
this UI/help change. The agent stopped it after **77 passes in 12.1 minutes**,
with **one interrupted and 16 not run**. It is not a successful full-suite gate.
Release acceptance uses the completed targeted 28-case journeys, four final
recovery accessibility cases, project gate, serial 383-case integration run,
container checks and protected deployed-browser acceptance. No test assertion
or authentication rule was weakened. Normal installed hooks passed on both
implementation commits, preserving the unrelated `uv.lock` bytes.

**Publication and final image:** A normal non-force push advanced main from
`d745a53` to runtime source
`6171f22358efce18e4ff3c6dbe877cb86d6e9738`. The image was built from that
commit's clean Git archive, excluding the unrelated working-tree lock edit and
all untracked private files, with the full OCI revision label. Image tag:
`math-practice-tutor:release-20261021-6171f22`; exact immutable image:
`sha256:adfb837dc74d56a95e339916b735d4b358144af0cc62c797d514091db7ddecda`.
The checked-in container smoke passed. Trivy 0.76.1 reported **zero
HIGH/CRITICAL vulnerabilities**, including unfixed findings, and a separate
all-severity secret scan reported **zero secrets**, without exclusions. The
CycloneDX SBOM contains **52 components**; SHA-256:
`5bef1e0f800c17e04096bb613c388a348cc8fa046254efaa1f04480458891fdc`.

The reviewed deployment wrapper uses that immutable scanned image ID rather
than a mutable tag. The anonymous browser probe runs inside the cutover's
rollback block; stub-only success, probe-failure rollback and invalid-probe
preflight checks passed. The read-only live preflight confirmed the old T60
image, original data mount and unchanged `0020_request_recovery` schema.

**Private deployment:** The cutover retained
`math-practice-tutor:rollback-20261021-3b0a4c3`, stopped both writers, and verified
the encrypted native backup plus an isolated restore with the original mount
read-only. Database integrity, foreign keys, object checksums, deletion
preservation and restored session/job cleanup passed. No live data was restored
or replaced. Backup: `backups/deploy-20261021-6171f22/snapshot.enc`; SHA-256:
`c35e50859ca53cfb15039e7a1ce4d62b101aced01e27e14a15c5755c1f13dc62`.
The generated passphrase is held separately in the operator's private backup-key
directory, without reading its value into agent context or passing it in
arguments/environment. Backup/key directories and files use modes 700/600.

The controlled no-op schema upgrade and Compose restart passed. Both API and
worker run the exact tested immutable image with the original data mount and
loopback binding. Verification passed private HTTPS readiness, a fresh
replacement-worker heartbeat, all **six public asset hashes**, cache/scope
headers, **three anonymous protected-route rejections without reading bodies**
and **three disabled API-documentation routes**.

The protected live probe passed in **two fresh anonymous desktop/mobile
contexts**: visible role labels/switch controls, both switch directions, recovery
link underline/44-pixel target, role-specific guidance, keyboard focus,
Back/reload/copied links, normal Help navigation and absence of horizontal
overflow. It entered no credentials and performed no mutations or inference;
mutating, external, unexpected API, redirect, WebSocket and page-error counts
were all zero. Safe deployment evidence remains with the ignored encrypted
backup. The prior image remains available for rollback.

**Changed files (7):** `App.tsx`, `Help.tsx` and `styles.css` under
`apps/web/src/`; `apps/web/tests/App.test.tsx`;
`tests/smoke/navigation.spec.ts`; `docs/RUNBOOK.md`; this task record. No API,
generated contract, permission or schema change was required. The unrelated
`uv.lock` modification remains byte-for-byte unchanged and is excluded from the
release. Live provider evaluations, paid inference and real account resets were
not run. Hosted CI was not awaited. The evidence-only follow-up changes no
runtime code; its commit runs file hooks while skipping the already-passed
duplicate project gate. Refresh the app or choose **Refresh when ready** to load
the new assets.

## T60 — Separate Management and Learning sign-in (2026-10-21)

**Status:** Complete; source, integration, Playwright, image, publication and
private deployment checks passed. The maintainer clarified that Management and Learning
need separate views with explicit credential-based sign-in links. The learner
list manages accounts; it does not select an identity for practice.

**Scope and contracts:** SPECIFICATION sections 3, 9 and 12; D013 account
ownership; role-specific login input and generated API clients; anonymous,
administrator and learner navigation; account-switch session and draft handling.
The anonymous app opens at **Learner sign-in**. Standalone **Learner sign-in**
and **Administrator sign-in** screens offer Help and the counterpart link.
Management contains Learners, Settings and Help with a Learner sign-in link;
Learning contains Practice, History and Help with an Administrator sign-in link.
Learner-list buttons explicitly say **Manage account**. No database migration,
new identity service or change to account ownership is planned.

**Plan:** Enforce the requested login role in the backend before replacing or
revoking a session, and regenerate public contracts. Give each sign-in screen
its own navigation without prior-account controls. Retain relative app addresses,
reload/bookmark behavior and return to the previous workspace when canceling or
following the current role's sign-in link. Preserve the prior session and unsent
work on opening, failure or cancellation; a successful sign-in for the requested
role replaces the session and clears prior-account content. Update current
README, Help, SPECIFICATION and D013 wording while preserving historical evidence.

**Validation plan:** Cover successful role-specific login, rejected credentials
for the other role and prior-session preservation in backend tests. Component
and desktop/mobile browser checks cover anonymous and authenticated navigation,
standalone sign-in, reload/bookmarks, cancellation, draft preservation, successful
account cleanup and management-only learner-list actions. Run targeted checks,
generated-contract consistency and the required project gates; record only
observed outcomes. Publication and private-deployment results are recorded
below. Live provider evaluations remain outside this task.

**Focused documentation/account-list validation:** Updated README, Help,
SPECIFICATION and D013 to describe the separate views, standalone role-specific
sign-in and preservation of the prior account/work until the requested-role
sign-in succeeds. Learner-list buttons visibly say **Manage account**.
The no-env-file runner's
`pnpm --filter @math-tutor/web exec vitest run tests/LearnerAccounts.test.tsx`
passed **7 tests**; the added case verifies the management callback without an
authentication request. Scoped ESLint, Prettier checks for the six other files
and the added T60 section, and `git diff --check` passed. Historical task evidence
and its existing table formatting are preserved. Complete project and release
checks follow.

**Source implementation and observed gates:** The required `LoginRequest.role`
contract is enforced after credentials/current account state are checked and
before the old session is revoked. Valid credentials for the other role return
specific sign-in guidance; invalid credentials retain the generic error. The
client sends the selected role using regenerated types. Standalone entry chrome
replaces the global area tabs, with one cross-role link in each workspace.
Help topics and footer links retain the selected entry role. Inline Practice
and History links request learner access; Learners and Settings request
administrator access, opening the named page when already signed in for that
role. Actual URLs and intercepted clicks share the same role/page mapping for
copied addresses and new tabs. Canceling and returning to the
current role keep the exact mounted workspace; success clears prior-account
state. Default signed-out entry is Learner sign-in, while direct Settings and
Learners bookmarks offer Administrator sign-in. Sign-out preserves the current
app path.

Commands used the cleared no-env-file `/tmp/shepherd-t58/run` runner with
`UV_CACHE_DIR=/tmp/shepherd-t60/uv-cache`. Synthetic ASGI/browser tests ran outside
the sandbox after the first restricted ASGI run stalled and was stopped; no
assertion or authorization check was weakened.

- `make check`: passed **329 backend unit, 11 toolchain and 233 component
  tests**, strict types/lint/format, lock checks, production build, generated
  contracts, credential scan and infrastructure validation. Earlier runs caught
  lint and optional-prop typing issues; these were corrected before the complete
  successful gate. Existing build upper-bound/chunk-size warnings remain.
- `make test-integration`: **383 passed in 69.90 seconds**. New coverage requires
  an explicit supported role and checks both mismatch directions: cookie, CSRF
  and old session survive failure; matching credentials replace and revoke it.
- `pnpm exec playwright test tests/smoke/workspace-navigation.spec.ts tests/smoke/navigation.spec.ts tests/smoke/bootstrap.spec.ts`:
  **34 desktop/mobile tests passed in 5.1 minutes**. The final complete browser
  run additionally includes copied Help/footer/inline URL checks added during
  independent review.
- Focused App/URL tests passed **37 cases**, including both roles at localhost
  and HTTPS nested paths. These verify URL construction and component routing;
  they do not claim complete subpath hosting support.

Independent review corrected actual Help hrefs, destination-role routing and
a stale return-page state that could discard a new Settings draft on a second
handoff. A regression now follows Learners → learner entry → Help → Settings →
new unsaved connection → learner entry → Cancel and retains the exact input and
value. Only an ongoing opposite-role handoff keeps the previous return page.

An initial broad browser run exposed two outdated test assumptions: adjacent
Help query fields and an implicit root URL after administrator login. Assertions
now check page/topic/role explicitly; the phone test establishes its fragment-only
starting URL and verifies that the administrator remains signed in. Its token,
no-logout and same-document checks remain intact. The corrected cases passed
**4/4 in 29.0 seconds** on an isolated instance with the checked-in desktop/mobile
profiles and zero retries. Broad runs were stopped while applying review changes;
those interruptions are not successful full-suite results. They are superseded
by the clean frozen run below. No live provider evaluation ran.

**Final frozen browser gate:** `make smoke-built` ran the actual checked-in
Playwright suite against the production build with synthetic data and mock
providers: **90 passed in 15.2 minutes**, comprising 45 desktop Chromium and 45
Pixel 7 profile cases, with zero retries. The final focused workspace run also
passed **4/4 in 1.1 minutes**. These include submitted synthetic credentials, role
rejections, normal/copied/new-tab Help links, Back/Forward/reload, learner draft
retention, the second Settings handoff and clearing prior-account content after
successful authentication. The frozen runtime source is
`3b0a4c37bb2a3f705a17c3bdc7965d874d7cd65f`.

**Publication and image:** Normal hooks passed for every implementation/test
commit. A non-force push published the frozen source to `main`; remote equality
and a clean tree were verified. Built
`math-practice-tutor:release-20261021-3b0a4c3` from its clean Git archive with the
full OCI revision label. Exact image:
`sha256:c7709b0718d99082a875ef9f8ba46ef2ff7051997c032ba23c1c5acc7a235a8c`.
The checked-in container smoke and Trivy 0.76.1 HIGH/CRITICAL vulnerability/secret
scan passed, including unfixed issues and without exclusions: **zero findings**.
CycloneDX 1.7 contains 52 components; SBOM SHA-256:
`882a44c5bf4def526d5add55539a98813a8b36e1704c37844099af9561e7e12c`.

**Private deployment:** The reviewed T58 cutover helper passed preflight, retained
`math-practice-tutor:rollback-20261021-4be4888`, stopped both writers and verified
an encrypted native backup plus isolated restore with the original mount
read-only. Integrity, foreign keys, object checksums, deletions and restored
session/job cleanup passed. No live data was restored or replaced. Backup
`backups/deploy-20261021-3b0a4c3/snapshot.enc` SHA-256:
`0baa6434eb4d2c06549c7b9dcd67687ec80fddfca86fbd567e25efadc7fbe946`.
Directories/files use modes 700/600; the generated passphrase is held separately
under `~/.local/share/shepherd-academy-universe/backup-keys/deploy-20261021-3b0a4c3/`,
without reading/exposing its value or passing it in arguments/environment.

The no-op schema upgrade and Compose restart passed. The API and worker run the
exact tested image with schema `0020_request_recovery`. HTTPS readiness, a fresh
replacement-worker heartbeat, loopback binding, original mount, all six public
asset hashes and cache/scope headers passed. Three anonymous protected routes
were rejected without reading their bodies; three API-documentation routes
returned 404.

`node /tmp/shepherd-t60/deployed-entry.cjs <private-origin>` then passed against
the live private HTTPS app in two fresh anonymous desktop/mobile Playwright
contexts. It verified standalone entries, actual relative counterpart links,
Help/topic/copied-footer role retention, reloads, heading focus without an
outline, three outlined keyboard controls and no horizontal overflow. It blocked
mutating/external/unexpected API requests, entered no credentials and performed
no inference. Safe image, browser and deployment metadata are retained beside
the ignored encrypted backup.

No remaining local gate failure is open. Hosted CI was not awaited; live provider
evaluations and paid inference were not run for this navigation/authentication
change. Mock evaluation reports were not rewritten. The final evidence-only
follow-up does not change the deployed runtime. Refresh the app or choose
**Refresh when ready** to load the new assets.

**Changed files (26):**

- Runtime: `apps/api/src/math_tutor/api/auth.py`; web `App.tsx`, `Help.tsx`,
  `LearnerAccounts.tsx`, `navigation.ts` and `styles.css` under `apps/web/src/`.
- Backend integration tests: `test_auth_sessions.py`, `test_browser_setup.py`,
  `test_learner_accounts.py` and `test_workflows.py` under
  `apps/api/tests/integration/`.
- Component tests: `App.test.tsx`, `LearnerAccounts.test.tsx`, `Setup.test.tsx`
  and `navigation.test.tsx` under `apps/web/tests/`.
- Browser tests/support: `bootstrap.spec.ts`, `navigation.spec.ts`,
  `phone-navigation.spec.ts`, `setup.spec.ts`, `support.ts` and
  `workspace-navigation.spec.ts` under `tests/smoke/`.
- Generated contracts: `contracts/openapi.json` and
  `apps/web/src/generated/api.d.ts`.
- Documentation: `README.md`, `docs/SPECIFICATION.md`, `docs/DECISIONS.md` and
  this task record.

## T59 — Remove the focus box from page headings (2026-10-21)

**Status:** Complete; source, targeted browser, container and private deployment
checks passed.
The maintainer requested removing or otherwise fixing
the oversized focus outline around the Sign in heading in the deployed app.

**Scope and contracts:** SPECIFICATION section 18 accessibility requirements;
programmatic page-heading focus, visible keyboard focus on interactive controls
and the existing private deployment. Preserve screen-reader focus management,
semantic headings, authentication and all API/database contracts.

**Plan:** Limit the CSS correction to programmatically focusable headings. Add
a browser regression that checks heading focus without an outline and visible
keyboard focus on sign-in and navigation controls. Run the targeted desktop and
mobile checks and `make check`, review the diff, publish with normal hooks and
deploy a checked container using the existing encrypted-backup procedure.

**Implementation:** `:is(h1, h2)[tabindex="-1"]:focus-visible` suppresses only
the outline on noninteractive focus targets. Automatic focus, heading semantics,
tab order and the shared three-pixel control outline remain unchanged.

**Validation:** Commands use the cleared, no-env-file `/tmp/shepherd-t58/run`
runner and synthetic/anonymous browser contexts. The new regression failed in
both browser projects against the previous build with `outline-style: solid`,
confirming it detects the reported defect. After rebuilding:

- `make check`: passed **329 backend unit, 11 toolchain and 214 component
  tests**, strict types/lint/format, locked dependencies, build, API-contract
  consistency, credential scan and infrastructure validation. Existing build
  upper-bound and chunk-size warnings remain.
- `pnpm exec playwright test tests/smoke/navigation.spec.ts --grep 'page headings keep accessible focus|guests can open and reload Help'`:
  **4 passed in 2.2 seconds** across desktop/mobile. The regression checks
  focused, focus-visible headings without an outline, real Tab/Shift+Tab focus
  on username/password/button/link controls with the existing outline, and
  keyboard Help/topic navigation. Existing guest authorization checks also pass.

The full integration/browser suites and live provider evaluations are not
repeated for this CSS-only runtime correction; T58 owns the preceding full-run
evidence. No API, database, dependency, model, provider setting or real account
change is included.

**Publication and image:** Independent review found no blocker. Normal commit
hooks passed; non-force push published
`4be488851e2dc7585f0f821cb7218f254f2257c9`, with remote equality and a clean tree
verified before building. Built `math-practice-tutor:release-20261021-4be4888`
from that commit's clean Git archive with the full OCI revision label. Exact
image is `sha256:af1f037e8536d967daccb6edc08903165a2cb0e386c19183d2286b50b8f48059`.
The checked-in container smoke and Trivy 0.76.1 HIGH/CRITICAL vulnerability/secret
scan passed, including unfixed issues and without exclusions. Zero findings;
CycloneDX 1.7 has 52 components. SBOM SHA-256:
`16a8195d49418f9285d74bbd65fa9987d520f1d7704b49bc9c85a67efc62e83e`.

**Private deployment:** Reused the independently reviewed T58 cutover helpers.
Preflight passed; retained the previous image as
`math-practice-tutor:rollback-20261021-25b79eb`, stopped both writers and verified
an encrypted native backup plus isolated restore with the original data mounted
read-only. No live data was restored or replaced. Backup
`backups/deploy-20261021-4be4888/snapshot.enc` has SHA-256
`822bd28a2e0214045910db124071ab902e0bbe59c6b8e303fe1a3c05145471b5`.
Directories/files are mode 700/600; the generated passphrase is kept separately
under `~/.local/share/shepherd-academy-universe/backup-keys/deploy-20261021-4be4888/`,
without exposing its value or passing it through arguments/environment variables.

The controlled no-op migration and Compose restart passed. API and worker use
the exact tested image, preserve the original data mount/private settings and
retain schema `0020_request_recovery`. Private HTTPS readiness, a fresh replacement
worker heartbeat, all six public asset hashes, cache/scope headers, three
anonymous protected-route rejections without reading their bodies and three
disabled API documentation routes passed.

`node /tmp/shepherd-t59/deployed-focus.cjs <private-origin>` additionally passed
against the live HTTPS app in two fresh anonymous desktop/mobile browser
contexts: Sign in retains heading focus with no outline; Tab focuses username,
password and the submit button with their existing three-pixel outlines. No
real account, authenticated request or live model call was used. Final image,
backup and browser verification metadata are retained beside the ignored
encrypted backup. Hosted CI was not awaited; the local results above are the
observed validation evidence.

**Changed files:** `apps/web/src/styles.css`, `tests/smoke/navigation.spec.ts`
and this task record. The final evidence-only follow-up does not change the
deployed runtime. Refresh the app, or choose **Refresh when ready** when its
update notice appears, to load the new assets.

## T58 — Upgrade and deploy the private local application (2026-10-21)

**Status:** Complete, with the Python patch-artifact limitation below. Source,
browser, image and private deployment checks passed. The maintainer authorized upgrading the tools and
dependencies, pushing the reviewed result to `main`, and deploying the existing
private local installation.

**Scope and contracts:** SPECIFICATION sections 2, 6, 12–13 and 16–17;
D001/D004/D007/D016; Node/Python/uv runtime and installer pins, exact dependency
locks, generated API consistency, immutable container packaging and the existing
single-host API/worker deployment. Preserve private settings, accounts, retained
data, strict peers and compatibility requirements. No product-policy or database
schema change is planned.

**Plan:** Verify stable releases and compatible artifacts, update the persistent
development tools and reproducible pins, refresh compatible locks, and run
locked bootstrap plus source, integration, browser, mock, audit and package
checks. Review and commit with normal hooks, push without force, then retain a
rollback image, stop both writers, create an encrypted backup and verify an
isolated restore before cutover. Verify the exact served build, worker readiness
and anonymous authorization boundaries without calling live providers. Record
actual outcomes and the address for opening the program below.

**Resolution:** Installed checksum-verified Node 26.12.1 through the existing
nvm and set its persistent default, retaining npm 12.2.0/pnpm 12.14.0. Current
uv is 0.13.4; CI/container pins and the uv_build minimum now match it. The
Node container index is pinned to its verified immutable registry digest.
The Python lock refresh preserves all 97 package identities and updates only
FastAPI 0.159.0 → 0.159.1. JavaScript adopts typescript-eslint 8.72.0 now that
it satisfies the unchanged default release-age policy. TypeScript/Vitest retain
their documented compatible versions; Vite 8.3.5 is still too recent.

Python 3.15.1 was released today, but `uv python install 3.15.1` fails with
`No download found for request: cpython-3.15.1-linux-x86_64-gnu`; the official
`python:3.15.1-slim-bookworm` registry tag is also unavailable. Retain Python
3.15.0 rather than change the approved shared-runtime packaging. Recheck these
artifacts as the next bounded runtime update. No OS Python change is planned.

**Source validation:** Commands use `/tmp/shepherd-t58/run` with cleared
inherited variables, no env-file loading, empty temporary npm configuration and
synthetic fixtures.

- `make bootstrap`: passed with Node 26.12.1, pnpm 12.14.0, uv 0.13.4,
  locked Python installation and frozen JavaScript installation.
- `make check`: passed **329 backend unit, 11 toolchain and 214 component
  tests**, locks, lint/format, strict types, builds, generated-contract drift,
  credential scan and infrastructure lint. Existing build-system upper-bound
  and JavaScript chunk-size warnings remain.
- `make test-integration`: **378 passed in 68.79s**, including authorization,
  ownership, provider policy, on-disk migrations, retention and recovery.
- `make audit`: Python and pnpm report **no known vulnerabilities**.
- `make eval-mock`: all four synthetic fixture suites passed. Generated
  fixture-report churn was excluded from the release diff.
- `make hooks-files-check`: all applicable file hooks passed; only the duplicate
  project gate was skipped after its separate successful run.
- `make smoke-built`: **88 desktop/mobile browser tests passed in 14.2 minutes**.

The first browser attempt could not launch the missing Playwright Chromium 1248
executable. Installed the matching official browser with
`pnpm exec playwright install chromium`; the unchanged suite then passed above.

**Candidate package:** Built `math-practice-tutor:t58-check` from tracked public
build inputs in an isolated context. The checked-in container smoke passed
Python/SQLite/HEIF/cryptography, installer removal, restricted-provider rejection
without inference, synthetic migrations, non-root/read-only API/worker/UI and
owner-setup checks. Independently hashing the Node image's raw index confirmed
its pinned registry digest. Checksum-verified Trivy 0.76.1 passed HIGH/CRITICAL
vulnerability and secret scanning with zero findings, including unfixed issues
and without exclusions. CycloneDX 1.7 contains 52 components.

Independent source and deployment-helper reviews found no blocker. The offline
native encrypted backup/isolated-restore helper passed a disposable synthetic
exercise with a retained object, pending work and a deletion tombstone; original
data remained read-only. The ownership recovery flag was set before ownership
changes so partial failures also receive cleanup.

**Publication and final image:** Normal installed commit hooks passed, including
their complete project gate. The non-force push advanced `main` from `958f80d`
to `25b79eb41b8bcf39ebdefef65ac60dc1110d0e3e`; remote equality and a clean tree
were verified. Built `math-practice-tutor:release-20261021-25b79eb` from that
commit's clean Git archive, labeled with its full OCI source revision. Exact image:
`sha256:2719582393e9e3ff827271e711446a23454222a8ec01cae57d70d7491842b84f`.
The final image repeated the checked-in container smoke and Trivy 0.76.1 scan:
all commands exited 0, with zero HIGH/CRITICAL vulnerabilities or secrets,
including unfixed issues and without exclusions. Its CycloneDX 1.7 SBOM contains
52 components; SHA-256:
`81865e6a61b4cdb13dae5c229c6d9d17cfa8f7e44d993a30ff57b619c1d8323d`.

The hosted [package job](https://github.com/tylermowll/shepherd-academy-universe/actions/runs/39678143425)
also passed. The hosted source job was still running when observed; the complete
local source/integration/browser/mock/audit results above are the release evidence.

**Private cutover:** The reviewed `/tmp/shepherd-t58-deploy/cutover.py` preflight
passed before `--execute`. It retained the previous image as
`math-practice-tutor:rollback-20261021-93f93de`, stopped both writers, then used
the old image in a network-disabled container with the original data mounted
read-only. Native encrypted backup and isolated restore passed schema, SQLite
integrity/foreign keys, retained-object checksums, deletion preservation and
restored-session/job cleanup checks. No live data was restored or replaced.
Backup `backups/deploy-20261021-25b79eb/snapshot.enc` has SHA-256:
`e7fae3d94a723d8a28ea8588999158c76b8ff4f9c664e811f4d928cc1ff73ea3`.
Directories/files are mode 700/600; its generated passphrase is stored separately
under `~/.local/share/shepherd-academy-universe/backup-keys/deploy-20261021-25b79eb/`,
never displayed or passed in arguments/environment variables.
Public helper code and final scan/SBOM metadata are retained beside the ignored
encrypted backup for a future operator review.

Compose's controlled `alembic -c alembic.ini upgrade head` and
`up -d --no-build --pull never --no-deps api worker` passed. Schema remains
`0020_request_recovery`. Both services use the exact tested image above and the
unchanged local data mount/private settings. Verification passed private HTTPS
readiness, a heartbeat newer than the replacement worker's start, all six public
asset hashes, HTML/service-worker cache headers and scope, three anonymous
protected-route rejections without reading their bodies and three disabled API
documentation routes. No live provider test request was made.

**Open the program:** The app is already running locally. Open the configured
private HTTPS origin, reported in the completion message, from a device on the
same Tailscale network and sign in with an existing account. Keep the host awake and
reachable. Docker runs the API/worker and SQLite stays on this computer;
Tailscale supplies private HTTPS access. Model inference can still use a cloud
provider if the administrator configured one. The evidence-only follow-up
changes this task record; the deployed runtime source stays `25b79eb`.

**Changed files:** `.node-version`, `package.json`, `pnpm-lock.yaml`,
`pyproject.toml`, `uv.lock`, `.github/workflows/ci.yml`,
`infra/docker/Dockerfile`, README, DEPENDENCIES, SPECIFICATION and this task
record. Application source, tests, generated API schema and database migrations
are unchanged. No live provider evaluations, model downloads, cloud provisioning
or OS-package upgrades are part of this release. Physical-device, teaching
quality and full restored-host acceptance remain tracked in ACCEPTANCE.

## T57 — Restore the workstation commit toolchain (2026-10-20)

**Status:** Workstation repair and local validation complete. The maintainer
supplied the failed commit transcript; the staged `uv.lock` refresh is preserved.
The maintainer subsequently authorized committing the reviewed changes and
pushing to `main`.

**Scope and contracts:** SPECIFICATION sections 6 and 16; repository Node/pnpm
minimums, the normal pre-commit gate, generated API consistency and the existing
synthetic unit/component/integration suites. No application behavior, API schema,
database schema or private settings change is planned.

**Diagnosis and repair:** `command -v node` and `command -v pnpm` found no
executable; no installation was present in the usual nvm/fnm/mise locations.
The failure occurs before the JavaScript version checker or Python lock checks.
Prepared Node 26.12.0 from the official archive, verified its SHA-256 against
the official `SHASUMS256.txt`, and installed npm 12.2.0/pnpm 12.14.0 with empty
temporary npm configurations. Installed the complete distribution under
`~/.local/share/shepherd-toolchain/node-v26.12.0-linux-x64`, with non-overwriting
`node`, `npm`, `npx` and `pnpm` links in the existing `~/.local/bin` PATH entry.
No shell startup files, system packages or persistent npm configuration changed.
README now explains that `uv sync` does not install JavaScript tools and that
the Git hook needs them on the invoking terminal's PATH.

**Maintainer lock refresh:** All 97 package identities and Python 3.15.0 remain.
The ten version changes are boto3/boto3-stubs/botocore/botocore-stubs
1.43.115 → 1.43.116, certifi 2026.10.18 → 2026.10.19, cfn-lint 1.57.2 →
1.58.0, FastAPI 0.150.0 → 0.156.4, Hypothesis 6.170.4 → 6.170.5, pip
26.2.1 → 26.2.2 and types-s3transfer 0.19.2 → 0.19.3. The staged and working
`uv.lock` SHA-256 is unchanged by this repair:
`8c2404db7ba6b9fa04691b6a68ef4f561e244c465eb26e7aa4e2890ecf0bd425`.

**Validation:** Source checks use `/tmp/shepherd-t57.c1VEbz/run` with cleared
inherited variables, no env-file loading, empty temporary npm configuration and
synthetic fixtures. Integration checks use a cleared offline environment.

- A fresh clean shell resolves all four commands through `~/.local/bin` and
  reports Node 26.12.0, npm 12.2.0 and pnpm 12.14.0; `make toolchain-check`
  passes. uv is 0.13.4 and the project Python remains 3.15.0.
- `make bootstrap`: passed locked Python and frozen JavaScript installation.
- `make check`: passed **329 backend unit, 11 toolchain and 214 component
  tests**, locks, lint/format, strict types, builds, generated-contract drift,
  credential scan and infrastructure lint. Existing build-system upper-bound
  and JavaScript chunk-size warnings remain.
- `make test-integration`: **378 passed in 171.55s**, including FastAPI auth,
  ownership, provider policy, setup, reading/tutoring, migrations and recovery.
- `make audit`: Python and pnpm report **no known vulnerabilities**.
- Stock cfn-lint 1.58.0 passes the household template and rejects an unknown
  synthetic resource type with E3006/exit 2 on Python 3.15. Its published
  metadata still declares Python `<3.15`; the existing documented compatibility
  limitation remains, without an override or patched distribution.
- `make hooks-files-check`: all applicable repository file hooks passed; the
  duplicate project hook was skipped because `make check` passed separately.
- Independent diff review found no blocker and confirmed the tool paths,
  versions, archive checksum and preserved staged/working lock hash.

Initial sandbox child-process/ASGI restrictions prevented the toolchain check
and stalled the first integration attempt (interrupted, exit 130). The unchanged
checks passed outside the sandbox with the same private-data boundaries.
No check failures remain.

**Changed files:** README, DEPENDENCIES and this task record. The maintainer's
pre-existing staged `uv.lock` is unchanged by the repair. Browser/container
suites and live provider evaluations were not run for this workstation repair.
No model downloads or deployment performed.

**Publication:** A fresh fetch confirmed the starting `main` and `origin/main`
both equal `cc07db3`. Independent publication review found only the audited
`uv.lock` refresh and the three documentation files above, with no blocker.
The installed commit-hook, non-force push and remote-equality outcomes are
recorded in the completion report.

## T56 — Update development tools and dependencies (2026-10-19)

**Status:** Local update, review and validation complete. The maintainer
authorized updating the development tools and project dependencies and pushing
the reviewed result to `main`.

**Scope and contracts:** SPECIFICATION sections 6 and 16, D001 and D016;
persistent nvm-managed Node/npm/pnpm, uv, root Python environment, JavaScript
workspaces, reproducible CI/container installers, generated API contracts and
existing application workflows. Retain minimum-only requirements, strict peers,
type checks, private-data boundaries and synthetic test fixtures. No database
migration or product-policy change is planned.

**Plan:** Verify current stable versions against official registry/release
metadata; install persistent tools, align repository pins, refresh dependency
locks, retry documented compatibility exceptions, then run locked bootstrap,
source/integration/browser/mock/audit/hook gates and the changed container
package checks. Review the final diff, commit with normal hooks and perform a
non-force push after a fresh fetch.

**Toolchain:** Direct official Node/npm/PyPI metadata selected Node 26.12.0,
npm 12.2.0, pnpm 12.14.0 and uv/uv_build 0.13.2. Python 3.15.0 remains the
current stable project runtime. Node's archive checksum and the new container
manifest digest were verified. Installed Node through the existing nvm and set
its persistent default to 26.12.0. npm and pnpm are installed in that Node's
global prefix; npm's one-time `--allow-scripts=pnpm` ran the official native
installer without changing user npm configuration. Node subprocess invocation
of pnpm passed. Existing terminals need `nvm use default` to select the new
installation; future nvm shells use the new default.

**Dependency resolution:** Python retains all 97 package identities and the
maintainer's prior upgrades; Hypothesis advances from 6.170.3 to 6.170.4.
JavaScript direct updates are Playwright 1.64.1, ESLint 10.13.0,
typescript-eslint 8.71.2, web-llm 0.2.86, React/React DOM 19.3.1, jsdom
30.1.3 and Vitest 4.1.12. The generated pnpm lock changes 89 package names,
including package-manager/platform packages; its first document now pins
pnpm 12.14.0. The supported one-time
`pnpm install --pm-on-fail=download --state-dir=/tmp/shepherd-js-refresh-pnpm-state --lockfile-only`
regenerated that manager lock; the workspace retains `pmOnFail: ignore`.

Independent isolated checks reproduced TypeScript 7.0.2's strict peer conflicts
with typescript-eslint and openapi-typescript. Application TypeScript 6.0.3 and
generator TypeScript 5.9.3 remain the newest compatible versions. Vitest
5.0.5/jest-dom 7.0.1 still fail with TS2428; the newest compatible 4.x release
4.1.12 passes. typescript-eslint 8.72.0 was too recent for the existing release-age
policy; no exclusions were retained. No workspace-policy changes, patched
declarations, type-check suppression or loosened assertions were introduced.

**Validation:** Commands use `/tmp/shepherd-t56/run` with the persistent Node
installation, cleared inherited variables, disabled env-file loading and
synthetic fixtures. The independent isolated JavaScript candidate also passed
frozen installation, strict types, lint, formatting, 11 toolchain/214 component
tests and audit before adoption.

- `make bootstrap`: passed locked Python and frozen JavaScript installation.
- `make check`: passed **329 backend unit, 11 toolchain and 214 component
  tests**, locks, lint/format, strict types, builds, generated-contract drift,
  credential scan and infrastructure lint. Existing build-system upper-bound
  and JavaScript chunk-size warnings remain.
- `make test-integration`: **378 passed in 67.50s** against synthetic fixtures.
- `make smoke-built`: **88 desktop/mobile browser cases passed in 14.3 minutes**
  using Chrome 155 through the supported executable override, with retries
  disabled. Covered accounts, setup, navigation/drafts, request recovery,
  provider policy, passages, assignment boundaries and photo workflows.
- `make eval-mock`: deterministic checks and all reading, teaching and
  adversarial contract gates passed. Fresh reports remain in
  `/tmp/shepherd-t56/eval-reports/`; dated tracked reports were preserved.
- `make audit`: Python and pnpm reported **no known vulnerabilities**.
- `make hooks-files-check`: all repository file hooks passed; its duplicate
  project hook was skipped because the full source gate passed separately.
- A fresh clean nvm shell selects Node 26.12.0, npm 12.2.0 and pnpm 12.14.0.
  The managed project Python remains 3.15.0 and uv reports 0.13.2.
- Stock cfn-lint still accepts the household template and rejects an invalid
  synthetic template on Python 3.15; no metadata override or patched package.

**Container package:** Built `math-practice-tutor:t56-check` from an isolated
context containing only tracked public build inputs. Node/npm/pnpm and uv
installer pins match the updated development tools; Node's image manifest
digest was independently hashed. The final image is
`sha256:10093491bc97f783c814f19ee855c8f68da5dbb4087f8c7436d54fbaf497fc92`.
The checked-in container smoke passed runtime/HEIF/cryptography, restricted
provider/no-inference, migration/SQLite, non-root/read-only API/worker, UI and
owner-setup checks against disposable synthetic storage.

Checksum-verified Trivy 0.76.0 passed HIGH/CRITICAL vulnerability and secret
scanning with **zero findings**, including unfixed vulnerabilities and without
exclusions. Generated CycloneDX 1.7 with **52 components**; SBOM SHA-256
`58fd1aff9e42a221864bcc601b86d12efdc27239d9f331ae2cd7b1de274da07b`.

**Final review and publication:** Independent diff review found no blocker.
All direct requirements retain `>=`; workspace peer, build and supply-chain
policies are unchanged. No application code, generated API contract, database
schema or private configuration changed. A fresh fetch confirmed the starting
`main` still matched `origin/main` at `1a804ad`. The installed commit-hook,
non-force push and remote-equality outcomes are recorded in the completion
report.

**Changed files:** `.node-version`, `package.json`, `apps/web/package.json`,
`pnpm-lock.yaml`, `pyproject.toml`, `uv.lock`, `.github/workflows/ci.yml`,
`infra/docker/Dockerfile`, README, DEPENDENCIES, SPECIFICATION, ACCEPTANCE and
this task record. Previously published maintainer Python upgrades are retained.

No failures remain. Compatibility/release-age exceptions are recorded above;
reassess them on the next update. Hosted CI was not observed in these local
results. No live provider evaluations, model downloads, deployment or OS-package
upgrade occurred. Real model, physical-device, manual-accessibility and full
host-recovery acceptance remain open.

## T55 — Review and publish the reconciled Python lock (2026-10-19)

**Status:** Review and local validation complete. The maintainer authorized
publication to `main`, explicitly including their `uv.lock` updates.

**Scope and contracts:** SPECIFICATION sections 6 and 16; locked installation,
existing API/HTTP-client behavior and dependency compatibility. Local `main`
fast-forwarded from `3292ea7` to `a46a42f`; the maintainer's newer local lock
was retained byte-for-byte from a verified temporary backup. No application,
generated API, database schema, provider policy or Python version changes.

**Independent review:** All 97 package identities, dependency declarations,
registry sources and Python constraints remain unchanged. Fourteen packages
advance relative to `a46a42f`; only versions and distribution artifacts change.
No downgrade or actionable lock inconsistency was found.

| Package          | Before    | After     |
| ---------------- | --------- | --------- |
| boto3            | 1.43.114  | 1.43.115  |
| boto3-stubs      | 1.43.114  | 1.43.115  |
| botocore         | 1.43.114  | 1.43.115  |
| botocore-stubs   | 1.43.114  | 1.43.115  |
| FastAPI          | 0.146.0   | 0.150.0   |
| filelock         | 4.2.2     | 4.2.4     |
| httpcore2        | 2.14.0    | 2.15.1    |
| httpx2           | 2.14.0    | 2.15.1    |
| hypothesis       | 6.170.1   | 6.170.3   |
| jsonpatch        | 1.35      | 1.36      |
| jsonpointer      | 3.3       | 3.4       |
| platformdirs     | 4.13.4    | 4.13.5    |
| python-discovery | 1.6.3     | 1.6.4     |
| s3transfer       | 0.19.2    | 0.19.3    |

**Validation:** `uv lock --offline`, `uv lock --check --offline` and
`git diff --check` passed. Initial checks lacked pnpm and an offline artifact;
locked bootstrap now passes using checksum-verified Node 26.11.1 and pnpm
12.11.2, uv 0.13.2 and Python 3.15.0. Commands use
`/tmp/shepherd-publish-toolchain/run`, which clears inherited variables and
disables env-file loading. The sandbox reported `EPERM` for Node subprocess
checks; the full gate runs outside that restriction with the same tests.

- `make bootstrap`: passed locked Python and frozen JavaScript installation.
- `make check`: passed **329 backend unit, 11 toolchain and 214 component
  tests**, locks, lint/format, strict types, builds, generated-contract checks,
  credential scan and infrastructure lint. Existing build-system upper-bound
  and JavaScript chunk-size warnings remain.
- `make test-integration`: **378 passed in 67.21s**, covering authentication,
  ownership, provider policy, SQLite migrations/recovery and tutoring/worker
  workflows against synthetic fixtures.
- `make audit`: Python and pnpm reported **no known vulnerabilities**.
- `make hooks-files-check`: passed all repository file hooks; its duplicate
  project gate was skipped because `make check` passed separately.

The first full gate had **213 component tests pass and one failure** at the
account-switch reload-warning assertion. The unchanged focused case and all
19 App tests passed in isolation. Independent review identified a passive-effect
cleanup race: the new empty form can render before React removes the old
`beforeunload` listener. The existing assertion now waits for cleanup, creating
a fresh cancelable event per attempt. All original draft, role, URL and guard
assertions remain. Final `pnpm test` and `make check` passed with this test-only
synchronization fix; no production behavior was changed.

**Remaining acceptance:** Updated ACCEPTANCE with the existing October 18
container, encrypted backup/isolated restore and private deployment evidence.
Live model selection/teaching review, physical devices/manual accessibility and
full restored-host startup/sign-in/key recovery remain maintainer work. The
administrator-authorship and post-attempt worked-solution decisions remain open;
this dependency refresh does not change either policy.

**Changed files and publication:** `uv.lock`, `apps/web/tests/App.test.tsx`,
`docs/DEPENDENCIES.md`, `docs/ACCEPTANCE.md` and this task record. A fresh fetch
confirmed local `main` matched `origin/main` at `a46a42f` before publication.
The final installed commit-hook, non-force push and remote-equality results are
recorded in the completion report.

No failures remain. Browser/container checks were not repeated for this lock and
test-only refresh. No live provider evaluations, model downloads or deployment
occurred; the private installation retains the earlier dependency set.

## T54 — Publish the maintainer's Python lock refresh (2026-10-18)

**Status:** Source validation complete. The maintainer authorized committing and
pushing the updated root `uv.lock` to `main` and requested an explanation of its
relationship to Python 3.15.

**Scope and contracts:** SPECIFICATION sections 6 and 16; locked installation,
existing API/HTTP-client behavior and dependency compatibility. Preserve the
maintainer's lock contents. No application, generated API, database schema or
runtime-version change is required.

**Lock review:** All 97 package identities, dependency declarations and Python
constraints are unchanged. Only these versions and their distribution artifacts
changed:

| Package     | Before    | After      |
| ----------- | --------- | ---------- |
| certifi     | 2026.7.22 | 2026.10.18 |
| FastAPI     | 0.145.0   | 0.146.0    |
| httpcore2   | 2.13.1    | 2.14.0     |
| httpx2      | 2.13.1    | 2.14.0     |
| jsonpointer | 3.2.1     | 3.3        |
| Starlette   | 1.8.0     | 1.9.0      |

The project already pinned Python **3.15.0** and required `>=3.15.0` before this
refresh. This update changes dependencies for that runtime, not Python itself.

**Validation (2026-10-18):** Commands used
`/tmp/shepherd-lock-toolchain/run`, with checksum-verified Node 26.11.1, pnpm
12.11.2, uv 0.13.1 and Python 3.15.0. The runner clears inherited variables and
disables env-file loading; tests use synthetic data.

- `uv lock --check --offline`: passed; all 97 package identities and dependency
  declarations were independently compared with the previous lock.
- `make check`: passed **329 backend unit, 11 toolchain and 214 component tests**,
  locks, lint/format, strict types, builds, generated-contract consistency,
  credential scan and infrastructure lint. Existing build-system upper-bound
  and JavaScript chunk-size warnings remain.
- `make test-integration`: **378 passed in 228.47s**, including authentication,
  ownership, SQLite migrations/recovery and tutoring/worker workflows.
- `make audit`: Python and pnpm reported **no known vulnerabilities**.
- `make hooks-files-check`: passed repository file hooks; the duplicate project
  hook was skipped because the full project gate passed separately.

The first `make check` stopped at contract generation because the temporary
pnpm install's shell launcher lacked a shebang and Python could not execute it
directly (`ENOEXEC`). A task-local launcher corrected the toolchain; the final
full run above passed. No application source, test or assertion was changed.
Independent compatibility review found no actionable blocker.

**Changed files and publication:** `uv.lock`, `docs/DEPENDENCIES.md` and this
task record. A fresh fetch confirmed the starting local `main` matched
`origin/main` at `3292ea7`. The final commit, installed commit hooks, non-force
push and remote equality are verified in the completion report.

No failures remain. Browser/container checks and live provider evaluations were
not run for this source-only refresh; no deployment or model download occurred.

## T53 — Six-character account passwords (2026-10-18)

**Status:** Complete; source, browser, package and private deployment checks passed. The maintainer requested a minimum above five
characters. This explicitly replaces D011's twelve-character HTTPS requirement
with one six-character minimum for administrator and learner accounts.

**Scope and contracts:** SPECIFICATION section 12, D011/D013, owner setup,
interactive administrator reset, learner creation/reset, login and existing
sessions. SetupStatus retains minimum/maximum lengths and drops the obsolete
local-only policy field; regenerate OpenAPI and TypeScript. Preserve password
hashing, the 256-character maximum, validation, rate limits, CSRF and ownership.
Backup encryption passphrases remain separate and unchanged.

**Validation plan:** Prove five characters are rejected and six accepted on HTTP
and HTTPS for setup/reset and learner accounts; retain session revocation and
wrong-password checks. Verify accounts created under the previous local policy
work over HTTPS without resetting credentials. Run targeted tests, `make check`,
`make test-integration`, browser account/setup journeys and repository hooks.
Update current guidance and record actual publication/deployment evidence.

**Implementation:** One shared six-character validator now covers administrator
setup/reset and learner creation/reset on every origin. Removed the former
network restrictions from login, session validation and native startup. The
frontend uses six characters on HTTPS and current Help/README/operations/security
guidance agrees. Regenerated OpenAPI and TypeScript after removing
`SetupStatus.local_passwords_allowed`.

No database migration or credential rewrite is needed. Existing administrator
password-history markers retain their historical meaning for migration 0013's
downgrade guard; learner markers remain stored metadata. Neither limits current
access. Existing credential hashes and sessions are preserved, while an explicit
password reset still revokes sessions. Independent review found no actionable
defects; hashing, maximum length, account state, CSRF, rate limits and ownership
checks remain intact.

**Validation (2026-10-18):**

- Focused password/authentication tests: **98 passed in 8.51s** against synthetic
  data, including HTTP/HTTPS five/six boundaries, existing short credentials,
  interactive reset, session revocation and migration rollback protection.
- `make check`: passed **329 backend unit, 11 toolchain and 214 component tests**,
  lint/format, Python/TypeScript types, builds, generated-contract drift,
  credential scan and infrastructure lint. Existing build-system upper-bound
  and JavaScript chunk-size warnings remain.
- `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/google-chrome pnpm smoke
tests/smoke/setup.spec.ts tests/smoke/accounts.spec.ts`: **10 desktop/mobile
  journeys passed in 36.0s** with retries disabled. Exactly five characters are
  rejected before a form mutation, exactly six create/reset and authenticate,
  invalid resets preserve the learner session, and successful resets revoke it
  without changing the learner identity. Focused ESLint/TypeScript checks passed.
- The initial integration run had **377 passed and one fixture setup error**:
  a concurrent native browser startup rebuilt `dist/assets` while the API fixture
  was mounting it. No application assertion failed. Final `make test-integration`
  after all browser/native test processes stopped passed **378 tests in 67.25s**,
  without code or assertion changes to conceal the fixture race.
- `make hooks-files-check` and the staged whitespace/credential scan passed.
- Current Markdown formatting, whitespace and independent policy consistency
  review passed. An earlier temporary documentation-check script was no longer
  available; it provided no validation result for this task.

The full 88-case browser suite was not repeated; the changed account/setup
workflows were covered by the ten focused journeys above. No live inference,
model download, private credential inspection or operator account reset was performed.
**Publication and package verification:** Published
`93f93de665cb6c9040b4a540139cb05ae8b86502` to `main` after the installed commit
hooks passed the complete project gate. A fresh fetch confirmed the base before
the non-force push. The maintainer's previously published lock updates are
preserved; this task changes no dependency lock or schema.

Built `math-practice-tutor:release-20261018-93f93de` from that commit's clean Git
archive. Exact image
`sha256:925a2533146814dc9fcf14a2273ac3bde0b88375f08a4594a61815b73243dc64`
has the full committed OCI revision. The checked-in container smoke passed its
runtime, restricted-provider/no-inference, migration/SQLite, non-root/read-only
API/worker, UI and owner-setup checks. A separate network-disabled, read-only
container accepted six and rejected five characters with an HTTPS origin.

Trivy 0.76.0's HIGH/CRITICAL vulnerability and secret scan passed with zero
findings, including unfixed vulnerabilities and no exclusions. Generated
CycloneDX 1.7 with 52 components; SBOM SHA-256
`1ec707f7d6b45b6a9b05abc42d6630f4a5e85d82a8b533e0829c37f8b1c090e3`.

**Private deployment and verification:** The reviewed
`/tmp/shepherd-t53-release-20261018/final/cutover.py` preserved the previous
`f0fb127` image as `math-practice-tutor:rollback-20261018-f0fb127`, stopped both
writers, and created a native encrypted backup with a verified isolated restore.
SQLite integrity, foreign keys, retained-object checksums, deletion handling and
schema validation passed; the original data mount was read-only during backup.
No live restore or credential rewrite occurred.

Backup `backups/deploy-20261018-93f93de/snapshot.enc` has SHA-256
`00bbfffd874ef3e5e233bb8aa78dde5dc04a005315002e0a52e2c5eb20a40e0f`.
Directory/file permissions are 700/600. Its generated mode-600 passphrase file
is stored separately under
`~/.local/share/shepherd-academy-universe/backup-keys/`; its value was never
displayed or passed through command arguments/environment variables.

Compose restarted the API and worker with the exact tested image above, retained
the existing loopback binding/data mount and confirmed unchanged schema
`0020_request_recovery (head)`. Final private HTTPS checks passed readiness, a
fresh heartbeat from the new worker, exact HTML/service-worker/JS/CSS hashes,
cache headers, three anonymous protected-route rejections and three disabled API
documentation routes. The anonymous setup API reports minimum **6**, maximum
**256**, no obsolete local-only field and `no-store`. A fresh anonymous mobile
browser passed both app-area links and labeled sign-in destinations with no
administrator controls, overflow or page errors. No actual account was used.

No failures remain. The final evidence-only commit changes this task record;
the running image's application source remains `93f93de`.

## T52 — Link learning and administration (2026-10-18)

**Status:** Complete; implementation, final source/browser/package gates,
publication and private deployment passed. The maintainer requested obvious links between
learning and administration within the same app, with administrator sign-in
required when entering administration. Publish to `main`, include the
maintainer's `uv.lock` updates, and deploy the private installation.

**Scope and contracts:** SPECIFICATION sections 2–3, 9–10, 12–13 and 16–17;
D013 account ownership and existing cookie/CSRF authentication. Add visible app
area links in both directions and clearly labeled sign-in destinations. Keep
the current account until another sign-in succeeds; the existing backend
already authenticates new credentials before revoking the prior session.
Opening or canceling a switch must preserve learner drafts; a successful switch
must clear previous-account data and session selection. No new provider,
service, privilege, API schema or database migration is planned.

**Validation plan:** Component cases for both roles, sign-in failure/cancel,
draft preservation and account cleanup; synthetic browser journeys for both
navigation directions, actual credentials and permission boundaries. Run the
required Make/hook gates, review the maintainer's lock delta, then publish and
repeat image smoke/security/SBOM, encrypted backup/restore, private deployment
and HTTPS/assets/anonymous-access checks. Record actual results and limits.

**Implementation and review:** The app header now links **Learning environment**
and **Administration**. Targeted URLs retain the destination through reload and
browser navigation; a different role opens its labeled sign-in in the same app.
Failed credentials keep the current session. Canceling preserves the exact
learner draft or unsaved administrator settings form. Successful authentication
remounts account-owned content, clears the old selection/hash and ignores stale
requests. Pending sign-in blocks conflicting navigation, logout/reconnect and
duplicate submission. Unexpected valid account roles open their actual
workspace with clear guidance. No backend privilege or schema changed.

Independent review found and corrected an administrator Settings remount when
opening the opposite sign-in, and conflicting actions during a pending login.
All existing assertions remain; the added regressions cover both behaviors.
README, Help and SPECIFICATION describe the shared navigation and sign-in rules.

**Maintainer lock updates:** FastAPI **0.143.3 → 0.145.0**, filelock
**4.2.1 → 4.2.2**, virtualenv **21.14.10 → 21.14.11**. All **97 package names**
and dependency declarations are preserved; only those package versions/artifacts
changed. Locked installation confirmed the new versions.

**Validation (2026-10-18):**

- `make audit`: Python and pnpm audits reported no known vulnerabilities.
- `make test-integration`: **376 passed in 66.21s** on synthetic on-disk SQLite.
- Focused App tests: **19 passed**, including **8** new account-switch cases;
  frontend types, ESLint and formatting passed.
- Focused `pnpm smoke tests/smoke/workspace-navigation.spec.ts`: **4 desktop/mobile
  journeys passed in 1.1 minutes** with real synthetic credentials and unchanged
  rate limits. The final preservation/pending-action corrections are also
  covered by component tests and the full browser gate below.
- Final `make check`: passed **329 backend unit, 11 toolchain and 212 component tests**,
  locked dependencies, lint/format, types, builds, contract drift, secret scan and
  infrastructure validation. Existing build-system upper-bound and JavaScript
  chunk-size warnings remain. `make hooks-files-check secret-check` passed.

The initial full browser run exposed a real generic-login URL regression:
adding `?page=learners` to root sign-in forced a full document reload when a
phone opened a root photo-capture fragment. The original same-document assertion
failed; no assertion was removed. The run was stopped after **29 passed, one
failed and one interrupted** (the interrupted case was waiting for the real
login throttle); **57** cases had not run. Generic sign-in now preserves the
root/current route while clearing stale selection, and explicit area switches
still open their role's home. New component regressions cover root login for
both roles; the final project gate above passed after this correction.

Focused `pnpm smoke tests/smoke/phone-navigation.spec.ts
tests/smoke/workspace-navigation.spec.ts` on the corrected build passed **all six
desktop/mobile journeys in 2.0 minutes**, including the original phone document
sentinel, actual account credentials, failed-sign-in authorization, cancellation
and draft cleanup. Final `make smoke-built` on that frozen build passed **all
88 desktop/mobile journeys in 14.2 minutes**, with retries disabled and the real
login rate limit unchanged. The installed Google Chrome executable was used
through the supported Playwright override.

An independently built candidate with the updated lock passed the checked-in
container smoke and Trivy **0.76.0** HIGH/CRITICAL vulnerability/secret scan,
including unfixed findings with no exclusions, and generated a **52-component**
CycloneDX SBOM. Final package verification will use the committed runtime source
and its exact OCI revision before private cutover. No paid provider inference,
private-data inspection or model download was performed by these checks.

**Publication and final installation (2026-10-18):**

- The installed commit hooks passed all applicable file checks and the full
  project pre-commit gate. Published
  **`f0fb127ce4d1896d594b684e65aea68c64f11576`** to `main`, including all three
  maintainer lock updates. A fresh fetch before publication confirmed the
  `150936f` base; the push advanced it without force.
- Built `math-practice-tutor:release-20261018-f0fb127` from a clean
  `git archive HEAD` context. The exact final image is
  **`sha256:78af08b19c02f6440fdde28bf3c1a717a1b4f85cebf11b950078f9d2d222e79a`**,
  labeled with the full committed source. The checked-in
  `scripts/container-smoke.sh` passed again for this image: Python/HEIF/crypto,
  installer removal, typed provider rejection without inference, real synthetic
  migrations/SQLite settings, non-root/read-only API and worker, built UI and
  browser owner-setup protections.
- Final Trivy **0.76.0** `image --image-src docker --scanners vuln,secret
--severity HIGH,CRITICAL --ignore-unfixed=false --ignorefile /dev/null
--exit-code 1` passed with **zero HIGH/CRITICAL vulnerabilities or secrets**.
  Generated CycloneDX **1.7**, **52 components**; SBOM SHA-256
  `706540c81d2c0db564896a8df9f9f1ff2297a73a10a35ddf09fa0ab1fc680601`.
- `/tmp/shepherd-t52-release-20261018/final/cutover.py` retained the prior image
  as `math-practice-tutor:rollback-20261018-4e9f5fa`, stopped API/worker with
  Compose `stop --timeout 100`, and verified both writers were stopped. The
  offline, network-disabled backup container used the prior image and a
  read-only original data mount. Native encrypted backup and isolated restore
  passed integrity, foreign keys, retained-object checksums, deletion handling
  and schema validation; live data was never restored or replaced.
- The encrypted backup is `backups/deploy-20261018-f0fb127/snapshot.enc`, SHA-256
  `02697d76089d88fbf3e4a575ccc66588b31e91ddf8cc20a344c959eb4cedfe78`.
  Directory/file modes are **700/600**. Its generated mode-600 passphrase file is
  stored separately under
  `~/.local/share/shepherd-academy-universe/backup-keys/`; its contents were never
  displayed or passed through command arguments/environment variables.
- Tagged the tested image as `math-practice-tutor:local`, ran controlled
  `alembic -c alembic.ini upgrade head`, and Compose
  `up -d --no-build --pull never --no-deps api worker`. Both running services
  match the exact tested image and unchanged **`0020_request_recovery (head)`**.
  Original accounts, data mount, operator settings and session secret were
  preserved.
- `python3 /tmp/shepherd-t52-release-20261018/final/verify.py` passed private
  HTTPS readiness, a heartbeat newer than the replacement worker's start,
  exact HTML/service-worker and **2/2** JS/CSS asset hashes, cache headers and
  service-worker scope. **3/3** anonymous protected requests returned `401` and
  `no-store`; protected response bodies were never read. **3/3** runtime API
  documentation routes returned `404`.
- `verify-navigation.mjs`, using a fresh anonymous mobile browser over the
  deployed private HTTPS origin, passed both visible area links and both
  labeled sign-in destinations, absence of administrator controls, viewport
  overflow and page-error checks. It never signed in or viewed learner work.
- Final scan/SBOM and deployment verification metadata are retained beside the
  ignored encrypted backup. This documentation-only completion record is
  published after deployment; it changes no runtime inputs.

**Changed files:** App/navigation/styles and Help; App component and dedicated
browser regressions; README/SPECIFICATION/this evidence; the maintainer's
`uv.lock`. No failures remain. Live provider teaching/handwriting quality,
physical devices, manual accessibility and full restored-host sign-in/key
recovery remain separate acceptance work. No paid inference, model download,
private-data inspection or new hosting infrastructure was used for this task.

## T51 — Deploy the current private installation (2026-10-18)

**Status:** Complete; image checks, encrypted backup/isolated restore, private
deployment and final installation verification passed. The maintainer authorized
deploying all current changes to the existing private Compose installation. Runtime source is
`4e9f5fad5006859208f8efba703624fd7c8f0161`; the starting tree was clean.

**Scope and contracts:** SPECIFICATION sections 2, 5, 12–13 and 16–17;
D004/D007/D016; RUNBOOK container upgrade and encrypted backup procedures.
Preserve the existing single API/worker, local data mount, operator settings,
session secret and browser-managed connections. Keep a rollback image, stop both
writers before backup/migration, verify an encrypted backup and isolated restore,
deploy the tested image, and check the private HTTPS application without
inference or protected response bodies. There are no migration changes from
`e9bf42c`; the schema remains `0020_request_recovery`.

**Pre-deployment checks and bounded correction:**

- Built `math-practice-tutor:release-20261018-4e9f5fa` using the checked-in
  Dockerfile and a clean `git archive HEAD` context. `.dockerignore` admitted
  only public build inputs; private settings/data were excluded. OCI labels
  record the complete source revision.
- `sh scripts/container-smoke.sh math-practice-tutor:release-20261018-4e9f5fa`:
  passed Python 3.15.0, HEIF conversion, cryptography, installer removal,
  restricted-provider typed rejection without inference, synthetic on-disk
  migrations, non-root/read-only API/worker readiness and built UI, owner-link
  renewal/stale rejection, browser setup and claimed-account protection.
- Trivy **0.76.0**, verified against official release metadata/checksums:
  `image --image-src docker --scanners vuln,secret --severity HIGH,CRITICAL
--ignore-unfixed=false --ignorefile /dev/null --exit-code 1` passed with
  **zero HIGH/CRITICAL vulnerabilities and secrets**. The vulnerability database
  was updated at `2026-10-18T07:12:07Z`. Generated a CycloneDX **1.7** SBOM with
  **52 components**. Scan/SBOM evidence is in
  `/tmp/shepherd-deploy-20261018-4e9f5fa`.
- The exact source's hosted [package job](https://github.com/tylermowll/shepherd-academy-universe/actions/runs/39086483885)
  passed build/smoke/scan/SBOM. Its source gate failed one reconnect-refresh
  component test. An unchanged local full suite passed **204/204**, but an
  isolated original test failed on repetition 16; temporary synthetic
  instrumentation reproduced the failure with **zero installed online
  listeners** when the test emitted its event. The composer could render before
  the passive effect installed the listener. A test-only `await act` around
  initial render now flushes those effects. All assertions, timeouts and runtime
  code are unchanged. The corrected full suite passed **204/204**, the isolated
  test passed **20/20** runs, and frontend types, scoped formatting and
  `git diff --check` passed in disposable network-disabled containers.
- Exercised `/tmp/shepherd-deploy-20261018-4e9f5fa/backup_snapshot.py` on a
  disposable synthetic database with the old image. The first attempt exposed
  SQLite's need to initialize WAL read-coordination files on a read-only mount;
  the corrected helper copies the quiesced database, sidecars and retained
  directory into private tmpfs before using the native encrypted backup and
  restore routines. The corrected exercise passed with a read-only original
  mount, no network, UID 10001 and dropped capabilities. It verifies integrity,
  foreign keys, retained-object checksums and the current deletion ledger;
  absence of a ledger is accepted only after proving there are no tombstones.

**Installation evidence (2026-10-18):**

- Verified the existing API and worker both used the October 11 image and the
  reviewed local `data:/app/data` bind mount. Preserved that image as
  `math-practice-tutor:rollback-20261018-e9bf42c`.
- `/tmp/shepherd-deploy-20261018-4e9f5fa/cutover.py` stopped both services with
  Compose `stop --timeout 100 api worker` and verified neither was running
  before backup. An offline container using the previous image and the
  read-only retained-data mount created an app-native authenticated encrypted
  backup and verified an isolated restore with SQLite integrity/foreign keys,
  retained-object checksums, current deletion handling and schema checks.
  Original data was not restored, reset or replaced.
- The mode-600 backup is `backups/deploy-20261018-4e9f5fa/snapshot.enc` under
  mode-700 directories; SHA-256 is
  `b5cb8bd480a271bd66b7f3f4024a4bced7159a926d871321ff0d8d6e215b0234`.
  The generated passphrase is stored separately in the mode-600
  `~/.local/share/shepherd-academy-universe/backup-keys/deploy-20261018-4e9f5fa.key`,
  never displayed or passed through command arguments or environment variables.
  Existing operator settings and session secret were preserved through Compose.
- Tagged the tested release as `math-practice-tutor:local`; Compose
  `run --rm --no-deps -T api alembic -c alembic.ini upgrade head`,
  `up -d --no-build --pull never --no-deps api worker`, and
  `exec -T api alembic -c alembic.ini current` passed. The schema stays
  **`0020_request_recovery (head)`**. Both replacement services use image
  **`sha256:88c59a36e6d580fe412511bef4ec8e003892c06c347c0673135bd47f1762f029`**,
  labeled with the complete `4e9f5fa` revision.
- `/tmp/shepherd-deploy-20261018-4e9f5fa/verify.py` passed private HTTPS
  readiness, a heartbeat newer than the replacement worker's start, exact
  served HTML/service-worker and **2/2** referenced JS/CSS hashes, no-cache
  HTML/service worker and service-worker scope. All **3/3** anonymous
  administrator/reading/request-receipt GETs rejected access with `401` and
  `no-store`; protected response bodies were never read. All **3/3** runtime API
  documentation URLs returned `404`.
- Deployment/verification metadata, vulnerability report and SBOM are retained
  beside the ignored encrypted backup. The SBOM SHA-256 is
  `85c06ade83427b9ba818f14f5d67ea3544dac762c15c6fc8c4bbba7ba2e8b71a`.

**Changed files:** `apps/web/tests/Tutor.test.tsx` contains only the synchronization
correction; this file records current deployment evidence. Production source
remains the tested committed runtime. These two follow-up files were left
uncommitted after deployment; the maintainer subsequently authorized publishing
them to `main` as a separate follow-up.

No deployment failures remain. The existing T50 source/integration/browser/mock
gates were not repeated for the unchanged production source; the packaged image
and corrected component regression were checked as described above. No test
inference, provider-setting inspection/change, model download, new hosting
infrastructure or Git push occurred. Physical devices, human teaching review,
manual accessibility, separately recovered settings/key decryption and restored
administrator/learner sign-in acceptance remain unverified; the offline restore
does not claim those operational recovery checks.

**Publication follow-up (2026-10-18):** The maintainer authorized publishing
the test synchronization and deployment record to `main`. A fresh fetch showed
local `main` and `origin/main` at `4e9f5fa`. `make check` with isolated Node
26.11.1, pnpm 12.11.2, uv 0.13.1 and Python 3.15.0 passed **329 backend unit,
11 toolchain and 204 component tests**, locked dependencies, lint/format,
types, builds, generated-contract drift, secret scanning and infrastructure
validation. The initial gate caught the test callback's `require-await` lint
error; returning a resolved promise preserves the asynchronous React flush and
satisfies the rule without disabling it. Existing build-system upper-bound and
JavaScript chunk-size warnings remain. Commit hooks run the required project
gate again; the final commit/push result and remote equality are reported after
publication. No runtime change or redeployment is needed for these two files.

## T50 — Independent adversarial product and implementation review (2026-10-17)

**Status:** Complete; independent review, bounded fixes and final local gates
passed. Release acceptance remains open. The maintainer authorized publication
to `main`; the starting tree was clean at `515dc70`.

**Scope:** Review the complete tutor against its learning goals, privacy and
operating processes. Reproduce meaningful defects before fixing them; record
consequential product decisions and release limitations separately. No live
inference, private-data inspection, model downloads, provisioning or deployment.

**Contracts and validation plan:** SPECIFICATION sections 1, 3–4, 7, 9–13;
revocation and ownership after external I/O; useful, source-grounded model
requests and responses; responsive learner history and recovery. Use synthetic
on-disk integration tests for authorization/state failures and focused component
and browser checks for affected journeys. Regenerate public contracts if needed.
Run targeted regressions, `make check`, `make test-integration`, mock evaluations
and appropriate browser checks; inspect the final diff and repository hooks.
Record actual commands, outcomes and limits before committing and pushing.

**Findings and changes:**

- **History scaling:** Each 2.5-second refresh fetched up to 100 complete
  sessions, then fetched the selected session again. A synthetic retained history
  of 100 sessions (one 47,600-character passage and 7,200-character response each)
  produced **10,407,691 bytes and 601 SELECTs** with the former list projection.
  The new typed summary projection uses **21,191 bytes and one SELECT** on the
  same temporary on-disk database. Polling refreshes the selected conversation
  and current processing disclosures; history navigation loads summaries.
  Full owned detail and administrator exports remain available.
- **Revocation after external I/O:** Both administrator and learner import
  requests returned `200` with a signed source token after a separate database
  connection revoked the requesting session during the source fetch. Expiring
  cached ORM objects before the final authorization now produces `401`.
- **Expired worker authority:** A worker paused beyond its lease could admit
  another provider call, although it could never publish the result. Preparation
  and failure handling now reject expired authority, including expiry during
  request construction before call admission; the job stays reclaimable and the
  next valid worker completes once without the stale call.
- **Valid multilingual output:** A 16,000-serialized-character inner JSON cap
  rejected schema-valid Unicode readings and generated passages depending on
  whether the provider escaped characters. Inner JSON now shares the existing
  262,144-byte transport bound, with decoded field limits unchanged. Oversized
  output and invalid Unicode still fail safely.
- **Empty successful responses:** Whitespace-only questions, goals, criteria,
  guidance and observation evidence could be accepted as successful model work.
  Required visible output is now validated, while legitimate optional empties
  and historical feedback remain readable. Invalid new output preserves the
  request and fails visibly.
- **Invisible uploaded work:** Normalization discarded alpha before placing
  PNGs on white, turning transparent black backgrounds into black and hiding
  black ink. RGBA, grayscale-alpha and palette transparency now composite onto
  white before producing the bounded, metadata-free JPEG.
- **Runtime API documentation:** `/docs`, `/redoc` and `/openapi.json` returned
  unauthenticated `200`, contrary to the default-private documentation contract.
  Runtime endpoints are disabled; offline contract generation still works.

**Product judgment and unresolved decisions:** The topic → work → guidance →
revision loop and single-household architecture form a coherent private tutor.
Provider isolation, durable work and retention support that goal, but broad
subject support and connection tests do not establish useful teaching. Required
human model/handwriting review, real-device accessibility and restored startup
remain release gates. Prioritize a measured initial learner/subject cohort over
adding providers or browser-model features; expansion needs held-out synthetic
cases and human review of false corrections, answer disclosure and uncertainty.

The role contract also needs a maintainer decision: D013/SPECIFICATION section 9
say administrators use synthetic probes rather than learner Practice, but
`Principal` plus `owned_learner` allows an administrator to create and mutate
any managed learner's tutoring work through HTTP. Administrator-based integration
fixtures exercise that behavior. This is not an escalation beyond the adult's
existing export/password-reset authority; it can nevertheless attribute
administrator-authored work to learner memory without an explicit actor record.
Recommend learner-only practice mutations, retaining administrator exports, or
an explicit audited on-behalf workflow if that is a real product need. Changing
all role-dependent routes and fixtures deserves its own bounded task; this
review does not silently redefine the existing privilege model.

The blanket solution prohibition also covers the app's own generated practice,
even after an attempt. Consider explicit post-attempt/post-finish worked-solution
comparison for those activities; keep uploaded assignments reference-only.
That teaching-policy decision is left to the maintainer. History pagination
beyond the 100 newest sessions and incremental loading of very long selected
conversations remain bounded follow-ups; administrator exports preserve access
to older retained work.

**Changed files:** Runtime changes are in
`apps/api/src/math_tutor/adapters/images.py`, `adapters/providers/contracts.py`,
`adapters/providers/transports.py`, `api/app.py`, `api/reading.py`,
`api/tutoring.py`, `worker.py` and `apps/web/src/Tutor.tsx`. Regression evidence
is in backend integration tests `test_reading.py`,
`test_teaching_output_boundaries.py`, `test_tutoring_history.py`,
`test_workflows.py`; backend unit tests `test_health.py`, `test_images.py`,
`test_provider_contracts.py`, `test_tutoring_contracts.py`; and frontend tests
`App.test.tsx`, `Tutor.test.tsx`. OpenAPI/TypeScript definitions were regenerated.
Current requirements, decisions and evidence are updated in SPECIFICATION,
ACCEPTANCE, HANDOFF and this task.

**Validation (2026-10-17):** Commands use
`/tmp/shepherd-t49-toolchain/run` (Node 26.11.1, pnpm 12.11.2, uv 0.13.1,
Python 3.15.0), which clears operator/provider variables and disables env-file
loading. ASGI/subprocess/browser checks use isolated execution outside the
restricted sandbox, where ASGI thread scheduling stalls.

- Pre-fix regressions demonstrated two revoked imports returning `200`, three
  alpha modes hiding black work, thirteen blank/Unicode failures, stale-worker
  call admission and all three public documentation endpoints returning `200`.
  A further synthetic-clock reproduction found expiry during request preparation
  still admitted a call; the final guard covers that boundary too.
- Focused final checks passed: **5 source-import**, **15 image unit**,
  **152 provider/teaching unit**, **18 teaching-output integration**,
  **74 workflow/retention/health**, **2 history integration** and
  **75 App/Tutor/Reading component** tests. After the final lease guard,
  **4 expiry/recovery/duplicate integration** tests and scoped Ruff/mypy passed.
- `make contracts`: regenerated the list summary response and TypeScript types.
  The new text validation stays local and adds no native-provider schema keywords.
- `make check` on the final source: passed **329 backend unit, 11 toolchain and
  204 component tests**, locks, lint/format, types, builds, contract drift,
  secret scan and infrastructure validation. The earlier complete run passed
  before the final lease-admission follow-up too. Existing build warnings about
  the deliberately unbounded `uv_build` requirement and JavaScript chunk size
  remain.
- Final `make test-integration`: **376 passed in 140.92s** on temporary on-disk
  SQLite databases. The earlier 375-case run passed before the final
  lease-admission guard and its additional regression case.
- Final `make smoke-built`: **84 desktop/mobile Chromium journeys passed in
  13.8 minutes**, with retries disabled. The supported installed-Chrome override
  used Google Chrome 155.0.8059.84. `make check test-integration smoke-built`
  passed as one serialized run against the frozen final source.
- `make audit`: Python and pnpm audits reported no known vulnerabilities.
- `make eval-mock` via `/tmp/shepherd-t50-eval.py`: passed all **33 deterministic
  cases**, synthetic vision contracts, **36 reading stages**, **36 teaching
  stages** and **20 adversarial stages**. Fresh reports are in
  `/tmp/shepherd-t50-eval-evidence`; checked-in dated reports were preserved.
  These are mock contracts, not measurements of teaching quality.
- `python3 /tmp/shepherd-t50-docs.py`: **196 local links/headings** validated
  across 17 Markdown files. Edited Markdown formatting and `git diff --check`
  passed.
- `make hooks-files-check secret-check`: repository file hooks and credential
  scanning passed after staging the new public history regression, paired with
  the completed project gate. The local commit hook was refreshed to use the
  consolidated root Python environment.

No failures remain in T50. Initial sandboxed ASGI runs stalled and were stopped;
the isolated external runs above passed. No workflow/ownership assertion was
removed or test threshold relaxed. Independent cross-review of the final source
diff found no further blocking regression.

Live inference, physical phones, manual accessibility,
restored-host startup/key recovery and local container packaging/scanning have
not been run. There is no local Docker executable. Source publication does not
update or validate the private running installation.

**Publication:** A fresh fetch confirmed the starting local `main` matched
`origin/main` at `515dc70`. The authorized commit runs the installed repository
hooks; its final hash, push result, remote equality and working-tree status are
verified in the completion report. No application deployment is included.

## T49 — Close tutoring and account process gaps (2026-10-17)

**Status:** Complete; implementation and final local gates passed. The maintainer
authorized fixing the reviewed gaps and committing and pushing the finished
changes to `main`.

**Scope:** Support discussion and typed repair after an unclear reference photo;
advertise retries only while the operation can actually be retried; allow an
administrator to correct a learner's age group without replacing the account;
make session completion visible with a recap of saved work; organize practice
material by learning purpose and then input method. Preserve automatic clear-photo
continuation, learner-controlled progression and separation of assignments from
practice. No new service, dependency, migration, live inference or deployment.

**Contracts:** SPECIFICATION sections 1, 3–4, 9–10 and 12–13; owned/versioned
submissions and request recovery; uncertain reading context and non-assessment;
`OperationPublic.retryable`; administrator-only `LearnerAccountUpdate` and
provider eligibility; generated OpenAPI/TypeScript definitions; accessible
practice controls, draft preservation and History.

**Validation plan:** Add focused integration/component tests for supported
clarification, retry and age-correction paths and their authorization, stale,
active and failure cases. Exercise changed browser journeys with synthetic data.
Regenerate contracts, run focused checks, `make check`, `make test-integration`,
`make eval-mock` and `make smoke-built`, then review the complete diff and
repository hooks. Record actual results before completion and publication.

**Changes:** Rejected reference photos now allow text questions while preserving
the uncertain report and capture state. Explicit typed repair uses the existing
material flow; clear photos still continue automatically. Internal source-reading
and source-discussion job stages keep successful, failed and canceled source
attempts out of subsequent learner-work review. Source discussion is never
assessed learning evidence. Retry responses and commands share the current
state/version/budget checks, including the intermediate state after a clear retake.

Administrators can edit age group on the same learner account. Actual changes
atomically stop unfinished jobs and invalidate leases; saved history and identity
remain intact, and unchanged saves preserve pending requests. Practice now selects
purpose before input method. Finish session is visible beside activity actions,
respects pending work/drafts and shows a recap from saved records without another
model request or a verified-grade claim.

Changed files:

- Backend: `apps/api/src/math_tutor/api/learners.py`, `photos.py`, `practice.py`;
  `apps/api/src/math_tutor/tutoring.py`, `worker.py`.
- Backend regression tests: `apps/api/tests/integration/test_learner_accounts.py`,
  `test_tutoring.py`, `test_workflows.py`.
- Frontend: `apps/web/src/Help.tsx`, `LearnerAccounts.tsx`, `PracticeSource.tsx`,
  `SessionReview.tsx`, `Tutor.tsx`, `TutorConversation.tsx`, `styles.css`.
- Component tests: `apps/web/tests/LearnerAccounts.test.tsx`, `Tutor.test.tsx`.
- Browser tests: `tests/smoke/bootstrap.spec.ts`, `navigation.spec.ts`,
  `practice-start.spec.ts`, `reading.spec.ts`, `tutor.spec.ts`.
- Regenerated contracts: `contracts/openapi.json`,
  `apps/web/src/generated/api.d.ts`.
- Guides and evidence: `README.md`; `docs/ACCEPTANCE.md`, `HANDOFF.md`,
  `SPECIFICATION.md`, `TASKS.md`.

**Validation (2026-10-17):** Commands use
`/tmp/shepherd-t49-toolchain/run` with checksum-verified Node 26.11.1, pnpm
12.11.2, uv 0.13.1 and Python 3.15.0. The runner clears operator/provider
environment settings and disables env-file loading. Synthetic ASGI, subprocess
and browser checks run outside the restricted sandbox where required.

- `make contracts`: regenerated OpenAPI and TypeScript definitions; the only
  schema addition is optional administrator age eligibility on account updates.
- Focused account integration: **13 passed**. Final focused tutor/workflow
  integration before the final retry guard: **91 passed**; the source retry and
  discussion selection after that guard: **7 passed**. Ruff and scoped mypy
  passed. `make test-integration` on the final backend: **368 passed in 231.92s**.
- Focused Tutor/Reading components: **61 passed**; LearnerAccounts/AdultPanel:
  **17 passed**. TypeScript and focused ESLint passed. All **12 tutor browser
  journeys** passed across targeted runs, including **4 new desktop/mobile
  reference/passage clarification, typed repair and session-recap journeys**.
- `make eval-mock`: passed **33 deterministic**, **12 reading**, **12 teaching**
  and **4 adversarial** cases. This establishes mock contracts, not live model
  quality. Rerun reports are archived in `/tmp/shepherd-t49-eval-evidence`;
  checked-in historical reports were preserved.
- `make check`: passed locks, lint/format, Python/TypeScript types, builds,
  generated-contract consistency, credential scan and CloudFormation validation.
  **303 backend unit, 11 toolchain and 201 frontend tests passed.** The existing
  `uv_build` upper-bound and JavaScript bundle-size warnings remain.
- After the reading-layout correction, `make check && make smoke-built` passed
  against the frozen final source: **303 unit, 11 toolchain, 201 component and
  84 desktop/mobile browser tests passed**. Browser checks used Google Chrome
  **155.0.8059.84** through the supported executable override and took **14.2m**;
  retries remained disabled.
- `make hooks-files-check`: passed all repository file hooks, paired with the
  completed project gate. `make secret-check` also passed after staging the new
  public files.
- Formatting of the edited guides and **89 local Markdown links/headings** passed;
  `git diff --check` passed.

Initial runs exposed new-fixture issues with retry backoff, browser locators,
capture-state synchronization and an intentionally empty uncertain reading.
The tests now advance the synthetic job's availability explicitly, locate the
accessible controls, wait for capture and exercise blank typed repair. No
workflow, ownership or uncertainty assertion was removed. An existing streaming
timeout test failed during concurrent suites (**302 unit tests passed**); the
unchanged test passed in the final serialized `make check`. Sandboxed ASGI runs
stalled and were interrupted; isolated runs passed. An intermediate integration
run was restarted to include the final retry-state regressions.
The first full browser run found a real reading-layout regression: the extra
Finish control wrapped the composer and reduced the conversation to 225 pixels,
below the existing greater-than-240-pixel check. That run stopped with **25
passed, 3 failed and 1 interrupted** while the layout was corrected; the existing
height and workflow assertions remain intact.
The scoped reading layout reserves space for wrapped controls above phone widths.
`node /tmp/shepherd-t49-toolchain/reading-geometry.mjs` through the isolated runner
measured widths **1280, 1100, 961, 960, 768, 521 and 393** pixels: conversation
heights were **321, 278, 278, 333, 278, 278 and 389** pixels, respectively, with
no horizontal overflow and touch targets of at least **44 pixels**.
The final focused reading browser run (`pnpm smoke tests/smoke/reading.spec.ts`)
passed all **10 desktop/mobile cases**, including the unchanged height checks,
long-section navigation and Unicode/overflow scenarios.

No failures remain in T49. Live-provider, physical-device and deployment checks
were not run; the existing maintainer acceptance work remains in ACCEPTANCE.
No model download, migration or private-data inspection was performed.

**Publication:** The maintainer explicitly authorized committing and pushing to
`main`. A fresh fetch before publication confirmed local `main` and `origin/main`
both at `85ff928`. Final commit hooks and the Git push outcome are reported with
the publication result.

## T48 — Clarify documentation and help text (2026-10-17)

**Status:** Complete; wording review and local checks passed. Authorized by the
maintainer's request to review and clean up written wording.

**Scope:** Review current documentation, in-app help and screen text. Replace
unexplained jargon, awkward phrasing and invented terms with clear, concise
language. Preserve requirements, commands, identifiers, historical evidence and
application behavior.

**Contracts:** SPECIFICATION sections 1–4, 12–13 and 16; consistent screen labels,
accessible names and help instructions; accurate setup, provider, privacy,
photo-reading and recovery guidance. No API, schema, workflow or policy change.

**Validation plan:** Review edited wording against the implementation and
requirements. Update existing UI assertions only where displayed wording changes;
keep behavior and authorization coverage. Run focused component checks, Markdown
formatting, local link/heading and Make-target checks, then `make check`. Review
the final diff and record actual outcomes. Live-provider calls and deployment
are outside this wording task.

**Changes:** Replaced unexplained shorthand with direct descriptions, explained
necessary technical terms, and made setup, privacy, photo and recovery
instructions easier to follow. Activity criteria now appear under **What a
complete response should include**. Help consistently uses **administrator** and
**username**. Existing tests check the revised text with the same behavior and
permission assertions.

Changed files:

- Guides: `README.md`; `docs/ACCEPTANCE.md`, `DEPENDENCIES.md`, `HANDOFF.md`,
  `PHONE_SETUP.md`, `PROVIDER_STATUS.md`, `RUNBOOK.md`, `SPECIFICATION.md`,
  `THREAT_MODEL.md`, `TUTOR_EVALUATION.md`; `evals/MANIFEST.md`,
  `evals/incoming/README.md`, `evals/fixtures/the-necklace-README.md`.
- Screen text in `apps/web/src`: `ActivityPurpose.tsx`, `AdultPanel.tsx`,
  `App.tsx`, `Help.tsx`, `LearnerAccounts.tsx`, `PhoneCapture.tsx`,
  `PhotoInput.tsx`, `ProviderConnections.tsx`, `ReadingPassage.tsx`,
  `ReadingSources.tsx`, `Research.tsx`, `Setup.tsx`, `Tutor.tsx`,
  `TutorConversation.tsx`.
- Existing assertions in `apps/web/tests`: `AdultPanel.test.tsx`,
  `ProviderConnections.test.tsx`, `Reading.test.tsx`, `Setup.test.tsx`,
  `Tutor.test.tsx`; in `tests/smoke`: `accounts.spec.ts`, `connections.spec.ts`,
  `reading.spec.ts`, `request-recovery.spec.ts`.
- This task record in `docs/TASKS.md`.

**Validation (2026-10-17):** Commands use the existing
`/tmp/shepherd-cleanup-toolchain/run` runner with Node 26.11.1, pnpm 12.11.2,
uv 0.13.1 and Python 3.15.0. It clears operator/provider settings and disables
env-file loading. Synthetic subprocess/browser checks run outside the restricted
sandbox where required.

- Focused learner checks with `pnpm --filter @math-tutor/web test` on App, Tutor,
  Reading, PhotoInput, PhoneCapture, Entry and UpdateNotice: **76 passed**.
  Setup, AdultPanel, ProviderConnections and Research: **95 passed**. A final
  Help wording check reran App: **11 passed**. Initial stale text assertions were
  updated; one existing text-selection timing failure passed on rerun without
  changing its assertions.
- `make check`: passed locks, lint/format, Python/TypeScript types, builds,
  generated API consistency, credential scan and CloudFormation lint.
  **303 backend unit, 11 toolchain and 187 frontend tests passed.** The gate was
  rerun successfully after the final text corrections. The first
  sandboxed attempt could not start pnpm; the isolated external run passed.
  Existing build warnings about the uv_build upper bound and bundle size remain.
- `pnpm smoke tests/smoke/accounts.spec.ts tests/smoke/connections.spec.ts
tests/smoke/reading.spec.ts tests/smoke/request-recovery.spec.ts`: **26 passed**;
  two desktop/mobile assertions still expected the old “app audience” wording.
  Updated that assertion to “age-group setting” and ran
  `pnpm smoke tests/smoke/connections.spec.ts --grep 'a saved connection stays selectable'`
  against the final build: **2 passed**. All **28 affected browser scenarios**
  passed across these runs, with no retry or workflow assertion removed.
- Markdown formatting with `node node_modules/prettier/bin/prettier.cjs --check
README.md docs/*.md evals/MANIFEST.md evals/incoming/README.md
evals/fixtures/the-necklace-README.md`: passed. Static comparison confirmed
  unchanged fenced command/configuration examples in all 13 edited guides.
- `python3 /tmp/shepherd-cleanup-doccheck.py`: passed **204 local links/headings**
  across 22 Markdown files and **339 Make-target references** against 46 targets;
  all ten historical task/report files match HEAD byte for byte.
- Final formatting and `git diff --check`: passed. Independent reviews found no
  unresolved requirement conflicts. All 37 changed files are listed above;
  runtime edits affect displayed text only.

No failures remain in this task. Integration, live-provider and physical-device
tests were not run for these wording-only changes. No model download, private
data inspection, migration or deployment was performed. The remaining release
checks in ACCEPTANCE are unchanged.

**Publication:** The maintainer authorized committing and pushing T48 to `main`
after review. A fresh fetch confirmed that local `main` matched `origin/main`
at `34b9938` before the commit.

## T47 — Consolidate the Python project and runtime (2026-10-17)

**Status:** Complete; all local exit checks passed. The maintainer explicitly authorized one root
`pyproject.toml`, `uv.lock` and `.venv`, using Python 3.15 for the application and
development tools.

**Scope:** Move Python dependency ownership and tool configuration to the
repository root, include CloudFormation validation in the common development
environment, and remove the separate infrastructure project and Python pin.
Update Make, CI, containers, startup/build paths, test fixtures and current
guidance to use the root project. Preserve the existing locked versions while
adding the validator's required packages. Keep dated validation and deployment
history intact. No database migration, live inference, deployment or model
download is authorized.

**Contracts:** SPECIFICATION sections 5–6 and 16; the common Python 3.15 runtime;
locked installs, package discovery, Alembic paths, native/container startup,
synthetic test isolation and CloudFormation validation without provisioning.
Document the checked cfn-lint 1.57.2 metadata exception and upstream support
change instead of maintaining a second Python environment.

**Validation plan:** Compare the consolidated lock with both prior locks; prove
that existing package versions remain unchanged. Validate normal Python 3.15
installation and cfn-lint on valid JSON/YAML, the household template and an
invalid template that must fail. Run targeted path/configuration checks, then
locked bootstrap, `make check`, integration tests, mock evaluations, built-app
smoke, audits and hooks. Check documentation links/headings and command
consistency, inspect the complete diff and record actual outcomes before marking
the task complete.

**Implementation:** Moved the application manifest, lock and Python tool
configuration to the root; source, tests and Alembic migrations remain under
`apps/api`. Added cfn-lint to the common development group and removed the separate
infrastructure manifest, lock and Python pin. Removed the retired generated
virtual environments and backend build directory after the root environment
worked. Make, Git hooks, auditing, browser startup and native private-settings
loading now select the root project. Checkout discovery remains independent of
the shell's working directory.

The container uses a verified, digest-pinned Python 3.15.0 build host and copies
the root `.venv` into the existing non-root runtime. Development tools remain
outside the production installation. Its synthetic disabled-provider check now
supplies the required request purpose. D016 records the consolidation and the
tested cfn-lint metadata exception; current guides use root commands.

**Validation (2026-10-17, before publication):** Checks use uv 0.13.1, Python 3.15.0,
checksum-verified Node 26.11.1 and pnpm 12.11.2 under the same temporary isolated
runner as T46. Operator/provider variables are cleared and env-file loading is
disabled. Socket/subprocess tests run outside the restricted sandbox against
synthetic temporary data.

- Lock comparison against both prior locks: **90 to 97 packages**, no existing
  version, sdist or wheel-artifact changes; the seven additions retain their
  former infrastructure-lock versions. No metadata override or patched package.
- `make bootstrap`: passed with one locked Python installation and frozen pnpm.
  A final offline `uv sync --locked` also passed after removing both retired
  virtual environments; interpreter prefix is the root `.venv`.
- `make check`: passed locks, lint/format, strict types, builds, contract drift,
  credential scan and CloudFormation lint. **303 backend unit, 11 toolchain and
  187 frontend component tests passed**; mypy checked 86 files.
- `make test-integration`: **346 passed in 59.19 seconds**, including migrations,
  retained sessions and private settings loaded through root uv from another
  working directory. The focused startup/settings/database run passed 80 tests.
- `make audit`: the consolidated Python lock and pnpm reported **no known
  vulnerabilities**. The exported hashed requirements include cfn-lint.
- The root Python 3.15 cfn-lint CLI accepts valid JSON/YAML and the household
  template, and rejects an invalid template with E3030. Earlier comparison with
  Python 3.14 produced the same four results on each interpreter.
- Four mock evaluation CLI runs used the Makefile fixtures and wrote
  `/tmp/shepherd-root-uv-*.json`: **33 exact and 30 vision cases** passed; reading
  and teaching passed **36 stages each**, adversarial teaching **20**. An initial
  scratch command named the absent adversarial v1 fixture; the corrected command
  used the authoritative v2 fixture. Historical reports are unchanged.
- `docker build -f infra/docker/Dockerfile -t shepherd-root-uv:t47 .`: passed.
  `sh scripts/container-smoke.sh shepherd-root-uv:t47`: passed Python 3.15.0,
  SQLite 3.53.1/WAL/foreign keys, HEIF conversion, cryptography, installer-free
  runtime, restricted provider subprocess rejection, migrations, API/worker/UI,
  setup-link renewal, stale-link rejection and administrator account creation.
  Only disposable synthetic containers/volume and loopback port 18080 were used;
  the smoke script removed them afterward.
- `make hooks-install`: reinstalled the existing Git hook against the root
  environment. An initial sandboxed hygiene run could not open the read-only
  skill file for its newline check; the successful gate ran outside that
  sandbox. Bootstrap's successful pnpm subprocess also received sandbox EPERM,
  so the successful bootstrap and project gate used the approved external run.
- `make smoke-built`: **80 desktop/mobile browser tests passed in 12.4 minutes**,
  one worker, no retries and the production login throttle unchanged. Native
  setup, reload/API restart and private request recovery use the root project.
- `make hooks-files-check`: passed all tracked-file hygiene checks, including
  root TOML, private-key detection, YAML, size, newline and whitespace checks.
  The already-passed project gate is also enforced by the commit hook.
- `python3 /tmp/shepherd-cleanup-doccheck.py`: passed **204 local links/headings**
  across 22 Markdown files and all documented Make references against 46 targets.
  Historical tasks and all nine evaluation reports remain byte-identical to HEAD.
  Markdown/configuration formatting and staged whitespace checks passed.
- Independent review found no missed active split-project paths. Git tracks
  exactly one Python manifest, lock and version pin, all at the root. A fetch
  confirmed starting `main` still matched `origin/main` before publication.

All local exit checks passed. No live inference, model download, private-data
inspection, destructive migration or application deployment was performed.
Container vulnerability scanning and SBOM publication remain CI checks for the
pushed revision; live provider, human and physical-device acceptance remain open.

## T46 — Retire catalog-era workflows and redundant checks (2026-10-17)

**Status:** Complete; all local exit checks passed. The maintainer authorized
cleanup and publication to `main`, including the separately staged API lock refresh.

**Scope:** Remove catalog-only creation/profile/progress/photo-confirmation APIs,
authored answer delivery and the old worker/provider payload branches. Preserve
current tutor submissions, photos, automatic reading, recovery, ownership,
retention, historical record export and exact-math domain utilities. Remove
unreachable administrator tutoring controls, dead offline utilities/styles,
obsolete fixture metadata and repeated CI gates. Keep the explicitly optional
browser-model prototype and infrastructure tooling. No destructive schema change,
live inference, deployment or model download is authorized by this task.

**Contracts:** SPECIFICATION sections 1, 4, 9–13 and 16; D005/D009; generated
OpenAPI/TypeScript; current worker generation/reading/guidance payloads; learner
and administrator separation; retained-data export and migration integrity.

**Validation plan:** Update transport/execution tests to current payloads; retain
authorization, idempotency, worker recovery, photo ordering, retention and
on-disk migration coverage while removing tests for retired product behavior.
Add endpoint-removal/current-path regression checks. Run targeted checks, then
`make check`, `make test-integration`, mock evaluations, `make smoke-built`, dependency
audits and repository hooks. Regenerate contracts, inspect the complete staged
diff and record exact outcomes before committing and pushing `main`.

**Lockfile:** Preserve the maintainer's staged updates to filelock 4.2.1,
platformdirs 4.13.4 and virtualenv 21.14.10. Initial API lock SHA-256:
`6a5f6e9e79e4ca93e94e52abf9ec07b0e24eb6d8f916d8b570d04e57ae7d95d7`.
The API and isolated infrastructure locks remain beside their owning manifests;
this task does not introduce a Python workspace.

**Implementation:** Removed the catalog/profile/progress/skip/external-problem
and manual-confirmation routes, authored hint/answer helper and legacy provider
schemas/worker branches. Primary session settings now store difficulty alone;
current operations no longer query catalog evaluations. Historical sessions,
readings, feedback and verdicts remain exportable, with no hidden answer keys;
old queued jobs fail safely without provider calls. No table or migration changed.

Removed unreachable administrator controls and provider-refresh synchronization
from learner tutoring, the unused offline arithmetic helper and obsolete CSS.
Updated current learner guidance and security tests, generated OpenAPI and
TypeScript, and migrated evaluation diagnostics to current reading/feedback
schemas. Fixture images, holdout labels and historical reports are unchanged.
CI now runs repository hygiene plus one project gate, then tests the built app;
standalone hooks and smoke commands retain their complete behavior. D015 records
the runtime cutover, and DEPENDENCIES explains lockfile ownership.

**Validation (2026-10-17, before publication):**

Checks used checksum-verified Node 26.11.1 and registry-integrity-verified pnpm
12.11.2 under `/tmp/shepherd-cleanup-toolchain`, uv 0.13.1, application Python
3.15.0 / SQLite 3.53.1 and isolated infrastructure Python 3.14.8. A temporary
runner cleared operator/provider configuration variables, disabled env-file
loading and isolated tool caches. Tests requiring localhost sockets ran outside
the restricted sandbox against synthetic temporary data.

- `make bootstrap`: passed frozen JavaScript and locked Python installations.
- `make contracts`: regenerated OpenAPI and TypeScript. The initial attempt
  found an incomplete preinstalled generator; frozen bootstrap restored it.
- `make check`: passed locks, lint/format, Python/TypeScript types, builds,
  contracts, credential scan and IaC lint. **300 backend unit, 11 toolchain and
  187 component tests passed.** An earlier gate caught implicit test imports;
  those were corrected before the successful complete run.
- `make test-integration`: **346 passed in 57.69 seconds**, including the final
  positive feedback-publication assertions for competing workers/expired leases.
- `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/google-chrome make smoke-built`:
  **80 desktop/mobile browser tests passed in 12.5 minutes**, with Chrome
  155.0.8059.84, zero retries and the production login rate limit unchanged.
- `make audit`: API Python, isolated infrastructure Python and pnpm reported
  **no known vulnerabilities**.
- All four mock evaluation CLI commands used the Makefile's fixtures and wrote
  `/tmp/shepherd-cleanup-*.json`: **33 exact cases and 30 vision fixtures** passed;
  reading and teaching passed **36 stages each**, adversarial teaching **20**.
  No historical report was rewritten.
- `make hooks-files-check` and `make hooks-check`: passed repository hygiene and
  the complete hook gate. The CI-only hygiene target skips the duplicate project
  hook because CI runs `make check` separately.
- `python3 /tmp/shepherd-cleanup-doccheck.py`: passed **202 local links/headings**
  across 22 Markdown files and every documented Make reference against **46
  targets**. Verified the historical task archive and all nine reports against HEAD.
  Revised Markdown formatting and `git diff --check` passed.
- Final staged credential/whitespace scans passed. Worktree and staged API lock
  hashes match the maintainer's original update above. A fetch confirmed the
  starting local `main` matched `origin/main` before publication.

All local publication gates passed. No live inference, model download,
private-data inspection, destructive migration or application
deployment was performed. Container packaging/scanning remains CI work for the
pushed revision; human/device/provider acceptance remains open.

## T45 — Documentation review and consolidation (2026-10-17)

**Status:** Complete; documentation checks passed. Release acceptance remains open.

**Scope:** Compare current documentation with public implementation, commands,
schemas and dependency manifests. Correct inaccurate claims, clarify setup and
operation, remove duplicate guidance and separate historical evidence from
current instructions. Preserve the maintainer's lockfile edit and dated model
reports. No runtime, public API, database or provider-policy changes.

**Documentation contracts:** README owns the overview and quick start; HANDOFF
routes ongoing work; SPECIFICATION owns requirements; RUNBOOK owns operations;
PHONE_SETUP owns phone access; PROVIDER_STATUS owns model configuration and
verification limits; TUTOR_EVALUATION owns evaluation procedures; ACCEPTANCE owns
remaining release checks; DEPENDENCIES owns dependency policy and exceptions;
DECISIONS owns architecture rationale. Historical task evidence lives separately.

**Exit checks:** Compare changed claims with source; check Markdown formatting,
local links and heading anchors, documented Make targets and whitespace. Inspect
the final diff for lost requirements, private material and unrelated changes.
Record actual outcomes below. Application and live-provider tests are not required
for documentation-only changes; earlier results remain dated evidence.

**Changes:** Updated README and the current guides listed above, THREAT_MODEL,
the evaluation manifest and its intake/Necklace guides. Moved dated task evidence
to `docs/history/TASKS.md`, preserving its text apart from relocated links.
Condensed superseded decision narratives while retaining every decision heading
and anchor. Removed duplicate deployment snapshots, package inventories and
task-specific copies of current requirements.

Source comparisons corrected the `compatible` adapter identifier, fixed
120-second job leases versus readiness heartbeats, file-managed provider reloads,
probe deadlines, operator-managed retention and backup cleanup, and prototype
features that the current app does not expose. The deployment and test records
remain explicitly dated; they do not validate later lockfile changes.

**Validation (2026-10-17):**

- `node_modules/.bin/prettier --check README.md docs/*.md docs/history/TASKS.md evals/MANIFEST.md evals/incoming/README.md evals/fixtures/the-necklace-README.md`:
  passed for all 16 revised Markdown files.
- `python3 /tmp/shepherd-doc-review/check_docs.py`: passed all 201 local
  links/heading references across 22 Markdown files, including the archive.
- `python3 /tmp/shepherd-doc-review/check_make_targets.py`: passed all 86 current
  documented target references against the 44 implemented Make targets.
- `git diff --check`: passed. Static comparisons confirmed archive preservation,
  all original decision headings/anchors, unchanged dated model reports and valid
  TOML in both Python locks. Independent cross-review found no material conflict
  among current guides, requirements and the inspected implementation.
- The maintainer's API lock SHA-256 remained
  `04617835b0f88cc37b5658d719134a02d7c829bd417a5e9917e5a0d6303fe02b`.

The initial documentation review used static checks only. Its subsequent
publication validation, including the maintainer's dependency update, is below.
The next operational action remains the model testing/selection in ACCEPTANCE.

### Publication checks (2026-10-17)

The maintainer authorized publishing the documentation and their API lock refresh
to `main`. The lock updates 22 packages, including Pillow 13.0.0, FastAPI 0.143.3
and SQLAlchemy 2.1.5; its original SHA-256 above is unchanged. A separately approved
internal wording cleanup fixes the skill's project name and replaces obsolete
T01–T05 navigation while retaining mandatory migration/integration gates.

Checks used checksum-verified Node 26.11.1 and integrity-verified pnpm 12.11.2 in
`/tmp/shepherd-publish-toolchain`, uv 0.13.1 and application Python 3.15.0. The
CloudFormation environment used isolated Python 3.14.8. `UV_NO_ENV_FILE=1` and
cleared operator/provider variables kept tests separate from private settings.

- `make check test-integration audit`: passed lock freshness, lint/format,
  Python/TypeScript types, builds, generated contracts, credential scan and IaC
  validation; **291 backend unit, 11 toolchain, 188 component and 340 integration
  tests passed**. Python application/infrastructure and pnpm audits reported no
  known vulnerabilities.
- The four mock evaluation CLI commands matched the Makefile's fixtures with
  outputs under `/tmp/shepherd-publish-*.json`. The deterministic report passed
  all 33 exact cases and 30 synthetic vision fixtures; reading and teaching
  passed 36 stages each, and adversarial teaching passed 20 stages. Historical
  committed reports were not rewritten.
- `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/google-chrome make smoke`:
  **80 desktop/mobile Chromium tests passed** using Chrome 155.0.8059.84 in
  12.4 minutes. The first run could not launch the absent Playwright Chromium
  revision 1248, before application assertions. The supported installed-Chrome
  override completed the full suite without changing assertions or retries.
- Markdown formatting, all 201 local links/headings, documented Make target
  references and staged whitespace/credential scans passed. The final
  formatting set includes the two approved internal instruction files.

No live inference, model download, private-data inspection, application deployment
or local container rebuild was performed. Container packaging and image scanning
remain checks for the pushed revision's CI; source checks do not validate the
running private installation or close human/device acceptance.
