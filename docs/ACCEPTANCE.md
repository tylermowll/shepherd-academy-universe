# Acceptance evidence and remaining checks

Synthetic tests establish software behavior. Live model quality, learning
outcomes, physical-device behavior and the actual host's recovery procedure need
separate evidence. This checklist does not claim production readiness.

## Current checkpoint

The latest recorded application release is the October 29 learning workbench
from [T83](TASKS.md#t83--redesign-the-active-learning-experience-2026-10-29),
published and privately deployed in
[T84](TASKS.md#t84--publish-and-privately-deploy-the-learning-workbench-2026-10-29).
The learner workspace keeps the task/source readable beside conversation,
preserves photo-reading order and recovery, and shows a saved-work recap on finish.
The earlier adaptive setup, model activation and account corrections remain part
of that application. Their original results are dated history in TASKS.

T84 records deployment of application source `051e4e0` at schema
`0021_published_library`, preserving all 868 public texts and retained accounts,
work and model selections. Its exact candidate passed container smoke, a
HIGH/CRITICAL image scan including unfixed findings, SBOM generation, encrypted
WAL-aware backup/isolated restore, private HTTPS, worker and exact served-asset
checks. This is the last recorded observation, not a new inspection of the host.

Subsequent CI, dependency and documentation updates have their own scope.
In particular, T86's published Python lock refresh was not privately deployed;
release-image results from T84 do not attest to those newer packages.

| Evidence                                                                                                               | Recorded result                                                                                                                                                                                                 | Limits                                                                                                                                                                                            |
| ---------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [T83 workbench](TASKS.md#t83--redesign-the-active-learning-experience-2026-10-29)                                      | 405 backend unit, 365 frontend/component and 11 toolchain tests; 467 integration cases; all 154 unique browser scenarios exercised across the full run and final 20-case affected-flow rerun.                   | The local browser evidence combines runs. It is a focused learner-workspace review, not whole-app accessibility or live-model acceptance.                                                         |
| [T84 publication and private deployment](TASKS.md#t84--publish-and-privately-deploy-the-learning-workbench-2026-10-29) | Hosted checks included a complete 154/154 browser pass, 467 integration cases, mock evaluations, audits and package checks; the exact local release image and private cutover passed the checks above.          | The hosted aggregate was cancelled at its old time limit during cleanup despite executed steps passing. Teaching quality, actual devices and full restored-host sign-in/key recovery remain open. |
| [T85 local-first validation](TASKS.md#t85--make-expensive-validation-local-first-2026-10-29)                           | Local source gates passed; `make verify-local` orders existing release checks. Automatic hosted checks keep source/runtime checks and audits; full hosted validation/packaging requires explicit manual opt-in. | Wiring validation and source checks do not claim a new complete browser/container run or fresh hosted aggregate result.                                                                           |
| [T86 Python patch refresh](TASKS.md#t86--publish-the-maintainers-python-patch-updates-2026-10-29)                      | Source gates, 467 integration cases, four mock suites, dependency audits and file hooks passed.                                                                                                                 | Lock publication only; no private deployment, browser/container rerun or live-provider test.                                                                                                      |

[DEPENDENCIES](DEPENDENCIES.md) owns version policy;
[TASKS](TASKS.md) records actual commands and their evidence limits. The
[current UI/UX record](UI_UX_REVIEW.md) lists corrections and remaining manual work.

## Functional/security mapping

The current product is the multi-subject tutor, with optional exact-math
utilities. Paths below are relative to the repository. The table lists existing
test coverage; it does not report a new test run.

| Current requirement                                                                                                                                                                        | Automated coverage                                                                                                                                                                                         |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Topic-based activities, criteria, explanations, revision and learner-controlled progression                                                                                                | `apps/api/tests/integration/test_tutoring.py`, `test_teaching_memory.py`, `test_teaching_output_boundaries.py`; `tests/smoke/tutor.spec.ts`                                                                |
| Assignment references produce different practice; sufficient work is acknowledged; reassurance does not require another demonstration                                                      | `apps/api/tests/unit/test_teaching_boundaries.py`; teaching memory/output integration tests and adversarial mock fixtures                                                                                  |
| Saved material preserves text unchanged, enforces Unicode limits and source ownership, and keeps guided reading on the selected section; supplied context excludes future sections         | `apps/api/tests/integration/test_reading.py`; `apps/api/tests/unit/test_reading_sources.py`; `tests/smoke/reading.spec.ts`                                                                                 |
| Full photo reading precedes feedback; clear work continues automatically; uncertainty that prevents useful feedback receives specific advice and remains labeled uncertain in conversation | `apps/api/tests/unit/test_images.py`; tutoring integration tests; `tests/smoke/phone-navigation.spec.ts`                                                                                                   |
| Duplicate requests, lost acknowledgments and current-tab/reload recovery preserve work; resolving an absent request blocks delayed acceptance                                              | `apps/api/tests/integration/test_request_recovery.py`; `tests/smoke/request-recovery.spec.ts`                                                                                                              |
| Browser-first owner setup, separate learner sign-ins, revocation and cross-account isolation                                                                                               | `apps/api/tests/integration/test_browser_setup.py`, `test_owner_setup.py`, `test_auth_sessions.py`; `tests/smoke/setup.spec.ts`, `accounts.spec.ts`                                                        |
| Rejected reference-photo discussion stays uncertain; retries reflect current activity/version; age-group corrections preserve history and stop pending work                                | `apps/api/tests/integration/test_tutoring.py`, `test_workflows.py`, `test_learner_accounts.py`; `apps/web/tests/Tutor.test.tsx`, `LearnerAccounts.test.tsx`                                                |
| Saved learning intent guides tutoring; one adaptive form preserves drafts and submits the initial activity atomically; session completion shows saved work                                 | `apps/api/tests/integration/test_learning_intents.py`; `apps/web/tests/Tutor.test.tsx`, `Reading.test.tsx`; `tests/smoke/practice-start.spec.ts`, `tutor.spec.ts`, `reading.spec.ts`, `navigation.spec.ts` |
| History lists summaries without transferring retained conversations; selected work and processing disclosures still refresh                                                                | `apps/api/tests/integration/test_tutoring_history.py`; `apps/web/tests/Tutor.test.tsx`                                                                                                                     |
| Source imports recheck revoked sessions after fetching; expired leases cannot admit model calls, including during request preparation                                                      | `apps/api/tests/integration/test_reading.py`, `test_workflows.py`                                                                                                                                          |
| Local published-library browsing, filters, pagination and immutable selections; optional subject levels survive save/reload and reach tutor prompts                                        | `apps/api/tests/integration/test_published_library.py`, `test_learning_levels.py`; `tests/smoke/library-levels.spec.ts`                                                                                    |
| Backend enforces provider capability, audience and cloud policy; safe failures and no automatic cloud fallback                                                                             | `apps/api/tests/unit/test_provider_contracts.py`, `test_provider_execution.py`; `apps/api/tests/integration/test_provider_connections.py`                                                                  |
| Retention, deletion, authenticated exports, migration integrity and deletion records reapplied on restore                                                                                  | `apps/api/tests/integration/test_retention_recovery.py`, `test_db_foundation.py`, `test_workflows.py`                                                                                                      |
| Public-only PWA caches, account transitions and updates that defer while commands are pending                                                                                              | `tests/smoke/bootstrap.spec.ts`, `navigation.spec.ts`, `request-recovery.spec.ts`; frontend App/UpdateNotice tests                                                                                         |

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
   retention. Recorded encrypted backup/isolated-restore checks establish their
   documented archive, schema and content guarantees; they do not establish a
   complete restored host with fresh sign-ins and saved-key recovery from
   separately retained operational copies.

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
