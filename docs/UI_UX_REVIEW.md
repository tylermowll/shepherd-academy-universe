# UI/UX review — October 22, 2026

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
