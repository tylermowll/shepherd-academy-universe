# Implementation tasks

This file owns the current work queue and completion evidence. The
[specification](SPECIFICATION.md) defines product requirements;
[implementation history](history/TASKS.md) preserves T00–T44 and the October 11
dependency refresh. Superseded workflows in that archive are historical evidence.
A task is complete only after its requirements and exit checks pass.

## Current checkpoint

T76 implements the maintainer-approved goal-first learning form, publishes it
to `main` and privately deploys it. Seven visible goals, conditional material
fields, inline photo intake and optional preferences replace the clipped
three-choice setup. Source, browser, package, backup/restore and runtime evidence
is recorded below; saved model selections are preserved without inference.

T75 implements and privately deploys T74's model-setup and demo-feedback
corrections at the maintainer's request. The checked source is privately deployed,
and the maintainer's tested tutor selection is restored. Exact validation,
backup/restore and runtime evidence is recorded below. Its source was published
alongside T76; no new live inference was performed.

T74's investigation established confusing demo feedback and a stale-role
overwrite defect; T75 implements its corrections. The exact earlier private
selection-change sequence remains unverified. Dated task sections below retain
their original investigation and release evidence.

T73 corrects the shared account-management page to Users, with explicit
Administrator and Learners role groups and consistent Help/settings links. It
preserves T72's compact controls and T71's sign-in corrections. Current source,
focused browser, package and private-update evidence is below. T71's prior
credential recovery is retained; these visual updates do not change passwords
or password policy.

The current product is the multi-subject tutor, with schema head
`0020_request_recovery`. T69 corrects the seven residual UI/UX findings from T68
and consolidates their documentation. Its implementation and publication evidence
are below; the [current review](UI_UX_REVIEW.md) lists the corrected behavior and
remaining acceptance work. Earlier task sections preserve dated evidence, not
additional supported implementations.

