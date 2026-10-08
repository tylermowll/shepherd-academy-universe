# Current handoff

The local administrator account exists. Open the app address and sign in;
first-account setup is finished. The `shepherd-academy-universe` Compose project
runs one API and one worker against the retained database in this checkout.

T42 adds reading passages separate from questions: pasted text, photographs,
original AI writing and selected published story/news imports. Guidance and
Next/Easier/Harder retain the passage across reload and History. Published text
has attributed previews and bounded fetching; homework remains reference-only.
The original reading evaluation exercises production guidance and generation
contracts and leaves teaching quality to human review. Release commit `1800536`
is on `main`, and the existing local installation has been updated to migration
`0018_reading_passages` with its data and settings retained. The reviewed image
passed the container smoke test and a clean HIGH/CRITICAL security scan; HTTPS
readiness and the served reading UI were verified after deployment.
Exact validation and remaining gates are in [TASKS](TASKS.md).

T41 is the preceding tested increment, covering recoverable tutor/provider saves,
usable conversation space, account handoffs and Docker host-model routing.
Its local evidence includes 194 backend unit, 162 frontend, 267 integration and
66 desktop/mobile browser checks. T40's signup/Settings fix remains covered.

For a fresh installation, the private owner link exchanges once for an eight-hour
HttpOnly setup cookie. Setup survives refreshes and API restarts with the same
secret; the cookie grants no normal account access. App updates defer their
refresh action until signup finishes. `make start` connects to the standard
running Docker API and prints a setup link only when no administrator exists.
It cannot reset an account. D014 records the setup contract.

The app is a multi-subject AI tutor. Learners sign in with individual usernames
and passwords, choose a topic and work through a conversation. Photo reading
appears before feedback; clear readings continue automatically. Unreadable work
receives specific clarification advice. Assignments provide reference material
for distinct practice and explanations, never answers to the active task.
There is no fixed activity catalog or photo approval step in this workflow.

The administrator manages learner accounts and AI connections. Administrators
who want to study create a separate learner account. Saving a connection does
not test or activate it. Synthetic connection tests and active-model selection
require separate actions in Settings. Provider routing, audience and ownership
remain enforced by the backend.

Live model quality, physical phone camera/install/update behavior, manual
accessibility checks and browser-model device measurements remain unverified.
Use [ACCEPTANCE](ACCEPTANCE.md) for these gates,
[PROVIDER_STATUS](PROVIDER_STATUS.md) for provider evidence, and
[RUNBOOK](RUNBOOK.md) for operation and recovery. Passing synthetic tests does
not establish model quality or production readiness.

Continue with one bounded task at a time. Preserve private settings and learner
data, regenerate API clients from backend schemas when contracts change, and
run the applicable Make gates. The current implementation has no legacy startup
path or development-schema compatibility bridge. Historical task evidence stays
in TASKS and architecture decisions stay in [DECISIONS](DECISIONS.md).
