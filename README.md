# Shepherd Academy Universe

A self-hosted, multi-subject AI tutor. Choose a topic, receive an activity, work
on paper or type a response, and get guidance on your work. Revise, ask questions,
and choose the next activity. Math, writing, reading, history, social studies,
science and custom topics are supported without a required grade level or fixed
activity catalog.

The app shows what it read from a photo before giving feedback. If enough of the
work is readable, feedback follows automatically. Otherwise, the app explains
what needs a clearer photo or clarification. Uploaded or pasted assignments help
the tutor choose concepts and create different practice; it does not complete
the assignment.

## Current status

The application is implemented through **T44**. Model selection and teaching
quality, checks on real phones, accessibility and backup recovery still need
[release review](docs/ACCEPTANCE.md). Passing automated tests or a connection
test does not establish teaching quality or production readiness.
See [TASKS](docs/TASKS.md) for the current checkpoint and
[HANDOFF](docs/HANDOFF.md) for the documentation guide.

## Start the app

Use Git, GNU Make, Node **>=26.12.1**, pnpm **>=12.15.0** and uv **>=0.13.5**.
uv installs Python **3.15.1** into the root `.venv` for the app and development
tools, including CloudFormation validation. The root `pyproject.toml` and
`uv.lock` define all Python dependencies. Minimum requirements allow newer stable
tools; installer pins and lockfiles record the exact versions used. Compatibility
exceptions are recorded in [DEPENDENCIES](docs/DEPENDENCIES.md).

For an existing nvm installation, select the repository's Node version and set
the default for new terminals before installing pnpm:

```bash
nvm install "$(cat .node-version)"
nvm alias default "$(cat .node-version)"
npm install --global npm@12.2.1
npm install --global pnpm@12.15.0 --allow-scripts=pnpm
```

Use `nvm use default` in terminals that were already open.

Python and JavaScript tools are installed separately: `uv sync` does not install
Node or pnpm. The Git commit hook uses the terminal's `PATH`. If it reports that
Node is missing, install the version in `.node-version` or activate your existing
Node installation in that terminal, then run `make toolchain-check` before
retrying the commit.

```bash
make bootstrap
make start
```

