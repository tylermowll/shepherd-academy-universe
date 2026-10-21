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

Use Git, GNU Make, Node **>=26.12.0**, pnpm **>=12.14.0** and uv **>=0.13.2**.
uv installs Python **3.15.0** into the root `.venv` for the app and development
tools, including CloudFormation validation. The root `pyproject.toml` and
`uv.lock` define all Python dependencies. Minimum requirements allow newer stable
tools; installer pins and lockfiles record the exact versions used. Compatibility
exceptions are recorded in [DEPENDENCIES](docs/DEPENDENCIES.md).

For an existing nvm installation, select the repository's Node version and set
the default for new terminals before installing pnpm:

```bash
nvm install "$(cat .node-version)"
nvm alias default "$(cat .node-version)"
npm install --global npm@12.2.0
npm install --global pnpm@12.14.0 --allow-scripts=pnpm
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

Administrator and learner passwords require **6–256 characters** on both HTTP
and HTTPS. Uppercase letters and symbols are optional. Existing passwords work
over HTTPS without a reset; updates preserve stored credentials. Use the
[runbook](docs/RUNBOOK.md) for password recovery. Resetting a password signs out
that account's browsers.

Use `make start` after stopping a native app with Ctrl+C. `make dev` restricts the
same workflow to loopback HTTP. For desktop practice with an iPhone camera, follow
[PHONE_SETUP](docs/PHONE_SETUP.md) for private HTTPS and the expiring QR upload link.
Before upgrading a retained database, stop the API and worker, back up the data
and follow the [migration instructions](docs/RUNBOOK.md).
Never share live `.env`, private provider settings or learner data with coding agents.

## Configure AI and learner accounts

Sign in as administrator and open **Settings**:

1. **Connections:** save the exact model, endpoint, capabilities and key if needed.
2. **Data & privacy:** choose whether cloud processing is allowed and whether
   children use the app. A local connection never switches to cloud automatically.
3. **Connection tests:** authorize sample requests to test the tutor and photo
   reader. The tutor test checks activity creation and feedback in two requests;
   the photo-reader test checks one image-reading response. These calls may incur
   provider charges.
4. **Active models:** select the tested tutor and photo reader for future work.
   Saving a connection or passing a test does not activate it.

The default mock supplies labeled sample responses and cannot provide real
teaching or general handwriting recognition. An unavailable model produces a
visible error. See [PROVIDER_STATUS](docs/PROVIDER_STATUS.md) for model limits,
Meta thinking effort, connection requirements, troubleshooting and advanced setup.

Keys entered in Settings are encrypted in the private database and never shown
again in the app.
Normal setup needs no provider YAML. See [provider setup](docs/PROVIDER_STATUS.md)
for advanced file configuration and [backup recovery](docs/RUNBOOK.md) for key
storage and recovery.

Open **Learners** to create learner usernames, passwords and age groups. Each
learner signs in through the common sign-in page and sees only their own work.
Administrators can correct an existing learner's age group without losing saved
work. Changing it stops pending requests so the updated provider restrictions
apply before more work is processed.
Administrators who also study create a separate learner account. Administrator
pages manage accounts, connections, exports, revocation and deletion; learner
pages show **Practice**, **History** and **Help**.

Use **Learning environment** and **Administration** at the top of the app to
move between the two areas. If the other area needs a different account, its
sign-in form opens in the same app. Your current account stays signed in until
the new credentials succeed; **Cancel account switch** returns to your work.
Sign in with a learner account to learn, or the administrator account to manage
settings and accounts.

## Practice and reading

As a learner, enter a topic and choose whether to practice a topic, study a
passage or practice assignment concepts. For passages and assignments, choose
how to supply the material. **Start session** creates the first activity
automatically. Use **Send** for work or questions, **Attach photo** for
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
the tutor to write one, or choose **Published story or news**. Published imports
offer two Aesop stories from a Project Gutenberg mirror and up to five NASA news
passages. Review the preview and attribution before starting. This picker does
not retrieve arbitrary URLs or books, and it sends no learner work to those sources.

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
The phone QR page needs no learner login and grants only temporary upload access. It shows an
upload receipt; the computer shows the reading and feedback. If a photo reading
is rejected, the tutor can still discuss that report, clearly marked as uncertain.
For a reference photo, ask what needs clarification, retake the photo, or edit
the uncertain reading as text and use the corrected material to create practice.
Discussing a rejected report does not automatically accept its reading.

## Recovery, privacy and operation

Switching app tabs preserves drafts in memory. Reloading, closing the browser tab
or switching learners can lose unsent drafts. After reload, interrupted requests
can be checked with **Check saved request** or **Resolve interrupted request**;
the app checks the saved request without resending work. Closing the tab loses
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
