# Current handoff

The local administrator account exists. Open the app address and sign in;
first-account setup is finished. The `shepherd-academy-universe` Compose project
runs one API and one worker against the retained database in this checkout.

T43 adds shared teaching criteria and evidence-linked observations across subjects,
plus guided sections and whole-text study for supplied material up to 50,000
characters. Reading pace, activity difficulty and help are separate controls.
Goals and sufficient-response criteria are visible; selected text can prepare a
question without sending it. Source text and section focus survive History and
reloads. T42's pasted/photo/AI-written/published sources remain supported;
homework remains reference for distinct analogous practice.

The retained installation is now at migration `0019_teaching_observations`.
API and worker run image
`sha256:1abafa0262c72d379a81a365a7215a58ccfe1f328b44961783e97d5ecf9c695a`.
The previous image and a stopped-writer recovery archive are retained outside Git.
Local gates passed: 255 backend unit, 180 frontend, 310 integration and 74
desktop/mobile browser checks, mock evaluations, hooks, dependency audits,
container smoke and a clean HIGH/CRITICAL image scan. HTTPS readiness and the
exact served section-navigation UI bundle were verified after the update.
Exact commands, recovery paths and remaining gates are in [TASKS](TASKS.md).

Open [the private app](https://zoopa-a-boop.taile8325e.ts.net) from its Tailscale
network. The post-update active tutor is **mock**. An administrator must run a
fresh tutor test under **Settings → Connection tests**, then select that
connection under **Active models**, for meaningful learner feedback. T43's new
response contract invalidates older tutor tests; photo-reader tests are unchanged.
No private setting or selected provider was changed during this update.

Eleven fresh Muse Spark CLI responses provide a small qualitative teaching pilot,
with clearer sufficiency handling and direct explanations, plus remaining
progression and unnecessary-demand concerns. Read the
[recorded exchanges and limitations](../evals/reports/teaching-muse-2026-10-08.md).
The CLI rehearsal is separate from the app's HTTP provider and browser/worker
path. Independent learning outcomes and actual installed-provider quality are
unmeasured; structured observations do not establish mastery or verified grades.

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

Broader live model quality, physical phone camera/install/update behavior, manual
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
