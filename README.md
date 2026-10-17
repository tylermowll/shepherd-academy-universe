# Shepherd Academy Universe

A self-hosted, multi-subject AI tutor. Choose a topic, receive an activity, work
on paper or type a response, and get guidance on your work. Revise, ask questions,
and choose the next activity. Math, writing, reading, history, social studies,
science and custom topics are supported without a required grade level or fixed
activity catalog.

Photo readings appear before feedback. Clear, task-relevant readings continue
automatically; uncertainty that prevents useful feedback gets specific retake or
clarification advice. Uploaded or pasted assignments are reference material for
concepts and different practice, never tasks for the tutor to complete.

## Current status

The application is implemented through **T44**. Model selection and teaching
quality, physical phone/accessibility checks and operational recovery still need
[release acceptance](docs/ACCEPTANCE.md). Passing automated tests or a connection
probe does not establish teaching quality or production readiness.
See [TASKS](docs/TASKS.md) for the current checkpoint and
[HANDOFF](docs/HANDOFF.md) for the documentation guide.

## Start the app

Use Git, GNU Make, Node **>=26.11.1**, pnpm **>=12.11.2** and uv **>=0.13.0**.
uv installs Python **3.15.0** for the app and Python **3.14.8** for the isolated
CloudFormation checker if needed. Minimum requirements allow newer stable
tools; installers and lockfiles retain exact reproducible versions. Compatibility
exceptions are recorded in [DEPENDENCIES](docs/DEPENDENCIES.md).

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

Loopback HTTP passwords need **6 characters**; HTTPS passwords need **12**,
without uppercase or symbol rules. Use the [runbook](docs/RUNBOOK.md) for password
recovery or moving an installation with short passwords to HTTPS. Resets revoke
sessions.

Use `make start` after stopping a native app with Ctrl+C. `make dev` restricts the
same workflow to loopback HTTP. For desktop practice with an iPhone camera, follow
[PHONE_SETUP](docs/PHONE_SETUP.md) for private HTTPS and the expiring QR upload link.
Before upgrading a retained database, stop the API and worker, back up the data
and follow the [migration instructions](docs/RUNBOOK.md).
Never share live `.env`, private provider settings or learner data with coding agents.

## Configure AI and learner accounts

Sign in as administrator and open **Settings**:

1. **Connections:** save the exact model, endpoint, capabilities and key if needed.
2. **Data & privacy:** review the installation's cloud permission and audience
   ceiling. A local connection never falls back to cloud.
3. **Connection tests:** explicitly authorize synthetic tests for the required
   roles. The tutor test checks activity creation and feedback in two requests;
   the photo-reader test checks one image-reading response. These calls may incur
   provider charges.
4. **Active models:** select the tested tutor and photo reader for future work.
   Saving a connection or passing a test does not activate it.

The default mock supplies labeled synthetic responses and cannot provide real
teaching or general handwriting recognition. An unavailable model produces a
visible error. See [PROVIDER_STATUS](docs/PROVIDER_STATUS.md) for model limits,
Meta thinking effort, role readiness, diagnostics and advanced provider setup.

Keys entered in Settings are write-only and encrypted in the private database.
Normal setup needs no provider YAML. See [provider setup](docs/PROVIDER_STATUS.md)
for advanced file configuration and [backup recovery](docs/RUNBOOK.md) for key
custody.

Open **Learners** to create learner usernames, passwords and age groups. Each
learner signs in through the common sign-in page and sees only their own work.
Administrators who also study create a separate learner account. Administrator
pages manage accounts, connections, exports, revocation and deletion; learner
pages show **Practice**, **History** and **Help**.

## Practice and reading

As a learner, enter a topic and choose **Start session**. The first activity is
created automatically. Use **Send** for work or questions, **Attach photo** for
upload or a phone QR link, **Help** for suggestions and **Next activity options**
to continue. **Session & material** holds reference material and preferences.
Activity difficulty and learner-led, balanced or tutor-led initiative are separate
controls. Students choose when to move on.

Activities show their learning goal and sufficient-response criteria. Feedback
identifies strengths, guidance and fallible observations of resolved and open
points. It distinguishes independent work from work after help when proposing
practice. These observations are guidance, not verified grades or mastery scores.

For reading or study in any subject, paste material, photograph a passage, ask
the tutor to write one, or choose **Published story or news**. Published imports
offer two Aesop stories from a Project Gutenberg mirror and up to five NASA news
passages. Review the preview and attribution before starting. This picker does
not retrieve arbitrary URLs or books, and it sends no learner work to those sources.

