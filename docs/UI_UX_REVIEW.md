# UI/UX review — current status

## T83 active learning workbench (2026-10-29)

This focused redesign covers the learner journey from the current activity
through response, guidance, revision, progression and finish. Administration
screens and live teaching quality are outside scope.

**Observed in the rendered baseline:** the activity goal and response criteria
extended beyond a small scrolling activity header on desktop and mobile. The
mobile reply box followed a large empty conversation area. After changing material,
the full material form remained expanded beside the activity. Source and activity
instructions used different constrained reading regions. Existing protections for
photo ordering, draft retention and saved-request recovery were present.

**Design judgments:** equally styled feedback paragraphs obscured their different
purposes; progression above the dialogue was distant from the decision after
reading guidance. A task-centered workbench was selected over a blank-page
chronological notebook (task/source become distant in long dialogue) and a series
of step screens (questions, photo clarification and revision require freer movement).

The implementation gives the current task and source a dedicated reading area,
keeps conversation and entry together, distinguishes feedback sections and places
Next/challenge/Finish after message entry. Native disclosures retain long material
and earlier activities. Explicit response/activity jumps preserve the session URL.
Saved errors, uncertain photo reports and safe retry controls remain in context;
completion gives a saved-work recap without another model call or mastery claim.

| Workflow / learner goal and entry                        | States and evidence                                                                                                                                                                                                                         | Coverage                                                                       |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Start and understand an activity, Practice               | Goal/material defaults and draft retention; full task/criteria; source unavailable and new-activity response cue. Full browser + final focused checks, desktop/mobile, keyboard and 320px.                                                  | Exercised                                                                      |
| Respond, receive guidance, revise and continue, Practice | Typed work, hints/questions, structured guidance, long dialogue and source, latest navigation, draft guards/Clear draft, next/challenge/finish. Final 20 browser cases, component tests and 200% root-font checks.                          | Exercised                                                                      |
| Read supplied/published material, Practice               | Local selection, literal/Unicode limits, faithful selection help, whole/section pacing, saved position and failure recovery. Full desktop/mobile suite; final long-source rendering check.                                                  | Exercised                                                                      |
| Work from a photo, Practice and phone companion          | Clear reading before automatic feedback; rejected readings remain uncertain; source discussion, typed repair, phone upload and revision. Final desktop/mobile mock-worker flows; physical camera excluded.                                  | Exercised                                                                      |
| Wait, stop, retry and recover, Practice                  | Pending/error presentation and keyboard retry through rendering fixtures; real lost receipts, stale-request resolution and duplicate protection in full browser/integration checks. Stop/empty/preparation copy also covered by components. | Exercised (browser, component and API; not every stop transition in a browser) |
| Finish and reopen saved work, Practice → History         | Draft protection, recap, full-width finished conversation, no empty composer, History headings, saved work and failed-list reload. Final desktop/mobile navigation and recap cases; full integration checks.                                | Exercised                                                                      |
| Preserve access and saved-work boundaries                | Account switch/revocation, ownership, public-only cache and pending-update regression checks in the full synthetic suite. This is regression coverage, not an administrator design audit.                                                   | Exercised within scope                                                         |
| Physical devices, screen readers and actual browser zoom | No physical camera/Safari or assistive-technology run. Chromium emulation and root-font resizing have explicit limits.                                                                                                                      | Not reviewed; requires device/manual acceptance                                |

The final source gate passed 405 backend, 365 frontend and 11 toolchain tests;
all 467 integration cases passed. Full browser run: 151/154; final rebuilt affected
flows: 20/20, including the three earlier failures. All 154 unique scenarios were
verified across runs, not in one final uninterrupted suite. Final-source scrolling
reveals typed guidance/errors, preserves photo-reading priority and earlier reading
positions, and marks new activities separately from old guidance.

