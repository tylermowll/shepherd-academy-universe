# Acceptance evidence and remaining checks

Synthetic tests establish software behavior. Live model quality, learning
outcomes, physical-device behavior and the actual host's recovery procedure need
separate evidence. This checklist does not claim production readiness.

## Current checkpoint

The tutor is implemented through T44. The following results are dated evidence,
not a claim about the current installation or live model quality:

| Evidence                                                                                        | Recorded result                                                                                                                                                                                                                                 | Limits                                                                                                                                        |
| ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| [October 17 publication checks](TASKS.md#publication-checks-2026-10-17)                         | 291 backend unit, 11 toolchain, 188 component, 340 integration and 80 desktop/mobile browser tests passed with the refreshed Python lock, including Pillow 13.0.0. Source/build/contract checks, mock evaluations and dependency audits passed. | Browser tests used Chrome 155 through the supported executable override. Local container packaging and live-provider quality were not tested. |
| [October 11 private deployment](history/TASKS.md#release-publication-2026-10-11)                | Source `e9bf42c` deployed at `0020_request_recovery`; HTTPS readiness, served assets, cache headers and protected endpoints checked.                                                                                                            | Provider selections and live inference were not inspected or tested.                                                                          |
| [October 10 phone layouts](history/TASKS.md#private-deployment-and-phone-layouts-2026-10-10)    | 40 mobile Chromium tests and six additional synthetic phone flows passed.                                                                                                                                                                       | Emulation does not establish physical camera, Safari, installation or manual accessibility behavior.                                          |
| [October 10 offline restore](history/TASKS.md#offline-development-restore-rehearsal-2026-10-10) | Encrypted backup/restore, wrong-passphrase rejection, database integrity, migration, session/job cleanup and retained-object checks passed on disposable copies.                                                                                | The deletion ledger was empty; separately retained settings/secrets, restored startup and sign-in were not tested.                            |

Publication checks validate the refreshed lockfile; they do not update the
private deployment record or establish model quality. See
[DEPENDENCIES](DEPENDENCIES.md) for version ownership and [TASKS](TASKS.md) for
commands and evidence limits.

## Functional/security mapping

The current product is the multi-subject tutor, with optional exact-math
utilities. Paths below are relative to the repository. The table lists existing
test coverage; it does not report a new test run.

| Current requirement                                                                                                                                                                        | Automated coverage                                                                                                                                  |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Topic-based activities, criteria, explanations, revision and learner-controlled progression                                                                                                | `apps/api/tests/integration/test_tutoring.py`, `test_teaching_memory.py`, `test_teaching_output_boundaries.py`; `tests/smoke/tutor.spec.ts`         |
| Assignment references produce different practice; sufficient work is acknowledged; reassurance does not require another demonstration                                                      | `apps/api/tests/unit/test_teaching_boundaries.py`; teaching memory/output integration tests and adversarial mock fixtures                           |
| Saved material preserves text unchanged, enforces Unicode limits and source ownership, and keeps guided reading on the selected section; supplied context excludes future sections         | `apps/api/tests/integration/test_reading.py`; `apps/api/tests/unit/test_reading_sources.py`; `tests/smoke/reading.spec.ts`                          |
| Full photo reading precedes feedback; clear work continues automatically; uncertainty that prevents useful feedback receives specific advice and remains labeled uncertain in conversation | `apps/api/tests/unit/test_images.py`; tutoring integration tests; `tests/smoke/phone-navigation.spec.ts`                                            |
| Duplicate requests, lost acknowledgments and reloads preserve the learner's work; resolving an absent request blocks its delayed acceptance                                                | `apps/api/tests/integration/test_request_recovery.py`; `tests/smoke/request-recovery.spec.ts`                                                       |
| Browser-first owner setup, separate learner sign-ins, revocation and cross-account isolation                                                                                               | `apps/api/tests/integration/test_browser_setup.py`, `test_owner_setup.py`, `test_auth_sessions.py`; `tests/smoke/setup.spec.ts`, `accounts.spec.ts` |
| Backend enforces provider capability, audience and cloud policy; safe failures and no automatic cloud fallback                                                                             | `apps/api/tests/unit/test_provider_contracts.py`, `test_provider_execution.py`; `apps/api/tests/integration/test_provider_connections.py`           |
| Retention, deletion, authenticated exports, migration integrity and deletion records reapplied on restore                                                                                  | `apps/api/tests/integration/test_retention_recovery.py`, `test_db_foundation.py`, `test_workflows.py`                                               |
| Public-only PWA caches, account transitions and updates that defer while commands are pending                                                                                              | `tests/smoke/bootstrap.spec.ts`, `navigation.spec.ts`, `request-recovery.spec.ts`; frontend App/UpdateNotice tests                                  |

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

## Optional research and hosting

Any future browser-model experiment requires a named WebGPU device, reviewed
model license, explicit download consent, synthetic questions, latency on first
and repeated runs, storage/memory/battery/temperature measurements and
cancel/unload/delete checks. It is separate text-only research, not a
prerequisite for the core tutor release.

AWS provisioning remains optional. If chosen, review the AMI, network/certificate/
SSM access, retained EBS mount, secret ARN, IAM and budget before applying IaC.
Publishing source does not deploy an application.