Pasted and imported study texts allow **50,000 Unicode codepoints**. Photo
transcriptions, AI-written passages and assignment references allow **8,000**.
Oversized drafts stay visible with an error. Choose **Read in sections** with
short, standard or long sections, or **Use the whole text**. Section mode keeps
future text out of supplied tutor context; prior model knowledge can still cause
spoilers. Reading pace is independent of activity difficulty. Previous/next
section controls save the position, and History preserves it. Next/Easier/Harder
ask another question about the current section.

Whole-text discussion must fit the model's configured context. If generation
fails because the text is too large, open **Reading pace**, choose sections and
select **Apply reading pace**; the saved source remains available. Select up to
1,500 characters in a passage to stage an editable help request. Send or clear
an existing conversation draft first.

Photos accept JPG, PNG, WebP, HEIC or HEIF up to **8 MiB**, including drag and drop.
The server converts them to bounded JPEGs and removes metadata. The phone QR page
needs no learner login and grants only temporary upload access. It shows an
upload receipt; the computer shows the reading and feedback. Rejected reader
reports remain explicitly uncertain conversational context.

## Recovery, privacy and operation

Switching app tabs preserves drafts in memory. Reloading, closing the browser tab
or switching learners can lose unsent drafts. After reload, interrupted requests
can be checked with **Check saved request** or **Resolve interrupted request**;
the app checks a saved receipt without resending work. Closing the tab loses that
receipt marker; use **History** for already saved work. The phone upload page has
its own recovery flow.

App updates wait while commands are pending and warn about unsent drafts.
Service-worker caches contain public assets only. Submitted work is retained on
the server; history defaults to 30 days. Processed photos are deleted, and
failed/unprocessed photos expire within 24 hours. The worker enforces retention.
Model-call records store safe status, timing and available token counts without
raw prompts, images, responses or keys. The PWA caches public assets; tutoring and
saved work require the server. See the [specification](docs/SPECIFICATION.md) for
architecture and data boundaries.

Run one API process and one worker on the same host and local disk. Provider keys
and exact-check answer keys stay on the backend. Models have no autonomous
external tools or authority to change permissions, verified verdicts or workflow
state. Jobs survive restarts and duplicate requests produce one visible result;
a crash after a provider response can require another billed call within the
operation budget. See [RUNBOOK](docs/RUNBOOK.md) for retained-data upgrades,
HTTPS, encrypted backups and restoration.

## Commands and verification

The [Makefile](Makefile) is authoritative.

| Command                                                                  | Purpose                                                                                         |
| ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| `make bootstrap`, `make hooks-install`                                   | Locked installation and local commit checks                                                     |
| `make check`                                                             | Locks, lint, format, types, unit/component tests, builds, contracts, secret scan and IaC checks |
| `make test-integration`                                                  | On-disk migration, ownership, recovery, policy and retention checks                             |
| `make smoke` / `make test-e2e`                                           | Isolated desktop/mobile Chromium workflows                                                      |
| `make eval-mock`                                                         | Math/vision, reading, cross-subject and adversarial synthetic contracts                         |
| `make audit`, `make hooks-check`                                         | Locked dependency audit and repository checks                                                   |
| `make contracts` / `make contracts-check`                                | Regenerate OpenAPI/TypeScript or reject drift                                                   |
| `make format`, `make lint`, `make typecheck`                             | Focused developer checks                                                                        |
| `make start`, `make dev`, `make serve`, `make worker`                    | Persistent start, loopback start, configured HTTPS gateway or worker alone                      |
| `make migrate`                                                           | Upgrade a retained database after stopping both writers                                         |
| `make down`                                                              | Stop Compose while retaining data; native processes use Ctrl+C                                  |
| `make backup OUTPUT=...`, `make restore INPUT=... OUTPUT=... LEDGER=...` | Native encrypted backup/restore with writes stopped                                             |
| `make demo`, `make seed-demo`                                            | Disposable restricted preview, or explicit empty demo database seed                             |

`make demo` uses public synthetic credentials `demo` /
`synthetic-demo-password-only` and blocks tutoring and personal uploads.
Install the test browser with `pnpm exec playwright install --with-deps chromium`,
or set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` to installed Chrome. Mobile emulation
does not certify physical Safari/Chrome behavior.

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