`make start` connects to the standard Docker app if it is already running on
port 8000. Otherwise, it creates missing private settings, initializes a fresh
database and starts the UI, API and worker at <http://127.0.0.1:8000> by default.
Existing settings, accounts and data are preserved. Use
[the container runbook](docs/RUNBOOK.md#container-package) for Docker installation.

On first run, open the private setup link printed in the terminal and create the
administrator account in the browser. Open the link within 30 minutes; that
browser then has eight hours to finish setup, including across refreshes and app
restarts. Unsent passwords clear on reload. `make start` renews an expired link
when no administrator exists; it does not reset an existing account. Keep setup
links private.

Administrator and learner passwords require **3–256 characters** on both HTTP
and HTTPS. Uppercase letters and symbols are optional. Existing passwords work
over HTTPS without a reset; updates preserve stored credentials. Use the
[runbook](docs/RUNBOOK.md) for password recovery. Resetting a password signs out
that account's browsers. Sign-in screens list usernames for this household;
choose your account and enter its password.

Use `make start` after stopping a native app with Ctrl+C. `make dev` restricts the
same workflow to loopback HTTP. For desktop practice with an iPhone camera, follow
[PHONE_SETUP](docs/PHONE_SETUP.md) for private HTTPS and the expiring QR upload link.
Before upgrading a retained database, stop the API and worker, back up the data
and follow the [migration instructions](docs/RUNBOOK.md).
Never share live `.env`, private provider settings or learner data with coding agents.

## Configure AI and learner accounts

Sign in as administrator and open **Settings**:

1. **Models:** save the exact model, endpoint, capabilities and key if needed.
2. **Data & privacy:** choose whether cloud processing is allowed and whether
   children use the app. A local connection never switches to cloud automatically.
3. Return to the connection in **Models** and authorize its tutor and photo-reader
   tests. The tutor test checks activity creation and feedback in two requests;
   the photo-reader test checks one image-reading response. These calls may incur
   provider charges.
4. Choose **Use as tutor** or **Use as photo reader** on the tested connection
   and authorize its processing location. The current-model summary confirms
   which connection each role actually uses. Saving or testing a connection does
   not activate it. Each role changes independently; a stale selection is rejected.

The default mock supplies labeled sample responses and cannot provide real
teaching or general handwriting recognition. An unavailable model produces a
visible error. See [PROVIDER_STATUS](docs/PROVIDER_STATUS.md) for model limits,
Meta thinking effort, connection requirements, troubleshooting and advanced setup.

Keys entered in Settings are encrypted in the private database and never shown
again in the app.
Normal setup needs no provider YAML. See [provider setup](docs/PROVIDER_STATUS.md)
for advanced file configuration and [backup recovery](docs/RUNBOOK.md) for key
storage and recovery.

Open **Users** to create learner usernames, passwords and age groups. Each
learner opens **Learner sign-in** with their own credentials and sees only their
own work. Choose **Manage account** beside a learner to update their sign-in
details, browsers and saved work. The administrator is also listed here; choose
the administrator account to change its password using the current password
and a confirmed new password. Changing it signs out other administrator browsers
and keeps this browser signed in.
Administrators can correct an existing learner's age group without losing saved
work. Changing it stops pending requests so the updated provider restrictions
apply before more work is processed.
Administrators who also study create a separate learner account. Administrator
pages manage accounts, connections, exports, revocation and deletion; learner
pages show **Practice**, **History** and **Help**.

**Management** and **Learning** are separate views in this app. Management has
**Users**, **Settings** and **Help**, with a **Learner sign-in** link to study.
Learning has **Practice**, **History** and **Help**, with an **Administrator
sign-in** link to manage the app. Each sign-in screen has its own heading,
**Help** and a link to the other sign-in screen. The app opens at **Learner
sign-in** when you are signed out; these addresses support reloads and bookmarks
on the same app host.

Opening the other sign-in keeps your current account and unsent work available.
**Cancel account switch**, or the sign-in link for your current role, returns to
your workspace. Invalid credentials or credentials for the other role preserve
that account and work. Successful sign-in with the requested role switches the
browser's account and clears unsent drafts from the previous account.

## Practice and reading

As a learner, choose what you would like help with: understand a topic, practice
a skill, read and discuss a text, work on writing, review for a test, learn from
homework, or describe something else. Enter what you are working on; the same
form shows relevant material choices. **Adjust difficulty and guidance** holds
optional preferences. Challenge defaults to **Apply and explain**, with
**Start with the basics** and **Stretch my thinking** as alternatives; guidance
defaults to balanced. An optional learning level can target a reading grade
band, a math grade/course, or another course you describe. It guides later
activities and feedback; it is not an assessment of your ability. Change or
clear it in Session settings. Text length, challenge and learning level are
separate preferences.
**Start learning** saves the session and creates its first activity automatically.
For photo material, the upload and phone controls open inline on the same page.
Use **Send** for work or questions, **Attach photo** for
upload or a phone QR link, **Help** for suggestions and **Next activity options**
to continue. **Session & material** holds reference material and preferences.
Activity difficulty and how much the tutor takes the lead are separate controls.
Students choose when to move on. **Finish session** is available alongside the
activity controls and opens a recap of saved work and the latest tutor guidance.
The recap is a record of the session, not a grade or mastery assessment.

Activities show their learning goal and what a complete response should include.
Feedback explains what went well, what needs attention and what to try next.
When suggesting practice, the tutor considers whether the learner worked
independently or received help. These AI observations can be wrong; they are
guidance, not verified grades or mastery scores.

For reading or study in any subject, paste material, photograph a passage, ask
the tutor to write one, or choose **Choose a published text**. The published
library stores reviewed Project Gutenberg stories, poems, essays and book
chapters/excerpts on this app's server. Search titles, authors and text, then
filter by category, word count or approximate reading band. Select **Use this
text** to open its preview and attribution. Changing a search preserves the
selected preview. Reading bands are automatic text estimates with a stated
basis; unrated texts remain available. They do not establish a learner's grade
or whether a text is suitable for every reader.

Local library searches and selections make no Internet or model request. They
work while the app server is reachable, even without Internet access. Tutoring
still needs the selected AI connection. **NASA news** is a separate, explicit
Internet source offering up to five recent passages; it sends no learner work
to NASA. The app does not fetch arbitrary learner-supplied URLs or retrieve a
book from its title.

The [packaged manifest](apps/api/src/math_tutor/data/published/manifest.json)
records the collection and its checksums;
[collection provenance](apps/api/src/math_tutor/data/published/README.md) describes
edition, attribution and permission information, with the full
[Gutenberg terms](apps/api/src/math_tutor/data/published/GUTENBERG-LICENSE.txt).
Source permissions are
specific to the included editions and jurisdiction. Learner sessions keep
their own unchanged passage snapshots: importing more public texts does not
rewrite saved work, and deleting a learner does not delete the shared library.

Fresh native initialization loads the packaged collection locally. For an
existing installation, follow the backup and stopped-writer upgrade procedure
in [RUNBOOK](docs/RUNBOOK.md), run **`make migrate`**, then
**`make library-import`**. The import verifies manifest-listed file checksums
and text hashes, is
atomic and safe to repeat, and refuses to overwrite an existing text ID with
changed content or metadata. It downloads nothing. A reviewed custom local
manifest can be imported in the configured application environment with:

```sh
python -m math_tutor.published_library import --manifest /path/to/manifest.json
```

Pasted and imported study texts allow **50,000 characters** (counted as Unicode
code points). Text read from photos, AI-written passages and assignment references
allow **8,000**.
Oversized drafts stay visible with an error. Choose **Read in sections** with
short, standard or long sections, or **Use the whole text**. Section mode keeps
later sections out of the text sent to the tutor; the model may already know the
story and reveal spoilers. Reading pace is independent of activity difficulty.
Previous/next section controls save the position, and History preserves it. Next/Easier/Harder
ask another question about the current section.

Whole-text discussion must fit the model's configured context limit. If generation
fails because the text is too large, open **Reading pace**, choose sections and
select **Apply reading pace**; the saved source remains available. Select up to
1,500 characters in a passage to stage an editable help request. Send or clear
an existing conversation draft first.

Photos accept JPG, PNG, WebP, HEIC or HEIF up to **8 MiB**, including drag and drop.
The server resizes them when needed, converts them to JPEG and removes metadata.
The phone QR page needs no learner login and grants only temporary upload access.
Before upload, it explains where the photo and extracted text will be processed.
It shows an upload receipt; the computer shows the reading and feedback. If a photo reading
is rejected, the tutor can still discuss that report, clearly marked as uncertain.
For a reference photo, ask what needs clarification, retake the photo, or edit
the uncertain reading as text and use the corrected material to create practice.
Discussing a rejected report does not automatically accept its reading.

## Recovery, privacy and operation

Switching app tabs preserves drafts in memory. Reloading, closing the browser tab
or switching learners can lose unsent drafts. Use **Check saved request** for an
interrupted text or photo submission, in the current tab or after reload. If it
was not saved, **Resolve interrupted request** safely releases it before you
continue. These actions do not resend work; current-tab resolution preserves
your draft or prepared photo. Closing the tab loses
the request reference; use **History** for already saved work. The phone upload
page has its own recovery flow.

App updates wait while requests are pending and warn about unsent drafts.
Service-worker caches contain public assets only. Submitted work is retained on
the server; history defaults to 30 days. Processed photos are deleted, and
failed/unprocessed photos expire within 24 hours. The worker enforces retention.
Model-call records store status, timing and available token counts without
raw prompts, images, responses or keys. The installed web app caches public files;
tutoring and saved work require the server. See the [specification](docs/SPECIFICATION.md) for
architecture and data boundaries.

Run one API process and one worker on the same computer, with a database on its
local disk. Provider keys and exact-check answer keys stay on the backend. Models have no autonomous
external tools or authority to change permissions, verified verdicts or workflow
state. Jobs survive restarts, and repeated requests produce one visible result.
A crash after a provider response can require another billed call, subject to
the configured request limit. See [RUNBOOK](docs/RUNBOOK.md) for database upgrades,
HTTPS, encrypted backups and restoration.

## Commands and verification

The [Makefile](Makefile) is authoritative.

| Command                                                                  | Purpose                                                                                                          |
| ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| `make bootstrap`, `make hooks-install`                                   | Locked installation and local commit checks                                                                      |
| `make check`                                                             | Locks, lint, format, types, unit/component tests, builds, API consistency, secret scan and infrastructure checks |
| `make test-integration`                                                  | On-disk migration, ownership, recovery, policy and retention checks                                              |
| `make smoke` / `make test-e2e`                                           | Build and run isolated desktop/mobile Chromium workflows                                                         |
| `make smoke-built`                                                       | Run browser workflows against an already-built app                                                               |
| `make eval-mock`                                                         | Synthetic math, photo, reading, teaching and adversarial test cases                                              |
| `make audit`, `make hooks-check`                                         | Locked dependency audit and repository checks                                                                    |
| `make hooks-files-check`                                                 | Repository file checks; pair with `make check` for all project checks                                            |
| `make contracts` / `make contracts-check`                                | Regenerate API definitions and TypeScript types, or check that they match the source                             |
| `make format`, `make lint`, `make typecheck`                             | Focused developer checks                                                                                         |
| `make start`, `make dev`, `make serve`, `make worker`                    | Start with saved settings, start on this computer only, use a configured HTTPS gateway, or run the worker alone  |
| `make migrate`                                                           | Upgrade an existing database after stopping the API and worker                                                   |
| `make library-import`                                                    | Verify and import the packaged public-text collection into local SQLite; no network or inference                 |
| `make down`                                                              | Stop Compose while retaining data; native processes use Ctrl+C                                                   |
| `make backup OUTPUT=...`, `make restore INPUT=... OUTPUT=... LEDGER=...` | Native encrypted backup/restore with writes stopped                                                              |
| `make demo`, `make seed-demo`                                            | Disposable restricted preview, or explicit empty demo database seed                                              |

`make demo` uses public synthetic credentials `demo` /
`synthetic-demo-password-only` and blocks tutoring and personal uploads.
Install the test browser with `pnpm exec playwright install --with-deps chromium`,
or set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` to installed Chrome. Mobile emulation
does not verify Safari or Chrome on a real phone.

Live evaluations are opt-in and may be billed; follow
[TUTOR_EVALUATION](docs/TUTOR_EVALUATION.md) for commands, call limits and human
review. CI also builds and smoke-tests the non-root image, scans HIGH/CRITICAL
vulnerabilities and retains an SBOM. [TASKS](docs/TASKS.md) links recorded outcomes;
a configured workflow is not evidence that a revision passed.

## Contributing and license

Read [AGENTS](AGENTS.md), [SPECIFICATION](docs/SPECIFICATION.md) and
[HANDOFF](docs/HANDOFF.md). Use original synthetic fixtures and record actual
outcomes. [THREAT_MODEL](docs/THREAT_MODEL.md) describes boundaries and
[evals/MANIFEST](evals/MANIFEST.md) records fixture provenance. Review public staged
files individually; never blanket-add local configuration or data.

[MIT licensed](LICENSE), as approved by the maintainer. Dependencies, model
weights and third-party runtime artifacts retain their own licenses.
