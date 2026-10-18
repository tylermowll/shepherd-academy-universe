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
maintainer's subsequent lock update. The
schema head is `0020_request_recovery`. The latest private deployment uses
runtime source `f0fb127`, Python 3.15.0, FastAPI 0.145.0 and pillow-heif 1.8.1,
verified on **October 18, 2026**. T52 below records the image, encrypted backup/isolated
restore, HTTPS, served-asset and authorization checks. The earlier installation
is preserved in the [October 11 release record](history/TASKS.md#release-publication-2026-10-11).
This is dated evidence; current provider selections and live teaching quality
have not been verified.

The maintainer refreshed the former `apps/api/uv.lock` before T46 publication.
T47 preserves those versions and artifacts in the root `uv.lock`, adding the
CloudFormation validator. T51/T52 verify the consolidated project's current
container packaging and private installation; October 11's evidence is historical.

The remaining release work is in [ACCEPTANCE](ACCEPTANCE.md#items-requiring-the-maintainer).
T47 records the Python project consolidation. T46 records the earlier cleanup
and publication checks. Browser-model research and AWS hosting remain optional.

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
