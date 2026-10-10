# Acceptance evidence and remaining checks

Synthetic tests establish software behavior. Live model quality, learning
outcomes, physical-device behavior and the actual host's recovery procedure need
separate evidence. This checklist does not claim production readiness.

## Current checkpoint

Recorded automated gates passed through **T44 (October 8, 2026)**: 291 backend
unit, 188 component, 340 integration and 80 desktop/mobile Chromium tests, plus
mock evaluations, repository checks, dependency audits, container smoke and a
clean HIGH/CRITICAL image scan. Exact commands and limits are in
[the T44 task entry](TASKS.md#t44--adversarial-review-hardening-2026-10-08).
Those complete source gates remain the October 8 evidence.

On **October 10, 2026**, T44 source `62b30ca` was deployed to the existing private
Compose installation at `0020_request_recovery`. Both writers stopped before a
verified private rollback archive. The deployed image passed container smoke and
a fresh scan with zero HIGH/CRITICAL findings. HTTPS readiness, matching served
HTML/JS/CSS, protected reading/admin/receipt endpoints and no-cache HTML/service
worker responses passed. Current provider selections were not inspected or
changed; no inference was run. Exact image and commands are in [TASKS](TASKS.md).

All 40 existing mobile Chromium checks and six additional synthetic phone flows
passed at 320×568, 375×667, 390×844, 430×932, 667×375 and 844×390. Settings,
long readings, conversation/reload and QR/photo upload passed overflow and control
reachability assertions. The suites used installed Chrome 149 with an explicit
browser override; exact commands and versions are in [TASKS](TASKS.md#private-deployment-and-phone-layouts-2026-10-10).
Emulation does not establish physical camera, iPhone Safari, device installation
or manual accessibility behavior. Use [HANDOFF](HANDOFF.md) for the remaining actions.

The approved offline development restore rehearsal passed authenticated encrypted
backup/restore, wrong-passphrase rejection, database integrity/foreign keys,
release-schema migration, browser-session revocation, unfinished-job/submission
cancellation, lease clearing and retained-object checks. The running data and
rollback archive were untouched; temporary copies were removed. No deletion
markers were present, so populated deletion replay was not exercised. This offline
check did not cover separately stored settings, session secret and passphrase,
or restored app startup and sign-in.

## Functional/security mapping

The current product is the multi-subject tutor, with optional exact-math utilities.
The former math-catalog, authored-hint and manual photo-approval acceptance flows
are superseded by D009/T25. Their dated regression evidence remains in TASKS.

Paths below are relative to the repository; test results are recorded in TASKS.

| Current requirement                                                                                                                                         | Automated coverage                                                                                                                                  |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Topic-based activities, criteria, explanations, revision and learner-controlled progression                                                                 | `apps/api/tests/integration/test_tutoring.py`, `test_teaching_memory.py`, `test_teaching_output_boundaries.py`; `tests/smoke/tutor.spec.ts`         |
| Assignment references produce distinct practice; sufficient work receives acknowledgment; reassurance creates no new demonstration                          | `apps/api/tests/unit/test_teaching_boundaries.py`; teaching memory/output integration tests and adversarial mock fixtures                           |
| Saved material preserves literal text, Unicode limits, source ownership and guided section focus; supplied context excludes future sections                 | `apps/api/tests/integration/test_reading.py`; `apps/api/tests/unit/test_reading_sources.py`; `tests/smoke/reading.spec.ts`                          |
| Full photo reading precedes feedback; clear work continues automatically; blocking uncertainty receives specific advice and stays uncertain in conversation | `apps/api/tests/unit/test_images.py`; tutoring integration tests; `tests/smoke/phone-navigation.spec.ts`                                            |
| Duplicate requests, lost acknowledgments and reloads preserve owned work; resolution excludes delayed acceptance                                            | `apps/api/tests/integration/test_request_recovery.py`; `tests/smoke/request-recovery.spec.ts`                                                       |
| Browser-first owner setup, separate learner sign-ins, revocation and cross-account isolation                                                                | `apps/api/tests/integration/test_browser_setup.py`, `test_owner_setup.py`, `test_auth_sessions.py`; `tests/smoke/setup.spec.ts`, `accounts.spec.ts` |
| Backend provider capability/audience/cloud policy; safe failures and no automatic cloud fallback                                                            | `apps/api/tests/unit/test_provider_contracts.py`, `test_provider_execution.py`; `apps/api/tests/integration/test_provider_connections.py`           |
| Retention, deletion, authenticated exports, migration integrity and restore tombstones                                                                      | `apps/api/tests/integration/test_retention_recovery.py`, `test_db_foundation.py`, `test_workflows.py`                                               |
| Public-only PWA caches, account transitions and updates that defer while commands are pending                                                               | `tests/smoke/bootstrap.spec.ts`, `navigation.spec.ts`, `request-recovery.spec.ts`; frontend App/UpdateNotice tests                                  |

Teaching guards reject reproduced copied equations, scalar answer criteria and
required extra work after sufficient feedback. They are bounded recognizers,
not universal semantic enforcement. AI observations remain fallible guidance;
server-owned source/support links and current evidence versions govern adaptation.
Older feedback remains visible without being treated as current learning evidence.

The mock suites include 12 reading cases/36 stages, 12 cross-subject cases/36
stages and four adversarial conversations/20 stages. Scripted answers to
fixture-authored transfer activities do not demonstrate independent learning.
Recorded Muse CLI samples also do not verify the installed HTTP/browser/worker
path. See [TUTOR_EVALUATION](TUTOR_EVALUATION.md) for live review procedures.

Known limits remain explicit: closing a tab loses its receipt marker; the phone
companion has a separate token workflow; pathological combining/ZWJ text can
split across section boundaries without losing characters; model prior knowledge
can reveal future events despite exclusion from supplied context.

## Items requiring the maintainer

1. **Test and select the intended models.** Follow
   [PROVIDER_STATUS](PROVIDER_STATUS.md#test-and-select-the-tutor-and-photo-reader). Record exact
   model/runtime/region where relevant, reviewed audience terms and data consent.
   T44 requires a fresh tutor connection test; photo-reader tests keep their normal
   validity. Select both roles explicitly. Only providers intended for use need
   live acceptance; unverified optional routes stay labeled unverified.
2. **Review real tutoring through the app and worker.** Use original synthetic
   work and the [evaluation guide](TUTOR_EVALUATION.md). Check handwriting,
   false corrections, sufficient answers and supported alternatives, explanation,
   assisted revision, independent transfer, memory, grounded reading, spoilers and
   homework/active-task answer leakage. Record failures and sample denominators;
   report latency/tokens separately from teaching quality. Human review is required.
3. **Use actual phones and accessibility tools.** On iPhone Safari and Android
   Chrome, record device/OS/browser versions and private HTTPS trust. Check learner
   sign-in/re-sign-in, QR upload, denied camera access, JPEG/HEIC capture,
   preview/crop/rotation, automatic clear-reading continuation and retake advice.
   Check 200% zoom, keyboard/screen reader, PWA installation/update and background/
   reconnect after submission. Confirm the same operation returns, revocation
   clears content and no sensitive browser cache or automatic refresh loses work.
4. **Complete operational recovery.** Retain an encrypted backup and the current
   deletion ledger; store its passphrase and deployment settings/session secret
   separately. Verify restored API/worker readiness, fresh administrator/learner
   sign-ins, saved-key decryption, retained provider policy and backup retention.
   The completed offline development restore does not validate those settings
   or recovery from separately retained operational copies.

Attach only synthetic evidence without credentials or real learner material.
Live inference, deployment and downloads require explicit authorization; this
checklist records unfinished work rather than authorizing those actions.

## Optional research and hosting

T23 browser-model acceptance requires a named WebGPU device, reviewed model
license, explicit download consent, synthetic questions, cold/warm latency,
storage/memory/battery/thermal measurements and cancel/unload/delete checks.
It is separate text-only research, not a prerequisite for the core tutor release.

AWS provisioning remains optional. If chosen, review the AMI, network/certificate/
SSM access, retained EBS mount, secret ARN, IAM and budget before applying IaC.
Publishing source does not deploy an application.