The private installation now uses T76 image
`sha256:d2aa8d95d867061cd739d4c170ac0ddbe42fd77f49bb5a16b57022477f97e36a`,
built from published source `642a5fb036d89eafa194ef089d53c5d8b6436b75`.
All 66 served public assets match the tested build. Dependency locks and schema
remain unchanged at `0020_request_recovery`. The API and worker are ready with
zero restarts, and the saved model-selection fingerprint matches the stopped-
writer backup. No migration, reset or inference was run on retained storage;
live teaching quality remains unverified.
[ACCEPTANCE](ACCEPTANCE.md#items-requiring-the-maintainer)
owns the remaining model, physical-device, accessibility and operational checks.

## T76 — Start learning with one adaptive form, publish and deploy (2026-10-24)

**Status:** Complete; source published to `main` and privately deployed after
the maintainer approved the design review's changes, publication and deployment.
The supplied screenshot shows clipped labels in the three-choice Practice
purpose popup, plus difficulty/guidance controls appearing before the main goal.
The review recommended visible wrapping choices, conditional material fields,
conversational wording and optional preferences. No paid inference is authorized.

**Scope and contracts:** SPECIFICATION sections 1, 3, 4, 9, 10, 12 and 13;
README's Practice and reading section; RUNBOOK's encrypted-backup/private update
procedure. The approved goal-first design supersedes section 3's three-purpose
visible setup contract. Offer understand, practice, read, write, review, homework
and other intents, each with defined tutor instructions. Persist typed
`learning_intent` in the existing session profile JSON, expose it in current API
schemas and regenerate contracts. Keep material source separate from learning
intent, preserve supplied-source/assignment boundaries, and retain one atomic
initial session/activity request. No SQL migration, dependency, new service,
provider change or model download is planned.

**Implementation and test plan:** Use native radio choices with wrapping labels
before the free-text learning topic. Reveal relevant material controls in the
same form, retain typed drafts when selections change, and keep Standard/balanced
defaults in a collapsed difficulty/guidance area. Replace duplicate/stiff copy.
Photo references still require an owned capture activity; show their existing
photo intake inline on the same Practice route after starting, without a new
upload queue or extra page. Preserve uncertain readings/conversation and all
request-recovery, offline, pending-work, ownership and privacy boundaries.

Cover intent persistence/idempotency/authorization, distinct prompts and active-
assignment safeguards; component conditional rendering, draft retention and
recovery; and desktop/mobile wrapping, keyboard choices, material transitions,
one accepted start request, photo capture and navigation. Run focused checks,
`make check`, `make test-integration` and relevant isolated browser checks using
synthetic providers/data and an allowlisted environment. Review/commit and push
the checked source to `main`, package clean committed source, verify exact public
assets and container smoke, then stop both writers for encrypted WAL-aware backup
and isolated restore verification. Deploy the immutable image with rollback,
verify private HTTPS/worker/schema/assets/access boundaries and preservation of
model selections. Record exact results before marking complete. Live teaching
quality and physical-device/accessibility acceptance remain separate.

**Implemented:** Seven native radio goals appear before the free-text topic;
material fields adapt inline to the selected goal. Optional preferences use
conversational question labels and concise selected-style guidance. Photo-source
intake opens inline on the same Practice route; its component stays mounted
through ambiguous upload/recovery and worker progress, including when historical
skipped captures remain saved. Existing-session material choices also use
wrapping radio labels. Source/material/typed drafts and request identities are
preserved across selection and navigation.

The typed session intent is stored in existing profile JSON and exposed in the
regenerated API client. Generation and guidance use distinct intent instructions
and v5 provenance while preserving supplied-section and assignment safeguards.
Default practice has one canonical request representation, so omitted/explicit
default intent remains idempotent; changed intent with the same key is rejected.
Homework material stays saved but is excluded from feedback even when a client
supplies it through a reading source.

**Source-checkpoint evidence:** Commands run through
`python3 /tmp/shepherd-t76/run.py` allowlist the environment and disable env-file
loading. All application tests use synthetic fixtures/providers.

| Command / check                                                           | Actual outcome                                                                                                                                                                                                                                                                                 |
| ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Backend learning-intent, reading, memory and tutoring selection           | 97 passed in 21.85 seconds; unit/boundary selection 74 passed. Initial retained-request hash failure was corrected with canonical default omission and explicit/omitted default equivalence coverage.                                                                                          |
| Final history/intent correction selection                                 | 22 passed in 5.32 seconds. History's exact public-field list adds only learning_intent; no-private-work/query/size assertions remain. Worked examples are permitted only with content distinct from the active task.                                                                           |
| Frontend Tutor/App/Reading/SessionReview components                       | 148 passed after adding all-goal, conditional draft, preference, retry and historical-photo-capture coverage. An existing lost-photo-receipt test caught component remount loss; recovery ownership was corrected without relaxing assertions.                                                 |
| `python3 /tmp/shepherd-t76/run.py make check`                             | Final gate passed: backend unit tests, all frontend tests, 11 toolchain tests, locks, lint, formatting, types, builds, contract drift, credential scan and infrastructure checks. Existing build-system upper-bound and JavaScript chunk-size warnings remain.                                 |
| `python3 /tmp/shepherd-t76/run.py make test-integration`                  | All 437 cases passed in 80.15 seconds on disposable on-disk SQLite. The first full run found one outdated exact public-field expectation (436 passed); updating it for the typed intent retained the original privacy assertions.                                                              |
| Focused `practice-start.spec.ts` goal-first/conditional browser selection | Four focused desktop/mobile cases passed in 12.7 seconds. Actual screenshots inspected at 1280px and 320px confirm fully wrapping goal labels and optional preferences. Browser interactions verify native keyboard choice, draft retention, no pre-submit writes and one exact start request. |
| Synthetic backup/state-machine checks                                     | 15 passed after adding a content-free selection digest; restricted container rehearsal preserved a committed uncheckpointed WAL row.                                                                                                                                                           |

The first whole-browser run was stopped after 32 passes, one obsolete help-
disclosure assertion failure, one interrupted case and 108 unrun cases in 4.8
minutes. The test now checks the current preferences disclosure's keyboard,
focus and content behavior while retaining its draft/role/Back assertions.
A published-text recovery message was also corrected to name the current
material controls. The final matching build was frozen before the next full run.

The final rebuilt project gate passed 333 backend unit, 328 frontend and 11
toolchain cases plus all lint/type/build/contract/security checks. The backend
is unchanged by the last frontend recovery-copy/browser-test correction; its
437-case full integration pass remains applicable.

**Final browser, mock and audit evidence:**

| Command / check                                                                                                                                                                                                                                        | Actual outcome                                                                                                                                                                                                                                                                                                                                                        |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `python3 /tmp/shepherd-t76/run.py pnpm exec playwright test --output /tmp/shepherd-t76/browser-final`                                                                                                                                                  | Fresh full run: 140 passed and two failed in 22.3 minutes, one worker and zero retries. Both failures were the retained T75 assertion expecting `Synthetic` in demo feedback.                                                                                                                                                                                         |
| `python3 /tmp/shepherd-t76/run.py pnpm exec playwright test tests/smoke/tutor.spec.ts --grep 'the tutor continues from a phone photo through guidance, revision, discussion, and the next activity' --output /tmp/shepherd-t76/tutor-feedback-browser` | Both passed in 33.7 seconds. Assertions now require explicit sample/no-assessment text and reject the old revision demand; photo order, ownership, progression and privacy assertions remain. Application source/build is unchanged by this test-only correction. All 142 unique scenarios are verified across these runs; no single clean 142-case batch is claimed. |
| Rational, reading, teaching and adversarial mock evaluation commands, reports `/tmp/shepherd-t76/eval-{rational,reading,teaching,adversarial}.json`                                                                                                    | 33 rational, 12 reading, 12 teaching and four adversarial contracts passed. Synthetic contracts do not establish live model quality.                                                                                                                                                                                                                                  |
| `python3 /tmp/shepherd-t76/run.py make audit`                                                                                                                                                                                                          | Python and pnpm dependency audits passed with no known vulnerabilities reported.                                                                                                                                                                                                                                                                                      |
| Changed-file pre-commit hooks, read-only skill final-newline checks, credential scan and `git diff --check`                                                                                                                                            | Passed. The already-passed duplicate project gate was skipped only inside commit hooks; no protected skill file was rewritten.                                                                                                                                                                                                                                        |

**Publication and packaging:** The initial source was pushed as
`dada9fc4937b1bc68ae89544af913958412e37e0`, followed by recovery-copy/navigation
correction `73cc02cb4922e1756899495d477e9fd4cb76c96e` and the assertion-only
release commit `642a5fb036d89eafa194ef089d53c5d8b6436b75`. Normal pushes to
`origin/main` passed and the remote hash was verified. This also publishes the
previously local T75 source/evidence commits. No force push was used.

| Command / operation                                                                                                                                                                                                                   | Actual outcome                                                                                                                                                                                                                                                                                                         |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `python3 /tmp/shepherd-t76/prepare_source.py`                                                                                                                                                                                         | Archived clean committed source `642a5fb036d89eafa194ef089d53c5d8b6436b75`; build context excludes private settings/data.                                                                                                                                                                                              |
| `docker build --pull=false --label org.opencontainers.image.revision=642a5fb036d89eafa194ef089d53c5d8b6436b75 -f /tmp/shepherd-t76/source/infra/docker/Dockerfile -t math-practice-tutor:t76-start-learning /tmp/shepherd-t76/source` | Passed; immutable image `sha256:d2aa8d95d867061cd739d4c170ac0ddbe42fd77f49bb5a16b57022477f97e36a`.                                                                                                                                                                                                                     |
| `python3 /tmp/shepherd-t76/verify_package.py`                                                                                                                                                                                         | Source label, UID/GID 10001 and all 66 packaged public files match the tested build. Manifest SHA-256 `886a96f3b8f84c593a6616fd137350c88b0c038bf84dc6c28903ad96aa4db045`.                                                                                                                                              |
| `python3 /tmp/shepherd-t76/run.py sh scripts/container-smoke.sh math-practice-tutor:t76-start-learning`                                                                                                                               | Passed: Python/HEIF/cryptography, installer-free/non-root runtime, SQLite WAL/FK/FULL/migration, disabled-provider refusal, API/worker/UI readiness, owner-link renewal/stale rejection and browser account protection. No inference.                                                                                  |
| Hosted source workflow [40144626370](https://github.com/tylermowll/shepherd-academy-universe/actions/runs/40144626370)                                                                                                                | Package job passed, including container smoke, HIGH/CRITICAL vulnerability scan and CycloneDX SBOM generation. Hosted checks are still running the browser suite at release verification. This scan covers the hosted same-source image; the exact local immutable candidate was not separately vulnerability-scanned. |
| `python3 /tmp/shepherd-t76/deploy.py preflight --candidate <immutable-image-id>`                                                                                                                                                      | Candidate, prior image, data mounts, loopback publication and runtime restrictions passed.                                                                                                                                                                                                                             |
| `python3 /tmp/shepherd-t76/deploy.py prepare --candidate <immutable-image-id> --execute`                                                                                                                                              | Both writers stopped; encrypted WAL-aware backup and isolated restore passed. Current deletion records and retained objects preserved; restored sessions revoked and pending work canceled only in the rehearsal.                                                                                                      |
| `python3 /tmp/shepherd-t76/deploy.py activate --execute`                                                                                                                                                                              | Private HTTPS, fresh worker/schema, all 66 exact served assets/update headers and protected-route/cache boundaries passed. Exactly one API/worker, zero restarts, read-only roots, capabilities dropped and loopback-only API publication.                                                                             |
| `python3 /tmp/shepherd-t76/verify_selection.py`                                                                                                                                                                                       | Running selection digest exactly matches the stopped-writer backup; saved tutor/photo-reader choices preserved. Read-only verification, no inference.                                                                                                                                                                  |

Encrypted backup:
`backups/deploy-20261025T000838Z-t76-start-learning-d2aa8d95d867/archive.enc`,
SHA-256 `33fcc2135da87e7cd5925cc27ddd94a485127f5c1c7d8cb9c335db77a0be31fa`.
Its generated passphrase is stored separately with permissions 600, never
printed or copied into evidence. The plaintext restore rehearsal was removed.
No migration or reset was run on retained storage. Rollback was not needed;
T75 remains tagged `math-practice-tutor:rollback-20261024-t76-start-learning`.
Reviewed helper source, manifests and content-free receipts are retained in
ignored `backups/evidence-20261024-t76-start-learning`. The private address remains
`https://zoopa-a-boop.taile8325e.ts.net`.

**Changed files and limits:** Backend tutoring API, generation/guidance, reading
and mock transport; frontend Tutor, LearningGoal, PracticeSource, practice options,
ReadingSources, Help and styles; regenerated OpenAPI/client; backend, component
and browser regression suites; README, SPECIFICATION, PHONE_SETUP, UI_UX_REVIEW,
ACCEPTANCE and this log. No dependency or SQL migration changed. Earlier saved
activities/replies remain historical; new activities use the saved learning
intent. No live/paid provider evaluation, model download, physical-device or
screen-reader test was run. Hosted browser checks remain pending; there is no
unresolved local functional test or deployment failure. Live teaching-quality
acceptance remains open.

## T75 — Unify model setup, protect activation and deploy (2026-10-24)

**Status:** Complete and privately deployed. The maintainer authorized the
investigated corrections and deployment to the existing private installation.
T74's investigation evidence is preserved below. Source is committed locally;
no Git push or paid inference was performed.

**Scope and contracts:** SPECIFICATION sections 3, 4, 7, 8, 10, 12 and 13;
README's model setup and provider guide; RUNBOOK's encrypted-backup/private
container update procedure. Replace the four-part setup navigation with Models
and Data & privacy. The maintainer's correction supersedes section 3's four-tab
visible contract, which will be updated with the implementation. Keep save,
explicitly authorized synthetic tests, and activation separate backend actions
within one model-focused flow. Show current role/model identities and distinguish
tested readiness from active use. Change role activation to a typed per-role
request with expected-current selection and authoritative saved-route response;
reject stale changes and preserve the other role. Retire the bulk endpoint
without a compatibility shim and regenerate API contracts. Replace misleading
mock coaching/revision demands with an honest non-assessing sample reply and
clarify the sample reading activity. No schema migration, dependency, new
provider, private-data movement or infrastructure redesign is planned.

**Implementation and test plan:** Update backend contract/routing and mock
regressions, frontend model setup/component tests, and affected isolated
desktop/mobile browser flows in parallel. Cover per-role authorization,
capability/policy/probe failures, stale writes, preservation of the other role,
server-confirmed activation, editing drafts and explicit test consent. Run
targeted checks, `make check`, `make test-integration`, and affected browser
regressions with a clean, allowlisted synthetic environment. Review the diff,
commit the bounded change, build from clean committed source, compare packaged
public assets with the tested build and run container smoke. Before replacing
the private API/worker, stop both writers and complete encrypted WAL-aware
backup plus isolated restore verification, preserving data/settings and rollback
image. Activate the immutable candidate and verify private HTTPS, fresh worker,
schema, public assets and protected-route/cache boundaries. Record actual results
and remaining limitations before claiming completion.

**Implemented:** Models now keeps connection editing, role tests and activation
on each saved card; Data & privacy remains separate. Current-model summaries
name the saved connections/models, while cards distinguish active selections,
test readiness and edited selections needing reactivation. Activation uses
`POST /admin/providers/routes/{stage}` with required selected/expected-current
connection IDs and explicit data-boundary authorization. The server validates
only that role, rejects stale choices and returns authoritative role selections;
the client verifies the response before success and preserves drafts on conflict
or refresh failure. The bulk endpoint is removed and contracts regenerated.
Mock replies now explicitly state that no answer was assessed, omit revision
demands and use clearer sample reading instructions. Help and setup guides use
the current flow.

The deployment also restored the maintainer's previously stated intended
tested tutor from the saved demo choice. The guarded operator helper
requires that exact connection/model and a current successful tutor test,
rechecks routing policy, preserves the photo-reader selection and makes no
inference call. A different intervening tutor choice is preserved.

**Targeted evidence:**

| Check                                                                                                              | Actual outcome                                                                                                                                                                                                                 |
| ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Backend tutoring/provider contract unit tests                                                                      | 130 passed.                                                                                                                                                                                                                    |
| Provider, learner-account and workflow integration selection                                                       | 128 passed in 29.13 seconds; final role-specific policy/auth checks passed 11 cases in 2.57 seconds. Initial sandboxed ASGI runs stalled and were interrupted; isolated local subprocess runs passed.                          |
| Frontend Models, connections, navigation and setup components                                                      | 109 passed; role-specific consent, server-confirmed activation, stale conflict, readback failure, draft preservation and reactivation are covered.                                                                             |
| `python3 /tmp/shepherd-t75/run.py uv run --locked --no-env-file pytest /tmp/shepherd-t75/test_operations.py -q`    | 15 synthetic encrypted-backup/state-machine cases passed in 0.94 seconds.                                                                                                                                                      |
| `python3 /tmp/shepherd-t75/run.py uv run --locked --no-env-file pytest /tmp/shepherd-t75/test_restore_tutor.py -q` | Three synthetic restoration/refusal checks passed in 0.74 seconds. The first fixture incorrectly fingerprinted a pre-save credential revision; fingerprinting the effective saved synthetic connection corrected that fixture. |
| `python3 /tmp/shepherd-t75/run.py uv run --locked --no-env-file python /tmp/shepherd-t75/test_backup_container.py` | Restricted container preserved a committed uncheckpointed WAL row through encrypted backup and isolated restore; synthetic source storage stayed read-only.                                                                    |

The first whole-project gate caught a consent-reset effect and two unsafe test
URL conversions in frontend lint; those were corrected without suppressions.
The second gate caught unsupported Testing Library `exact` options in new role
queries; exact-name matching was retained with valid options. The corrected
whole-project gate passed. Existing build-system upper-bound and JavaScript
chunk-size warnings remain.

| Final source check                                       | Actual outcome                                                                                                                                                              |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `python3 /tmp/shepherd-t75/run.py make check`            | Passed: 333 backend unit, 317 frontend and 11 toolchain tests; locks, lint, formatting, types, builds, generated contract drift, credential scan and infrastructure checks. |
| `python3 /tmp/shepherd-t75/run.py make test-integration` | All 418 cases passed in 75.95 seconds on disposable on-disk SQLite; no live provider requests.                                                                              |
| Guarded runtime tutor-restoration eligibility check      | The maintainer's intended connection still passes routing policy and has a current successful tutor test. Read-only check; no selection change or inference.                |

**Browser verification:** `python3 /tmp/shepherd-t75/run.py pnpm exec playwright test tests/smoke/connections.spec.ts tests/smoke/review-fixes.spec.ts tests/smoke/navigation.spec.ts tests/smoke/admin-navigation.spec.ts tests/smoke/setup.spec.ts --output /tmp/shepherd-t75/browser`
passed all 60 affected desktop/mobile cases in 6.5 minutes, one worker and zero
retries. Covers configuration/test/activation, selected-provider generation and
learner feedback after reload, stale conflicts, role preservation, pending/draft
guards, 320px reflow and setup recovery.

Source checks establish software behavior, not live teaching quality.

The repository-wide mutating file-hook attempt hit the sandbox's read-only
`.agents` mount. Automatic approval review rejected escalation because it could
rewrite unrelated skill files. The safe replacement ran the same hooks on all
changed files (only the already-passed duplicate project gate was skipped),
which passed, plus read-only final-newline checks on all seven tracked skill
files. No protected skill file was rewritten and no broader permission is needed
for the deployment.

**Packaging and private deployment:**

| Command / operation                                                                                                                                                                                                                | Actual outcome                                                                                                                                                                                                                                   |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Local source commit and `python3 /tmp/shepherd-t75/prepare_source.py`                                                                                                                                                              | Source `359c4f9a0e646ee84983d47b5b734574d641dbee` archived from a clean checkout; private settings/data are absent from the build context. Commit hooks passed for changed files.                                                                |
| `docker build --pull=false --label org.opencontainers.image.revision=359c4f9a0e646ee84983d47b5b734574d641dbee -f /tmp/shepherd-t75/source/infra/docker/Dockerfile -t math-practice-tutor:t75-model-setup /tmp/shepherd-t75/source` | Passed. Immutable candidate is `sha256:daa3b2da47c1a056bf71e64cadef92e3af5dd9bef81486323b6fd95f8a695a9b`.                                                                                                                                        |
| `python3 /tmp/shepherd-t75/verify_package.py`                                                                                                                                                                                      | Exact source label, UID/GID 10001 and all 66 packaged public assets match the browser-tested build. Public manifest SHA-256 `a645482a242830132c4c831b3f2508edba7c779d5293f890b51172241d024b3e`.                                                  |
| `python3 /tmp/shepherd-t75/run.py sh scripts/container-smoke.sh math-practice-tutor:t75-model-setup`                                                                                                                               | Passed runtime/HEIF/cryptography, installer-free/non-root execution, SQLite WAL/FK/FULL synchronization, migrations, worker/UI readiness, setup renewal/rejection and disabled-provider refusal. No inference.                                   |
| `python3 /tmp/shepherd-t75/deploy.py preflight --candidate <immutable-image-id>`                                                                                                                                                   | Read-only candidate/prior-image, data-mount and runtime-restriction checks passed.                                                                                                                                                               |
| `python3 /tmp/shepherd-t75/deploy.py prepare --candidate <immutable-image-id> --execute`                                                                                                                                           | Both writers stopped; encrypted WAL-aware backup and isolated restore verification passed before activation. Current deletions/retained object hashes preserved; restored sessions revoked and pending work canceled in the rehearsal.           |
| `python3 /tmp/shepherd-t75/deploy.py activate --execute`                                                                                                                                                                           | Passed private HTTPS, fresh worker/schema, all 66 exact served public assets/update headers and protected-route/cache checks. Exactly one API/worker, zero restarts, read-only roots, restricted capabilities and loopback-only API publication. |
| Guarded `restore_tutor.py --execute`, worker readback and `python3 /tmp/shepherd-t75/verify_tutor.py`                                                                                                                              | Intended tested tutor restored; photo-reader choice preserved. Worker verifies the selected non-mock model, fresh tutor test and latest test session's authorization. No inference request.                                                      |

Encrypted backup:
`backups/deploy-20261024T225009Z-t75-model-setup-daa3b2da47c1/archive.enc`, SHA-256
`f161c75807418c612be242cb2b0d0d9e8f927d2846b40047965857ec9e01631c`.
Its generated passphrase is stored separately with permissions 600, never printed
or copied into repository evidence. The plaintext restore rehearsal was removed.
Retained data/settings were preserved except the intended tutor-role restoration;
no migration or reset was run on retained storage. Rollback was not needed; the
prior image is retained as `math-practice-tutor:rollback-20261024-t75-model-setup`.

Reviewed helper source, public manifests and content-free operational receipts
are retained privately in ignored `backups/evidence-20261024-t75-model-setup`.
The existing private HTTPS address is unchanged. Saved demo activities/replies
remain historical records; a new session/activity uses the selected tutor.

**Changed files and limits:** Backend provider activation/configuration/recovery
copy and mock transport; frontend AdultPanel, ProviderConnections, Help and styles;
backend/component/browser regression suites; regenerated OpenAPI/client; README,
SPECIFICATION, PROVIDER_STATUS, PHONE_SETUP, UI_UX_REVIEW and this log. No dependency
or migration change. No Git push, hosted CI, whole-browser rerun, live/paid model
evaluation, model download, physical-device or screen-reader test was performed.
The 60 affected browser cases and 418 integration cases are fresh T75 evidence;
prior whole-browser results remain dated baseline evidence. No implementation,
test or deployment failure remains; live teaching-quality acceptance remains open.

## T74 — Diagnose demo replies and model-setup confusion (2026-10-24)

**Status:** Investigation complete; remediation remains open. The maintainer
reported vague reading instructions and repetitive revision advice, confirmed
having saved an active tutor, questioned the split setup flow, and explicitly
authorized inspecting the running test installation. No application code,
provider settings or retained learner content was changed.

**Scope and contracts:** SPECIFICATION sections 3, 4, 7, 8 and 13; README's
Configure AI and Practice sections; provider selection, synthetic disclosure,
conversation provenance, and learner-controlled progression. Review the selected
reading/demo exchange and administrator save/test/activation transitions only.
Use existing contract and provider-lifecycle tests plus a disposable stale-editor
reproduction. Existing live-teaching and device/accessibility acceptance work
remains separate.

**Confirmed findings:**

- API and worker both read saved tutor and photo-reader roles as `demo`. A
  non-mock saved connection has passed both role tests. The recent reading
  activity and matching reply were produced by `demo / fixture-v1`; no failed
  real-model call or fallback is involved in that exchange. Read-only queries
  selected routing names, test statuses and call provenance, excluding keys,
  passwords and learner text. Private connection identifiers/model values and
  raw operational output are not copied into this log.
- `MockProvider` ignores the learner message when reviewing and always emits
  the same claim/evidence advice and revision instruction, internally marked
  `not_assessed`. Three different synthetic message intents produced one
  identical feedback payload. Its reading question is also fixed and vague.
  The UI renders revision advice before the sample disclaimer. This establishes
  a misleading demo interaction, not an assessment of learner work.
- Saving/tests/activation are separate backend operations and four Settings
  sections. Saved cards show readiness from tests without explicit active-role
  labels; the generic activation receipt names neither saved model. Normal
  Practice navigation and polling reload provider availability, so a missing
  refresh is not established. Failed Features reads can retain old status.
- A synthetic stale-editor sequence first activates a non-mock tutor, then
  posts an older tutor choice while updating the photo reader. Both requests
  succeed; the tutor returns to demo. The API replaces both roles without an
  expected-current check, and the frontend sends both dropdown values. This is
  a reproduced overwrite defect, not proof of the maintainer's earlier sequence.
  The frontend also does not compare its post-save readback with submitted roles.
- Route selections have no change timestamp/history. A proposed timestamp-only
  access-log extraction was rejected by automatic approval review under the
  repository's private-log prohibition; it was not executed or bypassed. The
  precise earlier switching sequence remains unverified.

**Focused coverage:**

| Workflow / role / goal                                     | States and evidence                                                                                                                                         | Coverage                                                                      |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Learner / Practice / understand the reading task and reply | Supplied desktop screenshot, generated question, submitted feedback, current banner and saved provenance; source and read-only runtime metadata             | Source-only interaction review; no fresh browser or accessibility exercise    |
| Administrator / Settings / save, test and activate a model | Saved/tested/active, disabled/unavailable, successful activation and stale-editor overwrite; source, running role metadata and disposable SQLite/API tests  | Exercised in isolated synthetic API tests; rendered setup flow not exercised  |
| Learner / Practice / use the selected provider             | Default mock dispatch, three distinct message intents, separately visible processing boundaries; direct synthetic reproduction and existing targeted checks | Exercised without live inference; teaching quality outside this investigation |

**Actual validation:** All test processes used an allowlisted environment via
`env -i`, no environment-file loading, `AWS_EC2_METADATA_DISABLED=true`, a
temporary import-only database path and test-created on-disk SQLite fixtures.
The pytest selection enabled only the AnyIO plugin explicitly.

| Command / check                                                                                                                                                              | Actual outcome                                                                                                                                                                                                                  |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `git status --short` before investigation                                                                                                                                    | Clean; no unrelated edits.                                                                                                                                                                                                      |
| `env -i PATH=/usr/local/bin:/usr/bin:/bin HOME=/tmp LANG=C.UTF-8 AWS_EC2_METADATA_DISABLED=true APP_MODE=private .venv/bin/python /tmp/shepherd-demo-diagnosis/reproduce.py` | Default tutor is mock; three distinct synthetic inputs produce one identical feedback payload and revision demand. No server or model request.                                                                                  |
| `docker exec -i shepherd-academy-universe-api-1 python - < /tmp/shepherd-demo-diagnosis/runtime_metadata.py` and worker summary                                              | Read-only diagnostic confirmed the same saved demo roles in both processes, fresh test evidence for the saved non-mock connection, and demo provenance for the reported exchange. No settings or content changed.               |
| Targeted pytest command below                                                                                                                                                | 131 passed in 1.49 seconds, including the stale-editor reproduction. The initial sandboxed selection stalled at ASGI integration tests and was interrupted; the same isolated tests completed with local subprocess permission. |

```sh
env -i PATH=/usr/local/bin:/usr/bin:/bin HOME=/tmp LANG=C.UTF-8 \
  AWS_EC2_METADATA_DISABLED=true APP_MODE=private \
  PYTEST_DISABLE_PLUGIN_AUTOLOAD=1 \
  PYTHONPATH=/home/mowll/src/shepherd-academy-universe/apps/api/tests/integration \
  DATABASE_URL=sqlite+pysqlite:////tmp/shepherd-demo-diagnosis/import-only.sqlite3 \
  timeout 90s .venv/bin/python -m pytest -p anyio.pytest_plugin \
  apps/api/tests/unit/test_tutoring_contracts.py \
  apps/api/tests/unit/test_provider_contracts.py \
  apps/api/tests/integration/test_provider_connections.py::test_private_connection_lifecycle_encrypts_reopens_and_never_returns_key \
  apps/api/tests/integration/test_provider_connections.py::test_current_schema_probes_require_explicit_consent_and_do_not_activate_routes \
  apps/api/tests/integration/test_tutoring.py::test_photo_and_text_processing_boundaries_are_separately_visible \
  /tmp/shepherd-demo-diagnosis/test_stale_role_save.py -q
```

**Next bounded action:** Combine ordinary connection setup, role-specific
testing and explicit activation into one guided model flow while preserving
separate backend operations, data-boundary authorization and opt-in paid tests.
Show current tutor/photo-reader names and distinguish tested readiness from
actual activation. Prevent stale role saves from overwriting other changes and
confirm saved selections on readback. Replace fake demo coaching with an honest
sample receipt and no required revision; clarify the sample activity. That work
requires application changes and regression coverage and is not claimed here.

**Limits:** Only `docs/TASKS.md` is changed. No application correction, setting
activation, live/paid inference, model download, migration, publication or
deployment was performed. No fresh browser, full project gate or whole integration
suite was needed for this investigation-only log. Real-model teaching quality
remains open in ACCEPTANCE.

## T73 — Name the shared account-management page Users (2026-10-24)

**Status:** Complete and privately deployed; published with its final evidence
record. The maintainer identified misleading navigation and headings: a page
named Learners also contains the administrator account. The shared page is now
Users and explains the account roles consistently. This follows the approved
UI correction/publication/private-update work.

**Scope and contracts:** SPECIFICATION section 3 currently names the page
Learners; the maintainer's correction supersedes that visible-label contract.
Use Users for the management tab, heading, document title, settings links and
Help instructions. Its account region and introduction cover both administrator
and learner accounts. Keep Administrator and Learner as explicit account roles,
and Add learner account as the action that creates a learner. Internal route
keys, generated API contracts, permissions, credentials, account-switch behavior
and data ownership retain their current implementation. No backend, migration,
dependency or provider changes are required.

**Plan and validation:** Update visible copy, applicable documentation and
existing component/browser expectations together. Verify that Users includes
both roles, selected-administrator password editing remains scoped correctly,
learner management stays distinct from learner sign-in, and recovery/navigation
instructions point to the current label. Run focused components, `make check`
and the affected desktop/mobile access, account and navigation browser cases
using the isolated synthetic/mock harness. Publish the reviewed source, build
and smoke-test its clean-source candidate, complete the encrypted backup/restore
procedure, and privately deploy behind the existing stable address. Record
actual results and remaining checks before marking this task complete.

**Implemented:** Users is now the management tab, page/document title and
settings shortcut; its accessible region is User accounts. The page description
and introduction explain that it contains both administrator and learner
accounts. Help, README, phone setup, password-recovery instructions, D013 and the
review workflow inventory use the same page label. Explicit Administrator and
Learners role groups and Add learner account remain scoped to the actual roles.
No authorization, account data, backend or route behavior changed.

**Source-checkpoint evidence:** Checks use
`python3 /tmp/shepherd-t73/run.py` to allowlist tool environment variables, clear
inherited provider/operator settings and disable env-file loading.

| Command                                                                                                                                                    | Actual outcome                                                                                                                                                                                                                                                                                                                            |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm --filter @math-tutor/web exec vitest run tests/App.test.tsx tests/AdminNavigation.test.tsx tests/LearnerAccounts.test.tsx tests/AdultPanel.test.tsx` | 85 passed in 5.40 seconds; existing password/CSRF and ownership tests now also establish Users title, both role groups, correct recovery instructions and learner access boundaries.                                                                                                                                                      |
| `make check`                                                                                                                                               | Final gate passed: 315 frontend, 329 backend unit and 11 toolchain tests; locks, lint/format, types, build, API drift, credential scan and infrastructure checks passed. The first run caught two unsupported `exact` options in new Testing Library assertions; anchored role-name expressions preserve exact matching with valid types. |
| `uv run --locked --no-env-file pytest /tmp/shepherd-t73/test_operations.py -q`                                                                             | 15 synthetic backup/preflight/activation/rollback cases passed in 0.98 seconds.                                                                                                                                                                                                                                                           |

The affected desktop/mobile browser selection is running at this source
checkpoint; no browser, publication or deployment completion is claimed yet.
No new integration suite is planned for this visible-copy correction: backend,
contracts and database are unchanged, and T72 records their 409-case pass.
Existing build-system/chunk warnings remain. No paid/live inference or model
download was run.

**Final verification:**

| Command                                                                                                                                                                                                  | Actual outcome                                                                                                                                                                                                                                                                                                                                      |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm exec playwright test tests/smoke/accounts.spec.ts tests/smoke/admin-navigation.spec.ts tests/smoke/navigation.spec.ts tests/smoke/workspace-navigation.spec.ts --output /tmp/shepherd-t73/browser` | All 26 desktop/mobile cases passed in 5.1 minutes, one worker and zero retries. Confirms Users title/navigation, both role groups, distinct administrator/learner selection, administrator identity retained while managing a learner, password/CSRF/revocation, role-specific recovery, Help/Back/reload, drafts and authorized account switching. |
| `make hooks-files-check`, `make secret-check`, commit hooks and `git diff --check`                                                                                                                       | Passed; only the already-passed duplicate project gate was skipped in commit hooks.                                                                                                                                                                                                                                                                 |
| `docker build --pull=false --label org.opencontainers.image.revision=<source> -f /tmp/shepherd-t73/source/infra/docker/Dockerfile -t math-practice-tutor:t73-users /tmp/shepherd-t73/source`             | Passed from a clean Git archive of source `b92ce9498a3324346e789911c87bec373d2fefba`, with no private configuration/data in its context.                                                                                                                                                                                                            |
| `python3 /tmp/shepherd-t73/verify_package.py`                                                                                                                                                            | Exact source label, non-root UID/GID 10001 and all 66 packaged public assets match the tested frontend build.                                                                                                                                                                                                                                       |
| `sh scripts/container-smoke.sh math-practice-tutor:t73-users`                                                                                                                                            | Passed runtime/HEIF/cryptography, installer-free/non-root execution, SQLite 3.53.1/WAL/FK/FULL synchronization, migrations, worker/UI readiness, setup renewal/rejection and disabled-provider refusal. No inference.                                                                                                                               |
| `uv run --locked --no-env-file python /tmp/shepherd-t73/test_backup_container.py`                                                                                                                        | A restricted container preserved a committed row held only in SQLite WAL through encrypted backup and isolated restore; synthetic source storage stayed read-only.                                                                                                                                                                                  |
| `python3 /tmp/shepherd-t73/deploy.py preflight --candidate <immutable-image-id>`                                                                                                                         | Read-only preflight passed for the candidate, exact prior T72 image, original data mount and runtime restrictions.                                                                                                                                                                                                                                  |
| `python3 /tmp/shepherd-t73/deploy.py prepare --candidate <immutable-image-id> --execute`                                                                                                                 | Both writers stopped; encrypted WAL-aware backup and isolated restore verified before activation.                                                                                                                                                                                                                                                   |
| `python3 /tmp/shepherd-t73/deploy.py activate --execute`                                                                                                                                                 | Private HTTPS, fresh worker/schema, 66 exact served public assets/update headers, protected-route 401/no-store and disabled-documentation 404 checks passed. Exactly one API/worker, zero restarts, read-only roots, restricted capabilities and loopback-only API publication.                                                                     |

The release image is
`sha256:4e543216d69440d9cc4e17d576dc788e23a2806ffd34c6137ef444afdeb43a30`.
Public asset manifest SHA-256:
`a0fe968cb9f79a611ca0bc22baf52db9b5136bb33ec6db64dc1170b75827e5e2`.
The stable private HTTPS address and existing data/settings are preserved.

Backup archive:
`backups/deploy-20261024T205046Z-t73-users-4e543216d694/archive.enc`, SHA-256
`22458dcb67796cd6561777325074dbe78e98db516bd7cbc1bdc9ac0c3f2e5855`.
The generated passphrase is stored separately in the operator's private key
directory with permissions 600; its value was never opened or printed by the
coding agent. Restore verification retained current deletions/object hashes,
checked schema/integrity/foreign keys, revoked restored sessions and canceled
restored pending work; the plaintext rehearsal was removed. Retained installation
data was not migrated or reset. Rollback was not needed; the prior image remains
`math-practice-tutor:rollback-20261024-t73-users`.

Reviewed helper source, public manifests and content-free operational receipts
are retained privately in ignored `backups/evidence-20261024-t73-users`.
No key was copied there. No live `.env`, provider configuration, private logs,
uploads or learner records were opened by the coding agent; backup helpers
processed retained data internally and emitted only allowlisted receipts.

**Publication and limits:** Source commit `b92ce9498a3324346e789911c87bec373d2fefba`
and this documentation-only completion record are published together, after
local validation and private activation, so the final push starts one hosted
workflow. Hosted CI results are pending and are not claimed here. The 136-case
whole-browser and 409-case integration passes in T72 remain dated baseline
evidence, not fresh T73 results. No new full-browser/integration run, live
provider test, paid inference, model download, physical-device/password-manager
check or screen-reader acceptance was run for this copy-only change.

**Changed files:** Application App, LearnerAccounts, AdultPanel and Help; three
component test files; seven smoke/helper files; README, SPECIFICATION, DECISIONS,
PHONE_SETUP, RUNBOOK, UI_UX_REVIEW, ACCEPTANCE and this task log; the UI review's
current workflow-inventory label. No backend, schemas, generated clients,
migrations, dependencies, infrastructure source or private configuration changed.
No task failure remains; existing acceptance follow-ups stay separate.

## T72 — Refine control sizing and action placement, publish and redeploy (2026-10-24)

**Status:** Complete, published and privately deployed. The maintainer approved
the focused visual review's button/layout changes, Git publication and private
redeployment. T71's already-installed sign-in corrections are preserved and
published with this update.

**Scope and contracts:** SPECIFICATION sections 3, 12, 13 and 18; RUNBOOK's
container upgrade and encrypted-backup procedures. Use compact desktop controls,
comfortable touch targets, lighter secondary actions, a bounded sign-in form
and a tighter application header. Keep message actions beside message entry and
place Next activity and Finish session with the current activity. Preserve
keyboard/menu behavior, draft and pending-request guards, account isolation,
sign-in recovery, public-only PWA caching and provider boundaries. No API,
schema, backend, dependency or provider changes are planned.

**Plan and validation:** Check the focused Tutor components and desktop/mobile
sign-in, administration, composer/menu, finish and draft-guard journeys. Run
`make check`, integration tests and the browser regression suite using disposable
synthetic fixtures, mock providers and an allowlisted environment with env-file
loading disabled. Review the complete publication diff, commit and push the
approved source. Package and smoke-test an immutable candidate from committed
source, then stop both writers, complete an encrypted WAL-aware backup and
isolated restore rehearsal, activate with rollback available, and verify private
HTTPS readiness and exact public assets. Record actual results below before
claiming completion. Live inference and model downloads are outside this task.

**Implemented:** Desktop buttons use a 38px minimum, tighter line height/padding
and lighter secondary styling; coarse-pointer buttons, menu summaries and main
navigation retain a 44px minimum. Mobile secondary actions keep natural widths.
The sign-in form is centered with a 480px maximum. Header/account/navigation
spacing is tighter and Sign out has quiet styling. The persistent Activity
controls group contains Next activity and Finish session, remains outside the
collapsible activity brief, and leaves Attach photo, Help and Send at the message
composer. Existing ready-state, draft, pending-work, offline and completion
guards remain in force, including idle reference/generation states.

**First source-checkpoint validation:** Commands use `python3 /tmp/shepherd-t72/run.py` to
allowlist tool environment variables, clear inherited operator/provider settings
and disable env-file loading. At this checkpoint the full browser regression,
publication and deployment were still pending; final evidence follows below.

| Command                                                                                                                                                                                                                                                                                                                                | Actual outcome                                                                                                                                                                                                                                                                                                                                                                                           |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm --filter @math-tutor/web exec vitest run tests/Tutor.test.tsx tests/App.test.tsx tests/SignInAccounts.test.tsx tests/AdminNavigation.test.tsx`                                                                                                                                                                                   | 132 passed. Action separation and preserved draft/finish guards are checked alongside T71 sign-in/account transitions.                                                                                                                                                                                                                                                                                   |
| `make check`                                                                                                                                                                                                                                                                                                                           | Passed: 329 backend unit, 11 toolchain and 315 frontend tests; locks, lint, formatting, types, build, API drift, credential scan and infrastructure checks passed.                                                                                                                                                                                                                                       |
| `make test-integration`                                                                                                                                                                                                                                                                                                                | 409 passed in 74.52 seconds using disposable on-disk SQLite. The initial sandboxed ASGI run stalled and was stopped; the unchanged isolated command passed with local subprocess permission.                                                                                                                                                                                                             |
| `pnpm exec playwright test tests/smoke/sign-in.spec.ts tests/smoke/admin-navigation.spec.ts tests/smoke/practice-start.spec.ts tests/smoke/navigation.spec.ts --grep 'sign-in uses one\|administrator account drafts survive\|activity and message controls\|learner navigation preserves' --output /tmp/shepherd-t72/focused-browser` | Eight desktop/mobile cases passed in 1.0 minute, zero retries. Checks 320px reflow/touch targets, bounded sign-in, natural Cancel widths, credential correction, activity/message separation, collapsed-brief controls and menu geometry/dismissal/focus at 320/375/412px. The last grep alternative matches no current case; draft guards are covered by Tutor components and the full suite selection. |
| `uv run --locked --no-env-file pytest /tmp/shepherd-t72/test_operations.py -q`                                                                                                                                                                                                                                                         | 15 passed in 0.96 seconds: synthetic encrypted backup/restore, exact-image preflight, failed backup recovery, activation guard and rollback.                                                                                                                                                                                                                                                             |
| `uv run --locked --no-env-file python /tmp/shepherd-t72/test_backup_container.py`                                                                                                                                                                                                                                                      | Restricted synthetic-container backup/restore preserved a committed row present only in the uncheckpointed WAL; original fixture storage remained read-only.                                                                                                                                                                                                                                             |

The existing build-system upper-bound and JavaScript chunk-size warnings remain.
No live inference, model downloads or private learner content was used for these
checks. New application changes are App/Tutor/styles; new regression assertions
are in Tutor components and sign-in/admin-navigation/practice-start browser cases.
T71's already-installed source/test/documentation changes are retained and will
be published in the same source checkpoint. Backend, schemas, migrations,
generated clients, dependencies and infrastructure source are unchanged.

**Broader validation corrections:** The first `make smoke-built` run was stopped
after 23 passes, three failures and one interrupted case (109 not run, 4.3
minutes). The new toolbar left a 235px conversation where the existing test
requires more than 240px; frame minima now reserve the toolbar's height. Two
role-switch tests expected the deliberately removed button border; they now
assert underlined links and comfortable touch height while retaining keyboard,
outline, role, Back/reload and recovery checks.

The next focused conversation/navigation/reading/menu selection passed 14 cases
and failed the two desktop/mobile Help/History flows in 3.0 minutes. The trace
showed that an open photo panel intercepted the relocated Finish action after
returning from Help. This is an implementation defect; the existing interaction
assertions remain unchanged while the panel is bounded to the conversation.

Source `6ba406c2110f30b43e796b50a50a6e2f3c4f7153` was committed and pushed as the
first source checkpoint; it has not been deployed. Its candidate container smoke
passed and all 66 public assets matched the browser-tested build. The candidate's
initial manually entered revision label was corrected from Git before smoke or
preflight. Read-only deployment preflight passed. GitHub run `40126873498` passed
the package, vulnerability scan and SBOM job, but its project gate failed one
sentence-help component fixture (314/315 passed). The fixture checked textarea
enabled state even though the application uses read-only state and dispatched a
selection before passive effects had settled. It now settles the initial load,
checks editability and exact selection, then awaits Ask availability; draft,
staged-text, focus and zero-POST assertions remain. The original CI timing failure
did not reproduce locally. The corrected Tutor/Reading component run passed
80/80 before the final whole-project and browser runs below.

The corrected photo panel remains mounted inside a relative conversation stack,
bounded below the activity toolbar and above the message composer. Explicit
opening focuses its labelled region; background refresh does not steal focus,
and hiding/reopening preserves the photograph. The existing Help/History flow
now also measures that the panel cannot cover either action area. No forced
click or relaxed timeout was introduced.

`pnpm exec playwright test tests/smoke/conversation.spec.ts
tests/smoke/navigation.spec.ts tests/smoke/reading.spec.ts
tests/smoke/practice-start.spec.ts --grep 'Help and History preserve|bounded
conversation|activity and message controls|reading_text passage' --output
/tmp/shepherd-t72/panel-browser` passed **8/8 in 1.7 minutes**, desktop/mobile,
zero retries. Conversation space, photo-panel focus/bounds, retained draft,
Finish access, reading and menu interactions passed. Final `make check` passed
again with **329 backend unit, 11 toolchain and 315 frontend tests** and all
lint/format/type/build/contract/security/infrastructure checks. The final full
browser regression and private update remain pending at this follow-up source
checkpoint.

**Final verification and publication:** The final `make smoke-built` run passed
**136/136 desktop/mobile Chromium cases in 21.3 minutes**, one worker and zero
retries. It retains conversation-space, pointer-interaction, draft, pending-work,
photo clarification, keyboard, navigation, role/isolation, recovery and public-only
cache assertions. The initial three browser failures, two subsequently discovered
photo-panel failures and CI fixture failure above are resolved. No assertion was
relaxed to accept the implementation defects.

Source commits `6ba406c2110f30b43e796b50a50a6e2f3c4f7153` and
`d447134143db72d32aa6d76d7887b977b112ac02` were pushed to `origin/main`.
The release was built with the checked-in Dockerfile from a clean Git archive of
the latter commit. No private settings/data entered the build context. Its exact
source label and runtime UID/GID 10001 were verified. Final candidate:
`sha256:59b1c4ceedb1e5189309345aeb44f73b2b713fc7042ee4192dbf35efbb7e072e`.
All 66 packaged assets match the source-tested build; public manifest SHA-256:
`6caea1cea9cc476bb30a13cb45b1adfcfe605ce2450724e2fa1019ed87f23a09`.

| Command                                                                                                                                                                                           | Final outcome                                                                                                                                                                                                                                                                     |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `make check`                                                                                                                                                                                      | Final gate passed: 329 backend unit, 11 toolchain and 315 frontend tests; locks, lint, format, types, build, API drift, credential scan and infrastructure checks passed.                                                                                                         |
| `make test-integration`                                                                                                                                                                           | 409 passed in 74.52 seconds earlier in T72; backend source/contracts are unchanged by the subsequent frontend corrections.                                                                                                                                                        |
| `make smoke-built`                                                                                                                                                                                | 136 passed in 21.3 minutes against the final application build.                                                                                                                                                                                                                   |
| `make hooks-files-check` and commit hooks                                                                                                                                                         | Repository hygiene checks passed; only the already-passed duplicate project gate was skipped at commit time.                                                                                                                                                                      |
| `docker build --pull=false --label org.opencontainers.image.revision=<source> -f /tmp/shepherd-t72/source/infra/docker/Dockerfile -t math-practice-tutor:t72-compact-ui /tmp/shepherd-t72/source` | Passed from clean committed source, using the unchanged locked backend/runtime and rebuilt frontend.                                                                                                                                                                              |
| `python3 /tmp/shepherd-t72/verify_package.py`                                                                                                                                                     | Exact source label, non-root user and all 66 packaged public files match the tested build.                                                                                                                                                                                        |
| `sh scripts/container-smoke.sh math-practice-tutor:t72-compact-ui`                                                                                                                                | Passed Python/HEIF/cryptography, installer-free/non-root runtime, SQLite 3.53.1/WAL/FK/FULL synchronization, migrations, worker/UI readiness, owner setup/renewal/rejection and disabled-provider refusal. No inference.                                                          |
| `python3 /tmp/shepherd-t72/deploy.py preflight --candidate <immutable-image-id>`                                                                                                                  | Read-only preflight passed for the final candidate, previous image, original shared data mount and runtime restrictions.                                                                                                                                                          |
| `python3 /tmp/shepherd-t72/deploy.py prepare --candidate <immutable-image-id> --execute`                                                                                                          | Both writers stopped; encrypted WAL-aware backup and isolated restore verified before activation.                                                                                                                                                                                 |
| `python3 /tmp/shepherd-t72/deploy.py activate --execute`                                                                                                                                          | Private HTTPS, fresh worker heartbeat, unchanged schema, all 66 served public hashes/update headers, protected-route 401/no-store and disabled-documentation 404 checks passed. Exactly one API and one worker, read-only roots, zero restarts and loopback-only API publication. |

**Private update:** Backup archive
`backups/deploy-20261024T202023Z-t72-59b1c4ceedb1/archive.enc`, SHA-256
`4f6896fc1da47486b5d389fdab02befe0e120c78ac5af889937109142634172c`.
The generated key is stored separately in the operator's private backup-key
directory with permissions 600; its value was never opened or printed by the
coding agent. Restore checks preserved current deletions and retained-object
hashes, verified schema/integrity/foreign keys, revoked restored sessions and
canceled restored pending work. The isolated plaintext rehearsal was removed.
The installation continues using its original data mount and private settings.
No credential reset or migration was performed on retained data. Rollback was
not needed; the exact prior image is retained as
`math-practice-tutor:rollback-20261024-t72-compact-ui`.

Reviewed helper source, public manifests and private operational receipts are
retained in ignored `backups/evidence-20261024-t72-compact-ui`; no backup key was
copied there. No private `.env`, provider configuration, uploads, learner records
or private logs were opened by the coding agent. Backup programs processed
retained content internally and emitted only allowlisted booleans and hashes.

GitHub [run 40127726268](https://github.com/tylermowll/shepherd-academy-universe/actions/runs/40127726268)
for the corrected release completed successfully with both checks and package
jobs. This includes its project/integration/browser gates, synthetic evaluation,
dependency auditing, container smoke, vulnerability scan and SBOM. Its hosted
browser stage was still running when the private update completed and subsequently
passed. This documentation-only follow-up does not change the deployed runtime.

No T72 task failure remains. Live-provider/model tests, paid inference, model
downloads, physical-device/password-manager checks and screen-reader acceptance
were not run. Existing acceptance follow-ups and the separate launcher image-tag
discovery defect remain outside this bounded visual update.

## T71 — Correct account sign-in and household credential recovery (2026-10-24)

**Status:** Complete and applied to the private installation. The maintainer reported
misleading Reconnect on credential rejection, conflicting account chooser and
editable Username fields, repeated sign-in headings, and the incomplete prior
request to reset existing household passwords. T62 reset only the administrator
and preserved learner credentials; lowering the password minimum did not fulfill
that broader request.

**Scope and contracts:** SPECIFICATION sections 3 and 12, existing role-specific
name-only directory, sign-in/CSRF/session replacement, account-switch draft
preservation, Argon2id recovery and session revocation. One Account selector
replaces duplicate entry; manual Username is available only when the directory
fails. Sign-in errors appear inside the form, distinguish invalid credentials,
role rejection, throttling and server/network failure, and retain the account
choice. Remove repeated headings and explain the actual retry action.
No public API/schema, migration, dependencies or provider behavior changes.

**Plan and validation:** Exercise both roles, native keyboard selection, empty and
failed account lists, failed-password/corrected retry, connection failure,
throttling, and current-workspace preservation on rejected role switches.
Run focused components, `make check`, `make test-integration` and the focused
desktop/mobile Playwright access/account/navigation/setup journeys using
synthetic data and an isolated environment. Validate the candidate container
before a private update. Recover existing active account credentials through
supported application operations with hidden input, aggregate verification only,
no credential default in source, and no new learner access for disabled,
deleted or passwordless profiles. Keep existing work and provider settings.

**Source and package evidence:** All source commands use
`python3 /tmp/shepherd-t71/run.py` to allowlist tool environment variables,
exclude inherited operator/provider settings and disable environment-file loading.

| Command                                                                                                                                              | Actual outcome                                                                                                                                                                                                                                                                                                                    |
| ---------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm --filter @math-tutor/web exec vitest run tests/App.test.tsx tests/SignInAccounts.test.tsx tests/AdminNavigation.test.tsx tests/Setup.test.tsx` | Final focused run: 90 passed. Covers both roles, one submitted username, loading/empty/fallback lists, local credential/network/throttle/server errors, expiry refresh ordering, Help transitions and retained drafts.                                                                                                            |
| `make check`                                                                                                                                         | Final gate passed: 329 backend unit, 11 toolchain and 315 frontend tests; locks, lint, formatting, types, build, API drift, credential scan and infrastructure checks passed.                                                                                                                                                     |
| `make test-integration`                                                                                                                              | All 409 cases passed in 74.12 seconds on disposable on-disk SQLite. Backend and contracts are unchanged by T71.                                                                                                                                                                                                                   |
| Initial focused Playwright access/account/navigation/setup/bootstrap suite                                                                           | 54 passed; six fixture/assertion failures: old offline wording in two cases on both projects, and a directory-loading selection race in the shared helper on both projects. Copy assertions and the helper were corrected without changing product requirements or throttles; all six subsequently passed in the final run below. |
| `docker build --pull=false -t math-practice-tutor:t71-signin /tmp/shepherd-t71/image`                                                                | Passed. Builds from the installed immutable backend, removes its old web directory, and installs only the final verified public bundle; no private settings/data enter the build context.                                                                                                                                         |
| `sh scripts/container-smoke.sh math-practice-tutor:t71-signin`                                                                                       | Final candidate passed non-root runtime, SQLite 3.53.1/WAL/FK/FULL synchronization, migrations, worker/UI readiness, HEIF/cryptography, disabled-provider refusal, and synthetic owner setup/renewal/rejection. No inference.                                                                                                     |
| Isolated helper tests under `/tmp/shepherd-t71`                                                                                                      | 28 passed in 3.34 seconds: atomic credential reset, exclusions, rollback, backup/restore, operational recovery and HTTPS verifier behavior. Ruff and formatting passed. A separate real restricted-container test preserved a committed row present only in uncheckpointed WAL with the original source read-only.                |
| `python3 /tmp/shepherd-t71/deploy.py preflight --candidate <candidate>`                                                                              | Passed read-only image/non-root, existing-service, original-mount and privilege checks. No installed service was changed by preflight.                                                                                                                                                                                            |

Final candidate:
`sha256:fcaf2674d7b0f1aa3ff6c07f47f04e769b217ae5d5d4f9b964c84f8b8025c46c`.
Its 66-file public bundle manifest SHA-256 is
`ba5e7ff88892225f36eb28d01d96a775eeeab71f74502e779b8bc7116bf11e6b`.
The backend and dependencies are inherited unchanged from T70's installed image.
This is a local candidate; no Git commit or publication is claimed.

The initial sandbox toolchain subprocess failure was resolved by running the
unchanged isolated gate with local execution permission. An intermediate
component-test lint error was corrected before the final passing gate. The
existing build-system upper-bound and JavaScript chunk-size warnings remain.
The backup container probe caught read-only SQLite WAL auxiliary behavior before
any private operation; the reviewed helper now stages both the stopped main file
and WAL privately, then uses the application's SQLite backup API. The committed
WAL-only row proof guards against silently omitting that work.

**Final browser evidence:** The following command passed **20/20 cases in 3.1
minutes**, one worker and zero retries, against the final source build:

```bash
python3 /tmp/shepherd-t71/run.py pnpm exec playwright test 'tests/smoke/(sign-in|workspace-navigation|bootstrap)\.spec\.ts$' --grep 'corrects an incorrect password|account-list failure|a sign-in connection failure|an empty account list|an expired sign-in page|persisted tutoring survives disconnect|offline shell|canceling a failed administrator|app area links'
```

This reran all six initial failures, every sign-in regression, both account-switch
journeys and two new expired-form cases. Combined coverage is 62 distinct
desktop/mobile cases across the initial and final runs, not a claim that a full
browser suite passed on this revision. Screenshots support the focused layout
review; interactive assertions establish the behavior tested.

**Private installation:** `deploy.py prepare --candidate <candidate> --execute`
stopped both writers, preserved the exact previous image, and verified encrypted
backup plus isolated restore before the update. Archive:
`backups/deploy-20261024T191836Z-t71-fcaf2674d7b0/archive.enc`, SHA-256
`6eed8d8cb122be7bf5c963baade87cd20e064d3a4d24373f951d4a02047f77d6`.
Its generated passphrase is stored separately under the operator's private
backup-key directory with permissions 600; its value was not printed or opened
by the coding agent. The plaintext rehearsal was removed. Current deletions,
schema/integrity/foreign keys, restored-session revocation, pending-job cleanup
and retained-object hashes passed.

With both services stopped, `python3 /tmp/shepherd-t71/launch_reset.py` used hidden
input and the application's existing recovery operations in one transaction.
Aggregate receipt: **one existing administrator and one enabled learner reset**,
credentials verified and previous sessions revoked. Disabled, deleted and
passwordless profiles were excluded. No new account or credential default was
created; usernames, age groups and saved work were preserved.

`python3 /tmp/shepherd-t71/deploy.py activate --execute` started both services on
the exact final candidate and original data bind. Private HTTPS readiness, a
worker heartbeat newer than startup, zero service restarts, unchanged schema,
66 exact public asset hashes, public update headers, three protected-route
401/no-store responses and three disabled-documentation 404 responses passed.
Both roots remain read-only and the API is published only on loopback. Rollback
was not needed; the prior image is retained as
`math-practice-tutor:rollback-20261024-t71-sign-in`.

`python3 /tmp/shepherd-t71/verify_http_passwords.py --execute` then accepted the
requested credential through actual HTTPS sign-in for **one administrator and
one learner**, verified the matching roles internally, and immediately signed out
both isolated verification sessions. Its receipt contains counts/booleans only.
No private work or settings page was requested. The requested credential is not
stored in source, command arguments, environment variables or this record.

**Packaging exception and limits:** The runbook normally calls for a clean
committed source archive. This bounded private correction used the final tested
local frontend build over the unchanged installed backend, with an exact public
bundle manifest and installed-asset verification; Git publication was not part
of the request. Source changes remain uncommitted. Reviewed operational code,
manifests and safe receipts are retained in the ignored T71 evidence directory.
No private `.env`, provider configuration, uploads, private logs or learner
content was opened by the coding agent. Backup/recovery programs processed
retained data internally and exposed only the reviewed aggregate results.

**Changed files:** Application `App.tsx` and `SignInAccounts.tsx`; four component
test files (`App`, `SignInAccounts`, `AdminNavigation`, `Setup`); seven browser
test/support files including new `sign-in.spec.ts`; SPECIFICATION, TASKS,
UI_UX_REVIEW and ACCEPTANCE. No backend, generated API/client, schema, dependency
or infrastructure source changed.

No task failure remains. Full browser regression, physical-device/autofill and
screen-reader acceptance, live provider/model tests, paid inference, model
downloads, image vulnerability rescanning, Git commit and push were not run.
The unchanged backend/package baseline is T70; this task does not claim a new
whole-application UX audit or security certification. The separate launcher
image-tag discovery defect is outside T71; its next bounded correction is to
recognize the installed immutable image without starting a second application.

## T70 — Deploy the UI/UX corrections (2026-10-24)

**Status:** Private deployment complete following the maintainer's explicit
authorization. Both services use source `ac5114dd232e0ecadfb2d21ad9c6bc72a18cde04`
and immutable image
`sha256:3d65ca7cc20b7ea621148e474d384d00741528617c5d4faac7d6477aee767162`.
This evidence-only documentation update does not change the deployed runtime.

**Scope and contracts:** SPECIFICATION sections 2, 6, 12, 16–18 and RUNBOOK's
container/backup procedures: one API and one worker on the original local data
bind, private HTTPS, unchanged schema `0020_request_recovery`, encrypted backup,
current deletion preservation and exact-image rollback. No application,
dependency, API/client or schema changes. HANDOFF's stale October 11 deployment
entry conflicted with T67 and the running image; it now points to this checkpoint.

**Commands and actual evidence:** The candidate was built from a clean Git
archive, excluding private settings/data. The isolated runners and reviewed
operational helpers are under `/tmp/shepherd-t70`; source gates for the same
production code are recorded in T69.

| Command                                                                                                   | Actual outcome                                                                                                                                                                                                                                                                                                                                                 |
| --------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `docker build -f /tmp/shepherd-t70/source/infra/docker/Dockerfile ... /tmp/shepherd-t70/source`           | Passed; full source-revision label and non-root UID/GID 10001 verified.                                                                                                                                                                                                                                                                                        |
| `python3 /tmp/shepherd-t70/run.py sh /tmp/shepherd-t70/source/scripts/container-smoke.sh <image>`         | Passed: runtime/native image support, SQLite 3.53.1/WAL/FK/busy timeout/FULL synchronization, migrations, API/worker/UI and synthetic owner setup/renewal/rejection. No inference.                                                                                                                                                                             |
| `python3 /tmp/shepherd-t69/run.py make audit`                                                             | Python and JavaScript audits passed with no known vulnerabilities.                                                                                                                                                                                                                                                                                             |
| `python3 /tmp/shepherd-t70/scan.py`, then `python3 /tmp/shepherd-t70/finalize-scan.py`                    | Trivy 0.76.1, pinned `aquasec/trivy@sha256:790fd66d1697395d8693d1acaa1ea702406a20f109b6fc7bac8db623eca6c06c`: zero HIGH/CRITICAL vulnerabilities including unfixed; zero secrets across all severities; CycloneDX inventory with 52 components. Fresh database published October 24 at 13:07 UTC; scans ran offline after download, with an empty ignore file. |
| `python3 /tmp/shepherd-t70/run.py uv run --no-env-file --locked python /tmp/shepherd-t70/test-deploy.py`  | All 15 mocked checks passed, including missing-ledger refusal, failure after stop/start, exact-image rollback, honest failure receipts and private diagnostic suppression.                                                                                                                                                                                     |
| `python3 /tmp/shepherd-t70/test-backup.py`                                                                | Passed against disposable synthetic schema-0020/WAL volumes: actual helper restore/content/object checks, later deletions, session revocation, pending-job cleanup, wrong-password/tamper refusal and cleanup on failure. Existing destinations/source preserved; fixture containers/volumes removed.                                                          |
| `python3 /tmp/shepherd-t70/deploy.py --image <image> --revision ac5114dd232e0ecadfb2d21ad9c6bc72a18cde04` | Read-only preflight passed; no service/configuration mutation. Published main matched the candidate.                                                                                                                                                                                                                                                           |
| Same deployment command with `--execute`                                                                  | Passed on attempt 1: both writers stopped, encrypted backup and isolated restore verified, unchanged migration head checked, exact candidate started and verified. Rollback was not needed.                                                                                                                                                                    |
| `python3 /tmp/shepherd-t70/sustained.py`                                                                  | Follow-up at 16:51:47 UTC passed the same image, service, heartbeat, mount and HTTPS checks.                                                                                                                                                                                                                                                                   |

The first scanner download exceeded its 64 MiB temporary workspace; a fresh run
with 2 GiB passed every scan. Its initial summary compared Trivy's configuration
digest with Docker's OCI index digest. The finalizer hash-verified the archive's
index → runtime manifest → configuration chain and finalized those successful
reports without rescanning or changing severity/exclusions. Scanned configuration:
`sha256:37c68e1cfb60ee8b6660ede96ff4887213a8fa76dd569c0a7468d229661460c7`.
SBOM SHA256: `5610335cfd2e9a8e37e2d155eb3f5ed58caf596d0d2640b792ac6dfed0b48f11`.

**Recovery and installed checks:** The encrypted archive is retained under
ignored `backups/deploy-20261024-t70-ac5114dd232e/archive.enc`, SHA256
`b1322574f262f00de6d77419d394033866909d287ea6f7b1e8448a0bbed71471`.
Its generated passphrase was written separately with mode 600; it was never
printed or opened. The isolated restore verified integrity/FKs, content and
retained-object hashes, current deletions, revoked restored sessions and canceled
restored jobs; its new plaintext rehearsal directory was removed. Original data
and ledger were preserved. The previous image remains tagged
`math-practice-tutor:rollback-20261024-t70-ac5114dd232e`.

Private HTTPS readiness, six exact public asset hashes, update-cache/worker-scope
headers, three anonymous protected-route 401/no-store responses and three disabled
runtime-documentation 404 responses passed. Protected response bodies were not
read. Exactly one API and one worker run the candidate with zero restarts,
read-only roots, the original data bind, loopback-only API publishing and a fresh
post-start worker heartbeat.

**Documentation checks:** Credential scanning, `git diff --check` and all-files
repository hooks passed. The first all-files run could not open sandbox-mounted
read-only skill files for the newline check; the same unchanged hook passed with
filesystem permission. No check or assertion was disabled.

**Limits:** No private environment/provider configuration, learner material,
uploads, archive contents or private logs were opened. Reviewed backup/restore
programs processed retained data internally and exposed only allowlisted metadata.
No live/paid provider probes, model downloads or cloud provisioning ran. Existing
services resumed normal operation. Intended model selection, human teaching
review, physical devices/accessibility and full restored-host sign-in/key recovery
remain in ACCEPTANCE. Reviewed helpers, safe receipts and the SBOM are retained
outside Git in ignored `backups/evidence-deploy-20261024-t70-ac5114dd232e`.

## T69 — Correct the UI/UX findings and publish (2026-10-24)

**Status:** Complete. The corrections and cleaned documentation were published
to `main` as `775e6eb84bbb94f7828adafd49533b1c17a4b78a` through normal
commit hooks; the remote main hash was verified. The maintainer authorized all seven
T68 corrections, documentation cleanup and push. T70 records the subsequent
deployment authorization and outcome.

**Scope and contracts:** SPECIFICATION sections 3, 10–13 and 18: owned request
receipts and in-memory drafts, honest loading/save outcomes, phone processing
locations and safe rendering, keyboard focus and visible test progress. Current
API shapes and schema head are unchanged; no new dependencies, services,
compatibility shims or development-schema bridges were introduced.

**Implemented:** `RequestRecovery` now supplies one receipt lookup/resolution UI
for restored and current-tab typed requests and ordinary owned photos. A 404
lookup remains blocked until explicit server resolution. Accepted work is opened
without replay, and only its matching submitted draft is cleared. A missing or
superseded follow-up session read retains the pending identity and draft. An
unaccepted request is closed against late acceptance before releasing retained
text/photo. Phone-token uploads retain their independent scope.

`Tutor` distinguishes History loading, failure and successful-empty responses,
with GET-only reload. Account and connection mutations retain confirmed success
if the list refresh fails and block the affected stale controls until read-only
recovery. Connection tests identify their pending connection/stage. The phone
API discloses reader and downstream tutor locations without private metadata;
its received receipt stays empty. Phone tasks reuse SafeText and scoped wrapping.
Material navigation stays mounted within a session, restores a useful control
following learner actions and avoids stealing focus on polling/hidden pages.
Internal generation text no longer appears as learner-authored chat; failure and
retry/stop controls remain.

**Documentation:** README, Help and SPECIFICATION describe the current recovery
and display behavior. UI_UX_REVIEW is a concise correction record; superseded
committed review prose remains in Git history, and T68's dated evidence remains
in this task log. TASKS and ACCEPTANCE checkpoints now point
to current evidence instead of repeating old release narratives. Existing manual
acceptance requirements remain explicit.

**Commands and actual evidence:** Checks use
`python3 /tmp/shepherd-t69/run.py` as an environment-isolating prefix. It excludes
inherited operator/provider settings and dotenv loading. A temporary PNPM wrapper
preserves the Makefile build/test phases while passing `envDir: false` to the
existing Vite and Vitest APIs; no gate is skipped.

| Command                                                                                               | Actual outcome                                                                                                                                                                                                                                                                              |
| ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `make test-integration`                                                                               | **409 passed in 72.73s** against temporary on-disk SQLite databases.                                                                                                                                                                                                                        |
| `make check`                                                                                          | Final run passed: **329 backend unit tests in 10.71s**, **11 toolchain tests**, **305 frontend tests in 18 files**, lint/format, Python/TypeScript types, build, generated-contract drift, credential scan and infrastructure validation. Existing >500kB JavaScript chunk warning remains. |
| Focused Playwright selection across `review-fixes`, `reading`, `phone-navigation`, `request-recovery` | **12 passed in 1.3 minutes**, six per desktop/mobile project; all layout, focus, failed-read, receipt and no-new-work assertions retained.                                                                                                                                                  |
| `make lint format-check typecheck`                                                                    | Passed after the browser fixture corrections.                                                                                                                                                                                                                                               |
| `make secret-check`                                                                                   | Passed with the new shared component staged and included.                                                                                                                                                                                                                                   |
| `make smoke-built`                                                                                    | **124 passed in 19.3 minutes**, 62 desktop and 62 Pixel 7 Chromium emulation cases, one worker, zero retries.                                                                                                                                                                               |

Earlier checks stopped on a test-only unsupported Testing Library `exact` option,
which was replaced with its equivalent exact-name regex. The first focused
browser run was **6 passed/6 failed**: the formula legally wrapped, keyboard
focus ran before controls enabled (or wrongly required editable success after a
valid context-limit failure), and the History fixture recovered on normal page
navigation. Fixtures now require intrinsically wide math, wait for enabled or
terminal controls and hold History failure until explicit reload. No product
assertion or privacy rule was removed. Sandboxed phone integration attempts
stalled before test bodies in the existing async fixture; the same selection and
full gate passed with loopback socket permission.

**Final review:** Independent source review found no blocking issue in ownership,
receipt/key handling, administrator outcomes, focus or phone rendering. Production
file hashes remained unchanged during the full browser run. The generated client,
lockfiles and schema are unchanged; final whitespace and credential checks passed.

**Publication:** `git fetch origin main` confirmed a normal fast-forward from
`ef2c6dc`. The implementation commit passed the repository's ordinary commit
hooks, including the full project-check hook. `git push origin HEAD:main`
succeeded, and `git ls-remote origin refs/heads/main` matched the implementation
commit exactly. This documentation-only follow-up records the receipt without
changing the tested production source. `git diff --check`, the final credential
scan and all-files repository hooks passed.

**Remaining checks:** Live providers/teaching quality, actual phones/camera/HEIC,
Safari, installed-PWA background behavior, manual zoom/text spacing,
screen readers/accessible math, comprehensive contrast/targets and full restored
host recovery remain in ACCEPTANCE. No private environment/provider configuration,
real learner material, uploads or private logs were opened. No live/paid inference,
model downloads, cloud provisioning or deployment ran. Artifacts and logs are
synthetic and retained outside Git under `/tmp/shepherd-t69`.

## T68 — Review the whole application after T67 (2026-10-24)

**Status:** Source and synthetic-browser review complete. T69 implements the
corrections. This dated evidence is not a complete manual accessibility audit or
a release-readiness claim.

**Scope and contracts:** The maintainer requested the repository's UI/UX review
skill across the application. Reviewed source `ef2c6dc` from a clean working tree,
covering all 23 implemented workflow groups, with separate administrator and
learner journeys. Applied usability, accessibility and writing lenses against
README, SPECIFICATION sections 1–4, 10–13 and 18, current T67 evidence and
ACCEPTANCE. No application, schema/client, dependency or permanent test changes.
Only this task log and `docs/UI_UX_REVIEW.md` changed.

**Findings:** The review recorded a permanent-rejection retry trap without in-tab
resolution; completed
administrator actions misreported after refresh failure; incomplete phone
disclosure for a local reader plus cloud tutor (source-only); failed History
loading presented as an empty account; phone task math/wrapping problems; lost
focus continuity on section changes; and missing visible connection-test progress.
The focus result is narrowly reported: BODY receives focus and the following Tab
returns to the passage title, not the masthead. Pending generation appearing as
learner-authored chat is a separate design suggestion; the specification's
successful-generation hiding requirement is already satisfied. T67's historical
corrections and existing ACCEPTANCE follow-ups stay separate.

**Actual checks:** A fresh Vite build with `envDir: false` and
`node scripts/build-pwa.mjs` passed; the existing >500kB JavaScript chunk warning
remains. Isolated `make smoke-built` passed **114 cases in 18.3 minutes**, 57 each
on Chrome 156.0.8078.47 desktop and Pixel 7 Chromium emulation, one worker and
zero retries. The first sandbox attempt could not bind loopback and exited before
tests; the same harness then ran with socket permission. No live environment
files or inherited operator/provider settings were loaded.

Temporary focused probes initially produced **14 passed, 2 failed in 2.1 minutes**.
Both failed recovery cases reached a real stale-version 409 but could not match
the remounted composer with an exact label-text selector. A 15-second-wait rerun
still failed both; snapshots retained the draft. Using the accessible textbox
role and the actual read-only textarea contract produced **2 passes in 9.2
seconds**, retaining the draft-value, disabled Finish, real 409 and missing
Check/Resolve assertions. All 16 distinct probe cases consequently have passing
evidence across those runs; defect-probe passes establish reproduction, not fixes.
The probes also completed synthetic age correction, authenticated no-store export,
canceled deletion and confirmed deletion. TypeScript passed with the expanded
temporary probes. The report contains exact commands, coverage and measurements;
desktop phone-task scrollWidth measured **2,111px at a 320px viewport**. Screenshots
were inspected alongside interaction, HTTP, focus/Tab and geometry evidence.

The temporary probe was removed from the repository; its initial/final source,
logs, screenshots and failure traces remain under
`/tmp/shepherd-ux-review-20261024`. Final `git diff --check` passed. Backend
unit/integration, full `make check`, dependency audits and deployment gates were
not rerun for these documentation-only changes.

**Limits and next bounded action:** No private settings/provider configuration,
learner material, uploads or private logs were opened. No live/paid inference,
model downloads, provisioning, deployment or Git push ran. Physical phone/camera/
HEIC, Safari, installed-PWA/background behavior, actual browser zoom/text spacing,
screen readers/accessible math, comprehensive contrast/targets, live teaching and
full host recovery remain unverified. Prioritize an in-tab receipt lookup/resolve
slice for ambiguous typed/photo requests that preserves drafts and safely handles
both absent/stale and already-accepted work. This review implements no corrections.

## T67 — Fix review findings, publish and deploy (2026-10-23)

**Status:** Complete; the maintainer-authorized corrections passed the gates,
were published to `main` as `7ce664b97530e5641cdd5ae8459f82beeabb1bf6` through
normal commit hooks, and were deployed to the existing private installation.
The pushed remote revision was verified. This evidence-only documentation update
does not change the deployed application revision.

**Scope and contracts:** T66's eight confirmed issues plus the saved-review
metadata and History identification follow-ups. SPECIFICATION sections 2–4,
9–13 and 18: recoverable owned-session links, in-memory draft/account isolation,
accurate settings outcomes, role-specific destinations, phone operation ordering,
photo availability, narrow layouts, contrast and source-linked fallible review.
No new services, dependencies, live provider calls or database migration were
introduced. Existing lockfiles remain unchanged.
Their SHA-256 values are `uv.lock`:
`3c30aecb82975db9a5df58080e6271afdbfe4246cca98f58798e7c043dceec81`;
`pnpm-lock.yaml`:
`d0614a0d4a4646f60abd0e4ad6ceb8a0875371c851bca8458ca45243d4df3d8d`.

**Implemented:** `Tutor.tsx` retains successful availability/history reads when a
saved session is unavailable, clears invalid initial selections, restores the
current URL after failed navigation and protects displayed drafts. Opening another
session now guards the composer, actions and already-open photo picker/dropzone
until the transition settles. Both photo source choices display the safe reader
status and a pasted-text alternative. History includes creation dates and
contextual action descriptions. `TutorConversation.tsx` and `SessionReview.tsx`
expose optional saved help, unresolved observations and response/reading versions,
with AI observations labeled fallible. Typed API dates and response-version
metadata come from existing owned records; OpenAPI/frontend types were regenerated.

`AdultPanel.tsx` guards pending active-model saves against edits and duplicate
submission. `ProviderConnections.tsx` distinguishes confirmed privacy saves from
failed refreshes and offers GET-only recovery. `App.tsx`/`Help.tsx` honor the
destination role in both clicks and copied URLs, retaining workspace/topic/drafts
on cancellation. `PhoneLink.tsx` serializes creation/cancellation and clears only
the canceled link. CSS permits valid long names to wrap and gives enabled
placeholders an opaque darker color. The settings receipt now gives its message
a full row and wraps actions to prevent narrow-screen text compression.
Regression coverage is in the affected component tests, API history tests and
`tests/smoke/review-fixes.spec.ts`.

**Commands and gates:** Targeted history/metadata integration passed **3 tests in
1.26 seconds**, including serialization and cross-learner 404 isolation.
`make test-integration` passed **404 tests in 72.38 seconds**. Final `make check`
was repeated successfully against the exact committed source: **329 backend unit
tests**, **11 toolchain tests** and **284 frontend tests in 18 files**, plus
lint/format, types, build, generated-contract drift, secrets and infrastructure
checks. The full built Playwright suite passed **114 cases in 18.3 minutes** on
desktop and Pixel 7 Chromium emulation. Final credential scanning and all-files
repository hooks also passed. Two older expectations were corrected
for the intended guarded session-selection behavior and explicit role-specific
entry on setup cancellation; background-poll race, draft and account-isolation
assertions remain covered. Focused learner, administrator and navigation test
counts overlap this total and are not additional passes. Targeted lint/types and
repository-file hooks passed. `make audit` reported no known vulnerabilities in
either dependency audit. All four deterministic/mock evaluation suites passed;
reports remain outside Git in `/tmp/shepherd-t67/mock-reports`.

The earlier focused `review-fixes.spec.ts` browser suite passed **14 cases in 2.1 minutes**
across desktop and Pixel 7 Chromium emulation. Both projects kept body/document
width within the 320px viewport for valid long names. The desktop enabled
placeholder measured **6.3157026914:1** with opaque `#536456` on white. Ten
desktop/mobile role-entry, active-model, phone-QR, photo-unavailable and recovered
session screenshots were visually inspected. This exposed a narrow-screen
active-model success toast whose unwrapped actions squeezed the message into a
tall column. A final CSS correction and 320px receipt-width browser assertion were
added afterward; a fresh build and both desktop/mobile receipt checks passed
(**2 browser executions in 3.0 seconds**), and both new 320px screenshots were
visually inspected. The final full gate and browser results above include this
correction. Focused browser counts overlap the 114-case suite.

**Image and security:** Committed source
`7ce664b97530e5641cdd5ae8459f82beeabb1bf6` produced immutable image
`sha256:9e7d5e1ffd96c32902753ed24793992daf9a77cfc0d1169adfefa50f7d14f759`,
with that full OCI revision label. Container smoke and an offline encrypted
backup/restore rehearsal passed. Trivy 0.76.1 with the October 23 database
reported **zero HIGH/CRITICAL vulnerabilities and zero secrets at all severities**.
The first scan exhausted its 256 MiB temporary database-download mount; retry
with 2 GiB passed against the same image, without rebuilding. The CycloneDX SBOM
contains 52 components and has SHA-256
`ea8a1d1d06040f39bb8d0849ac745fc44cb39c3d27022ae96131b9835ce31441`.

**Deployment and recovery:** Attempt 1 refused backup preflight because the
current deletion ledger was missing, before creating an archive, migrating or
starting the candidate. Automatic rollback restored the previous image and
passed private HTTPS verification. Before attempt 2, with API and worker writers
stopped, a guard verified the absence of tombstones, deletion-audit records and
deleted learners before initializing the first empty ledger, as permitted by
RUNBOOK. It preserved any existing ledger rather than substituting an older one.

Attempt 2 completed without rollback. The encrypted archive is
`backups/deploy-20261023-t67-7ce664b97530-attempt2/archive.enc`, SHA-256
`d0a8654ec70b4eb574039ad75cb3822b0fff71e3484dbda443359348dad21087`.
Its passphrase is held separately outside Git and was not printed or exposed
to the agent.
The isolated restore passed SQLite integrity, foreign-key, preserved table-content,
retained-object checksum, deletion-preservation, restored-session revocation and
pending-job cancellation checks. The ledger remained unchanged after its guarded
creation, and the plaintext restore rehearsal was removed.

The rollback image remains tagged
`math-practice-tutor:rollback-20261023-t67-7ce664b97530-attempt2`.
API/worker startup reached `0020_request_recovery` with the original data mount
preserved, a fresh worker heartbeat and zero service restarts. Private HTTPS
readiness passed; six public asset hashes matched the candidate; cache headers
and worker scope passed. Three anonymous protected endpoints returned **401**
with `no-store`, without reading their bodies, and three runtime-documentation
endpoints returned **404**. The public/synthetic gate, scan, SBOM and content-free
deployment evidence bundle retains 60 evidence files plus a checksum index under
`backups/evidence-deploy-20261023-t67-7ce664b97530`, including final checks,
deployment receipts, SBOM/scans, mock results and helper tests. A sustained
post-cutover metadata check also confirmed both exact service images, zero
restarts and a fresh worker heartbeat.

**Remaining limits:** No private provider configuration or real learner content/logs
was inspected. No live or paid provider tests, model downloads or cloud
provisioning were run. Actual-device, assistive-technology, real-model
quality and full operational-recovery checks remain in ACCEPTANCE; synthetic
results do not establish WCAG conformance or teaching quality. The implemented
corrections and final gates above supersede T66's historical findings.

## T66 — Whole-application UI/UX review (2026-10-23)

**Status at review:** Review complete; application corrections remained open.
This is the dated source and synthetic-browser review, with the manual/device
limits below. [T67](#t67--fix-review-findings-publish-and-deploy-2026-10-23)
subsequently corrected and deployed the eight findings and two follow-ups.

**Scope and contracts:** Applied `.agents/skills/ui-ux-review/SKILL.md` across
all 23 workflow groups, tracking administrator and learner journeys separately.
Covered usability, semantic accessibility and interface wording against
SPECIFICATION sections 2–4, 10–13 and 18, the current README, T65 and ACCEPTANCE.
Reviewed source `b593765` from a clean working tree. Only `docs/UI_UX_REVIEW.md`
and this task log changed; no application, dependency, API/schema or permanent
test changes were made.

**Findings:** The dated review recorded eight confirmed issues: a missing saved-session bookmark blocks new
practice and History; a delayed active-model save erases newer selections;
cross-role Help destinations open the wrong workspace; successful privacy saves
can be reported as unsuccessful after a refresh failure; delayed phone-link
cancellation hides its replacement; unavailable photo input silently disables
Start; valid long names overflow narrow layouts; enabled placeholder text has
2.819:1 contrast. The saved-review metadata contract and History identification
suggestion remain separately labeled source-only/design follow-ups. Previous
T65 fixes and existing acceptance work are kept separate from these findings.

**Commands and evidence:** The fresh Vite build with `envDir: false` and
`scripts/build-pwa.mjs` passed. The isolated `make smoke-built` gate passed
**100 cases in 16.2 minutes** on Chrome 156.0.8078.47 desktop and Pixel 7
emulation, one worker, zero retries. Temporary focused probes initially reported
13 passed/3 failed: two error-copy expectation mismatches and one mobile timeout
in an unrelated color-capture step after overflow was measured. Correcting that
expectation and separating the unrelated step yielded **4 focused passes in
10.4 seconds**, retaining every behavior/overflow assertion. All 16 distinct
focused cases consequently have passing evidence across these runs; their
assertions deliberately reproduce defects rather than validate corrected
behavior. The lifecycle cases exercised only disposable account age correction,
no-store export, canceled deletion and final deletion. TypeScript and final
`git diff --check` passed. Browser-native color conversion measured the enabled
placeholder at effective RGB (139,158,153) on white. Both projects measured
918px learner content and 693px connection content in a 320px viewport.

The first sandbox attempt failed before tests because local sockets were blocked;
the same isolated harness then ran with socket permission. Commands excluded
operator/provider environment variables and environment-file loading. No private
configuration/data/logs, live provider tests, paid inference, model downloads,
provisioning, deployment or push were used. Temporary probes and synthetic
artifacts were preserved under `/tmp/shepherd-ux-review-20261023` and removed from
the repository. The pre-existing JavaScript chunk-size warning remains; the
backend unit/integration, full project and dependency-audit gates were not rerun
for this documentation-only review.

**Remaining work at review completion:** Prioritize a bounded correction for unavailable initial
session URLs, with regression coverage for successful feature/history loading,
404 selection, Reconnect and subsequent navigation. The other seven confirmed
findings remained unfixed at that point; T67 records their subsequent correction.
Actual phones/camera/HEIC, installed-PWA background
behavior, real browser zoom, text spacing, screen readers/accessible math, live
teaching and full host recovery remain in ACCEPTANCE. This review does not
establish complete browser-state coverage or WCAG conformance.

## T65 — Review and preserve administrator work across navigation (2026-10-22)

**Status:** Complete; the maintainer-authorized review and bounded corrections
were checked, pushed to `main` as `4151794`, then deployed to the existing private
installation. The final documentation update records the observed results.

**Scope and contracts:** SPECIFICATION sections 3, 8, 10, 12 and 18; in-memory
drafts and pending/completed operation context across page changes; role/account
isolation; honest copy, focus and update behavior. The review spans all 23 workflow
groups in source, with focused synthetic browser coverage of the affected paths.
The correction stays bounded to administrator panel lifetime, Settings drafts and
related notice/recovery behavior. The maintainer's exact T64 lockfile is retained;
no dependencies, API/schema changes or live-provider inference were added.

**Requirement conflict:** README/SPECIFICATION/Help promise that page changes
preserve in-memory drafts, while the old connection editor said leaving Settings
discarded entries and its API key. The correction preserves drafts in
account-scoped memory across ordinary navigation and updates the editor copy.
Successful save, explicit cancel/reset, account changes, authentication loss and
reload remain deliberate clearing boundaries. Keys/passwords never enter browser
storage. Authoritative policy changes reset privacy drafts, and returning to
Settings requires fresh active-model acknowledgement.

**Implemented:** `App.tsx` and `AdultPanel.tsx` retain visited administrator pages
in account-scoped memory with inactive controls hidden. `ProviderConnections.tsx`
retains privacy-tab drafts and explains credential lifetime. `LearnerAccounts.tsx`
clears notices on explicit management selection and preserves delayed add/delete
selection behavior. Pending actions are counted across overlapping requests and
included in browser-unload/PWA-update protection; `UpdateNotice.tsx` warns about
unsaved forms. Account replacement/authentication loss still clears hidden state;
no browser credential storage, API contract or schema change was introduced.
The final evidence commit also makes the existing selected-text-help test await
an enabled composer before selecting text. Its normal hook exposed a readiness
race after the earlier full gate passed; all behavior assertions remain intact,
and this test-only correction changes no deployed runtime code.

**Review and checks:** This review covered all 23
workflow groups with baseline source-only coverage, the synthetic browser failure
before the fix, corrections, independent review and manual/device limits.
`make check` passed: 329 backend unit, 11 toolchain and 252 frontend tests, lint,
format, types, build, generated-contract drift, credential scan and infrastructure
lint. `make test-integration` passed 403 tests in 71.56 seconds. The six new App
regressions include delayed password completion, overlapping requests, retained
drafts, cleared account state and scoped notices. Initial verification exposed
React lifecycle lint errors and a test waiting for an account list too early;
both were corrected. The focused Playwright gate selected `admin-navigation`,
`accounts`, `connections`, `navigation` and `workspace-navigation`: **38 cases
passed in 6.2 minutes**, on desktop and Pixel 7 Chromium emulation, one worker,
zero retries and unchanged login throttles. All eight new screenshots were
visually inspected. An initial browser run exposed the fixture's locked privacy
controls and was stopped; its test setup was corrected before the passing gate.
The privacy-draft browser case overrides only the synthetic provider GET response
to expose editable controls; server locks remain enforced and no policy save is
performed. Existing build warnings about the uv_build upper bound and JavaScript
chunk size remain. The exact T64 `uv.lock` SHA-256 remains
`95bbc12a27fa194c35aecc20d9d8e5d41c244c942b43841d6319d95fad121cdb`.

**Image and deployment:** The clean source archive for
`4151794a02c560ce0e7bad175003f573512266f2` produced immutable image
`sha256:a9e01150b7ec0f81568860c0b3cb786f5abfeef8276e6036bceaa9815e8479d9`,
with that full OCI revision label. `sh scripts/container-smoke.sh IMAGE` passed
Python/HEIF/cryptography and restricted-subprocess checks, migrations, worker
readiness, built UI and synthetic setup/renewal/stale-link behavior. The first
temporary archive incorrectly gave public source directories mode 700; smoke
caught the non-root import failure. Extraction modes were corrected and cached
layers discarded before rebuilding and rerunning all candidate checks. No
production source change was needed for this preparation error.

Checksum-verified Trivy 0.76.1 with the October 22 database reported **zero high or
critical vulnerabilities and zero secrets at all severities** for the final
image. A CycloneDX SBOM with 52 components was generated. A network-disabled,
read-only-root synthetic backup/restore rehearsal also passed before cutover.

After push and remote revision verification, the reviewed cutover retained the
previous image as `math-practice-tutor:rollback-20261022-t65`, stopped API and
worker writers, and completed encrypted native backup plus isolated restore in
`backups/deploy-20261022-t65-4151794`. The encryption passphrase is held separately
outside Git and was never printed. The encrypted archive SHA-256 is
`db4a8b4624e5442898bdda4d1ca204bf756ddbaf474fceaeafc3e636b894dd22`.
Integrity, foreign keys, checksums, deletion preservation, restored-session
revocation and pending-job cancellation passed; the original data mount was
preserved. The unchanged schema upgrade passed before both replacements started.

Private HTTPS verification passed: both services run the exact tested image with
zero restarts, the worker heartbeat is newer than replacement startup, readiness
is healthy, and the loopback API binding/data mounts are preserved. Six served
HTML/JS/CSS/worker/manifest/icon hashes match the image; cache headers and worker
scope match. Three protected routes returned anonymous 401/no-store without their
bodies being read; three runtime documentation routes returned 404. Existing
settings and account credentials were retained; no administrator reset, provider
configuration inspection, real learner-data inspection or inference was performed.

An additional anonymous HTTPS cold-start browser probe passed in two fresh
desktop/mobile contexts: learner/administrator entry, administrator reload,
public Help/topic navigation, role return and horizontal-overflow checks. Ten
account-directory requests were fulfilled with synthetic empty lists before
networking; only four anonymous session reads reached the API. External,
mutation, unexpected API/public, WebSocket, redirect and page-error counts were
zero. No credentials were entered and no login/setup/provider requests ran.

**Limits:** No test failures remain in the required gates. The review does not
establish whole-app WCAG conformance, physical-device behavior or teaching quality.
The existing [acceptance checks](ACCEPTANCE.md#items-requiring-the-maintainer)
remain open, as does the review's mobile long-account-list navigation consideration.
Live/paid providers, model downloads, cloud provisioning and public deployment
were not run. The published T64 lockfile and all its preceding account/skill work
are included through the source commit's ancestry.

## T64 — Publish pending account, review-skill and lock updates (2026-10-22)

**Status:** Complete; the validated source was committed and pushed to `main`,
including the maintainer's exact `uv.lock` updates and all other pending repository
changes. This publication did not update the private installation recorded above.

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
hash.

**Publication:** Commit `18f6784147205c56f5b1cd8e2bad9aeb1283c508`
(`Publish household accounts, UI/UX review skill and lock refresh`) includes all
**38 manifest files**. Normal commit hooks passed, including their project gate;
no hook was bypassed. `git push origin main` succeeded, advancing remote `main`
from `9b43820` to `18f6784` without a force push. The committed `uv.lock` matches
the supplied SHA-256 exactly. The post-push working tree was clean and
`git rev-list --left-right --count main...origin/main` returned `0 0`.
The accompanying documentation commit records these observed outcomes.

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

| Package          | Before   | After    |
| ---------------- | -------- | -------- |
| boto3            | 1.43.114 | 1.43.115 |
| boto3-stubs      | 1.43.114 | 1.43.115 |
| botocore         | 1.43.114 | 1.43.115 |
| botocore-stubs   | 1.43.114 | 1.43.115 |
| FastAPI          | 0.146.0  | 0.150.0  |
| filelock         | 4.2.2    | 4.2.4    |
| httpcore2        | 2.14.0   | 2.15.1   |
| httpx2           | 2.14.0   | 2.15.1   |
| hypothesis       | 6.170.1  | 6.170.3  |
| jsonpatch        | 1.35     | 1.36     |
| jsonpointer      | 3.3      | 3.4      |
| platformdirs     | 4.13.4   | 4.13.5   |
| python-discovery | 1.6.3    | 1.6.4    |
| s3transfer       | 0.19.2   | 0.19.3   |

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
