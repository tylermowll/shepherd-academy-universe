# UI/UX review — October 22, 2026

Latest review: [October 23 whole-application review](#october-23-2026--whole-application-review).
Correction status: [T67 remediation](#october-23-2026--t67-remediation).
The October 22 sections below retain T65's historical corrections and evidence.

[T65](TASKS.md#t65--review-and-preserve-administrator-work-across-navigation-2026-10-22)
applies the repository's [UI/UX review skill](../.agents/skills/ui-ux-review/SKILL.md)
to administrator and learner workflows, then corrects the confirmed administrator
navigation issue. This is a dated review with explicit coverage limits, not a
claim of accessibility conformance or release readiness.

## Findings and correction

1. **High: ordinary navigation discarded administrator work.** At baseline
   `8ce3b91`, [App](../apps/web/src/App.tsx) conditionally mounted AdultPanel with
   `key={page}`. Help removed it; changing Learners/Settings remounted it. Local
   account fields, connection entries and completion/error context disappeared.
   A synthetic browser reproduction confirmed the Add learner form was gone after
   **Help → Settings → Learners**. This was observed behavior; other affected
   administrator forms were initially identified through source inspection.

   The connection editor also said leaving Settings discarded entries and the
   API key, conflicting with README/Help's page-switch retention promise. The
   correction preserves visited administrator panels in account-scoped memory,
   hides inactive panels, and corrects that copy. Data & privacy also stays
   mounted across Settings subtab changes. Pending operations keep their outcome
   context across ordinary page navigation. Learners still mounts lazily, and
   selecting another learner retains the existing component-reset boundary.

2. **Medium: administrator operations lacked refresh protection.** Baseline
   [App](../apps/web/src/App.tsx) deferred updates for setup and learner work and
   guarded browser unload for learner work, but omitted administrator operations. The correction
   counts overlapping actions, includes them in pending update/unload protection,
   and resets the count when accounts change. Earlier account completions cannot
   clear the current account's busy state. The update confirmation now explicitly
   warns that unsaved forms will be lost.

3. **Low: a learner notice could appear above administrator management.** This
   was already recorded as a T64 follow-up. Shared notices in
   [LearnerAccounts](../apps/web/src/LearnerAccounts.tsx) survived selecting
   **Manage administrator**. Explicit account-management selection now clears
   notices from the previous selection; ordinary Help/Settings navigation retains
   the relevant outcome.

An initial suspicion about stale browser lists was withdrawn after tracing
AdultPanel's existing selected-learner React key, which resets the device state.
No device-list correction was needed. No additional blocker was established from
the inspected learner, photo, History, Help or recovery source.

## Baseline workflow coverage

Every row below is **source-only at `8ce3b91`**. The review considered usability,
semantic accessibility and wording, including normal, empty, pending, failure
and recovery states where implemented. Browser, viewport and input method were
**not exercised for these rows**; existing tests and responsive styles supplied
source evidence only. The separate synthetic reproduction above confirms one
administrator transition and does not turn this matrix into a whole-app browser
audit. Source links open current files; the baseline revision identifies the
reviewed implementation.

| #   | Role, workflow, goal and entry                               | States inspected                                                                                     | Baseline source evidence                                                                                                                                                                                                        |
| --- | ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Operator: create first administrator; setup entry            | Invalid/expired link, validation, pending creation, lost receipt, Help/return                        | [Setup](../apps/web/src/Setup.tsx), [App](../apps/web/src/App.tsx): field errors, identity recovery and setup update deferral.                                                                                                  |
| 2   | Guest: role-specific sign-in; learner/administrator URLs     | Account list loading/empty/error, manual entry, pending/failed login, recovery                       | [SignInAccounts](../apps/web/src/SignInAccounts.tsx), App: labels/autofill, distinct headings and retained workspace after failure.                                                                                             |
| 3   | Signed-in user: switch, cancel, return or sign out; masthead | Failed/wrong-role login, successful clearing, Back/Forward, authentication loss                      | App, [navigation](../apps/web/src/navigation.ts): account-version reset; administrator draft issue above.                                                                                                                       |
| 4   | Administrator: create/select learner; Learners               | Empty household, add/cancel, username/password/age, pending/save failure                             | [LearnerAccounts](../apps/web/src/LearnerAccounts.tsx): native field constraints; navigation lost local form state.                                                                                                             |
| 5   | Administrator: change learner details/age; selected record   | Rename, unchanged/reset password, age correction, pending/error                                      | LearnerAccounts: revocation/cancellation consequences and history-preserving wording; draft issue above.                                                                                                                        |
| 6   | Administrator: change own password; Manage administrator     | Confirmation mismatch, API error, pending/success, navigation                                        | [AdministratorAccount](../apps/web/src/AdministratorAccount.tsx): labeled autofill and status/alert; draft/outcome and refresh findings above.                                                                                  |
| 7   | Administrator: manage signed-in browsers; selected record    | Loading/empty, refresh/error/retry, one/all revocation, selection change                             | AdultPanel's learner key resets state; LearnerAccounts cancels obsolete fetch effects.                                                                                                                                          |
| 8   | Administrator: export/delete learner; selected record        | Download/error, named irreversible confirmation/cancel, post-delete selection                        | LearnerAccounts: explicit scope and provider/backup limits; backend guarantees were not re-audited.                                                                                                                             |
| 9   | Administrator: save/manage Connections; Settings             | Add/edit/cancel, write-only key actions, changed destination, save/refresh failure, read-only/delete | [ProviderConnections](../apps/web/src/ProviderConnections.tsx): saving/testing/activation distinct; draft-copy conflict above.                                                                                                  |
| 10  | Administrator: set Data & privacy; Settings                  | Cloud/audience choice, server/demo locks, failed save, disclosures                                   | ProviderConnections: explicit policy and local-reader/cloud-tutor explanation; conditional form lost subtab drafts.                                                                                                             |
| 11  | Administrator: test connections; Settings                    | Explicit sample-call/cost authorization, blockers, pending/failure/history/refresh                   | ProviderConnections: diagnostic and capability states inspected; no provider probe performed.                                                                                                                                   |
| 12  | Administrator: choose Active models; Settings                | Independent roles, unavailable choice, blocker links, acknowledgement/save/success, load/retry       | [AdultPanel](../apps/web/src/AdultPanel.tsx): dirty route choices survive refresh within the mount; navigation/refresh findings above.                                                                                          |
| 13  | Learner: start practice; Practice                            | Purpose/input, difficulty/initiative, topic limits, unavailable/mock/pending                         | [PracticeSource](../apps/web/src/PracticeSource.tsx), [Tutor](../apps/web/src/Tutor.tsx): native controls and labeled synthetic limits.                                                                                         |
| 14  | Learner: supply material; Practice source controls           | Paste/photo/generated/published, oversized draft, preview/attribution/import error                   | Tutor, [ReadingSources](../apps/web/src/ReadingSources.tsx), [ReadingPassage](../apps/web/src/ReadingPassage.tsx): assignment-reference and data-sharing distinctions.                                                          |
| 15  | Learner: pace/navigate reading; passage/sidebar              | Whole/sections, saved position, draft guard, selected-text help/overflow, context-limit recovery     | [MaterialNavigation](../apps/web/src/MaterialNavigation.tsx), ReadingPassage, Tutor: editable staged question and keyed activity state.                                                                                         |
| 16  | Learner: submit work, discuss and progress; conversation     | Goal/criteria, send/help/revise, reading/tutoring, next/easier/harder, draft guards                  | [ActivityPurpose](../apps/web/src/ActivityPurpose.tsx), [TutorConversation](../apps/web/src/TutorConversation.tsx), [ComposerMenu](../apps/web/src/ComposerMenu.tsx): reading before feedback, semantic log, AI-not-grade copy. |
| 17  | Learner: finish/review/continue; Practice/History            | Finish guards, recap, uncertainty, empty/recent list, owned session selection                        | [SessionReview](../apps/web/src/SessionReview.tsx), Tutor: 100-session limit disclosed; pagination is an existing acceptance gap.                                                                                               |
| 18  | Learner: prepare/submit photo; attachment controls           | File/drop, size/format error, preview, rotation/range crop/remove, pending/retry                     | [PhotoInput](../apps/web/src/PhotoInput.tsx): labeled native controls and in-memory draft signals; no camera/image operation exercised.                                                                                         |
| 19  | Learner: respond to photo reading; conversation              | Automatic useful reading, blocking uncertainty, typed correction/retake, uncertain discussion        | TutorConversation, Tutor: server `can_continue` governs advancement; no approval gate; rejected readings remain labeled.                                                                                                        |
| 20  | Learner/phone: hand off one upload; QR/photo page            | Create/new/cancel/expiry, loopback guidance, receipt, offline/background/expired recovery            | [PhoneLink](../apps/web/src/PhoneLink.tsx), [PhoneCapture](../apps/web/src/PhoneCapture.tsx), [Entry](../apps/web/src/Entry.tsx): token-scoped receipt flow; physical device behavior untested.                                 |
| 21  | All roles: find Help and return; contextual/full Help        | Deep links, Back/reload, role-specific recovery, setup/provider/privacy advice                       | [Help](../apps/web/src/Help.tsx), App: focused topic heading; draft-retention copy conflict above.                                                                                                                              |
| 22  | Learner: recover interrupted work; Practice notices          | Pending/failure/lost receipt, check/resolve, same-request retry, per-tab limits                      | [request-recovery](../apps/web/src/request-recovery.ts), Tutor, PhotoInput: identifier-only receipts and explicit no-replay wording.                                                                                            |
| 23  | All roles: offline/PWA/update; global notices                | Offline limits, reconnect, content clearing, waiting update, pending/draft warning                   | App, [UpdateNotice](../apps/web/src/UpdateNotice.tsx): explicit confirmation; administrator pending omission above; built caches not exercised.                                                                                 |

Optional browser-model Research is outside this review. Specification-only
administration/evaluation dashboards were not presumed implemented.

## Independent implementation review

A separate source review examined App, AdultPanel, ProviderConnections,
LearnerAccounts, UpdateNotice and the new component/browser regressions. It found
no production blocker in the reviewed correction. Account-version remounting and
client generation checks still clear hidden content after account replacement or
authentication loss and reject stale responses. Native `hidden`, reinforced by
the existing stylesheet, excludes inactive controls from rendering. Lazy Learners
mounting avoids initial hidden device requests; active-state checks preserve the
existing delayed add/delete selection behavior. This review did not execute
tests or establish screen-reader behavior.

## Deliberate limits and remaining checks

Drafts remain in memory; reload, close, sign-out and successful account replacement
clear them. Idle administrator drafts do not gain a new browser-unload guard;
the explicit update confirmation warns about unsaved forms. Authoritative policy
changes reset the keyed privacy form, and returning to Settings resets active-model
authorization acknowledgement. These boundaries avoid retaining stale consent.
No credentials or drafts are added to browser storage.

[ACCEPTANCE](ACCEPTANCE.md#items-requiring-the-maintainer) still owns physical
iPhone Safari/Android camera/HEIC and installed-PWA/background checks, actual
200% zoom and assistive-technology review, live model selection/teaching review,
and complete host recovery. Existing History pagination/large conversations,
administrator authorship and teaching-policy decisions remain separate. Source,
Chromium emulation and mock results cannot establish these outcomes. No contrast
ratio or WCAG failure is asserted from CSS alone.

## Verification evidence

Baseline source inspection used read-only Git, `rg`, `cat` and `sed` against
public source/docs/tests. The synthetic pre-fix browser reproduction observed the
missing Add learner form after Help → Settings → Learners. No private
configuration, private logs, real learner data or live providers were accessed
for this review.

The correction in `4151794` passed `make check`: 329 backend unit tests, 11
toolchain tests, 252 component tests, lint, formatting, types, build, generated
contract checks, credential scan and infrastructure lint. `make test-integration`
passed 403 tests in 71.56 seconds. Six new App regressions cover drafts, delayed
completion, overlapping pending requests, account replacement/authentication loss
and notices associated with the correct management selection.

After building the corrected source, this focused command passed **38 cases in
6.2 minutes**, using one worker, no retries and the real login rate limit:

```bash
pnpm exec playwright test tests/smoke/admin-navigation.spec.ts tests/smoke/accounts.spec.ts tests/smoke/connections.spec.ts tests/smoke/navigation.spec.ts tests/smoke/workspace-navigation.spec.ts
```

Both projects ran: desktop Chromium and Pixel 7 Chromium emulation, with automated
pointer/keyboard actions. The fixture used disposable synthetic accounts and
loopback model responses. All commands ran with environment-file loading disabled,
operator/provider environment settings excluded and cloud inference disabled.
The privacy-draft case unlocked only its synthetic GET response; it asserted no
writes, and neither enabled cloud inference nor changed backend policy. Initial
selector/focus assumptions and that locked-fixture setup were corrected before
the final passing gate; they are not additional product defects.

| Post-fix workflow coverage                                                      | Status and evidence                                                                                                                                                                                                        |
| ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Administrator learner/password drafts, Help and browser Back                    | **Exercised:** new browser cases on both projects retain entered values and selected mode; hidden forms leave visible role queries; heading focus asserted.                                                                |
| Administrator connection credentials and privacy subtabs                        | **Exercised:** both projects retain drafts across subtabs/pages, keep keys masked, perform no writes and leave credentials out of browser storage. Policy interaction uses the explicit synthetic response override above. |
| Sign-in, password change/revocation, provider setup/tests/activation blockers   | **Exercised:** existing account/connection cases on both projects; provider calls target loopback fixtures. No live model or real household account was used.                                                              |
| Role switches, canceled/failed switches, learner drafts, Help/History and focus | **Exercised:** existing navigation/workspace cases on both projects, including saved-session return and clearing on successful account replacement.                                                                        |
| Other workflow states in the baseline matrix                                    | **Source-only for this review:** the focused gate does not establish every state of all 23 groups. Component/integration passes are additional automated evidence, not a complete visual or accessibility audit.           |

All eight new desktop/mobile screenshots were visually inspected. No new
clipping, overlap or exposed credential was observed. An existing layout
limitation appears with the fixture's accumulated learners: the full account list
precedes the mobile editor, placing it several screens below the heading. This
remains a separate mobile-navigation consideration. Screenshots do not establish
contrast, touch-target dimensions, actual zoom, screen-reader announcements or
physical-phone behavior. The manual and live-provider limits above remain open.

After private deployment, two fresh desktop/mobile HTTPS contexts passed
anonymous learner/administrator entry, administrator reload, public Help/topic
navigation, role return and overflow checks. Before navigation, request routing
replaced every account-directory response with a synthetic empty list and blocked
service workers, external destinations, mutations and unexpected APIs. Four
anonymous session reads were allowed; ten account-directory requests were
intercepted before networking. No credentials, login, setup or provider request
was used, and no page error occurred. This verifies public entry behavior, not
authenticated use of the real household installation. T65 records image, backup,
readiness and served-asset verification separately.

## October 23, 2026 — whole-application review

This review applies all three lenses in the repository UI/UX skill: task and
interaction design, accessibility, and interface wording. The reviewed source is
`b593765`; the working tree was clean before the review. The October 22 findings
and corrections above remain historical evidence. This review changes only this
report and TASKS; it does not implement the corrections below.

### Findings, ordered by consequence

1. **High — a removed session link blocks otherwise available learning.**
   Role/workflow: learner, opening Practice from a saved session URL. In
   [Tutor.tsx](../apps/web/src/Tutor.tsx#L188), one `Promise.all` groups session
   history, feature availability and the selected session. A 404 for a removed
   session discards the successful history/features responses. Practice keeps
   saying “Checking tutor availability…” and disables Start session even with a
   topic. Reconnect successfully refreshes authentication but leaves this state;
   History requests the same missing ID again and displays no sessions. Retention
   can normally remove old sessions, so this is a supported lifecycle, not just a
   malformed URL. Expected: explain the unavailable session while keeping History
   and new practice usable. Correct the independent loading/error boundaries,
   clear an unavailable selection/hash, and offer History/New session. Governing
   requirements: SPECIFICATION sections 3, 10 and 12 (retention and recovery).
   **Evidence: reproduced in desktop and mobile Chromium. The owned history contained one saved session; history/features/Reconnect returned 200, the missing session returned 404, and both new practice and the history list stayed unusable.**

2. **Medium — saving active models can erase a newer selection.**
   Role/workflow: administrator, Settings → Active models during a delayed save.
   [AdultPanel.tsx](../apps/web/src/AdultPanel.tsx#L275) leaves both selects and Save
   enabled while POST is pending. Save A, select B before the response, then let
   A finish: completion clears `routesDirty` and the following GET replaces B
   with A. The success notice arrives alongside the lost edit. Expected: a save
   protects its submitted state and preserves or prevents later changes. Use a
   local pending guard and status, or version edits so an older completion cannot
   overwrite them. Governing requirement: SPECIFICATION section 3, honest state
   and in-memory draft behavior. **Evidence: reproduced in both browser projects with one intercepted POST and a delayed response; both selects and Save remained enabled, and B reverted to A. No provider-routing write reached the server.**

3. **Medium — Help links across roles open a different page from their label.**
   Role/workflow: either signed-in role, following a destination in Help.
   Administrator → Help → Practice opens Learners. Learner → Help → Connect an
   AI model → Settings opens Practice. In [App.tsx](../apps/web/src/App.tsx#L126)
   and [Help.tsx](../apps/web/src/Help.tsx#L50), destination-role sign-in is added
   only when an entry flow is already visible. Role coercion then substitutes the
   current workspace. Expected: show the requested role's sign-in while retaining
   the prior workspace/drafts for cancellation. Apply the same role-aware
   navigation used by masthead links, including real hrefs for reload/new tabs.
   This directly conflicts with SPECIFICATION section 3's named Help destinations.
   **Evidence: both directions reproduced in both browser projects, including the incorrect URL query and observed heading.**

4. **Medium — a completed privacy save can be reported as an unsuccessful change.**
   Role/workflow: administrator, Settings → Data & privacy, lost refresh after a
   successful save. [ProviderConnections.tsx](../apps/web/src/ProviderConnections.tsx#L1418)
   handles POST failure and subsequent GET failure in one catch. A confirmed
   successful POST followed by GET 503 displays “Data & privacy could not be
   changed,” with no visible refresh action in that tab. This can leave the
   operator believing cloud permission did not change when the server accepted
   it. Expected: distinguish the saved permission from stale display data.
   Suggested copy: “Data & privacy was saved, but the current settings could not
   be refreshed. Refresh settings to check them.” Add that read-only recovery
   action and keep actual POST rejection wording separate. Governing requirements:
   SPECIFICATION sections 3 and 12; accurate permission disclosures.
   **Evidence: reproduced in both projects using intercepted POST success followed by GET 503. No actual privacy policy was enabled or changed.**

5. **Medium — canceling an old phone link can hide its replacement QR.**
   Role/workflow: learner, Attach photo → phone handoff. Hold cancellation of
   link A, choose New QR code, wait for B, then complete cancellation A. B
   disappears from the computer because [PhoneLink.tsx](../apps/web/src/PhoneLink.tsx#L130)
   unconditionally clears `link`; cancellation never sets the local busy state.
   Expected: cancellation affects A and leaves B visible. Serialize creation and
   cancellation, or clear only the matching canceled link ID. Show cancellation
   status without adding a confirmation gate. Governing requirements:
   SPECIFICATION sections 2, 3 and 10, phone continuity and recovery.
   **Evidence: reproduced in both projects with actual disposable link creation/cancellation and a held DELETE. B appeared, then disappeared after A completed.**

6. **Medium — a photo-only limitation disables Start session without explaining why.**
   Role/workflow: learner, Practice starter with a working text tutor but no
   available photo reader. Selecting reading-photo or assignment-photo input
   disables Start session in [Tutor.tsx](../apps/web/src/Tutor.tsx#L1052).
   The starter never displays the returned `photo_status`; that explanation is
   only rendered inside an existing session's attachments. General Help mentions
   the demo and tutor availability, not this independent photo-reader blocker.
   Expected: show the specific reason near Material input and a usable alternative.
   Suggested copy: “Photo reading is unavailable. Paste the material instead, or
   ask the administrator to select a photo reader.” Prefer the backend's more
   specific safe explanation when available. Governing requirements:
   SPECIFICATION sections 3 and 10, honest unavailable states and recovery.
   **Evidence: reproduced in both projects using a GET-only features override; both photo choices disabled Start without the supplied reason, while topic input still enabled it.**

7. **Medium — valid long names break narrow-screen reflow.**
   Role/workflow: administrator, Learners selected-record heading and Settings
   connection cards. Valid 64-character unbroken names wrap in account-list
   buttons but not the selected learner heading or provider heading. The grid/flex
   children retain their intrinsic widths. Relevant sources:
   [LearnerAccounts.tsx](../apps/web/src/LearnerAccounts.tsx#L272),
   [ProviderConnections.tsx](../apps/web/src/ProviderConnections.tsx#L1033) and
   [styles.css](../apps/web/src/styles.css#L1023). Expected: the heading and related
   controls fit a 320 CSS-pixel viewport without two-dimensional reading. Add
   appropriate `min-width: 0` and wrapping to the affected children/headings.
   Governing requirement: SPECIFICATION section 18 and
   [WCAG 2.2 SC 1.4.10](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html).
   **Evidence: both projects measured a 320px document viewport with learner content 918px wide and connection content 693px wide. Computed provider heading width was 660.3125px with normal wrapping and auto minimum width.**

8. **Medium — enabled placeholder text has insufficient contrast.**
   Role/workflow: learner, empty Topic or learning goal in the Practice starter.
   The displayed 16px/600 placeholder uses a 50% transparent foreground on white.
   Browser-computed colors match in both projects; native browser conversion and
   alpha compositing produce effective RGB `(139, 158, 153)` on `(255, 255, 255)`:
   **2.819:1**, below the 4.5:1 minimum for this text. This is an enabled field,
   separate from the contrast exemption for disabled controls. The rule comes from
   imported Tailwind preflight; [styles.css](../apps/web/src/styles.css#L1) has no
   explicit placeholder override, and [Tutor.tsx](../apps/web/src/Tutor.tsx#L995)
   displays the affected example. Expected: readable examples in empty controls.
   Give placeholders an explicit darker color, such as the existing helper-text
   color, with opacity 1, then remeasure enabled inputs and textareas. Governing
   requirement: SPECIFICATION section 18 and
   [WCAG 2.2 SC 1.4.3](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html),
   which explicitly includes placeholder text.

### Additional source-based concern and design suggestion

The saved review does not expose all the information promised by SPECIFICATION
section 3: assistance, unresolved points and source/version metadata.
[SessionReview.tsx](../apps/web/src/SessionReview.tsx#L9) provides counts and one
last-guidance excerpt; [TutorConversation.tsx](../apps/web/src/TutorConversation.tsx#L153)
labels help generically and its Response details omit available assistance and
open-point fields. The chronological conversation already preserves work, help and uncertainty.
This is a **source-only metadata contract follow-up**, not missing history or a
measured teaching defect. Clarify which detail helps learners review their work,
then expose concise optional assistance/unresolved-point details with AI
observations labeled fallible. Keep implementation-only metadata out of the main
learning flow.

History cards show topic, status and activity count, without a date. Multiple
sessions on the same topic can be hard to distinguish. A saved/last-used date and
more contextual action names are a **design suggestion**, not a demonstrated
completion failure. The existing 100-session pagination limit is a separate,
previously recorded acceptance item.

### Coverage matrix

All 23 workflow groups received source review for usability, semantic
accessibility and wording. “Exercised” below means the specified synthetic
transitions ran in the browser; other states named in that row were inspected in
source and existing tests only. It does not mean every state or every accessibility
criterion passed. Browser/input evidence: installed Chrome 156.0.8078.47,
Playwright 1.64.1, desktop 1280×720 and Pixel 7 emulation 393×727,
automated pointer actions and selected keyboard actions. Dedicated touch-only
journeys were not exercised; mobile contexts emulate touch-capable devices. Menu cases additionally
exercise 320, 375 and 412 CSS-pixel widths; the long-name probe uses 320×800.
No assistive technology or physical touch/camera testing was performed.

| # | Role, workflow, goal and entry | States reviewed | Status and fresh evidence |
| --- | --- | --- | --- |
| 1 | Operator: first administrator; setup URL | Missing/expired permission, validation, pending, reload/restart, lost receipt, Help/update | **Exercised:** `setup.spec.ts`; invalid/expiry variants also source-reviewed. |
| 2 | Guest: learner/administrator sign-in | Name-list loading/empty/failure, manual entry, wrong credentials/role, throttle, recovery | **Exercised:** `accounts`, `navigation`, `workspace-navigation`; directory error/loading variants source-only. |
| 3 | Signed-in roles: switch/cancel/return/sign out; masthead | Back/reload, failed/successful switch, retained/cleared drafts, auth loss | **Exercised:** `bootstrap`, `workspace-navigation`, `navigation`; cross-role Help probe. |
| 4 | Administrator: create/select learner; Learners | Empty, add/cancel, uniqueness/password/age, pending/rejected save | **Exercised:** `accounts`, `admin-navigation`; long-name layout probe. |
| 5 | Administrator: learner details/age; selected account | Rename, unchanged/reset password, age consequences, retained corrections | **Exercised:** rename/password/revocation in `accounts` and age correction in the disposable lifecycle probe; some error variants source-only. |
| 6 | Administrator: own password; Manage administrator | Mismatch/wrong current, pending/success, other-browser revocation, page changes | **Exercised:** `accounts`, `admin-navigation`; some rejection variants source-only. |
| 7 | Administrator: browsers; selected learner | Loading/empty/stale/error, refresh, revoke one/all, selection changes | **Exercised:** all-browser revocation and isolation in `bootstrap`; single-device/error/races source-only. |
| 8 | Administrator: export/delete; selected learner | Scope, download/error, named irreversible confirm/cancel, post-delete selection | **Exercised:** disposable lifecycle probe completed no-store export/download, canceled deletion and confirmed deletion; failure/late-result variants source-only. |
| 9 | Administrator: Connections; Settings | Add/edit/cancel, read-only records, keys/destination, save/refresh failure, enable/delete | **Exercised:** `connections`, `admin-navigation`; long-name probe. Some delete/read-only variants source-only. |
| 10 | Administrator: Data & privacy; Settings | Cloud/audience consent, server/demo locks, drafts, failed save, disclosure | **Exercised:** `connections`, `admin-navigation`; intercepted save/refresh-failure probe. No actual cloud-policy enablement. |
| 11 | Administrator: Connection tests; Settings | Cost/sample consent, blockers, pending/success/failure/history/refresh | **Exercised:** `connections`, with loopback HTTP fixtures. Live providers/teaching not tested. |
| 12 | Administrator: Active models; Settings | Separate roles, capability/policy/test blockers, consent, save/refresh | **Exercised:** `connections`; intercepted delayed-save edit probe. |
| 13 | Learner: start practice; Practice | Topic/purpose/input, difficulty/initiative, empty/overflow/mock/unavailable/pending | **Exercised:** `practice-start`, `tutor`, `reading`; photo-unavailable starter probe. |
| 14 | Learner: supply material; source picker | Paste/photo/generated/published, preview/attribution, Unicode/overflow/import failure | **Exercised:** paste/photo/generated and overflow in `reading`/`tutor`; published network/import states source-only. |
| 15 | Learner: pace/navigate; passage/sidebar | Whole/sections, saved position, current-section next, selection help/draft conflict | **Exercised:** `reading`; model context-limit recovery and some failure variants source-only. |
| 16 | Learner: work/help/progression; composer/log | Goals/criteria, work/question, pending stages, revision/help/next/easier/harder, menus | **Exercised:** `conversation`, `tutor`, `practice-start`, including keyboard Escape/focus and narrow menus. |
| 17 | Learner: finish/recap/History | Finish/draft guards, saved work/guidance, empty/recent list, reopen/failure | **Exercised:** `bootstrap`, `tutor`, `navigation`, `reading`; missing initial session probe. Review detail gap source-only. |
| 18 | Learner: prepare/submit photo; attachments | File/drop, size/format/preview, crop/rotation/remove, preparation/pending/retry | **Exercised:** synthetic file selection/preparation/submission in `tutor`/`bootstrap`; drag/crop/rotation and physical camera/HEIC source-only. |
| 19 | Learner: respond to photo reading; conversation | Reading before guidance, automatic continuation, uncertainty, retake/typed repair/discuss | **Exercised:** `tutor`, `conversation`; mock reports establish orchestration, not handwriting or teaching quality. |
| 20 | Learner/phone: hand off upload; QR/photo URL | Create/replace/cancel/expiry, receipt, offline/background recovery | **Exercised:** `phone-navigation`, `tutor`; delayed cancellation probe. Physical phone/background/device variants untested. |
| 21 | All roles: Help; contextual/full Help | Topics/deep links/Back/reload, role recovery, return to drafts, setup/provider/privacy | **Exercised:** `navigation`, `workspace-navigation`, `admin-navigation`; cross-role destination probe. |
| 22 | Learner: interrupted request recovery; Practice | Lost acknowledgement, check/resolve, throttle/reload, retries and receipt limits | **Exercised:** `request-recovery`, `bootstrap`; remaining retry-budget/backend failure variants source-only. |
| 23 | All roles: offline/PWA/update; global notices | Server unavailable, reconnect, public caches, waiting updates, pending/draft deferral | **Exercised:** `bootstrap`, `setup`; installed-device update/background and actual assistive announcements untested. |

Optional browser-model Research is **outside scope**: it is not mounted in the
current application navigation and was source-inspected only. No model was
downloaded. Usage/evaluation dashboards are specification-only rather than
implemented screens; the skill inventory already records that distinction.

### Commands, measurements and limits

Commands used the temporary isolation runner
`python3 /tmp/shepherd-ux-review-20261023/run.py` as a prefix:

| Command after that prefix | Actual outcome |
| --- | --- |
| `pnpm --filter @math-tutor/web exec node --input-type=module -e 'import {build} from "vite"; await build({envDir:false});'` | Fresh frontend build passed; the existing >500kB JavaScript chunk warning remains. |
| `node scripts/build-pwa.mjs` | Passed; generated the PWA assets for that build. |
| `make smoke-built` | **100 passed in 16.2 minutes**, 50 per project, one worker and zero retries. |
| `pnpm exec playwright test tests/smoke/ui-ux-review-access-probes.spec.ts tests/smoke/ui-ux-review-admin-probes.spec.ts tests/smoke/ui-ux-review-learner-probes.spec.ts` | Initial targeted run: **13 passed, 3 failed in 2.2 minutes**. Both missing-session cases stopped on an overly specific error-text expectation. The mobile long-name case measured overflow, then timed out clicking an unrelated color-capture control in the expanded layout. These failures are retained in the local evidence. |
| `pnpm exec playwright test tests/smoke/ui-ux-review-admin-probes.spec.ts tests/smoke/ui-ux-review-learner-probes.spec.ts --grep 'valid 64-character\|initial missing session'` | **4 passed in 10.4 seconds** after matching the observed safe error text and separating unrelated color capture from the broken layout. All behavior and overflow assertions remained. |
| `pnpm exec tsc --noEmit` | Passed, including the final temporary probe source. |
| `node --input-type=module` with the captured-color canvas measurement supplied on stdin | Passed; browser-native Oklab conversion/compositing plus WCAG relative luminance gave 2.8193524214114105:1. No network navigation. |

`git diff --check` passed for the final documentation changes. Backend unit and
integration suites, `make check`, dependency audits and deployment checks were not
rerun for this documentation-only review. Historical T65 results above are not
reported as fresh results. The synthetic account lifecycle probe completed age
correction, authenticated no-store export/download, canceling deletion and final
deletion in both projects.

The initial sandbox browser attempt could not bind a loopback socket and exited
before tests ran. The same isolated harness subsequently ran with the necessary
socket permission. The temporary runner allowlists ordinary runtime variables,
excludes inherited operator/provider settings, disables uv environment-file
loading and uses temporary caches. Vite built with `envDir: false`, preserving the
checked-in configuration and plugins without reading live environment files.
The fixture uses a disposable temporary SQLite database, mock provider, explicit
cloud disablement and loopback model fixtures. No private installation,
configuration, learner data, uploads or logs were opened.

The targeted probes deliberately assert the observed defective behavior. Their
passing result demonstrates reproduction, not successful desired behavior. Their
temporary source and synthetic artifacts are retained locally under
`/tmp/shepherd-ux-review-20261023`; the probe files were removed from the repository
after execution. No application or permanent test files changed.

The recorded contrast sample is
`oklab(0.329377 -0.0462245 0.00368226 / 0.5)`, placeholder/element opacity 1,
background white, 16px/600. Canvas conversion uses the installed browser's CSS
color parser rather than a guessed Oklab conversion; the recorded ratio uses
sRGB relative luminance. This is a measured defect in one enabled-field style,
not a whole-application contrast pass. Other contrast combinations, all target
sizes, text spacing and every focus/announcement path were not exhaustively
measured.

Screenshots of desktop/mobile account/privacy, conversation/reading, and the
focused unavailable-session/long-name states were visually inspected. The
interaction assertions and measured geometry establish the cited behavior;
screenshots alone do not establish correctness. An independent source sanity
review checked the missing-session setup, both Help directions and the phone
DELETE/replace sequence, and narrowed the recap concern to missing optional
metadata rather than missing conversation history.

Fresh source/browser coverage leaves existing ACCEPTANCE work open: actual
iPhone Safari and Android camera/HEIC, installed PWA and background/reconnect
behavior, 200% browser zoom, text-spacing and assistive-technology checks, accessible
math announcements, actual-model tutoring/handwriting/answer-disclosure quality,
and full host recovery. Existing History pagination/large conversations,
administrator-authorship and teaching-policy decisions, and the already recorded
mobile account-list distance to the editor remain separate follow-ups. No live
or paid provider tests, cloud provisioning, deployment, model downloads or Git push
were performed. This is whole-app source coverage with selected synthetic browser
coverage, not a complete manual accessibility audit or WCAG-conformance claim.

## October 23, 2026 — T67 remediation

[T67](TASKS.md#t67--fix-review-findings-publish-and-deploy-2026-10-23) implements
the eight findings and the two separately recorded follow-ups. T66's findings,
measurements and coverage above describe the reviewed baseline and remain
historical evidence. The corrections passed final gates, were published as
`7ce664b97530e5641cdd5ae8459f82beeabb1bf6` and were deployed to the private
installation on October 23. This section records correction tests separately from
T66's defect-reproduction probes.

| Finding/follow-up | Implemented correction |
| --- | --- |
| 1. Unavailable session URL | Preserve successful availability/history responses, explain the unavailable selection and clear its initial hash; retain the current session/draft and restore its URL after failed navigation. Pending session changes guard text, actions and photo selection. |
| 2. Delayed active-model save | Disable edits/duplicate submission while saving, show pending state and require fresh acknowledgement afterward. |
| 3. Cross-role Help destinations | Clicks and real hrefs request the destination role; cancel returns to the prior workspace, Help topic and drafts. |
| 4. Privacy save followed by failed refresh | State that the permission was saved, prevent another policy submission and offer GET-only Refresh settings recovery. |
| 5. Phone-link cancellation | Serialize creation/cancellation, show cancellation state and clear only the matching canceled link. |
| 6. Unavailable photo input | Show the safe reader status and a pasted-text alternative beside either photo source choice, in starter and material controls. |
| 7. Valid long names | Allow narrow grid children and learner/connection names to wrap. |
| 8. Placeholder contrast | Set an opaque darker placeholder color for inputs and textareas; the desktop enabled-field sample measures 6.3157026914:1 with opaque `#536456` on white. |
| Saved-review metadata | Optional help/open-point disclosures retain fallible AI wording; response prompt version and photo-reading version are available without exposing prompts, private configuration or answer keys. |
| History identification | Show the saved creation date and describe each action with its topic/date context. |

Read-only API creation dates and nullable response versions use existing persisted
records and authorization; no migration or ownership widening was added.
Regenerated OpenAPI/frontend types and API integration tests cover serialization
and cross-learner 404 rejection. Retained older observations remain saved history;
the backend's current-prompt/source filters for teaching evidence are unchanged.

Final verification: targeted API history/metadata checks passed **3 tests in
1.26 seconds**; integration passed **404 tests in 72.38 seconds**. `make check`
was repeated successfully against the exact committed source: **329 backend unit
tests**, **11 toolchain tests** and
**284 frontend tests in 18 files**, plus lint/format, types, build, contract drift,
secret and infrastructure checks. The component regressions cover
delayed selection/save/cancel transitions, retained drafts, photo availability,
review observations and dates. Two old expectations were updated to reflect
guarded History selection and explicit role entry after setup cancellation,
preserving the relevant race/isolation assertions. Targeted lint/types,
repository-file hooks and both dependency audits passed. Four deterministic/mock
evaluation suites passed, with reports in `/tmp/shepherd-t67/mock-reports` and no
checked-in report changes. Focused component counts overlap the full total.

The full built browser suite passed **114 cases in 18.3 minutes** across desktop
and Pixel 7 Chromium emulation. The earlier focused permanent
`tests/smoke/review-fixes.spec.ts` suite passed **14 cases in
2.1 minutes** on desktop and Pixel 7 Chromium emulation. Valid long learner and
connection names kept body/document width within 320px in both projects; the
desktop enabled placeholder sample measured **6.3157026914:1**, `#536456` on white
with opacity 1. These are specific rendered checks, not whole-app contrast or
layout conformance. Ten role-entry, active-model, phone-QR, photo-unavailable and
recovered-session screenshots across both projects were visually inspected.
Visual inspection exposed a mobile active-model receipt whose message became a
narrow, tall column beside unwrapped action buttons. The final correction gives
the message a full row and wraps the actions; the active-model browser case now
asserts that its message spans the toast content at 320px and captures that view.
Targeted formatting and a fresh build passed; both desktop/mobile 320px receipt
checks passed (**2 browser executions in 3.0 seconds**). The full check and
114-case browser results include that correction; focused counts overlap the
full suite. Both corrected 320px receipt screenshots were visually inspected and
show readable full-row messages with wrapped controls. Final credential scanning
and all-files repository hooks passed.

The immutable image passed container smoke, offline encrypted restore and
Trivy 0.76.1 checks with the October 23 database: zero HIGH/CRITICAL vulnerabilities
and zero secrets at all severities. Its CycloneDX SBOM has 52 components. The first
deployment attempt refused a missing deletion ledger before archive/migration/
candidate startup and automatically restored the previous image with HTTPS
verification. A stopped-writer guard then initialized the first empty ledger only
after confirming no recorded deletion history, as RUNBOOK permits. Attempt 2 passed encrypted
backup/isolated restore and cutover without rollback, preserving the original
data mount. SQLite integrity/foreign keys, content/object checksums, deletions,
restored-session revocation and job cancellation passed. Private HTTPS readiness,
six asset hashes, cache/worker scope, three protected 401/no-store responses and
three runtime-documentation 404 responses passed; protected bodies were not read.
Both services retained the exact image with zero restarts and a fresh worker
heartbeat. [T67](TASKS.md#t67--fix-review-findings-publish-and-deploy-2026-10-23)
records the immutable identities, archive checksum, rollback tag and evidence
retention. This documentation update changes no deployed runtime code.

No live-provider acceptance was run, and no private provider configuration or
real learner content/logs was inspected.
Actual phones/camera/HEIC, installed-PWA background behavior, browser zoom,
text spacing, screen readers/accessible math, real tutoring quality and full host
recovery remain in ACCEPTANCE. These corrections do not establish complete
browser-state coverage, WCAG conformance or teaching quality.
