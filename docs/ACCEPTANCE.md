# Acceptance evidence and remaining checks

Synthetic tests establish software behavior. Live model quality, learning
outcomes, physical-device behavior and the actual host's recovery procedure need
separate evidence. This checklist does not claim production readiness.

## Current checkpoint

The current source includes T72's control/layout refinements and the preserved T71
sign-in corrections. These are the latest recorded checks; earlier runs remain
in TASKS and its history rather than being duplicated here.

| Evidence | Recorded result | Limits |
| --- | --- | --- |
| [T72 compact controls and action placement](TASKS.md#t72--refine-control-sizing-and-action-placement-publish-and-redeploy-2026-10-24) | Final project gate passed: 329 backend unit, 11 toolchain and 315 frontend tests; 409 integration cases; all 136 desktop/mobile browser cases passed in 21.3 minutes. Clean-source candidate smoke, encrypted WAL-aware backup/restore, private HTTPS/readiness and all 66 exact served public assets passed. Source `d447134` is published and privately deployed. | Synthetic browser/device emulation; live providers, physical devices, password managers, assistive technology and restored-host sign-in/key recovery remain open. Earlier validation failures and their corrections are recorded in T72. |
| [T71 sign-in and credential recovery](TASKS.md#t71--correct-account-sign-in-and-household-credential-recovery-2026-10-24) | Full gate passed: 329 backend unit, 11 toolchain and 315 frontend tests; 409 integration cases. Focused browser coverage spans 62 distinct desktop/mobile cases across initial and corrected final runs; final 20/20 passed. Private update, encrypted backup/restore, exact 66 served assets and actual HTTPS sign-in for one administrator and one learner passed. | Focused access-flow correction; full browser suite, real autofill/password managers, physical devices and assistive technology remain unverified. Backend/dependencies unchanged from T70. |
| [T69 UI/UX corrections](TASKS.md#t69--correct-the-uiux-findings-and-publish-2026-10-24) | Full project gate passed: 329 backend unit, 11 toolchain and 305 frontend tests; 409 integration tests passed. All 124 desktop/mobile browser cases passed in 19.3 minutes. | Synthetic source checks; live models, physical devices, assistive technology and restored-host acceptance remain open. |
| [T70 private deployment](TASKS.md#t70--deploy-the-uiux-corrections-2026-10-24) | October 24 source `ac5114d` deployed; package smoke, dependency/image audits, SBOM, encrypted backup/isolated restore and private HTTPS/assets/access boundaries passed at schema head 0020_request_recovery. Both services have fresh readiness and zero restarts. Exact identities and receipts are in T70. | Existing data/settings preserved; live teaching quality and full restored-host sign-in/key recovery remain unverified. |

[DEPENDENCIES](DEPENDENCIES.md) owns version policy;
[TASKS](TASKS.md) records actual commands and their evidence limits. The
[current UI/UX record](UI_UX_REVIEW.md) lists corrections and remaining manual work.

## Functional/security mapping

The current product is the multi-subject tutor, with optional exact-math
utilities. Paths below are relative to the repository. The table lists existing
test coverage; it does not report a new test run.

| Current requirement                                                                                                                                                                        | Automated coverage                                                                                                                                          |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Topic-based activities, criteria, explanations, revision and learner-controlled progression                                                                                                | `apps/api/tests/integration/test_tutoring.py`, `test_teaching_memory.py`, `test_teaching_output_boundaries.py`; `tests/smoke/tutor.spec.ts`                 |
| Assignment references produce different practice; sufficient work is acknowledged; reassurance does not require another demonstration                                                      | `apps/api/tests/unit/test_teaching_boundaries.py`; teaching memory/output integration tests and adversarial mock fixtures                                   |
| Saved material preserves text unchanged, enforces Unicode limits and source ownership, and keeps guided reading on the selected section; supplied context excludes future sections         | `apps/api/tests/integration/test_reading.py`; `apps/api/tests/unit/test_reading_sources.py`; `tests/smoke/reading.spec.ts`                                  |
| Full photo reading precedes feedback; clear work continues automatically; uncertainty that prevents useful feedback receives specific advice and remains labeled uncertain in conversation | `apps/api/tests/unit/test_images.py`; tutoring integration tests; `tests/smoke/phone-navigation.spec.ts`                                                    |
| Duplicate requests, lost acknowledgments and current-tab/reload recovery preserve work; resolving an absent request blocks delayed acceptance                                                | `apps/api/tests/integration/test_request_recovery.py`; `tests/smoke/request-recovery.spec.ts`                                                               |
| Browser-first owner setup, separate learner sign-ins, revocation and cross-account isolation                                                                                               | `apps/api/tests/integration/test_browser_setup.py`, `test_owner_setup.py`, `test_auth_sessions.py`; `tests/smoke/setup.spec.ts`, `accounts.spec.ts`         |
| Rejected reference-photo discussion stays uncertain; retries reflect current activity/version; age-group corrections preserve history and stop pending work                                | `apps/api/tests/integration/test_tutoring.py`, `test_workflows.py`, `test_learner_accounts.py`; `apps/web/tests/Tutor.test.tsx`, `LearnerAccounts.test.tsx` |
| Practice purpose selects relevant material inputs; visible session completion preserves drafts and shows a recap of saved work                                                             | `apps/web/tests/Tutor.test.tsx`, `Reading.test.tsx`; `tests/smoke/tutor.spec.ts`, `reading.spec.ts`, `navigation.spec.ts`                                   |
| History lists summaries without transferring retained conversations; selected work and processing disclosures still refresh                                                                | `apps/api/tests/integration/test_tutoring_history.py`; `apps/web/tests/Tutor.test.tsx`                                                                      |
| Source imports recheck revoked sessions after fetching; expired leases cannot admit model calls, including during request preparation                                                      | `apps/api/tests/integration/test_reading.py`, `test_workflows.py`                                                                                           |
| Backend enforces provider capability, audience and cloud policy; safe failures and no automatic cloud fallback                                                                             | `apps/api/tests/unit/test_provider_contracts.py`, `test_provider_execution.py`; `apps/api/tests/integration/test_provider_connections.py`                   |
| Retention, deletion, authenticated exports, migration integrity and deletion records reapplied on restore                                                                                  | `apps/api/tests/integration/test_retention_recovery.py`, `test_db_foundation.py`, `test_workflows.py`                                                       |
| Public-only PWA caches, account transitions and updates that defer while commands are pending                                                                                              | `tests/smoke/bootstrap.spec.ts`, `navigation.spec.ts`, `request-recovery.spec.ts`; frontend App/UpdateNotice tests                                          |

Teaching checks reject known copied equations, criteria containing a numeric
answer and feedback that calls work sufficient but requires more. These checks
recognize specific patterns; they cannot enforce the policy in every possible
response. AI observations may be wrong. The server links them to their source
and any help given, and uses current evidence versions to adapt teaching. Older
feedback remains visible without being treated as current learning evidence.

Mock results and historical Muse CLI samples do not establish teaching quality
or verify the installed HTTP/browser/worker path. Use
[TUTOR_EVALUATION](TUTOR_EVALUATION.md) for fixture commands and live review procedures.

Known limits: request receipts are stored per tab and may be lost when it
closes; the phone companion has a separate token workflow; unusual sequences of
Unicode combining marks or zero-width joiners can split across section
boundaries without losing characters; model prior knowledge can reveal future
events despite exclusion from supplied context.

## Items requiring the maintainer

1. **Test and select the intended models.** Follow
   [PROVIDER_STATUS](PROVIDER_STATUS.md#test-and-select-the-tutor-and-photo-reader).
   Record exact model/runtime/region where relevant, reviewed audience terms and
   data consent. Select both roles after current connection tests pass. Only
   providers intended for use need live acceptance; optional connections without
   live evidence stay labeled unverified.
2. **Review real tutoring through the app and worker.** Use original synthetic
   work and the [evaluation guide](TUTOR_EVALUATION.md). Check handwriting,
   false corrections, sufficient answers and supported alternatives,
   explanation, revision after help, independent use of a concept on a new task,
   memory, questions based on supplied passages, spoilers and disclosure of
   homework or active-task answers. Record failures and total sample counts;
   report latency/tokens separately from teaching quality. Human review is
   required.
3. **Use actual phones and accessibility tools.** On iPhone Safari and Android
   Chrome, record device/OS/browser versions and private HTTPS trust. Check
   learner sign-in/re-sign-in, QR upload, denied camera access, JPEG/HEIC
   capture, preview/crop/rotation, automatic continuation after a clear photo
   reading and retake advice. Check 200% zoom, keyboard/screen reader, PWA
   installation/update, and recovery after backgrounding or reconnecting
   following submission. Confirm the app returns to the same operation,
   revocation clears content and no sensitive browser cache or automatic refresh
   loses work.
4. **Complete operational recovery.** Retain an encrypted backup and the current
   deletion ledger; store its passphrase and deployment settings/session secret
   separately. Verify restored API/worker readiness, fresh administrator/learner
   sign-ins, saved-key decryption, retained provider policy and backup
   retention. The completed offline development restore does not validate those
   settings or recovery from separately retained operational copies.

Attach only synthetic evidence without credentials or real learner material.
Live inference, deployment and downloads require explicit authorization; this
checklist records unfinished work rather than authorizing those actions.

## Decisions raised by the independent review

[T50](TASKS.md#t50--independent-adversarial-product-and-implementation-review-2026-10-17)
found a coherent private practice workflow, with teaching quality still the
largest unverified product assumption. Select an initial learner/subject cohort
and review held-out synthetic work through the actual app/worker before claiming
readiness across subjects. Include incorrect and sufficient answers, help and
revision, assignment-answer disclosure, uncertainty and genuine handwriting.
Set acceptable failure criteria before reviewing results. More adapters or a
larger mock suite do not close this gap.

Resolve administrator authorship before treating saved work as learner evidence.
D013 and SPECIFICATION section 9 direct administrators to synthetic probes and
exports, but the current HTTP ownership helper also permits administrators to
create and change managed learners' practice. The UI hides those controls;
the backend and administrator-based integration fixtures permit them. Prefer
learner-only practice mutations; if adult assistance on behalf of a learner is
required, specify explicit actor attribution and audit behavior first. Existing
administrator export and credential-reset authority limits the confidentiality
impact, but does not resolve evidence attribution.

Review the blanket prohibition on solving the app's own generated practice
activity. `tutoring.TEACHING` applies it alongside the assignment-reference rule,
including after a learner has attempted the activity. Different examples are
useful, but a stuck learner may also need to compare a worked solution with
their attempt. Decide whether an explicit post-attempt or post-finish comparison
belongs in practice, while keeping uploaded assignments reference-only. This is
a teaching-policy decision; the review leaves the current boundary intact.

History currently lists at most 100 recent sessions. Older retained sessions
remain accessible by saved URL or administrator export; learner pagination is a
bounded follow-up. A selected session still transfers its complete conversation
and repeated passage snapshots, so very long sessions can grow large even after
T50 removes unrelated histories from polling. Measure incremental conversation
loading before extending session limits.

## Optional research and hosting

Any future browser-model experiment requires a named WebGPU device, reviewed
model license, explicit download consent, synthetic questions, latency on first
and repeated runs, storage/memory/battery/temperature measurements and
cancel/unload/delete checks. It is separate text-only research, not a
prerequisite for the core tutor release.

AWS provisioning remains optional. If chosen, review the AMI, network/certificate/
SSM access, retained EBS mount, secret ARN, IAM and budget before applying IaC.
Publishing source does not deploy an application.