Exact command chronology and screenshot paths are recorded in
[T83](TASKS.md#t83--redesign-the-active-learning-experience-2026-10-29).
The review is not a whole-app accessibility or release-readiness assessment.

## T76 adaptive learning setup

The maintainer's screenshot shows the first letters clipped in the open
three-choice Practice purpose menu. The form also put difficulty and tutor
style before its main purpose. The approved correction replaces that popup
with seven visible native radio goals, followed by a free-text topic and
relevant material choices on the same form. Difficulty/guidance are optional,
with conversational labels and one selected-style explanation. Source-photo
intake opens inline on the same route after its owned capture activity exists.

Each intent has defined backend instructions and typed saved metadata; material
input remains separate from teaching intent. Photos, request recovery, supplied
sections and distinct homework practice retain their existing boundaries. The
photo input remains mounted during ambiguous receipt recovery, including when
historical skipped capture activities exist.

| Learner workflow                                 | Evidence / coverage                                                                                                                                                                                                 |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Choose a goal, switch material and retain drafts | Exercised: components and desktop/mobile Chromium verify seven goals, conditional inputs, retained topic/text/preferences and one exact start request carrying the selected intent/source.                          |
| Read the choices and use the keyboard            | Exercised: 1280px/320px screenshots inspected; browser geometry checks complete wrapping labels, native keyboard choice and the optional preference disclosure. Actual screen-reader behavior remains untested.     |
| Supply a photo without another setup page        | Exercised: inline intake and desktop/mobile photo progression, reading-before-feedback, uncertain reports and lost-receipt recovery. Components cover historical skipped captures without losing the active upload. |
| Recover or navigate while work is pending        | Exercised: component/API guards and desktop/mobile navigation, draft, request-receipt, account-isolation and public-only cache scenarios. Physical camera and installed-PWA behavior remain separate checks.        |

The final project gate passed 333 backend unit, 328 frontend and 11 toolchain
tests, with all lint/type/build/contract/security checks. All 437 integration
cases passed. Dependency audit passed. The mock evaluation sets passed 33
rational, 12 reading, 12 teaching and four adversarial cases; these establish
software behavior, not model quality.

All **142 unique desktop/mobile browser scenarios** were verified across the
fresh full-suite run and a focused rerun. The full run passed 140 and failed two
retained demo-feedback assertions expecting `Synthetic`. The corrected assertions
require explicit sample/non-assessment text and reject the old revision demand;
the desktop/mobile rerun passed both in 33.7 seconds. Application source and the
matching build were unchanged by that test-only correction. This is not a claim
that one final uninterrupted run passed 142 cases. Earlier stopped-run findings
and exact commands remain in
[T76](TASKS.md#t76--start-learning-with-one-adaptive-form-publish-and-deploy-2026-10-24).

Release source `642a5fb036d89eafa194ef089d53c5d8b6436b75` is published to `main`
and privately deployed. Encrypted WAL-aware backup and isolated restore passed
before activation. Private HTTPS, a fresh worker, all 66 exact served public
assets, protected routes/cache boundaries and runtime restrictions passed;
exactly one API and worker run with zero restarts. The content-free model-selection
digest matches the backup; no migration, reset or inference was performed.

Hosted package job `40144626370` passed package smoke, its HIGH/CRITICAL
vulnerability-scan gate and SBOM generation for the same-source package. The
deployed local image was not separately vulnerability-scanned; the remaining
hosted checks are still running. This is a focused workflow correction. Live
teaching quality, physical devices, screen readers and comprehensive
accessibility acceptance remain unverified.

## T75 model setup and activation

The maintainer's reading-session report exposed two problems: a tested model
was not the active tutor, and the demo presented fixed revision advice as if it
had assessed the answer. A separate synthetic reproduction established that a
stale role editor could overwrite a previously activated tutor.

Settings now has Models and Data & privacy. Each model card combines editing,
explicitly authorized role tests and role-specific activation. Current models
names the authoritative tutor/photo-reader selections. Cards distinguish
passing tests, active roles and edited selections needing reactivation. Saves
include the expected current role, preserve the other role and reject stale
choices; the client checks the saved response before showing success. Drafts,
authorization for charged tests and data-boundary policy remain required. Demo replies
explicitly state that they cannot review the answer and do not demand revision.

The source gate passed 317 frontend, 333 backend unit and 11 toolchain tests;
all 418 integration cases and all 60 affected desktop/mobile browser cases
passed. The source-tested image is privately deployed; encrypted backup/restore,
fresh API/worker readiness and all 66 served assets passed. The intended tested
tutor selection was restored and verified without inference.
[T75](TASKS.md#t75--unify-model-setup-protect-activation-and-deploy-2026-10-24)
records exact commands and remaining evidence. No live teaching-quality,
physical-device or screen-reader acceptance is claimed.

## T73 account-management naming

The maintainer identified a misleading page title missed by the previous review:
Learners included the administrator account. The shared tab, heading and document
title now say Users, and its introduction covers both account roles. Help and
Settings links use the same label. Administrator and Learners remain explicit
role groups, and Add learner account names the role it creates. Existing account
selection, authentication, ownership and password behavior remains required.

The focused correction passed the project gate (315 frontend, 329 backend unit
and 11 toolchain cases), plus all 26 affected desktop/mobile browser cases in
5.1 minutes. Those cases verify both account groups, administrator identity during
learner management, correct password editors and Help/recovery/navigation labels.
The source-tested image is privately deployed behind the existing address;
encrypted backup/restore, HTTPS/worker readiness and all 66 exact public assets
passed. Hosted CI is pending; no new whole-app or physical-device review is claimed.

[T73](TASKS.md#t73--name-the-shared-account-management-page-users-2026-10-24)
records the focused correction's validation and deployment evidence. This does
not claim a new whole-application audit.

## T72 control sizing and action placement

The maintainer's focused visual review identified bulky controls and competing
actions. Desktop buttons now use a tighter line height, smaller padding and
lighter secondary styling; coarse-pointer buttons and navigation retain at least
44px height. Secondary mobile actions keep natural widths. The sign-in form is
centered and capped at 480px, and header/navigation spacing is reduced.

Practice now keeps Next activity and Finish session in an Activity controls
group beside the current activity, outside its collapsible details and the
message form. Attach photo, Help and Send stay beside message entry. Finish
remains available for idle reference/generation steps; unsent drafts and pending
work continue to prevent conflicting activity/session changes. Menu exclusivity,
outside dismissal, Escape focus and keyboard outlines remain required.

The photo panel is bounded to the conversation area so it cannot cover activity
or message controls. Explicit opening focuses its labelled region; hiding it
preserves the photo draft and background refresh does not steal focus.

Final validation passed the project gate (315 frontend, 329 backend unit and 11
toolchain tests), 409 integration cases and all 136 desktop/mobile browser cases
in 21.3 minutes. Browser assertions cover 320px reflow, coarse-pointer targets,
natural secondary widths, conversation space, panel bounds and pointer access,
keyboard menus, draft guards and the full existing workflows. The tested image
is privately deployed; encrypted backup/restore, readiness and all 66 exact
served public assets passed. Initial layout/test-fixture failures and their
corrections are preserved in T72's dated evidence.

Publication and private deployment evidence is recorded in
[T72](TASKS.md#t72--refine-control-sizing-and-action-placement-publish-and-redeploy-2026-10-24).
The prior T71 sign-in corrections below are preserved in this publication.
This is a focused control/layout refinement. Existing physical-device,
assistive-technology and teaching-quality acceptance work remains open.

## T71 sign-in correction

The maintainer's landing-page report identified gaps missed by the previous
reviews: a credential error offered Reconnect, the account chooser competed with
an editable autofilled Username, and repeated headings obscured the form. The
existing browser tests explicitly expected both account controls and did not
check whether credential-error recovery addressed the actual failure. Passing
those checks did not establish a coherent sign-in experience.

T71 replaces duplicate entry with one Account selector, keeps manual Username
only for a failed directory request, removes repeated form headings, and puts
actionable sign-in failures beside the Password field. Sign in retries the
requested action; incorrect credentials do not reload the session. Expired
sign-in permission needs its own refresh before retry, rather than displaying
internal validation language. Existing workspace and draft isolation remain
required. The earlier operational password reset affected only the administrator;
the requested active-account recovery is recorded separately in TASKS.

Focused coverage and final browser/private-update evidence are recorded in
[T71](TASKS.md#t71--correct-account-sign-in-and-household-credential-recovery-2026-10-24).
This is a focused access-flow correction, not a new whole-application audit.

| Workflow and goal                                           | States and review lenses                                                                                                                   | Evidence / coverage status                                                                                                                                                                                                               |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Guest learner/administrator selects an account and signs in | Loading, empty, failed directory, password rejection, throttling, network/server error; clear language and one authoritative account field | Exercised: component tests; desktop/mobile Chromium directory, credential and connection journeys. Throttle/server wording also covered by components. Actual installed HTTPS credential verification passed for both existing accounts. |
| Guest retries an expired sign-in form                       | Refresh only expired sign-in permission, then retry selected credentials without unrelated recovery controls                               | Exercised: component request ordering and refresh-failure retry; real API 403 then explicit successful recovery in desktop/mobile Chromium.                                                                                              |
| Current account opens another role's sign-in                | Failed credentials or role, Help, cancel and successful replacement; prior work remains until valid replacement                            | Exercised: components and desktop/mobile browser draft/role-switch journeys.                                                                                                                                                             |
| Keyboard user completes entry                               | Account selection retains focus, Tab reaches Password then Sign in, errors describe the field and focus recovery                           | Exercised: component and desktop/mobile Chromium keyboard/focus assertions. Screen-reader behavior remains unreviewed.                                                                                                                   |
| Saved work survives offline/reload and explicit app update  | Public-only shell cache, selected account and password retained until explicit refresh                                                     | Exercised: desktop/mobile browser offline, reload, cache and explicit-refresh cases.                                                                                                                                                     |

Final `make check` passed 315 frontend, 329 backend unit and 11 toolchain tests;
409 integration cases passed. The initial focused browser run passed 54 cases;
six stale-copy/loading-fixture failures were corrected and rerun successfully
within the final 20-case run (3.1 minutes, zero retries), including two new expiry
cases. This covers 62 distinct affected desktop/mobile cases across the two
runs. The final image's 66 served public assets and installed HTTPS sign-in for
both existing accounts were verified. No full browser-suite result is claimed.

Physical password-manager/autofill behavior, screen readers and real phones have
not been exercised by this correction. Existing acceptance work below remains.

## T69 correction record

T69 implements the seven findings from the October 24 review and the small
activity-generation copy suggestion. All required validation gates passed; the
implementation was published to `main` as `775e6eb`. This file keeps
the current correction record; dated commands, review limits and publication
evidence live in [TASKS](TASKS.md#t69--correct-the-uiux-findings-and-publish-2026-10-24).
Earlier committed reviews remain in Git history; T68's dated findings and commands
are retained in TASKS rather than duplicated here.

## Corrections

| Finding                                         | Current behavior                                                                                                                                                                                                             | Regression coverage                                                                                                    |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Interrupted request traps the current tab       | Text and owned-photo requests share receipt lookup and explicit server resolution. Accepted work is opened without replay; an absent request is blocked against late acceptance before its retained draft/photo is released. | Tutor and PhotoInput component cases; real stale-version/late-original browser flow; existing receipt API integration. |
| Successful administrator change appears to fail | Account creation, credentials, age, deletion and connection actions retain their confirmed receipt. Stale writes stay blocked until GET-only refresh succeeds.                                                               | LearnerAccounts/ProviderConnections components and deletion/refresh browser flow.                                      |
| Phone omits downstream text processing          | The existing processing label names reader and tutor locations and distinguishes feedback, passage practice and assignment-reference practice. Received receipts remain content-free.                                        | Phone API mixed-route, purpose, private-metadata and receipt tests.                                                    |
| Failed History load appears empty               | Loading, failed and successfully empty lists have distinct states. Reload saved sessions retries reads while preserving current work.                                                                                        | Tutor component and saved-session browser regressions.                                                                 |
| Phone task displays raw math and overflows      | The companion reuses SafeText in a compact task section, wraps identifiers and bounds intrinsically wide formulas to their own scroll area.                                                                                  | PhoneCapture components and 320px desktop/mobile geometry/math assertions.                                             |
| Reading-section change loses focus              | Navigation stays mounted within the current session and restores a useful control after a learner action; polling and hidden pages do not steal focus.                                                                       | Reading component and keyboard section/pace browser cases.                                                             |
| Connection test has no visible progress         | Pending status names the connection and tutor/photo-reader stage while keeping previous completed results visible.                                                                                                           | Both component test stages and held mock-test browser state.                                                           |

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
teaching quality or release readiness. [T70](TASKS.md#t70--deploy-the-uiux-corrections-2026-10-24)
records the subsequent private deployment; live inference acceptance remains open.
