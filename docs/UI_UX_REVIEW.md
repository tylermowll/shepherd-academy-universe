# UI/UX review — current status

T69 implements the seven findings from the October 24 review and the small
activity-generation copy suggestion. All required validation gates passed; the
implementation was published to `main` as `775e6eb`. This file keeps
the current correction record; dated commands, review limits and publication
evidence live in [TASKS](TASKS.md#t69--correct-the-uiux-findings-and-publish-2026-10-24).
Earlier committed reviews remain in Git history; T68's dated findings and commands
are retained in TASKS rather than duplicated here.

## Corrections

| Finding | Current behavior | Regression coverage |
| --- | --- | --- |
| Interrupted request traps the current tab | Text and owned-photo requests share receipt lookup and explicit server resolution. Accepted work is opened without replay; an absent request is blocked against late acceptance before its retained draft/photo is released. | Tutor and PhotoInput component cases; real stale-version/late-original browser flow; existing receipt API integration. |
| Successful administrator change appears to fail | Account creation, credentials, age, deletion and connection actions retain their confirmed receipt. Stale writes stay blocked until GET-only refresh succeeds. | LearnerAccounts/ProviderConnections components and deletion/refresh browser flow. |
| Phone omits downstream text processing | The existing processing label names reader and tutor locations and distinguishes feedback, passage practice and assignment-reference practice. Received receipts remain content-free. | Phone API mixed-route, purpose, private-metadata and receipt tests. |
| Failed History load appears empty | Loading, failed and successfully empty lists have distinct states. Reload saved sessions retries reads while preserving current work. | Tutor component and saved-session browser regressions. |
| Phone task displays raw math and overflows | The companion reuses SafeText in a compact task section, wraps identifiers and bounds intrinsically wide formulas to their own scroll area. | PhoneCapture components and 320px desktop/mobile geometry/math assertions. |
| Reading-section change loses focus | Navigation stays mounted within the current session and restores a useful control after a learner action; polling and hidden pages do not steal focus. | Reading component and keyboard section/pace browser cases. |
| Connection test has no visible progress | Pending status names the connection and tutor/photo-reader stage while keeping previous completed results visible. | Both component test stages and held mock-test browser state. |

Pending or failed generation is labeled Activity preparation instead of displaying
its internal command as learner-authored chat. Failure details and retry/stop
controls remain available; successful internal generation stays hidden.

The implementation uses current APIs and components. No compatibility shims,
new dependencies, migrations, services or provider fallbacks were added. The API
JSON shapes are unchanged. RequestRecovery replaces the separate reload-only
receipt UI and also serves ordinary owned photos; the phone upload token keeps
its independent scope.

## Validation

- `make check` passed: 329 backend unit, 11 toolchain and 305 frontend tests,
  lint/format/types, build, contract drift, credential scan and infrastructure checks.
- `make test-integration` passed all 409 cases on temporary on-disk SQLite databases.
- `make smoke-built` passed all 124 desktop/mobile Chromium cases in 19.3 minutes,
  one worker and zero retries. The 12 focused correction cases also passed; they
  overlap this total.

The existing JavaScript chunk-size warning remains. Exact commands and corrected
test-fixture failures are recorded in T69; no governing assertion was removed.
Tests use temporary synthetic data, mock/loopback providers and explicit environment
isolation. They exercise software behavior rather than actual tutoring quality.
The browser suite exercises setup, separate sign-ins, administration, learning,
reading, photos, Help,
interruption and public-only PWA caches. Dedicated regressions cover each corrected
state; that does not establish every browser/device/accessibility state.

## Remaining acceptance work

[ACCEPTANCE](ACCEPTANCE.md#items-requiring-the-maintainer) remains authoritative:

- Physical iPhone Safari and Android camera/HEIC, trusted private HTTPS, installed
  PWA background/resume and reconnection.
- Actual browser zoom/text spacing, screen-reader announcements and mathematical
  speech, and comprehensive contrast/target-size measurements.
- Exact intended provider/model selection and human review of real tutoring,
  handwriting, sufficient answers, uncertainty and assignment-answer disclosure.
- Full restored-host startup, sign-in and saved-key recovery.

Existing History pagination/large-conversation and administrator-authorship
follow-ups remain separate. Synthetic results do not establish WCAG conformance,
teaching quality or release readiness. This task does not deploy the private app
or authorize live inference.
